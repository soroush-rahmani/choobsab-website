#!/bin/bash
echo "=== TIME NOW ==="
date -u
echo "=== NPM LOG TAIL ==="
tail -20 /root/npm-install.log 2>/dev/null
echo "=== LOG MTIME ==="
stat -c '%y' /root/npm-install.log 2>/dev/null
echo "=== PACKAGE COUNT ==="
ls /var/www/choobsab/backend/node_modules 2>/dev/null | wc -l
echo "=== RUNNING NPM/NODE PROCESSES ==="
ps -eo pid,etime,cmd | grep -E 'npm install|timeout' | grep -v grep || echo "NONE"
echo "=== APP CHECK ==="
curl -s -o /dev/null -m 5 -w 'APP5000 HTTP %{http_code}\n' http://127.0.0.1:5000/ || echo "APP DOWN"