import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const createLicenseSchema = z.object({
  tipo: z.enum(["teste", "premium"]),
  duracao: z.enum(["1h", "1d", "3d", "30d", "60d", "110d", "1y"]),
  email: z.string().email().optional(),
  user_name: z.string().optional(),
  max_devices: z.number().default(1),
  quantidade: z.number().min(1).max(50).default(1),
  notes: z.string().optional(),
});

export const createLicenses = createServerFn({ method: "POST" })
  .validator((data: unknown) => createLicenseSchema.parse(data))
  .handler(async ({ data }) => {
    const { tipo, duracao, email, user_name, max_devices, quantidade, notes } = data;
    
    const licenses = [];
    const now = new Date();
    
    for (let i = 0; i < quantidade; i++) {
      let expiresAt: Date | null = new Date();
      let duracaoDias = 0;
      
      switch (duracao) {
        case "1h":
          expiresAt.setHours(expiresAt.getHours() + 1);
          duracaoDias = 0; // represent 1h as 0 days but with expires_at set
          break;
        case "1d":
          expiresAt.setDate(expiresAt.getDate() + 1);
          duracaoDias = 1;
          break;
        case "3d":
          expiresAt.setDate(expiresAt.getDate() + 3);
          duracaoDias = 3;
          break;
        case "30d":
          expiresAt.setDate(expiresAt.getDate() + 30);
          duracaoDias = 30;
          break;
        case "60d":
          expiresAt.setDate(expiresAt.getDate() + 60);
          duracaoDias = 60;
          break;
        case "110d":
          expiresAt.setDate(expiresAt.getDate() + 110);
          duracaoDias = 110;
          break;
        case "1y":
          expiresAt.setFullYear(expiresAt.getFullYear() + 1);
          duracaoDias = 365;
          break;
      }

      const licenseKey = `MR-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      licenses.push({
        chave: licenseKey, // legacy support
        license_key: licenseKey, // v17 support
        tipo,
        status: "ativa",
        email: email || null,
        user_name: user_name || "Cliente MR",
        expires_at: expiresAt.toISOString(),
        expira_em: expiresAt.toISOString(), // legacy support
        duracao_dias: duracaoDias,
        max_devices,
        max_dispositivos: max_devices, // legacy support
        notes: notes || null,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        metadata: {},
        fornecedor_config: {}
      });
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("licencas")
      .insert(licenses)
      .select();

    if (error) throw new Error(error.message);
    return inserted;
  });

export const adjustLicenseTime = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({
    licenseId: z.string().uuid(),
    days: z.number(),
  }).parse(data))
  .handler(async ({ data }) => {
    const { licenseId, days } = data;
    
    const { data: lic, error: fetchError } = await supabaseAdmin
      .from("licencas")
      .select("expires_at")
      .eq("id", licenseId)
      .single();
      
    if (fetchError || !lic) throw new Error("Licença não encontrada");
    
    const currentExpiry = lic.expires_at ? new Date(lic.expires_at) : new Date();
    currentExpiry.setDate(currentExpiry.getDate() + days);
    
    const { error: updateError } = await supabaseAdmin
      .from("licencas")
      .update({ 
        expires_at: currentExpiry.toISOString(),
        expira_em: currentExpiry.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", licenseId);
      
    if (updateError) throw new Error(updateError.message);
    return { success: true, newExpiry: currentExpiry.toISOString() };
  });

export const deleteLicenses = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({
    licenseIds: z.array(z.string().uuid()),
  }).parse(data))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("licencas")
      .delete()
      .in("id", data.licenseIds);
      
    if (error) throw new Error(error.message);
    return { success: true };
  });
