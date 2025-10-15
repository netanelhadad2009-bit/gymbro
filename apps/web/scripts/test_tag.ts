import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import * as path from "path";

config({ path: path.resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function test() {
  console.log("Testing tag insert...");

  const tagName = "חזה";

  // Test SELECT
  console.log(`\n1. SELECT where name_he = '${tagName}'`);
  const { data: selectData, error: selectError } = await supabase
    .from('exercise_tags')
    .select('id')
    .eq('name_he', tagName)
    .maybeSingle();

  console.log("Result:", { data: selectData, error: selectError });

  // Test INSERT
  console.log(`\n2. INSERT name_he = '${tagName}'`);
  const { data: insertData, error: insertError } = await supabase
    .from('exercise_tags')
    .insert({ name_he: tagName })
    .select('id')
    .single();

  console.log("Result:", { data: insertData, error: insertError });
}

test().catch(console.error);
