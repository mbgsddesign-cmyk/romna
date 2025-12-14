
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '..');
const API_DIR = path.join(PROJECT_ROOT, 'src/app/api');
const ITEM_TEMP_DIR = path.join(PROJECT_ROOT, 'src/app/_api_temp');
const AUTH_DIR = path.join(PROJECT_ROOT, 'src/app/auth');
const AUTH_TEMP_DIR = path.join(PROJECT_ROOT, 'src/app/_auth_temp');
const NETLIFY_DIR = path.join(PROJECT_ROOT, 'netlify');
const OUT_DIR = path.join(PROJECT_ROOT, 'out');

function run(command: string) {
    console.log(`> ${command}`);
    execSync(command, { stdio: 'inherit', cwd: PROJECT_ROOT });
}

function safeRename(oldPath: string, newPath: string) {
    if (fs.existsSync(oldPath)) {
        console.log(`Moving ${path.basename(oldPath)} -> ${path.basename(newPath)}`);
        fs.renameSync(oldPath, newPath);
    }
}

async function build() {
    try {
        console.log("🚀 Starting Netlify Build...");

        // 1. Hide Dynamic Routes
        safeRename(API_DIR, ITEM_TEMP_DIR);
        safeRename(AUTH_DIR, AUTH_TEMP_DIR);

        // 2. Build via Next.js
        console.log("🔨 Building Static Export...");
        run('NETLIFY_EXPORT=true npm run build');

        // 3. Move Output
        if (fs.existsSync(NETLIFY_DIR)) {
            fs.rmSync(NETLIFY_DIR, { recursive: true, force: true });
        }
        if (fs.existsSync(OUT_DIR)) {
            fs.renameSync(OUT_DIR, NETLIFY_DIR);
            console.log(`✅ Build saved to: ${NETLIFY_DIR}`);
        } else {
            console.error("❌ Build failed: 'out' directory not found.");
        }

    } catch (error) {
        console.error("❌ Build Error:", error);
    } finally {
        // 4. Restore Dynamic Routes (ALWAYS)
        console.log("🧹 Restoring project structure...");
        safeRename(ITEM_TEMP_DIR, API_DIR);
        safeRename(AUTH_TEMP_DIR, AUTH_DIR);
    }
}

build();
