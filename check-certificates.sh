#!/bin/bash
# Script kiểm tra TLS certificates cho Gateway

echo "🔍 Checking TLS Certificates for Gateway"
echo "=========================================="
echo ""

CERT_DIR="./gateway/certs"
CERT_FILE="$CERT_DIR/cert.pem"
KEY_FILE="$CERT_DIR/key.pem"

# Check if directory exists
if [ ! -d "$CERT_DIR" ]; then
    echo "❌ Directory $CERT_DIR does not exist!"
    echo "   Creating directory..."
    mkdir -p "$CERT_DIR"
    echo "   ✅ Directory created"
else
    echo "✅ Directory $CERT_DIR exists"
fi

echo ""

# Check certificate file
if [ ! -f "$CERT_FILE" ]; then
    echo "❌ Certificate file not found: $CERT_FILE"
else
    echo "✅ Certificate file exists: $CERT_FILE"
    echo "   Size: $(ls -lh "$CERT_FILE" | awk '{print $5}')"
    echo "   Permissions: $(ls -l "$CERT_FILE" | awk '{print $1}')"
    
    # Validate certificate
    if openssl x509 -in "$CERT_FILE" -text -noout > /dev/null 2>&1; then
        echo "   ✅ Certificate is valid"
        echo "   Subject: $(openssl x509 -in "$CERT_FILE" -noout -subject 2>/dev/null | sed 's/subject=//')"
        echo "   Valid until: $(openssl x509 -in "$CERT_FILE" -noout -enddate 2>/dev/null | sed 's/notAfter=//')"
    else
        echo "   ⚠️  Certificate file exists but is invalid!"
    fi
fi

echo ""

# Check key file
if [ ! -f "$KEY_FILE" ]; then
    echo "❌ Key file not found: $KEY_FILE"
else
    echo "✅ Key file exists: $KEY_FILE"
    echo "   Size: $(ls -lh "$KEY_FILE" | awk '{print $5}')"
    echo "   Permissions: $(ls -l "$KEY_FILE" | awk '{print $1}')"
    
    # Validate key
    if openssl rsa -in "$KEY_FILE" -check -noout > /dev/null 2>&1; then
        echo "   ✅ Key is valid"
    else
        echo "   ⚠️  Key file exists but is invalid!"
    fi
fi

echo ""

# Check if they match
if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ]; then
    CERT_MODULUS=$(openssl x509 -noout -modulus -in "$CERT_FILE" 2>/dev/null | openssl md5)
    KEY_MODULUS=$(openssl rsa -noout -modulus -in "$KEY_FILE" 2>/dev/null | openssl md5)
    
    if [ "$CERT_MODULUS" = "$KEY_MODULUS" ]; then
        echo "✅ Certificate and key match!"
    else
        echo "❌ Certificate and key do NOT match!"
        echo "   This certificate and key are not a pair!"
    fi
fi

echo ""

# Check permissions
if [ -f "$CERT_FILE" ]; then
    PERMS=$(stat -c "%a" "$CERT_FILE" 2>/dev/null || stat -f "%OLp" "$CERT_FILE" 2>/dev/null)
    if [ "$PERMS" != "644" ] && [ "$PERMS" != "0644" ]; then
        echo "⚠️  Certificate permissions: $PERMS (recommended: 644)"
    fi
fi

if [ -f "$KEY_FILE" ]; then
    PERMS=$(stat -c "%a" "$KEY_FILE" 2>/dev/null || stat -f "%OLp" "$KEY_FILE" 2>/dev/null)
    if [ "$PERMS" != "600" ] && [ "$PERMS" != "0600" ]; then
        echo "⚠️  Key permissions: $PERMS (recommended: 600)"
        echo "   Fix: chmod 600 $KEY_FILE"
    fi
fi

echo ""
echo "📋 Docker Compose Volume Mount:"
echo "   Host path: $CERT_DIR -> Container path: /certs"
echo ""

# Check if running in container
if [ -f "/.dockerenv" ]; then
    echo "⚠️  Running inside Docker container"
    echo "   Checking container paths..."
    if [ -f "/certs/cert.pem" ]; then
        echo "   ✅ /certs/cert.pem exists in container"
    else
        echo "   ❌ /certs/cert.pem NOT found in container"
    fi
    if [ -f "/certs/key.pem" ]; then
        echo "   ✅ /certs/key.pem exists in container"
    else
        echo "   ❌ /certs/key.pem NOT found in container"
    fi
else
    echo "ℹ️  Running on host. To check inside container, run:"
    echo "   docker compose exec gateway ls -la /certs"
fi

echo ""
echo "✅ Check completed!"
