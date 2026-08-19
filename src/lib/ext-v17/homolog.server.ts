import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Script de homologação para o backend da extensão MR Sem Limites.
 */
export async function runHomologation() {
  const tests = [];
  const SIGLA = "TEST";
  
  // 1. Criar licença de teste
  const randomHex = () => Math.floor(Math.random() * 65536).toString(16).padStart(4, '0').toUpperCase();
  const testKey = `MR-${randomHex()}-${randomHex()}-${randomHex()}`;
  
  try {
    const { data: license, error: licError } = await supabaseAdmin.from("licencas").insert({
      license_key: testKey,
      user_name: "Homologador E2E",
      status: "active",
      max_devices: 1,
      expires_at: new Date(Date.now() + 86400000).toISOString()
    } as any).select().single();

    if (licError) throw licError;
    tests.push({ name: "Criação de Licença", ok: true });

    // 2. Testar Validação (HWID 1)
    const v1 = await (await fetch('http://localhost:8080/api/ext/validate-license', {
      method: 'POST',
      body: JSON.stringify({ license_key: testKey, hwid: 'HWID-001' })
    })).json();
    tests.push({ name: "Validação HWID 1", ok: v1.ok === true });

    // 3. Testar Limite HWID (HWID 2 deve falhar)
    const v2 = await (await fetch('http://localhost:8080/api/ext/validate-license', {
      method: 'POST',
      body: JSON.stringify({ license_key: testKey, hwid: 'HWID-002' })
    })).json();
    tests.push({ name: "Limite HWID (Deve falhar)", ok: v2.ok === false && v2.error === 'hwid_limit_reached' });

    // 4. Testar Heartbeat
    const h1 = await (await fetch('http://localhost:8080/api/ext/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ license_key: testKey, hwid: 'HWID-001' })
    })).json();
    tests.push({ name: "Heartbeat", ok: h1.ok === true });

    // Cleanup
    await supabaseAdmin.from("licencas").delete().eq("id", license.id);
    
    return { tests, allOk: tests.every(t => t.ok) };
  } catch (err) {
    console.error("Erro na homologação:", err);
    return { error: String(err), tests };
  }
}
