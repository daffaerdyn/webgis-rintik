import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let client: SupabaseClient;

if (!supabaseUrl || !supabaseKey) {
    if (process.env.NODE_ENV !== "production") {
        console.warn(
            "[RINTIK WebGIS] Peringatan: Variabel NEXT_PUBLIC_SUPABASE_URL atau ANON_KEY belum disetel. Menggunakan fallback client untuk build & prerendering aman."
        );
    }
    // Fallback client aman agar prerendering static Next.js tidak crash
    client = createClient(
        "https://placeholder-rintik.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder",
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        }
    );
} else {
    client = createClient(supabaseUrl, supabaseKey);
}

export const supabase = client;
