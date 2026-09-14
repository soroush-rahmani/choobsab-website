#!/bin/bash
# ==========================================================
#  Choobsab Startup Script - for ParsPack "Startup Script" field
#  OS: Ubuntu 24.04 LTS
#  This script runs automatically on first boot and:
#    1) updates the system
#    2) installs Node.js 22 + Git + Nginx + PM2
#    3) clones the project from GitHub into /var/www/choobsab
#    4) starts the server with PM2 (persistent + starts on reboot)
#    5) configures the firewall (ufw) and Nginx
#  Install log:  cat /root/choobsab-setup.log
# ==========================================================

exec > /root/choobsab-setup.log 2>&1
set -x

echo "==== [1/7] System update ===="
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y curl ca-certificates gnupg git nginx build-essential python3

echo "==== [2/7] Installing Node.js 22 ===="
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
node -v   # must be v22.x

echo "==== [3/7] Installing PM2 ===="
npm install -g pm2

echo "==== [4/7] Cloning project from GitHub ===="
rm -rf /var/www/choobsab
git clone https://github.com/soroush-rahmani/choobsab-website.git /var/www/choobsab
cd /var/www/choobsab/backend
npm install

echo "==== [5/7] Creating .env config ===="
# NOTE: fill this file later with real values (ZarinPal + MeliPayamak):
if [ ! -f .env ]; then
  cp .env.example .env
fi

echo "==== [6/7] Starting server with PM2 ===="
cd /var/www/choobsab
pm2 start deploy/ecosystem.config.js
pm2 startup systemd -u root --hp /root >/dev/null 2>&1
pm2 save

echo "==== [7/7] Firewall + Nginx ===="
# Firewall - order matters: SSH first (to avoid lockout), then Nginx
ufw allow OpenSSH
ufw allow 'Nginx Full'
echo "y" | ufw enable

# Nginx - use catch-all server_name (_) so the site works via IP too;
# after DNS is set, replace _ with the real domain (or let certbot handle it)
cp /var/www/choobsab/deploy/nginx-choobsab.conf /etc/nginx/sites-available/choobsab
sed -i 's/YOUR-DOMAIN.com www.YOUR-DOMAIN.com/_/g' /etc/nginx/sites-available/choobsab
ln -sf /etc/nginx/sites-available/choobsab /etc/nginx/sites-enabled/choobsab
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "======================================"
echo "OK - installation complete! Server is up:"
echo "   -> http://YOUR-SERVER-IP/"
echo "   -> Admin panel: http://YOUR-SERVER-IP/admin/login.html"
echo "Remaining manual steps:"
echo "   1) Upload database:  /var/www/choobsab/backend/choobsab.db"
echo "   2) Upload product images: /var/www/choobsab/assets/uploads/products/"
echo "   3) Fill .env (ZarinPal + MeliPayamak) then run:  pm2 restart choobsab"
echo "   4) Change the default admin password (admin123)!"
echo "======================================"
