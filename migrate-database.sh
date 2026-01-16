#!/bin/bash
set -e

# Màu sắc cho output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Thông tin database cũ (source)
SOURCE_HOST="14.225.254.130"
SOURCE_PORT="5434"
SOURCE_DB="tsh_db"
SOURCE_USER="tsh_db"
SOURCE_PASSWORD="Tsh123qwe"

# Thông tin database mới (target) - có thể chỉnh sửa hoặc set qua biến môi trường
TARGET_HOST="${TARGET_HOST:-14.225.254.130}"
TARGET_PORT="${TARGET_PORT:-5434}"
TARGET_DB="${TARGET_DB:-Proxy96_new}"
TARGET_USER="${TARGET_USER:-tsh_db}"
TARGET_PASSWORD="${TARGET_PASSWORD:-Tsh123qwe}"

echo -e "${GREEN}🚀 Bắt đầu migrate database...${NC}"
echo ""
echo -e "${YELLOW}Database nguồn:${NC}"
echo "  Host: ${SOURCE_HOST}:${SOURCE_PORT}"
echo "  Database: ${SOURCE_DB}"
echo "  User: ${SOURCE_USER}"
echo ""
echo -e "${YELLOW}Database đích:${NC}"
echo "  Host: ${TARGET_HOST}:${TARGET_PORT}"
echo "  Database: ${TARGET_DB}"
echo "  User: ${TARGET_USER}"
echo ""

# Kiểm tra psql có sẵn
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ psql không được tìm thấy. Vui lòng cài đặt PostgreSQL client tools.${NC}"
    exit 1
fi

