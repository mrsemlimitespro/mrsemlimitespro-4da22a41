import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { webhooks } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const webhooksRouter = router({
  list: protectedProcedure
    .input(z.object({ 
      workspaceId: z.string()
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(webhooks).where(eq(webhooks.workspaceId, input.workspaceId));
    }),

  create: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      url: z.string().url(),
      events: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db.insert(webhooks).values({
        workspaceId: input.workspaceId,
        url: input.url,
        events: input.events?.join(",") || "all",
        status: "active",
      });

      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({
      id: z.number(),
      workspaceId: z.string()
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db.delete(webhooks).where(
        and(
          eq(webhooks.id, input.id),
          eq(webhooks.workspaceId, input.workspaceId)
        )
      );

      return { success: true };
    }),
});
