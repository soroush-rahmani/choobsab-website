#!/bin/bash
echo "=== npmjs.org full tarball download test ==="
curl -4 -L -s -o /tmp/e1.tgz -m 30 -w 'code=%{http_code} bytes=%{size_download} speed=%{speed_download}Bps time=%{time_total}s\n' https://registry.npmjs.org/express/-/express-4.21.1.tgz 2>&1 || echo "NPMJS TARBALL FAIL"
ls -la /tmp/e1.tgz 2>/dev/null

echo "=== npmmirror full tarball download test (follow redirect) ==="
curl -4 -L -s -o /tmp/e2.tgz -m 30 -w 'code=%{http_code} bytes=%{size_download} speed=%{speed_download}Bps time=%{time_total}s\n' https://registry.npmmirror.com/express/-/express-4.21.1.tgz 2>&1 || echo "NPMIRROR TARBALL FAIL"
ls -la /tmp/e2.tgz 2>/dev/null

echo "=== WHERE does npmmirror redirect to? ==="
curl -4 -sIL -m 15 https://registry.npmmirror.com/express/-/express-4.21.1.tgz 2>/dev/null | grep -iE 'HTTP/|location:' | head -5

echo "=== npm debug: try installing ONE tiny package, 60s timeout ==="
cd /tmp && timeout 60 npm install express@4.21.1 --no-save --no-fund --no-audit --registry=https://registry.npmmirror.com 2>&1 | tail -6
echo "NPM-EXIT: $?"