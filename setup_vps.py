import urllib.request, subprocess, os

DIST_URL = "https://github.com/drrubanesmohan-spec/anaesthesia-residency-app/releases/download/vps-deploy/dist.tar.gz"
WEBROOT = "/var/www/ordinemmed"

def run(cmd):
    print(">>>", cmd)
    subprocess.run(cmd, shell=True)

print("=== Step 1: Install nginx + certbot ===")
run("apt-get update -qq")
run("apt-get install -y nginx certbot python3-certbot-nginx")

print("=== Step 2: Download app ===")
os.makedirs(WEBROOT, exist_ok=True)
urllib.request.urlretrieve(DIST_URL, "/tmp/dist.tar.gz")
run("tar -xzf /tmp/dist.tar.gz -C " + WEBROOT)
print("Files extracted.")

print("=== Step 3: Configure nginx ===")
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
run("nginx -t")
run("systemctl restart nginx")
run("systemctl enable nginx")
print("Nginx ready.")

print("=== Step 4: SSL certificate ===")
run("certbot --nginx -d ordinemmed.ru -d www.ordinemmed.ru --non-interactive --agree-tos -m admin@ordinemmed.ru --redirect")

print("\n=== ALL DONE ===")
print("nginx is serving the app on port 80/443.")
print("Now in Cloudflare DNS:")
print("  1. Remove Worker custom domains for ordinemmed.ru and www")
print("  2. Add A record: ordinemmed.ru -> 104.171.128.203  (proxy OFF)")
print("  3. Add A record: www -> 104.171.128.203  (proxy OFF)")
