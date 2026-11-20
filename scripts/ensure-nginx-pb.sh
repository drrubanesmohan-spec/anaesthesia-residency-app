#!/bin/bash
# One-time server setup: make nginx proxy /pb/ to PocketBase (127.0.0.1:8090).
# Safe to re-run: does nothing if the /pb/ location already exists.
# Moved here unchanged from the old deploy.sh on 2026-11-20. Run as root.
set -e
NGINX_CONF="/etc/nginx/sites-available/ordinemmed"

echo "=== Updating nginx ==="
python3 -c "
c = open('$NGINX_CONF').read()
loc = '''    location /pb/ {
        proxy_pass http://127.0.0.1:8090/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600;
        proxy_buffering off;
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
