#!/bin/bash
pkill -9 -f "npm install" 2>/dev/null
pkill -9 -f "timeout 3" 2>/dev/null
sleep 1

cd /var/www/choobsab/backend || exit 1

# Force IPv4 for npm (fixes hanging on unrouted IPv6)
export NODE_OPTIONS="--dns-result-order=ipv4first"
npm config set registry https://registry.npmjs.org

# Clean slate (drop stale lockfile that may pin bad tarball URLs)
rm -rf node_modules package-lock.json

echo "=== starting npm install $(date -u) ===" > /root/npm-install2.log
timeout 420 npm install --no-fund --no-audit --fetch-retries=4 --fetch-retry-maxtimeout=45000 >> /root/npm-install2.log 2>&1
echo "EXIT-CODE: $?" >> /root/npm-install2.log
tail -6 /root/npm-install2.log
echo "=== PACKAGE COUNT: $(ls node_modules 2>/dev/null | wc -l) ==="