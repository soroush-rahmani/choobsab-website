#!/bin/bash
# No self-killing pkill here! Only kill leftover npm installs:
pkill -9 -f "npm install --no-fund" 2>/dev/null
sleep 1

cd /var/www/choobsab/backend || exit 1

export NODE_OPTIONS="--dns-result-order=ipv4first"
npm config set registry https://registry.npmjs.org

rm -rf node_modules package-lock.json
mkdir -p /var/www/choobsab/backend

echo "=== fresh install start $(date -u) ===" > /root/npm4.log
timeout 400 npm install --no-fund --no-audit --fetch-retries=3 --fetch-retry-maxtimeout=40000 >> /root/npm4.log 2>&1
echo "EXIT-CODE: $?" >> /root/npm4.log

echo "=== TAIL ==="
tail -6 /root/npm4.log
echo "=== PKG COUNT: $(ls node_modules 2>/dev/null | wc -l) ==="
if [ -d node_modules/express ]; then echo "EXPRESS: OK"; else echo "EXPRESS: MISSING"; fi
if [ -d node_modules/better-sqlite3 ]; then echo "SQLITE: OK"; else echo "SQLITE: MISSING"; fi