import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { workspaces, workspaceMembers } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const workspacesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    
    // Get workspaces where user is a member
    const userWorkspaces = await db
      .select({
        workspace: workspaces,
      })
      .from(workspaces)
      .innerJoin(workspaceMembers, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(
        and(
          eq(workspaceMembers.userId, ctx.user.openId),
          eq(workspaceMembers.status, "active")
        )
      );

    return userWorkspaces.map(row => row.workspace);
  }),

  create: protectedProcedure
    .input(z.object({ 
      name: z.string().min(1),
      type: z.enum(["personal", "business"]).default("personal")
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Math.random().toString(36).substring(2, 5);
      
      const [newWorkspace] = await db.insert(workspaces).values({
        ownerId: ctx.user.openId,
        name: input.name,
        slug,
        type: input.type,
      }).$returningId();

      await db.insert(workspaceMembers).values({
        workspaceId: newWorkspace.id,
        userId: ctx.user.openId,
        role: "owner",
        status: "active",
      });

      return { success: true, workspaceId: newWorkspace.id };
    }),

  ensureInitial: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    // Check if user has any workspace
    const existing = await db
      .select()
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userId, ctx.user.openId))
      .limit(1);

    if (existing.length > 0) {
      return { success: true, created: false };
    }

    // Create personal workspace
    const name = ctx.user.name || "Meu Workspace";
    const slug = `personal-${ctx.user.openId.substring(0, 8)}`;
    
    try {
      const workspaceId = crypto.randomUUID();
      await db.insert(workspaces).values({
        id: workspaceId,
        ownerId: ctx.user.openId,
        name,
        slug,
        type: "personal",
      });

      await db.insert(workspaceMembers).values({
        workspaceId,
        userId: ctx.user.openId,
        role: "owner",
        status: "active",
      });

      return { success: true, created: true, workspaceId };
    } catch (error) {
      console.error("[Workspaces] Failed to create initial workspace:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create workspace" });
    }
  }),
});
