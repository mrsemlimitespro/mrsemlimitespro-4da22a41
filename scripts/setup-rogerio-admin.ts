import { supabaseAdmin } from "../src/integrations/supabase/client.server";

async function run() {
  const email = 'rogeriocftv.mr@gmail.com';
  // Note: Password will be set to a temporary value, user MUST reset it.
  // I will not output the password.
  const tempPassword = 'TempPassword123!'; 

  console.log(`Checking if user exists: ${email}`);
  
  const { data: list } = await supabaseAdmin.auth.admin.listUsers();
  const existing = list.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

  let userId: string;

  if (existing) {
    console.log(`User already exists (UUID: ${existing.id}). Updating password and confirming email.`);
    userId = existing.id;
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: tempPassword,
      email_confirm: true
    });
  } else {
    console.log(`Creating user: ${email}`);
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true
    });
    if (createErr) throw createErr;
    userId = created.user.id;
  }

  console.log(`Assigning 'admin' role to UUID: ${userId}`);
  const { error: roleErr } = await supabaseAdmin.from('user_roles').upsert({
    user_id: userId,
    role: 'admin'
  }, { onConflict: 'user_id, role' });

  if (roleErr) throw roleErr;
  
  console.log("SUCCESS: Rogerio is now an Admin.");
}

run().catch(console.error);
