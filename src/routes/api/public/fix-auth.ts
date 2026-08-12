import { createFileRoute } from '@tanstack/react-router'
import { supabaseAdmin } from '@/integrations/supabase/client.server'

export const Route = createFileRoute('/api/public/fix-auth')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const email = 'rogeriocftv.mr@gmail.com';
          const password = 'ResetNeeded2026!';
          
          const { data: list } = await supabaseAdmin.auth.admin.listUsers();
          const existing = list?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
          
          let userId: string;
          if (existing) {
            userId = existing.id;
            await supabaseAdmin.auth.admin.updateUserById(userId, {
              password,
              email_confirm: true
            });
          } else {
            const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
              email,
              password,
              email_confirm: true
            });
            if (createErr) throw createErr;
            userId = created.user.id;
          }
          
          // Garante role admin
          await supabaseAdmin.from('user_roles').upsert({
            user_id: userId,
            role: 'admin'
          }, { onConflict: 'user_id, role' });
          
          return new Response(JSON.stringify({ ok: true, userId }), {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (e: any) {
          return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500 });
        }
      }
    }
  }
})
