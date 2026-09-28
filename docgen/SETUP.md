# Docgen Service — VPS Setup

## 1. Create PocketBase collections

SSH into VPS and run these curl commands (get superuser token first):

```bash
# Auth as superuser
TOKEN=$(curl -s -X POST http://localhost:8090/api/collections/_superusers/auth-with-password \
  -H 'Content-Type: application/json' \
  -d '{"identity":"admin@ordinemmed.ru","password":"NewAdmin1234"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

echo "Token: $TOKEN"

# Create app_settings collection
curl -s -X POST http://localhost:8090/api/collections \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "app_settings",
    "type": "base",
    "fields": [
      {"name":"key",   "type":"text","required":true},
      {"name":"value", "type":"text","required":false}
    ],
    "listRule":   "@request.auth.role = \"admin\"",
    "viewRule":   "@request.auth.role = \"admin\"",
    "createRule": "@request.auth.role = \"admin\"",
    "updateRule": "@request.auth.role = \"admin\"",
    "deleteRule": "@request.auth.role = \"admin\""
  }'

# Create document_submissions collection
curl -s -X POST http://localhost:8090/api/collections \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "document_submissions",
    "type": "base",
    "fields": [
      {"name":"resident",   "type":"relation","collectionId":"_pb_users_auth_","required":true},
      {"name":"data",       "type":"json",    "required":false},
      {"name":"status",     "type":"text",    "required":false},
      {"name":"yandex_url", "type":"url",     "required":false},
      {"name":"error_msg",  "type":"text",    "required":false}
    ],
    "listRule":   "@request.auth.id != \"\" && (@request.auth.role = \"admin\" || resident = @request.auth.id)",
    "viewRule":   "@request.auth.id != \"\" && (@request.auth.role = \"admin\" || resident = @request.auth.id)",
    "createRule": "@request.auth.id != \"\"",
    "updateRule": "@request.auth.id != \"\" && (@request.auth.role = \"admin\" || resident = @request.auth.id)",
    "deleteRule": "@request.auth.role = \"admin\""
  }'
```

## 2. Prepare the DOCX template

On your local Mac:
```bash
# Convert .doc to .docx using LibreOffice
/Applications/LibreOffice.app/Contents/MacOS/soffice --headless --convert-to docx \
  "/Users/drrubanesmohan/Downloads/ФГОС ВО/310802_Индивидуальный план_М.В. Петрова 2026.doc" \
  --outdir /tmp/
```

Then open the resulting .docx in Word and replace the fillable fields with:
- `{{full_name}}`, `{{specialty}}`, `{{department}}`, `{{supervisor_name}}`, `{{dept_head}}`
- `{{enrollment_date}}`, `{{enrollment_order}}`, `{{expulsion_date}}`, `{{expulsion_order}}`
- `{{att1_date}}`, `{{att1_protocol}}`, `{{att2_date}}`, `{{att2_protocol}}`
- Grades: `{{anesthesiology_grade}}`, `{{emergency_grade}}`, `{{it_grade}}`, `{{pedagogy_grade}}`, `{{public_health_grade}}`, `{{electives_grade}}`, `{{faculty_grade}}`
- Practice months: `{{p1m1_workplace}}` through `{{p2m11_procedures}}`
  - Pattern: `{{pYmM_field}}` where Y=year(1-2), M=month(1-11), field = workplace/diagnosis/patients/duty_place/duty_dates/procedures
- Research: `{{research_topic}}`, `{{research_passed}}`, `{{research_date}}`
- Publications: `{{pub1_title}}`, `{{pub1_coauthors}}`, `{{pub1_publisher}}`, `{{pub1_year}}` (up to pub10)
- Conf talks: `{{talk1_topic}}`, `{{talk1_date}}`, `{{talk1_place}}` (up to talk10)
- Conf attendance: `{{att1_topic}}`, `{{att1_date}}`, `{{att1_place}}` (up to att10)

Save as `template.docx`.

## 3. Upload template and service to VPS

```bash
# Copy files to VPS
scp /tmp/template.docx root@104.171.128.203:/root/docgen/template.docx
scp anesthesia-app/docgen/index.js root@104.171.128.203:/root/docgen/index.js
scp anesthesia-app/docgen/package.json root@104.171.128.203:/root/docgen/package.json
```

## 4. Install and start the service on VPS

SSH into VPS:
```bash
cd /root/docgen
npm install

# Test run
node index.js &

# Test health
curl http://localhost:3001/health

# Install as systemd service
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
systemctl start docgen
systemctl status docgen
```

## 5. Add gen.ordinemmed.ru to Cloudflare Tunnel

```bash
# Update tunnel config to add docgen service
cat > /etc/cloudflared/config.yml << 'EOF'
tunnel: 50e1ec96-764a-47b5-a136-cad8e0589c81
credentials-file: /root/.cloudflared/50e1ec96-764a-47b5-a136-cad8e0589c81.json

ingress:
  - hostname: api.ordinemmed.ru
    service: http://localhost:8090
  - hostname: gen.ordinemmed.ru
    service: http://localhost:3001
  - service: http_status:404
EOF

systemctl restart cloudflared
```

Then in Cloudflare DNS (dashboard.cloudflare.com → ordinemmed.ru → DNS):
- Add CNAME: `gen` → `50e1ec96-764a-47b5-a136-cad8e0589c81.cfargotunnel.com` (proxied)

## 6. Save Yandex token in the app

1. Log in as admin at ordinemmed.ru
2. Go to Manage → Settings tab
3. Paste the Yandex token and save

## 7. Yandex Disk folder

The service uploads to `/Ordinem/Планы/` on Yandex Disk.
Create this folder manually in Yandex Disk (or it will be auto-created on first upload).
