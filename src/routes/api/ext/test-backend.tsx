import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

export const Route = createFileRoute('/api/ext/test-backend')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const randomHex = () => Math.floor(Math.random() * 65536).toString(16).padStart(4, '0').toUpperCase();
          const testKey = `MR-${randomHex()}-${randomHex()}-${randomHex()}`;
          
          const insertResult = await supabaseAdmin.from("licencas").insert({
            license_key: testKey,
            user_name: "Homologador E2E",
            status: "active",
            max_devices: 1,
            expires_at: new Date(Date.now() + 86400000).toISOString()
          } as any).select().single();

          if (insertResult.error) {
             return new Response(JSON.stringify({ error: insertResult.error, step: 'insert' }, null, 2));
          }

          const license = insertResult.data as any;
          const tests = [{ name: "Criação de Licença", ok: true }];

          // Validar
          const vReq = await fetch('http://localhost:8080/api/ext/validate-license', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ license_key: testKey, hwid: 'HWID-001' })
          });
          const v1 = await vReq.json();
          tests.push({ name: "Validação HWID 1", ok: v1.ok === true });

          // Heartbeat
          const hReq = await fetch('http://localhost:8080/api/ext/heartbeat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ license_key: testKey, hwid: 'HWID-001' })
          });
          const h1 = await hReq.json();
          tests.push({ name: "Heartbeat", ok: h1.ok === true });

          // Cleanup
          await supabaseAdmin.from("licencas").delete().eq("id", license.id);
          
          return new Response(JSON.stringify({ tests, allOk: tests.every(t => t.ok) }, null, 2));

        } catch (err: any) {
          return new Response(JSON.stringify({ 
            error: err.message || String(err),
            stack: err.stack 
          }, null, 2));
        }
      }
    }
  }
});
