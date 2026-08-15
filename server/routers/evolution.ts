import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { evolutionInstances } from "../../../drizzle/schema";
import { eq, and } from "drizzle-orm";

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

import { workspaces } from "../../../drizzle/schema";

export const evolutionRouter = router({
  listWorkspaces: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select().from(workspaces).where(eq(workspaces.userId, ctx.user.id));
    if (rows.length === 0) {
      // Criar workspace padrão se não existir
      const defaultWs = { userId: ctx.user.id, name: "Workspace Principal", slug: "workspace-principal" };
      await db.insert(workspaces).values(defaultWs);
      const newRows = await db.select().from(workspaces).where(eq(workspaces.userId, ctx.user.id));
      return newRows;
    }
    return rows;
  }),

  createWorkspace: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      await db.insert(workspaces).values({
        userId: ctx.user.id,
        name: input.name,
        slug,
      });
      return { success: true };
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select().from(evolutionInstances).where(eq(evolutionInstances.userId, ctx.user.id));
    // Omitir ou mascarar apiKey para segurança no cliente
    return rows.map(r => ({
      ...r,
      apiKey: r.apiKey ? "••••••••" : null,
    }));
  }),

  createInstance: protectedProcedure
    .input(z.object({
      instanceName: z.string().min(1),
      apiUrl: z.string().optional(),
      apiKey: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      let qrCode: string | null = null;
      let status = "disconnected";

      if (input.apiUrl && input.apiKey) {
        try {
          const res = await fetchWithTimeout(`${input.apiUrl.replace(/\/$/, "")}/instance/create`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": input.apiKey,
            },
            body: JSON.stringify({
              instanceName: input.instanceName,
              qrcode: true,
              integration: "WHATSAPP-BAILEYS",
            }),
          }, 10000);

          if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Evolution API HTTP ${res.status}: ${errText}`);
          }

          const data = await res.json() as any;
          if (data?.qrcode?.base64) {
            qrCode = data.qrcode.base64;
            status = "Aguardando QR";
          }
        } catch (err: any) {
          console.error("[Evolution API] Falha ao criar instância remotamente:", err);
          throw new Error("Erro ao comunicar com a Evolution API: " + (err.message || "Timeout ou falha de rede"));
        }
      }

      await db.insert(evolutionInstances).values({
        userId: ctx.user.id,
        instanceName: input.instanceName,
        status,
        apiUrl: input.apiUrl || null,
        apiKey: input.apiKey || null,
        qrCode,
      });

      return { success: true };
    }),

  deleteInstance: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const [instance] = await db.select().from(evolutionInstances).where(
        and(eq(evolutionInstances.id, input.id), eq(evolutionInstances.userId, ctx.user.id))
      );

      if (instance && instance.apiUrl && instance.apiKey) {
        try {
          await fetchWithTimeout(`${instance.apiUrl.replace(/\/$/, "")}/instance/logout/${instance.instanceName}`, {
            method: "DELETE",
            headers: {
              "apikey": instance.apiKey,
            },
          }, 8000);
        } catch (err) {
          console.warn("[Evolution API] Aviso ao executar logout remoto (continuando remoção local):", err);
        }
      }

      await db.delete(evolutionInstances).where(
        and(eq(evolutionInstances.id, input.id), eq(evolutionInstances.userId, ctx.user.id))
      );

      return { success: true };
    }),

  refreshInstance: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const [instance] = await db.select().from(evolutionInstances).where(
        and(eq(evolutionInstances.id, input.id), eq(evolutionInstances.userId, ctx.user.id))
      );

      if (!instance || !instance.apiUrl || !instance.apiKey) {
        throw new Error("Instância não encontrada ou sem credenciais da Evolution API configuradas.");
      }

      try {
        const statusRes = await fetchWithTimeout(`${instance.apiUrl.replace(/\/$/, "")}/instance/connectionState/${instance.instanceName}`, {
          method: "GET",
          headers: {
            "apikey": instance.apiKey,
          },
        }, 8000);

        if (!statusRes.ok) {
          throw new Error(`Erro HTTP ${statusRes.status} ao consultar status`);
        }

        const statusData = await statusRes.json() as any;
        const currentStatus = statusData?.instance?.state || "connected";

        let qrCode = instance.qrCode;
        if (currentStatus !== "connected") {
          const qrRes = await fetchWithTimeout(`${instance.apiUrl.replace(/\/$/, "")}/instance/connect/${instance.instanceName}`, {
            method: "GET",
            headers: {
              "apikey": instance.apiKey,
            },
          }, 8000);

          if (qrRes.ok) {
            const qrData = await qrRes.json() as any;
            if (qrData?.base64) {
              qrCode = qrData.base64;
            }
          }
        } else {
          qrCode = null;
        }

        await db.update(evolutionInstances)
          .set({ status: currentStatus, qrCode })
          .where(eq(evolutionInstances.id, input.id));

        return { success: true, status: currentStatus, qrCode };
      } catch (err: any) {
        console.error("[Evolution API] Erro ao atualizar status da instância:", err);
        throw new Error("Falha ao comunicar com a Evolution API: " + (err.message || "Erro desconhecido"));
      }
    }),
});
