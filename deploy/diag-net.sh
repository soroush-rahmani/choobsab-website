#!/bin/bash
echo "=== KILL HANGING NPM ==="
pkill -9 -f "npm install" 2>/dev/null
pkill -9 -f "timeout 300" 2>/dev/null
sleep 1

echo "=== IPV6 ADDRESSES ==="
ip -6 addr show 2>/dev/null | grep -E 'inet6' | grep -v fe80 || echo "NO GLOBAL IPV6"
echo "=== IPV6 PING TEST ==="
curl -6 -s -o /dev/null -m 6 -w 'IPV6-to-mirror: %{http_code} %{time_total}s\n' https://registry.npmmirror.com/pm2 2>&1 || echo "IPV6 UNREACHABLE"
echo "=== IPV4 TARBALL TEST (express) ==="
curl -4 -s -o /dev/null -m 12 -w 'IPV4-tarball: %{http_code} %{time_total}s %{size_download}B\n' https://registry.npmmirror.com/express/-/express-4.21.1.tgz 2>&1 || echo "IPV4 TARBALL FAIL"
echo "=== DEFAULT (auto) TARBALL TEST ==="
curl -s -o /dev/null -m 12 -w 'auto-tarball: %{http_code} %{time_total}s %{size_download}B\n' https://registry.npmmirror.com/express/-/express-4.21.1.tgz 2>&1 || echo "AUTO TARBALL FAIL"