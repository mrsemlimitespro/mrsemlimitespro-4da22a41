import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Workspaces table for multi-tenant companies / personal spaces.
 */
export const workspaces = mysqlTable("workspaces", {
  id: varchar("id", { length: 36 }).primaryKey(),
  ownerId: varchar("owner_id", { length: 64 }).notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  type: varchar("type", { length: 32 }).default("personal"),
  metadata: text("metadata"), 
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Workspace = typeof workspaces.$inferSelect;
export type InsertWorkspace = typeof workspaces.$inferInsert;

/**
 * Workspace members table for role-based access control within a workspace.
 */
export const workspaceMembers = mysqlTable("workspace_members", {
  id: varchar("id", { length: 36 }).primaryKey(),
  workspaceId: varchar("workspace_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 64 }).notNull(),
  role: varchar("role", { length: 32 }).notNull(),
  status: varchar("status", { length: 32 }).default("active"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type InsertWorkspaceMember = typeof workspaceMembers.$inferInsert;

/**
 * Evolution API Instances table for real WhatsApp connections.
 */
export const evolutionInstances = mysqlTable("evolution_instances", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  workspaceId: varchar("workspaceId", { length: 36 }),
  instanceName: varchar("instanceName", { length: 128 }).notNull(),
  status: varchar("status", { length: 64 }).default("disconnected").notNull(),
  phone: varchar("phone", { length: 64 }),
  battery: varchar("battery", { length: 16 }).default("-"),
  qrCode: text("qrCode"),
  apiUrl: text("apiUrl"),
  apiKey: text("apiKey"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EvolutionInstance = typeof evolutionInstances.$inferSelect;
export type InsertEvolutionInstance = typeof evolutionInstances.$inferInsert;
