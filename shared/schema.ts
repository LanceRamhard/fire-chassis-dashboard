import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Saved Chassis Requests ──────────────────────────────────────────────────
export const chassisRequests = sqliteTable("chassis_requests", {
  id:           integer("id").primaryKey({ autoIncrement: true }),
  configName:   text("config_name").notNull(),
  manufacturer: text("manufacturer").notNull(),
  formData:     text("form_data").notNull(),          // JSON stored as text
  createdAt:    integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt:    integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const insertChassisRequestSchema = createInsertSchema(chassisRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertChassisRequest = z.infer<typeof insertChassisRequestSchema>;
export type ChassisRequest = typeof chassisRequests.$inferSelect;

// ─── Option Configuration (per-model field whitelists) ───────────────────────
export const chassisConfigs = sqliteTable("chassis_configs", {
  id:           integer("id").primaryKey({ autoIncrement: true }),
  manufacturer: text("manufacturer").notNull(),
  modelId:      text("model_id").notNull(),
  modelLabel:   text("model_label").notNull(),
  fieldRules:   text("field_rules"),                  // JSON stored as text
  updatedAt:    integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const insertChassisConfigSchema = createInsertSchema(chassisConfigs).omit({
  id: true,
  updatedAt: true,
});

export type InsertChassisConfig = z.infer<typeof insertChassisConfigSchema>;
export type ChassisConfig = typeof chassisConfigs.$inferSelect;

// ─── Global Dropdown Options ─────────────────────────────────────────────────
export const dropdownOptions = sqliteTable("dropdown_options", {
  id:        integer("id").primaryKey({ autoIncrement: true }),
  fieldKey:  text("field_key").notNull().unique(),
  options:   text("options").notNull(),               // JSON stored as text
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const insertDropdownOptionsSchema = createInsertSchema(dropdownOptions).omit({
  id: true,
  updatedAt: true,
});

export type InsertDropdownOptions = z.infer<typeof insertDropdownOptionsSchema>;
export type DropdownOptions = typeof dropdownOptions.$inferSelect;

// ─── Dependency Rules ────────────────────────────────────────────────────────
// action = "filter": when ifField=ifValue, restrict thenField options to thenAllowedValues
// action = "hide":   when ifField=ifValue, hide thenField from the request form
export const dependencyRules = sqliteTable("dependency_rules", {
  id:                integer("id").primaryKey({ autoIncrement: true }),
  ifField:           text("if_field").notNull(),
  ifValue:           text("if_value").notNull(),
  thenField:         text("then_field").notNull(),
  thenAllowedValues: text("then_allowed_values").notNull(), // JSON stored as text
  action:            text("action").notNull().default("filter"),
  updatedAt:         integer("updated_at", { mode: "timestamp" }).notNull(),
});

export type DependencyRuleAction = "filter" | "hide";

export const insertDependencyRuleSchema = createInsertSchema(dependencyRules).omit({
  id: true,
  updatedAt: true,
});

export type InsertDependencyRule = z.infer<typeof insertDependencyRuleSchema>;
export type DependencyRule = typeof dependencyRules.$inferSelect;
