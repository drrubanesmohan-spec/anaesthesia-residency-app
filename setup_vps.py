import subprocess, os

WEBROOT = "/var/www/ordinemmed"
REPO = "https://github.com/drrubanesmohan-spec/anaesthesia-residency-app"

def run(cmd, check=True):
    print(">>>", cmd)
    r = subprocess.run(cmd, shell=True)
    if check and r.returncode != 0:
        print("FAILED:", r.returncode)
    return r.returncode == 0

print("=== Step 1: Install nginx + certbot ===")
run("apt-get update -qq")
run("apt-get install -y nginx certbot python3-certbot-nginx")

print("=== Step 2: Clone and build app ===")
run("rm -rf /tmp/app")
run(f"git clone --depth 1 {REPO} /tmp/app")
os.chdir("/tmp/app")
run("npm ci")
run("echo 'VITE_PB_URL=https://api.ordinemmed.ru' > .env.local")
run("npm run build")

print("=== Step 3: Copy to webroot ===")
os.makedirs(WEBROOT, exist_ok=True)
run(f"rm -rf {WEBROOT}/*")
run(f"cp -r /tmp/app/dist/. {WEBROOT}/")
print("Files copied.")

print("=== Step 4: Configure nginx ===")
conf = (
    "server {\n"
    "    listen 80;\n"
    "    server_name ordinemmed.ru www.ordinemmed.ru;\n"
    "    root /var/www/ordinemmed;\n"
    "    index index.html;\n"
    "    location / { try_files $uri $uri/ /index.html; }\n"
    "    location /assets/ { expires 1y; add_header Cache-Control \"public, immutable\"; }\n"
    "    gzip on;\n"
    "    gzip_types text/plain text/css application/javascript application/json image/svg+xml;\n"
    "}\n"
)
open("/etc/nginx/sites-available/ordinemmed", "w").write(conf)
run("ln -sf /etc/nginx/sites-available/ordinemmed /etc/nginx/sites-enabled/ordinemmed")
run("rm -f /etc/nginx/sites-enabled/default")
run("nginx -t && systemctl restart nginx && systemctl enable nginx")
print("Nginx ready.")

print("=== Step 5: SSL certificate ===")
run("certbot --nginx -d ordinemmed.ru -d www.ordinemmed.ru --non-interactive --agree-tos -m admin@ordinemmed.ru --redirect", check=False)

print("\n=== ALL DONE ===")
print("Nginx serving the app. Now update Cloudflare DNS:")
print("  Remove Worker custom domains for ordinemmed.ru + www")
print("  Add A record: ordinemmed.ru -> 104.171.128.203  proxy=OFF")
print("  Add A record: www          -> 104.171.128.203  proxy=OFF")
