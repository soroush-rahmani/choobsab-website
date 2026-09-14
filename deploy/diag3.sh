#!/bin/bash
echo "=== NPM4 LOG (tail 6) ==="
tail -6 /root/npm4.log 2>/dev/null
echo "=== NPM RUN LOG ==="
cat /root/npm4-run.log 2>/dev/null | tail -6
echo "=== PKG COUNT ==="
ls /var/www/choobsab/backend/node_modules 2>/dev/null | wc -l
echo "=== NPM CACHE SIZE ==="
du -sh /root/.npm/_cacache 2>/dev/null
echo "=== NPM/NODE PROCESSES ==="
ps -eo pid,etime,cmd | grep -E 'node|npm' | grep -v grep | grep -v 'ss -tpn' | head -8
echo "=== LISTENING PORTS ==="
ss -tln 2>/dev/null | grep -E ':80 |:443 |:5000 ' || echo "NONE"
echo "=== DISK ==="
df -h / | tail -1
echo "=== MEM ==="
free -m | head -2