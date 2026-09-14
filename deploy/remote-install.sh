#!/bin/bash
# Kill any hung npm processes
pkill -9 -f "npm install" 2>/dev/null
pkill -9 -f "npm config set registry" 2>/dev/null
sleep 1

cd /var/www/choobsab/backend || exit 1

# Fast mirror (tested reachable)
npm config set registry https://registry.npmmirror.com

# Clean-fresh install: remove all leftovers from previous failed attempts
rm -rf node_modules package-lock.json
echo "=== starting CLEAN npm install at $(date) ===" > /root/npm-install.log
timeout 300 npm install --no-fund --no-audit --fetch-retries=3 --fetch-retry-maxtimeout=60000 >> /root/npm-install.log 2>&1
echo "EXIT-CODE: $?" >> /root/npm-install.log
tail -10 /root/npm-install.log
echo "=== PACKAGE COUNT: $(ls node_modules 2>/dev/null | wc -l) ==="