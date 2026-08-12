/**
 * Public access status para o PublicPackLanding.
 *
 * Retorna o estado mínimo necessário para decidir UX:
 *  - authed: usuário logado?
 *  - hasAccess: existe registro ativo em pack_access para esse email?
 *  - requiresPurchase: o pack possui um link de venda configurado
 *  - purchaseUrl: URL externa do checkout (armazenada em `sales_product_id`)
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type PackAccessStatus = {
  authed: boolean;
  hasAccess: boolean;
  requiresPurchase: boolean;
  purchaseUrl: string | null;
};

export const getPackAccessStatus = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().trim().min(1).max(160) }).parse(d))
  .handler(async ({ data }): Promise<PackAccessStatus> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: pack } = await supabaseAdmin
      .from("premium_packs")
      .select("id, sales_product_id")
      .eq("slug", data.slug)
      .maybeSingle();

    const purchaseUrl = (pack?.sales_product_id as string | null) || null;
    const requiresPurchase = Boolean(purchaseUrl);

    let authed = false;
    let email: string | null = null;
    try {
      const { getRequest } = await import("@tanstack/react-start/server");
      const req = getRequest();
      const auth = req?.headers.get("authorization");
      const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
      if (token) {
        const { data: u } = await supabaseAdmin.auth.getUser(token);
        if (u?.user?.email) {
          authed = true;
          email = u.user.email.toLowerCase();
        }
      }
    } catch {
      /* sem sessão — segue como público */
    }

    let hasAccess = false;
    if (authed && pack?.id && email) {
      const { data: row } = await supabaseAdmin
        .from("pack_access")
        .select("id")
        .eq("pack_id", pack.id)
        .eq("status", "active")
        .ilike("email", email)
        .maybeSingle();
      hasAccess = Boolean(row);
    }

    return { authed, hasAccess, requiresPurchase, purchaseUrl };
  });
