import { createClient } from "@supabase/supabase-js";

async function run() {
  const url = process.env.LEGACY_SUPABASE_URL;
  const key = process.env.LEGACY_SUPABASE_SERVICE_ROLE_KEY;
  
  console.log("URL present:", !!url);
  console.log("KEY present:", !!key);
  
  if (!url || !key) return;

  const supabase = createClient(url, key);
  const { data, error } = await supabase.from('clientes').select('count', { count: 'exact', head: true });
  console.log("Result:", { data, error });
}

run();
