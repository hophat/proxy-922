#!/bin/bash

# Script test SePay webhook với format mới
# Sử dụng: ./test-sepay-webhook.sh [BACKEND_URL] [ORDER_CODE] [API_KEY]

BACKEND_URL=${1:-"http://localhost:3300"}
ORDER_CODE=${2:-"PAY1234567890"}  # Thay bằng order code thực tế trong database
API_KEY=${3:-"Hophat96"}  # Thay bằng API key thực tế từ SePay

echo "Testing SePay webhook với format mới..."
echo "Backend URL: $BACKEND_URL"
echo "Order Code: $ORDER_CODE"
echo "API Key: ${API_KEY:0:10}..." # Chỉ hiển thị 10 ký tự đầu
echo ""

# Lệnh curl test webhook SePay với format mới
# SePay gửi với header: "Authorization: Apikey API_KEY"
curl -X POST "${BACKEND_URL}/payments/webhooks/sepay" \
  -H "Content-Type: application/json" \
  -H "Authorization: Apikey ${API_KEY}" \
  -d '{
    "gateway": "TPBank",
    "transactionDate": "2025-12-24 10:16:36",
    "accountNumber": "03735825801",
    "subAccount": null,
    "code":  "'"${ORDER_CODE}"'",
    "content":  "'"${ORDER_CODE}"'",
    "transferType": "in",
    "description": "BankAPINotify '"${ORDER_CODE}"'",
    "transferAmount": 99000,
    "referenceCode": "918ITC1253580450",
    "accumulated": 892120,
    "id": 36554971
  }' \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -v

echo ""
echo "Lưu ý:"
echo "  - Đảm bảo order code '${ORDER_CODE}' đã tồn tại trong database và có status PENDING"
echo "  - API key phải khớp với SEPAY_API_KEY trong file .env của backend"
