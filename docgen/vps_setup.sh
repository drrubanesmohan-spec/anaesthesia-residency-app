#!/bin/bash
# Run this script in the Timeweb VPS console (KVM or web terminal)
# It installs the docgen service and configures Cloudflare tunnel for gen.ordinemmed.ru

set -e

echo "=== 1. Installing Node.js (if not present) ==="
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
node --version

echo "=== 2. Creating /root/docgen directory ==="
mkdir -p /root/docgen

echo "=== 3. Writing package.json ==="
cat > /root/docgen/package.json << 'PKGJSON'
{
  "name": "docgen",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "axios": "^1.7.0",
    "docxtemplater": "^3.50.0",
    "express": "^4.19.0",
    "pizzip": "^3.1.7"
  }
}
PKGJSON

echo "=== 4. Installing npm dependencies ==="
cd /root/docgen && npm install

echo "=== 5. Writing index.js ==="
# (Copy index.js from your Mac to /root/docgen/index.js via scp or paste manually)
# scp anesthesia-app/docgen/index.js root@104.171.128.203:/root/docgen/index.js

echo "=== 6. Installing systemd service ==="
cat > /etc/systemd/system/docgen.service << 'EOF'
[Unit]
Description=Ordinem Document Generation Service
After=network.target

[Service]
Type=simple
WorkingDirectory=/root/docgen
ExecStart=/usr/bin/node /root/docgen/index.js
Restart=always
Environment=PB_SUPERUSER_EMAIL=admin@ordinemmed.ru
Environment=PB_SUPERUSER_PASSWORD=NewAdmin1234

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable docgen

echo "=== 7. Updating Cloudflare Tunnel config ==="
# Find tunnel credentials file
CRED_FILE=$(find /root/.cloudflared -name "*.json" 2>/dev/null | head -1)
echo "Credentials file: $CRED_FILE"

cat > /etc/cloudflared/config.yml << EOF
tunnel: 50e1ec96-764a-47b5-a136-cad8e0589c81
credentials-file: $CRED_FILE

ingress:
  - hostname: api.ordinemmed.ru
    service: http://localhost:8090
  - hostname: gen.ordinemmed.ru
    service: http://localhost:3001
  - service: http_status:404
EOF

echo "=== 8. Restarting cloudflared ==="
systemctl restart cloudflared
systemctl status cloudflared --no-pager

echo ""
echo "=== DONE ==="
echo "Next steps:"
echo "1. Copy template.docx to /root/docgen/template.docx"
echo "2. systemctl start docgen"
echo "3. Add CNAME in Cloudflare DNS: gen -> 50e1ec96-764a-47b5-a136-cad8e0589c81.cfargotunnel.com"
echo "4. Test: curl https://gen.ordinemmed.ru/health"
