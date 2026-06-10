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
// A rule fires when ALL of its conditions hold. Each condition matches a source
// field against a SET of values:
//   operator = "in":     holds when the field's current value is one of `values`
//   operator = "not_in": holds when the field's current value is NOT one of
//                        `values` — including when the field has no selection
//                        yet, which gives "show only when …" semantics
// action = "filter": when the rule fires, restrict thenField options to thenAllowedValues
// action = "hide":   when the rule fires, hide thenField from the request form
export const dependencyRules = sqliteTable("dependency_rules", {
  id:                integer("id").primaryKey({ autoIncrement: true }),
  conditions:        text("conditions").notNull(),          // JSON RuleCondition[] stored as text
  thenField:         text("then_field").notNull(),
  thenAllowedValues: text("then_allowed_values").notNull(), // JSON stored as text
  action:            text("action").notNull().default("filter"),
  updatedAt:         integer("updated_at", { mode: "timestamp" }).notNull(),
});

export type DependencyRuleAction = "filter" | "hide";
export type RuleConditionOperator = "in" | "not_in";

export interface RuleCondition {
  field: string;
  operator: RuleConditionOperator;
  values: string[];
}

// The conditions column holds JSON; the storage layer deserializes it.
export function ruleConditions(rule: { conditions: unknown }): RuleCondition[] {
  return Array.isArray(rule.conditions) ? (rule.conditions as RuleCondition[]) : [];
}

export const insertDependencyRuleSchema = createInsertSchema(dependencyRules).omit({
  id: true,
  updatedAt: true,
});

export type InsertDependencyRule = z.infer<typeof insertDependencyRuleSchema>;
export type DependencyRule = typeof dependencyRules.$inferSelect;

// ─── Previously Quoted (uploaded manufacturer quotes & spec sheets) ──────────
// A quote groups one or more uploaded documents (quote PDF, spec sheet, …)
// with searchable metadata so users can find prior quotes for similar trucks.
// uploadedBy is free text for now; it becomes a user reference once logins land.
export const quotes = sqliteTable("quotes", {
  id:            integer("id").primaryKey({ autoIncrement: true }),
  // Optional link to a saved chassis request. When set, the quote's metadata is
  // inherited from that request so it doesn't have to be re-entered. Nullable —
  // a quote can stand alone, and deleting a request unlinks (not deletes) it.
  requestId:     integer("request_id").references(() => chassisRequests.id, { onDelete: "set null" }),
  title:         text("title").notNull(),
  manufacturer:  text("manufacturer").notNull(),
  truckModel:    text("truck_model"),
  apparatusType: text("apparatus_type"),
  engine:        text("engine"),                      // option id, e.g. "l9"
  frontAxle:     text("front_axle"),                  // option id, e.g. "14.6k"
  rearAxle:      text("rear_axle"),                   // option id, e.g. "24k"
  quotedPrice:   text("quoted_price"),
  quoteDate:     text("quote_date"),                  // ISO date string (YYYY-MM-DD)
  notes:         text("notes"),
  uploadedBy:    text("uploaded_by"),
  createdAt:     integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt:     integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const insertQuoteSchema = createInsertSchema(quotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Quote = typeof quotes.$inferSelect;

export const quoteFiles = sqliteTable("quote_files", {
  id:           integer("id").primaryKey({ autoIncrement: true }),
  quoteId:      integer("quote_id").notNull().references(() => quotes.id, { onDelete: "cascade" }),
  fileName:     text("file_name").notNull(),          // stored name on disk (random)
  originalName: text("original_name").notNull(),      // name shown to users / on download
  mimeType:     text("mime_type").notNull(),
  fileSize:     integer("file_size").notNull(),
  createdAt:    integer("created_at", { mode: "timestamp" }).notNull(),
});

export type QuoteFile = typeof quoteFiles.$inferSelect;
export type QuoteWithFiles = Quote & { files: QuoteFile[] };

// ─── App Settings (generic key → JSON value store) ───────────────────────────
// A small key/value table for global app configuration that doesn't warrant its
// own table — e.g. the list of which form fields are required. The value column
// holds arbitrary JSON serialized as text.
export const appSettings = sqliteTable("app_settings", {
  key:       text("key").primaryKey(),
  value:     text("value").notNull(),                 // JSON stored as text
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export type AppSetting = typeof appSettings.$inferSelect;

// Settings key holding the array of required FormState field keys.
export const REQUIRED_FIELDS_KEY = "requiredFields";
