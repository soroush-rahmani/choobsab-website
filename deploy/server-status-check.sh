#!/bin/bash
echo "PM2: $(pm2 -v 2>/dev/null || echo NOT-INSTALLED)"
echo "BACKEND-PACKAGES: $(ls /var/www/choobsab/backend/node_modules 2>/dev/null | wc -l)"
if [ -d /var/www/choobsab/backend/node_modules/express ]; then echo "EXPRESS: YES"; else echo "EXPRESS: NO"; fi
if [ -d /var/www/choobsab/backend/node_modules/better-sqlite3 ]; then echo "SQLITE: YES"; else echo "SQLITE: NO"; fi
echo "APP-HTTP: $(curl -s -o /dev/null -m 4 -w '%{http_code}' http://127.0.0.1:5000/ 2>/dev/null)"
pgrep -af 'npm install' | grep -v pgrep || echo "NO-ACTIVE-NPM-PROCESS"
