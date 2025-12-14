#!/usr/bin/env node
/**
 * ROMNA V6 Runtime Verification Script
 * Run: npm run verify:runtime
 */

const fs = require('fs');

const CHECKS = {
    supabaseEnv: () => {
        const required = [
            'NEXT_PUBLIC_SUPABASE_URL',
            'NEXT_PUBLIC_SUPABASE_ANON_KEY'
        ];
        const missing = required.filter(k => !process.env[k]);
        return {
            name: 'Supabase ENV',
            pass: missing.length === 0,
            details: missing.length === 0 ? 'All Supabase vars present' : `Missing: ${missing.join(', ')}`
        };
    },

    serverEnv: () => {
        // These should NOT have NEXT_PUBLIC_ prefix
        const serverOnly = ['HF_API_KEY', 'GEMINI_API_KEY'];
        const found = serverOnly.filter(k => process.env[k]);
        return {
            name: 'Server-Only ENV',
            pass: found.length > 0,
            details: found.length > 0
                ? `Found: ${found.join(', ')}`
                : 'Warning: HF_API_KEY and GEMINI_API_KEY not in Node context (check Netlify UI)'
        };
    },

    noPublicSecrets: () => {
        // These should NEVER have NEXT_PUBLIC_ prefix
        const badVars = [
            'NEXT_PUBLIC_HF_API_KEY',
            'NEXT_PUBLIC_GEMINI_API_KEY',
            'NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY'
        ].filter(k => process.env[k]);
        return {
            name: 'No Exposed Secrets',
            pass: badVars.length === 0,
            details: badVars.length === 0
                ? 'No secrets exposed in NEXT_PUBLIC_'
                : `DANGER: Exposed secrets: ${badVars.join(', ')}`
        };
    },

    netlifyPlugin: () => {
        try {
            const toml = fs.readFileSync('./netlify.toml', 'utf8');
            const hasPlugin = toml.includes('@netlify/plugin-nextjs');
            return {
                name: 'Netlify Plugin',
                pass: hasPlugin,
                details: hasPlugin ? '@netlify/plugin-nextjs configured' : 'Plugin not found'
            };
        } catch (e) {
            return { name: 'Netlify Plugin', pass: false, details: 'netlify.toml not found' };
        }
    },

    nextSSR: () => {
        try {
            const config = fs.readFileSync('./next.config.ts', 'utf8');
            const hasExport = config.includes("output: 'export'") && !config.includes('NETLIFY_EXPORT');
            return {
                name: 'Next.js SSR',
                pass: !hasExport,
                details: hasExport ? 'WARN: Static export forced' : 'SSR mode (correct)'
            };
        } catch (e) {
            return { name: 'Next.js SSR', pass: false, details: 'next.config.ts not found' };
        }
    },

    sttRoute: () => {
        const exists = fs.existsSync('./src/app/api/stt/route.ts');
        return {
            name: '/api/stt Route',
            pass: exists,
            details: exists ? 'Server-side STT route exists' : 'MISSING: /api/stt route not found'
        };
    },

    buildOutput: () => {
        const hasNextDir = fs.existsSync('./.next');
        return {
            name: 'Build Output',
            pass: hasNextDir,
            details: hasNextDir ? '.next directory exists' : 'Run npm run build first'
        };
    }
};

console.log('\n🔧 ROMNA V6 Runtime Verification\n');
console.log('='.repeat(50));

let allPass = true;
let warnings = 0;

Object.values(CHECKS).forEach(check => {
    const result = check();
    const icon = result.pass ? '✅' : (result.details.includes('Warning') ? '⚠️' : '❌');
    console.log(`${icon} ${result.name}: ${result.details}`);
    if (!result.pass && !result.details.includes('Warning')) allPass = false;
    if (result.details.includes('Warning')) warnings++;
});

console.log('='.repeat(50));

if (allPass && warnings === 0) {
    console.log('✅ All checks passed!');
} else if (allPass && warnings > 0) {
    console.log(`⚠️ Passed with ${warnings} warning(s)`);
} else {
    console.log('❌ Some checks failed');
}

console.log('\n📝 For server ENV vars, verify in Netlify UI.');
console.log('📖 See docs/NETLIFY_ENV.md for details.\n');

process.exit(allPass ? 0 : 1);
