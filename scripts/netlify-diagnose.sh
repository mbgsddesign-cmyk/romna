#!/bin/bash

echo "🔍 ROMNA Netlify Diagnostic"

echo "1️⃣ Checking Next build..."
npm run build || exit 1

echo "2️⃣ Checking required files..."
test -f netlify.toml || echo "❌ netlify.toml missing"
test -d .next || echo "❌ .next directory missing"

echo "3️⃣ Checking plugin..."
npm ls @netlify/plugin-nextjs || echo "❌ plugin missing"

echo "4️⃣ Checking common SSR issues..."
grep -R "window\." src && echo "⚠️ window used outside useEffect"
grep -R "document\." src && echo "⚠️ document used outside useEffect"

echo "5️⃣ Checking env leakage..."
grep -R "process.env" src | grep -v NEXT_PUBLIC && echo "⚠️ server env used in client"

echo "✅ Diagnostic complete"
