const { loadEnvConfig } = require('@next/env');
const { createClient } = require('@supabase/supabase-js');

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function runtrace() {
    console.log("--- ROMNA FORENSIC DIAGNOSIS V3 ---");

    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    console.log(`URL: ${sbUrl}`);

    if (serviceKey && serviceKey.length < 20) console.warn("Service Key looks too short/placeholder");
    if (anonKey && anonKey.length < 20) console.warn("Anon Key looks too short/placeholder");

    // Try connecting with Anon Key first (read-only if public?)
    // Actually, execution_plans needs auth.

    const keyToUse = serviceKey || anonKey;

    if (!sbUrl || !keyToUse) {
        console.error("Missing credentials.");
        return;
    }

    const supabase = createClient(sbUrl, keyToUse);

    // Try a public table or health check?
    // We'll try fetching execution_plans again.

    const { data, error } = await supabase.from('execution_plans').select('count', { count: 'exact', head: true });

    if (error) {
        console.error("Connection failed:", error);
        console.log("Details:", JSON.stringify(error, null, 2));
    } else {
        console.log("Connection SUCCESS! Found plans count:", data?.length ?? "Head response");

        // NOW fetch the data
        const { data: plans, error: pError } = await supabase.from('execution_plans').select('*').limit(5);
        if (pError) console.error("Fetch failed:", pError);
        else console.log("Sample Plan:", plans[0]);
    }
}

runtrace().catch(console.error);
