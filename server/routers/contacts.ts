import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { contacts } from "../../drizzle/schema";
import { eq, and, like, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const contactsRouter = router({
  list: protectedProcedure
    .input(z.object({ 
      workspaceId: z.string(),
      search: z.string().optional()
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      
      const filters = [eq(contacts.workspaceId, input.workspaceId)];
      if (input.search) {
        filters.push(or(
          like(contacts.name, `%${input.search}%`),
          like(contacts.number, `%${input.search}%`)
        ));
      }
      
      return await db.select().from(contacts).where(and(...filters));
    }),

  create: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      name: z.string().optional(),
      number: z.string().min(8),
      email: z.string().email().optional(),
      tags: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db.insert(contacts).values({
        workspaceId: input.workspaceId,
        name: input.name || null,
        number: input.number,
        email: input.email || null,
        tags: input.tags || null,
      });

      return { success: true };
    }),

  import: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      contacts: z.array(z.object({
        name: z.string().optional(),
        number: z.string().min(8),
      }))
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const values = input.contacts.map(c => ({
        workspaceId: input.workspaceId,
        name: c.name || null,
        number: c.number,
      }));

      // In a real scenario, we might want to batch this or use onDuplicateKeyUpdate
      for (const val of values) {
        await db.insert(contacts).values(val);
      }

      return { success: true, count: values.length };
    }),
});