# Hàm kiểm tra kết nối database
check_connection() {
    local host=$1
    local port=$2
    local db=$3
    local user=$4
    local password=$5
    
    export PGPASSWORD="${password}"
    if psql -h "${host}" -p "${port}" -U "${user}" -d "${db}" -c "SELECT 1;" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Kiểm tra kết nối database nguồn
echo -e "${YELLOW}🔍 Kiểm tra kết nối database nguồn...${NC}"
export PGPASSWORD="${SOURCE_PASSWORD}"
if ! check_connection "${SOURCE_HOST}" "${SOURCE_PORT}" "${SOURCE_DB}" "${SOURCE_USER}" "${SOURCE_PASSWORD}"; then
    echo -e "${RED}❌ Không thể kết nối đến database nguồn!${NC}"
    echo "   Hãy kiểm tra lại thông tin kết nối."
    exit 1
fi
echo -e "${GREEN}✅ Kết nối database nguồn thành công${NC}"
echo ""

# Tạo database mới
echo -e "${YELLOW}📦 Tạo database mới: ${TARGET_DB}...${NC}"
export PGPASSWORD="${TARGET_PASSWORD}"

# Kiểm tra database đã tồn tại chưa
if psql -h "${TARGET_HOST}" -p "${TARGET_PORT}" -U "${TARGET_USER}" -d "postgres" -tAc "SELECT 1 FROM pg_database WHERE datname='${TARGET_DB}';" | grep -q 1; then
    echo -e "${YELLOW}⚠️  Database ${TARGET_DB} đã tồn tại.${NC}"
    read -p "Bạn có muốn xóa và tạo lại database ${TARGET_DB}? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        psql -h "${TARGET_HOST}" -p "${TARGET_PORT}" -U "${TARGET_USER}" -d "postgres" -c "DROP DATABASE IF EXISTS ${TARGET_DB};" 2>/dev/null || true
        psql -h "${TARGET_HOST}" -p "${TARGET_PORT}" -U "${TARGET_USER}" -d "postgres" -c "CREATE DATABASE ${TARGET_DB};"
        echo -e "${GREEN}✅ Database ${TARGET_DB} đã được tạo lại${NC}"
    else
        echo -e "${YELLOW}⚠️  Sử dụng database hiện có${NC}"
    fi
else
    # Tạo database mới
    if psql -h "${TARGET_HOST}" -p "${TARGET_PORT}" -U "${TARGET_USER}" -d "postgres" -c "CREATE DATABASE ${TARGET_DB};" 2>/dev/null; then
        echo -e "${GREEN}✅ Database ${TARGET_DB} đã được tạo${NC}"
    else
        echo -e "${RED}❌ Không thể tạo database ${TARGET_DB}${NC}"
        exit 1
    fi
fi
echo ""

# Kiểm tra kết nối database đích
echo -e "${YELLOW}🔍 Kiểm tra kết nối database đích...${NC}"
if ! check_connection "${TARGET_HOST}" "${TARGET_PORT}" "${TARGET_DB}" "${TARGET_USER}" "${TARGET_PASSWORD}"; then
    echo -e "${RED}❌ Không thể kết nối đến database đích!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Kết nối database đích thành công${NC}"
echo ""

# Chạy migrations trên database mới
echo -e "${YELLOW}🔧 Chạy migrations trên database mới...${NC}"
cd backend

# Tạo file .env tạm thời nếu chưa có hoặc cập nhật
ENV_FILE=".env"
BACKUP_ENV_FILE=".env.backup.$(date +%Y%m%d_%H%M%S)"

# Backup .env hiện tại nếu có
if [ -f "${ENV_FILE}" ]; then
    cp "${ENV_FILE}" "${BACKUP_ENV_FILE}"
    echo -e "${YELLOW}⚠️  Đã backup file .env hiện tại thành ${BACKUP_ENV_FILE}${NC}"
fi

# Tạo/cập nhật .env với thông tin database mới
cat > "${ENV_FILE}" << EOF
DATABASE_HOST=${TARGET_HOST}
DATABASE_PORT=${TARGET_PORT}
DATABASE_USER=${TARGET_USER}
DATABASE_PASSWORD=${TARGET_PASSWORD}
DATABASE_NAME=${TARGET_DB}
EOF

# Chạy migrations
echo -e "${YELLOW}📦 Đang chạy migrations...${NC}"
if npm run migration:run; then
    echo -e "${GREEN}✅ Migrations đã chạy thành công${NC}"
else
    echo -e "${RED}❌ Migrations thất bại${NC}"
    # Restore .env backup nếu có
    if [ -f "${BACKUP_ENV_FILE}" ]; then
        mv "${BACKUP_ENV_FILE}" "${ENV_FILE}"
        echo -e "${YELLOW}⚠️  Đã khôi phục file .env từ backup${NC}"
    fi
    cd ..
    exit 1
fi

cd ..
echo ""

# Chạy script TypeScript để migrate data
echo -e "${YELLOW}📥 Migrate data từ database cũ sang database mới...${NC}"
cd backend

# Set environment variables cho script TypeScript
export SOURCE_DB_HOST="${SOURCE_HOST}"
export SOURCE_DB_PORT="${SOURCE_PORT}"
export SOURCE_DB_NAME="${SOURCE_DB}"
export SOURCE_DB_USER="${SOURCE_USER}"
export SOURCE_DB_PASSWORD="${SOURCE_PASSWORD}"

if npm run migrate:from-old-db; then
    echo -e "${GREEN}✅ Migrate data thành công${NC}"
else
    echo -e "${YELLOW}⚠️  Có lỗi khi migrate data (có thể do schema khác nhau)${NC}"
    echo -e "${YELLOW}   Bạn có thể kiểm tra và migrate data thủ công${NC}"
fi

cd ..
echo ""

echo -e "${GREEN}✨ Migration hoàn thành!${NC}"
echo ""
echo -e "${YELLOW}Thông tin database mới:${NC}"
echo "  Host: ${TARGET_HOST}:${TARGET_PORT}"
echo "  Database: ${TARGET_DB}"
echo "  User: ${TARGET_USER}"
echo ""
echo -e "${GREEN}File .env trong backend/ đã được cập nhật với thông tin database mới${NC}"
if [ -f "backend/${BACKUP_ENV_FILE}" ]; then
    echo -e "${YELLOW}File .env cũ đã được backup thành: backend/${BACKUP_ENV_FILE}${NC}"
fi
echo ""
echo -e "${YELLOW}Để sử dụng database mới, đảm bảo các biến môi trường trong backend/.env đúng:${NC}"
echo "  DATABASE_HOST=${TARGET_HOST}"
echo "  DATABASE_PORT=${TARGET_PORT}"
echo "  DATABASE_USER=${TARGET_USER}"
echo "  DATABASE_PASSWORD=${TARGET_PASSWORD}"
echo "  DATABASE_NAME=${TARGET_DB}"
echo ""
