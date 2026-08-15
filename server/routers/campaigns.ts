import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { campaigns, dispatchLogs, evolutionInstances } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const campaignsRouter = router({
  list: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(campaigns)
        .where(eq(campaigns.workspaceId, input.workspaceId))
        .orderBy(desc(campaigns.createdAt));
    }),

  create: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      name: z.string(),
      message: z.string(),
      mediaUrl: z.string().optional(),
      scheduledAt: z.string().optional(), // ISO string
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db.insert(campaigns).values({
        workspaceId: input.workspaceId,
        name: input.name,
        message: input.message,
        mediaUrl: input.mediaUrl || null,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      });

      return { success: true };
    }),

  getLogs: protectedProcedure
    .input(z.object({ 
      workspaceId: z.string(),
      campaignId: z.number().optional() 
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      
      const filters = [eq(dispatchLogs.workspaceId, input.workspaceId)];
      if (input.campaignId) {
        filters.push(eq(dispatchLogs.campaignId, input.campaignId));
      }
      
      return await db.select().from(dispatchLogs)
        .where(and(...filters))
        .orderBy(desc(dispatchLogs.createdAt))
        .limit(100);
    }),

  // Smart API: Implementar rotação de instâncias para disparo
  dispatchBatch: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      campaignId: z.number(),
      numbers: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Get available instances for rotation
      const instances = await db.select().from(evolutionInstances)
        .where(and(
          eq(evolutionInstances.workspaceId, input.workspaceId),
          eq(evolutionInstances.status, "connected")
        ));

      if (instances.length === 0) {
        throw new TRPCError({ 
          code: "PRECONDITION_FAILED", 
          message: "Nenhuma instância do WhatsApp conectada neste workspace." 
        });
      }

      const campaign = (await db.select().from(campaigns).where(eq(campaigns.id, input.campaignId)).limit(1))[0];
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Campanha não encontrada" });

      // Process in batches with rotation
      let instanceIndex = 0;
      for (const number of input.numbers) {
        const instance = instances[instanceIndex % instances.length];
        
        try {
          // Log sending attempt
          await db.insert(dispatchLogs).values({
            workspaceId: input.workspaceId,
            campaignId: input.campaignId,
            instanceId: instance.id,
            contactNumber: number,
            status: "sent",
          });
          
          // In a real implementation, we would call Evolution API here
        } catch (err) {
          console.error(`Failed to send to ${number}`, err);
          await db.insert(dispatchLogs).values({
            workspaceId: input.workspaceId,
            campaignId: input.campaignId,
            instanceId: instance.id,
            contactNumber: number,
            status: "failed",
            errorMessage: err instanceof Error ? err.message : "Erro desconhecido",
          });
        }
        
        instanceIndex++;
      }

      return { success: true, processed: input.numbers.length };
    })
});
