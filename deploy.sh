#!/bin/bash
set -e

TOKEN="${GH_TOKEN:?GH_TOKEN not set. Run: export GH_TOKEN=your_token}"
REPO="https://drrubanesmohan-spec:${TOKEN}@github.com/drrubanesmohan-spec/anaesthesia-residency-app.git"
WEBROOT="/var/www/ordinemmed"
NGINX_CONF="/etc/nginx/sites-available/ordinemmed"

echo "=== Pulling latest code ==="
rm -rf /tmp/deploy_app
git clone --depth 1 "$REPO" /tmp/deploy_app
cd /tmp/deploy_app

echo "=== Building app ==="
npm ci --silent
echo "VITE_PB_URL=https://ordinemmed.ru/pb" > .env.local
npx tsc -b && npx vite build --config vite.static.config.ts

echo "=== Deploying to webroot ==="
rm -rf "$WEBROOT"/*
cp -r dist/. "$WEBROOT"/

echo "=== Updating nginx ==="
python3 -c "
c = open('$NGINX_CONF').read()
loc = '''    location /pb/ {
        proxy_pass http://127.0.0.1:8090/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
'''
if 'location /pb/' not in c:
    c = c.replace('    location / {', loc + '    location / {', 1)
    open('$NGINX_CONF', 'w').write(c)
    print('nginx: /pb/ location added')
else:
    print('nginx: /pb/ already present, skipping')
"

nginx -t && systemctl reload nginx
echo "=== DONE === Site live at https://ordinemmed.ru"
