#!/bin/bash
set -e

# 1. Backup API routes (because Next.js static export fails with dynamic API routes)
if [ -d "src/app/api" ]; then
  mv src/app/api ./api_backup
  echo "Temporarily moved src/app/api to ./api_backup"
fi
if [ -d "src/app/auth/callback" ]; then
  mv src/app/auth/callback ./auth_callback_backup
  echo "Temporarily moved src/app/auth/callback"
fi
if [ -d "src/app/auth/repair" ]; then
  mv src/app/auth/repair ./auth_repair_backup
  echo "Temporarily moved src/app/auth/repair"
fi
# Fix for reset-password using cookies
if [ -d "src/app/auth/reset-password" ]; then
  mv src/app/auth/reset-password ./auth_reset_password_backup
  echo "Temporarily moved src/app/auth/reset-password"
fi

# Function to restore API folder on exit/error
cleanup() {
  if [ -d "./api_backup" ]; then
    rm -rf src/app/api
    mv ./api_backup src/app/api
    echo "Restored src/app/api"
  fi
  if [ -d "./auth_callback_backup" ]; then
    rm -rf src/app/auth/callback
    mv ./auth_callback_backup src/app/auth/callback
    echo "Restored src/app/auth/callback"
  fi
  if [ -d "./auth_repair_backup" ]; then
    rm -rf src/app/auth/repair
    mv ./auth_repair_backup src/app/auth/repair
    echo "Restored src/app/auth/repair"
  fi
  if [ -d "./auth_reset_password_backup" ]; then
    rm -rf src/app/auth/reset-password
    mv ./auth_reset_password_backup src/app/auth/reset-password
    echo "Restored src/app/auth/reset-password"
  fi
}
trap cleanup EXIT

# 2. Run the build
echo "Running Next.js build with static export..."
NETLIFY_EXPORT=true npm run build

# 3. Update 'netlify' folder
if [ -d "out" ]; then
  echo "Build successful. Updating 'netlify' directory..."
  rm -rf netlify/*
  cp -r out/* netlify/
  echo "Netlify directory updated."
  rm -rf out
else
  echo "Error: 'out' directory not created."
  exit 1
fi
