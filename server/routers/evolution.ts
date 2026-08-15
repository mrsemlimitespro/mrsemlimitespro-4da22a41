import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { evolutionInstances } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { ENV } from "../_core/env";
import { TRPCError } from "@trpc/server";

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 15000): Promise<Response> {
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

function getEvolutionHeaders(apiKey?: string | null) {
  const key = apiKey || ENV.evolutionApiKey;
  if (!key) {
    throw new TRPCError({ 
      code: "PRECONDITION_FAILED", 
      message: "Evolution API Key não configurada no servidor." 
    });
  }
  return {
    "Content-Type": "application/json",
    "apikey": key,
  };
}

function getEvolutionUrl(customUrl?: string | null) {
  const baseUrl = (customUrl || ENV.evolutionApiUrl || "").replace(/\/$/, "");
  if (!baseUrl) {
    throw new TRPCError({ 
      code: "PRECONDITION_FAILED", 
      message: "Evolution API URL não configurada no servidor." 
    });
  }
  return baseUrl;
}

export const evolutionRouter = router({
  list: protectedProcedure
    .input(z.object({ workspaceId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      
      const filters = [eq(evolutionInstances.userId, ctx.user.id)];
      if (input.workspaceId) {
        filters.push(eq(evolutionInstances.workspaceId, input.workspaceId));
      }
      
      const rows = await db.select().from(evolutionInstances).where(and(...filters));
      return rows.map(r => ({
        ...r,
        apiKey: r.apiKey ? "••••••••" : null,
      }));
    }),

  createInstance: protectedProcedure
    .input(z.object({
      instanceName: z.string().min(1),
      workspaceId: z.string(),
      apiUrl: z.string().optional(),
      apiKey: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const baseUrl = getEvolutionUrl(input.apiUrl);
      const headers = getEvolutionHeaders(input.apiKey);

      let qrCode: string | null = null;
      let status = "disconnected";

      try {
        const res = await fetchWithTimeout(`${baseUrl}/instance/create`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            instanceName: input.instanceName,
            qrcode: true,
            integration: "WHATSAPP-BAILEYS",
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Evolution API Error ${res.status}: ${errText}`);
        }

        const data = await res.json() as any;
        if (data?.qrcode?.base64) {
          qrCode = data.qrcode.base64;
          status = "awaiting_qr";
        } else if (data?.instance?.status === "open") {
          status = "connected";
        }
      } catch (err: any) {
        console.error("[Evolution API] Falha ao criar instância:", err);
        throw new TRPCError({ 
          code: "INTERNAL_SERVER_ERROR", 
          message: "Erro ao comunicar com a Evolution API: " + (err.message || "Timeout ou falha de rede") 
        });
      }

      await db.insert(evolutionInstances).values({
        userId: ctx.user.id,
        workspaceId: input.workspaceId,
        instanceName: input.instanceName,
        status,
        apiUrl: input.apiUrl || null,
        apiKey: input.apiKey || null,
        qrCode,
      });

      return { success: true };
    }),

  refreshInstance: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [instance] = await db.select().from(evolutionInstances).where(
        and(eq(evolutionInstances.id, input.id), eq(evolutionInstances.userId, ctx.user.id))
      );

      if (!instance) throw new TRPCError({ code: "NOT_FOUND", message: "Instância não encontrada" });

      const baseUrl = getEvolutionUrl(instance.apiUrl);
      const headers = getEvolutionHeaders(instance.apiKey);

      try {
        // 1. Check state
        const stateRes = await fetchWithTimeout(`${baseUrl}/instance/connectionState/${instance.instanceName}`, {
          method: "GET",
          headers,
        });

        let currentStatus = "disconnected";
        if (stateRes.ok) {
          const stateData = await stateRes.json() as any;
          currentStatus = stateData?.instance?.state || "disconnected";
        }

        let qrCode = null;
        if (currentStatus !== "open" && currentStatus !== "connected") {
          // 2. Try to get QR if not connected
          const qrRes = await fetchWithTimeout(`${baseUrl}/instance/connect/${instance.instanceName}`, {
            method: "GET",
            headers,
          });

          if (qrRes.ok) {
            const qrData = await qrRes.json() as any;
            if (qrData?.base64) {
              qrCode = qrData.base64;
              currentStatus = "awaiting_qr";
            }
          }
        }

        await db.update(evolutionInstances)
          .set({ status: currentStatus, qrCode })
          .where(eq(evolutionInstances.id, input.id));

        return { success: true, status: currentStatus, qrCode };
      } catch (err: any) {
        console.error("[Evolution API] Erro ao atualizar status:", err);
        throw new TRPCError({ 
          code: "INTERNAL_SERVER_ERROR", 
          message: "Falha na Evolution API: " + (err.message || "Erro desconhecido") 
        });
      }
    }),

  deleteInstance: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [instance] = await db.select().from(evolutionInstances).where(
        and(eq(evolutionInstances.id, input.id), eq(evolutionInstances.userId, ctx.user.id))
      );

      if (instance) {
        const baseUrl = getEvolutionUrl(instance.apiUrl);
        const headers = getEvolutionHeaders(instance.apiKey);
        try {
          await fetchWithTimeout(`${baseUrl}/instance/delete/${instance.instanceName}`, {
            method: "DELETE",
            headers,
          }, 5000);
        } catch (err) {
          console.warn("[Evolution API] Falha ao deletar instância remota (seguindo com delete local):", err);
        }
      }

      await db.delete(evolutionInstances).where(
        and(eq(evolutionInstances.id, input.id), eq(evolutionInstances.userId, ctx.user.id))
      );

      return { success: true };
    }),

  logoutInstance: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [instance] = await db.select().from(evolutionInstances).where(
        and(eq(evolutionInstances.id, input.id), eq(evolutionInstances.userId, ctx.user.id))
      );

      if (!instance) throw new TRPCError({ code: "NOT_FOUND", message: "Instância não encontrada" });

      const baseUrl = getEvolutionUrl(instance.apiUrl);
      const headers = getEvolutionHeaders(instance.apiKey);

      try {
        await fetchWithTimeout(`${baseUrl}/instance/logout/${instance.instanceName}`, {
          method: "DELETE",
          headers,
        });

        await db.update(evolutionInstances)
          .set({ status: "disconnected", qrCode: null })
          .where(eq(evolutionInstances.id, input.id));

        return { success: true };
      } catch (err: any) {
        throw new TRPCError({ 
          code: "INTERNAL_SERVER_ERROR", 
          message: "Falha ao desconectar: " + (err.message || "Erro remoto") 
        });
      }
    }),
});