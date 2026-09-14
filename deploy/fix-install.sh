#!/bin/bash
# Fix install script - run in background
exec > /root/install.log 2>&1

echo "=== Installing PM2 ==="
npm install -g pm2@latest
echo "PM2 version: $(pm2 --version)"

echo "=== Installing backend dependencies ==="
cd /var/www/choobsab/backend
npm install --no-fund --no-audit

echo "=== Checking node_modules count ==="
ls node_modules | wc -l

echo "=== Starting server with PM2 ==="
pm2 start deploy/ecosystem.config.js
pm2 save

echo "=== Done ==="
date
