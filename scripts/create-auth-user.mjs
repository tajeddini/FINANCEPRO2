import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(new URL("../.env.local", import.meta.url));

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.AUTH_USER_EMAIL;
const password = process.env.AUTH_USER_PASSWORD;

if (!supabaseUrl || !serviceRoleKey || !email || !password) {
  throw new Error(
    "Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, AUTH_USER_EMAIL, and AUTH_USER_PASSWORD in .env.local.",
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (error) throw new Error(`Creating the Auth user failed: ${error.message}`);
if (!data.user?.id) throw new Error("Auth Admin returned no user ID.");

console.log(data.user.id);
