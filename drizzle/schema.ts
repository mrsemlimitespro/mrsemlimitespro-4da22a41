import { int, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: varchar("role", { length: 32 }).default("user").notNull(),
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

/**
 * Contacts table for workspace-isolated lead management.
 */
export const contacts = mysqlTable("contacts", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: varchar("workspace_id", { length: 36 }).notNull(),
  name: varchar("name", { length: 255 }),
  number: varchar("number", { length: 32 }).notNull(),
  email: varchar("email", { length: 255 }),
  tags: text("tags"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

/**
 * Campaigns table for mass messaging orchestration.
 */
export const campaigns = mysqlTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: varchar("workspace_id", { length: 36 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  status: varchar("status", { length: 32 }).default("pending").notNull(),
  type: varchar("type", { length: 32 }).default("whatsapp").notNull(),
  message: text("message").notNull(),
  mediaUrl: text("media_url"),
  scheduledAt: timestamp("scheduled_at"),
  settings: text("settings"), // JSON for rotation, delays, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

/**
 * Dispatch logs for real-time tracking and auditing.
 */
export const dispatchLogs = mysqlTable("dispatch_logs", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: varchar("workspace_id", { length: 36 }).notNull(),
  campaignId: int("campaign_id"),
  instanceId: int("instance_id"),
  contactNumber: varchar("contact_number", { length: 32 }).notNull(),
  status: varchar("status", { length: 32 }).notNull(), // sent, delivered, failed
  errorMessage: text("error_message"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Webhooks for Evolution API events.
 */
export const webhooks = mysqlTable("webhooks", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: varchar("workspace_id", { length: 36 }).notNull(),
  url: text("url").notNull(),
  events: text("events"), // Comma separated events
  status: varchar("status", { length: 32 }).default("active").notNull(),
  secret: varchar("secret", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
