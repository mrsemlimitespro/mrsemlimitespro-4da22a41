import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
// Import removed to avoid conflict with globalThis.crypto

const KeyGeneratorSchema = z.object({
  produtoSigla: z.string().min(2).max(5),
  revendedorId: z.string().uuid(),
  planoId: z.string().uuid(),
  clienteId: z.string().uuid(),
});

/**
 * Gera uma chave de licença no padrão MR CENTRAL: SIGLA-MR-XXXX-XXXX-XXXX-XXXX
 */
export const generateLicenseKey = createServerFn({ method: "POST" })
  .inputValidator((data) => KeyGeneratorSchema.parse(data))
  .handler(async ({ data }) => {
    const sb = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Gerar corpo aleatório (alta entropia)
    const segments = [];
    for (let i = 0; i < 4; i++) {
      const bytes = new Uint8Array(2);
      globalThis.crypto.getRandomValues(bytes);
      segments.push(Array.from(bytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(''));
    }
    const key = `${data.produtoSigla.toUpperCase()}-MR-${segments.join('-')}`;

    return { key };
  });
