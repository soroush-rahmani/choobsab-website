#!/bin/bash
# Kill everything old
pkill -9 -f "npm install" 2>/dev/null
pkill -9 -f "timeout 4" 2>/dev/null
pkill -9 -f "remote-install" 2>/dev/null
sleep 2

cd /var/www/choobsab/backend || exit 1

export NODE_OPTIONS="--dns-result-order=ipv4first"
npm config set registry https://registry.npmjs.org

rm -rf node_modules package-lock.json

echo "=== fresh install start $(date -u) ===" > /root/npm3.log
timeout 300 npm install --no-fund --no-audit --fetch-retries=3 --fetch-retry-maxtimeout=40000 >> /root/npm3.log 2>&1
echo "EXIT-CODE: $?" >> /root/npm3.log

echo "=== TAIL ==="
tail -5 /root/npm3.log
echo "=== PKG COUNT: $(ls node_modules 2>/dev/null | wc -l) ==="
if [ -d node_modules/express ]; then echo "EXPRESS: OK"; else echo "EXPRESS: MISSING"; fi
if [ -d node_modules/better-sqlite3 ]; then echo "SQLITE: OK"; else echo "SQLITE: MISSING"; fi