import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq, desc } from "drizzle-orm";
import path from "path";
import {
  chassisRequests,   type ChassisRequest,   type InsertChassisRequest,
  chassisConfigs,    type ChassisConfig,    type InsertChassisConfig,
  dropdownOptions,   type DropdownOptions,  type InsertDropdownOptions,
  dependencyRules,   type DependencyRule,   type InsertDependencyRule,
  quotes,            type Quote,            type InsertQuote,
  quoteFiles,        type QuoteFile,        type QuoteWithFiles,
  appSettings,
} from "@shared/schema";

// ─── DB path: use DATABASE_PATH env var or <cwd>/chassis.db ──────────────────
const dbPath = process.env.DATABASE_PATH ?? path.join(process.cwd(), "chassis.db");

export const sqlite = new Database(dbPath);
export const db = drizzle(sqlite);

// Enable WAL mode for better concurrent read performance
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// ─── JSON helpers ─────────────────────────────────────────────────────────────
// SQLite stores JSON columns as text; these helpers keep the rest of the code clean.
function toJson(val: unknown): string {
  return JSON.stringify(val ?? null);
}
function fromJson<T>(val: string | null | undefined): T {
  if (!val) return null as unknown as T;
  try { return JSON.parse(val) as T; } catch { return null as unknown as T; }
}

// Deserialize a raw DB row into a ChassisRequest (formData is text → object)
function deserializeRequest(row: typeof chassisRequests.$inferSelect): ChassisRequest {
  return {
    ...row,
    formData: fromJson(row.formData as unknown as string),
  } as unknown as ChassisRequest;
}

function deserializeConfig(row: typeof chassisConfigs.$inferSelect): ChassisConfig {
  return {
    ...row,
    fieldRules: fromJson(row.fieldRules as unknown as string),
  } as unknown as ChassisConfig;
}

function deserializeDropdown(row: typeof dropdownOptions.$inferSelect): DropdownOptions {
  return {
    ...row,
    options: fromJson(row.options as unknown as string),
  } as unknown as DropdownOptions;
}

function deserializeDependency(row: typeof dependencyRules.$inferSelect): DependencyRule {
  return {
    ...row,
    conditions:        fromJson(row.conditions as unknown as string),
    thenAllowedValues: fromJson(row.thenAllowedValues as unknown as string),
  } as unknown as DependencyRule;
}

// ─── Storage interface ────────────────────────────────────────────────────────
export interface IStorage {
  // Chassis Requests
  getChassisRequests(): Promise<ChassisRequest[]>;
  getChassisRequest(id: number): Promise<ChassisRequest | undefined>;
  createChassisRequest(req: InsertChassisRequest): Promise<ChassisRequest>;
  updateChassisRequest(id: number, req: Partial<InsertChassisRequest>): Promise<ChassisRequest | undefined>;
  deleteChassisRequest(id: number): Promise<boolean>;

  // Chassis Configs
  getChassisConfigs(): Promise<ChassisConfig[]>;
  getChassisConfigsByManufacturer(manufacturer: string): Promise<ChassisConfig[]>;
  getChassisConfig(id: number): Promise<ChassisConfig | undefined>;
  upsertChassisConfig(cfg: InsertChassisConfig): Promise<ChassisConfig>;
  deleteChassisConfig(id: number): Promise<boolean>;

  // Dropdown Options
  getDropdownOptions(): Promise<DropdownOptions[]>;
  getDropdownOptionsByField(fieldKey: string): Promise<DropdownOptions | undefined>;
  upsertDropdownOptions(opts: InsertDropdownOptions): Promise<DropdownOptions>;

  // Dependency Rules
  getDependencyRules(): Promise<DependencyRule[]>;
  getDependencyRule(id: number): Promise<DependencyRule | undefined>;
  createDependencyRule(rule: InsertDependencyRule): Promise<DependencyRule>;
  updateDependencyRule(id: number, rule: Partial<InsertDependencyRule>): Promise<DependencyRule | undefined>;
  deleteDependencyRule(id: number): Promise<boolean>;

  // Quotes (uploaded manufacturer quotes & spec sheets)
  getQuotes(): Promise<QuoteWithFiles[]>;
  getQuote(id: number): Promise<QuoteWithFiles | undefined>;
  createQuote(quote: InsertQuote, files: NewQuoteFile[]): Promise<QuoteWithFiles>;
  updateQuote(id: number, quote: Partial<InsertQuote>): Promise<QuoteWithFiles | undefined>;
  addQuoteFiles(quoteId: number, files: NewQuoteFile[]): Promise<QuoteWithFiles | undefined>;
  deleteQuote(id: number): Promise<QuoteFile[] | undefined>; // returns removed files for disk cleanup
  getQuoteFile(fileId: number): Promise<QuoteFile | undefined>;
  deleteQuoteFile(fileId: number): Promise<QuoteFile | undefined>;

  // App Settings (generic key → JSON value)
  getAppSetting<T = unknown>(key: string): Promise<T | null>;
  setAppSetting<T = unknown>(key: string, value: T): Promise<T>;
}

export interface NewQuoteFile {
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
}

// ─── Database Storage ─────────────────────────────────────────────────────────
export class DatabaseStorage implements IStorage {
  // ── Chassis Requests ────────────────────────────────────────────────────────
  async getChassisRequests(): Promise<ChassisRequest[]> {
    const rows = db.select().from(chassisRequests).orderBy(desc(chassisRequests.createdAt)).all();
    return rows.map(deserializeRequest);
  }

  async getChassisRequest(id: number): Promise<ChassisRequest | undefined> {
    const row = db.select().from(chassisRequests).where(eq(chassisRequests.id, id)).get();
    return row ? deserializeRequest(row) : undefined;
  }

  async createChassisRequest(req: InsertChassisRequest): Promise<ChassisRequest> {
    const now = new Date();
    const result = db.insert(chassisRequests).values({
      configName:   req.configName,
      manufacturer: req.manufacturer,
      formData:     toJson(req.formData),
      createdAt:    now,
      updatedAt:    now,
    }).returning().get();
    return deserializeRequest(result);
  }

  async updateChassisRequest(id: number, req: Partial<InsertChassisRequest>): Promise<ChassisRequest | undefined> {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (req.configName   !== undefined) updates.configName   = req.configName;
    if (req.manufacturer !== undefined) updates.manufacturer = req.manufacturer;
    if (req.formData     !== undefined) updates.formData     = toJson(req.formData);
    const result = db.update(chassisRequests).set(updates).where(eq(chassisRequests.id, id)).returning().get();
    return result ? deserializeRequest(result) : undefined;
  }

  async deleteChassisRequest(id: number): Promise<boolean> {
    const result = db.delete(chassisRequests).where(eq(chassisRequests.id, id)).returning().get();
    return !!result;
  }

  // ── Chassis Configs ─────────────────────────────────────────────────────────
  async getChassisConfigs(): Promise<ChassisConfig[]> {
    const rows = db.select().from(chassisConfigs).all();
    return rows.map(deserializeConfig).sort((a, b) =>
      (a.manufacturer ?? "").localeCompare(b.manufacturer ?? "") ||
      (a.modelLabel ?? "").localeCompare(b.modelLabel ?? "")
    );
  }

  async getChassisConfigsByManufacturer(manufacturer: string): Promise<ChassisConfig[]> {
    const rows = db.select().from(chassisConfigs).where(eq(chassisConfigs.manufacturer, manufacturer)).all();
    return rows.map(deserializeConfig);
  }

  async getChassisConfig(id: number): Promise<ChassisConfig | undefined> {
    const row = db.select().from(chassisConfigs).where(eq(chassisConfigs.id, id)).get();
    return row ? deserializeConfig(row) : undefined;
  }

  async upsertChassisConfig(cfg: InsertChassisConfig): Promise<ChassisConfig> {
    const now = new Date();
    // Check for existing by manufacturer + modelId
    const existing = db.select().from(chassisConfigs)
      .where(eq(chassisConfigs.manufacturer, cfg.manufacturer))
      .all()
      .find(c => c.modelId === cfg.modelId);

    if (existing) {
      const result = db.update(chassisConfigs).set({
        modelLabel:  cfg.modelLabel,
        fieldRules:  toJson(cfg.fieldRules),
        updatedAt:   now,
      }).where(eq(chassisConfigs.id, existing.id)).returning().get();
      return deserializeConfig(result);
    } else {
      const result = db.insert(chassisConfigs).values({
        manufacturer: cfg.manufacturer,
        modelId:      cfg.modelId,
        modelLabel:   cfg.modelLabel,
        fieldRules:   toJson(cfg.fieldRules),
        updatedAt:    now,
      }).returning().get();
      return deserializeConfig(result);
    }
  }

  async deleteChassisConfig(id: number): Promise<boolean> {
    const result = db.delete(chassisConfigs).where(eq(chassisConfigs.id, id)).returning().get();
    return !!result;
  }

  // ── Dropdown Options ────────────────────────────────────────────────────────
  async getDropdownOptions(): Promise<DropdownOptions[]> {
    const rows = db.select().from(dropdownOptions).all();
    return rows.map(deserializeDropdown).sort((a, b) => a.fieldKey.localeCompare(b.fieldKey));
  }

  async getDropdownOptionsByField(fieldKey: string): Promise<DropdownOptions | undefined> {
    const row = db.select().from(dropdownOptions).where(eq(dropdownOptions.fieldKey, fieldKey)).get();
    return row ? deserializeDropdown(row) : undefined;
  }

  async upsertDropdownOptions(opts: InsertDropdownOptions): Promise<DropdownOptions> {
    const now = new Date();
    const existing = db.select().from(dropdownOptions).where(eq(dropdownOptions.fieldKey, opts.fieldKey)).get();
    if (existing) {
      const result = db.update(dropdownOptions).set({
        options:   toJson(opts.options),
        updatedAt: now,
      }).where(eq(dropdownOptions.fieldKey, opts.fieldKey)).returning().get();
      return deserializeDropdown(result);
    } else {
      const result = db.insert(dropdownOptions).values({
        fieldKey:  opts.fieldKey,
        options:   toJson(opts.options),
        updatedAt: now,
      }).returning().get();
      return deserializeDropdown(result);
    }
  }

  // ── Dependency Rules ────────────────────────────────────────────────────────
  async getDependencyRules(): Promise<DependencyRule[]> {
    const rows = db.select().from(dependencyRules).all();
    return rows.map(deserializeDependency).sort((a, b) =>
      JSON.stringify(a.conditions).localeCompare(JSON.stringify(b.conditions))
    );
  }

  async getDependencyRule(id: number): Promise<DependencyRule | undefined> {
    const row = db.select().from(dependencyRules).where(eq(dependencyRules.id, id)).get();
    return row ? deserializeDependency(row) : undefined;
  }

  async createDependencyRule(rule: InsertDependencyRule): Promise<DependencyRule> {
    const result = db.insert(dependencyRules).values({
      conditions:        toJson(rule.conditions),
      thenField:         rule.thenField,
      thenAllowedValues: toJson(rule.thenAllowedValues),
      action:            rule.action ?? "filter",
      updatedAt:         new Date(),
    }).returning().get();
    return deserializeDependency(result);
  }

  async updateDependencyRule(id: number, rule: Partial<InsertDependencyRule>): Promise<DependencyRule | undefined> {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (rule.conditions        !== undefined) updates.conditions        = toJson(rule.conditions);
    if (rule.thenField         !== undefined) updates.thenField         = rule.thenField;
    if (rule.thenAllowedValues !== undefined) updates.thenAllowedValues = toJson(rule.thenAllowedValues);
    if (rule.action            !== undefined) updates.action            = rule.action;
    const result = db.update(dependencyRules).set(updates).where(eq(dependencyRules.id, id)).returning().get();
    return result ? deserializeDependency(result) : undefined;
  }

  async deleteDependencyRule(id: number): Promise<boolean> {
    const result = db.delete(dependencyRules).where(eq(dependencyRules.id, id)).returning().get();
    return !!result;
  }

  // ── Quotes ──────────────────────────────────────────────────────────────────
  private withFiles(quote: Quote): QuoteWithFiles {
    const files = db.select().from(quoteFiles).where(eq(quoteFiles.quoteId, quote.id)).all();
    return { ...quote, files };
  }

  async getQuotes(): Promise<QuoteWithFiles[]> {
    const rows = db.select().from(quotes).orderBy(desc(quotes.createdAt)).all();
    return rows.map(r => this.withFiles(r));
  }

  async getQuote(id: number): Promise<QuoteWithFiles | undefined> {
    const row = db.select().from(quotes).where(eq(quotes.id, id)).get();
    return row ? this.withFiles(row) : undefined;
  }

  async createQuote(quote: InsertQuote, files: NewQuoteFile[]): Promise<QuoteWithFiles> {
    const now = new Date();
    const row = db.insert(quotes).values({
      title:         quote.title,
      manufacturer:  quote.manufacturer,
      truckModel:    quote.truckModel ?? null,
      apparatusType: quote.apparatusType ?? null,
      quotedPrice:   quote.quotedPrice ?? null,
      quoteDate:     quote.quoteDate ?? null,
      notes:         quote.notes ?? null,
      uploadedBy:    quote.uploadedBy ?? null,
      chassisRequestId: quote.chassisRequestId ?? null,
      createdAt:     now,
      updatedAt:     now,
    }).returning().get();
    for (const f of files) {
      db.insert(quoteFiles).values({ quoteId: row.id, ...f, createdAt: now }).run();
    }
    return this.withFiles(row);
  }

  async updateQuote(id: number, quote: Partial<InsertQuote>): Promise<QuoteWithFiles | undefined> {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (quote.title         !== undefined) updates.title         = quote.title;
    if (quote.manufacturer  !== undefined) updates.manufacturer  = quote.manufacturer;
    if (quote.truckModel    !== undefined) updates.truckModel    = quote.truckModel;
    if (quote.apparatusType !== undefined) updates.apparatusType = quote.apparatusType;
    if (quote.quotedPrice   !== undefined) updates.quotedPrice   = quote.quotedPrice;
    if (quote.quoteDate     !== undefined) updates.quoteDate     = quote.quoteDate;
    if (quote.notes            !== undefined) updates.notes            = quote.notes;
    if (quote.chassisRequestId !== undefined) updates.chassisRequestId = quote.chassisRequestId;
    const row = db.update(quotes).set(updates).where(eq(quotes.id, id)).returning().get();
    return row ? this.withFiles(row) : undefined;
  }

  async addQuoteFiles(quoteId: number, files: NewQuoteFile[]): Promise<QuoteWithFiles | undefined> {
    const row = db.select().from(quotes).where(eq(quotes.id, quoteId)).get();
    if (!row) return undefined;
    const now = new Date();
    for (const f of files) {
      db.insert(quoteFiles).values({ quoteId, ...f, createdAt: now }).run();
    }
    db.update(quotes).set({ updatedAt: now }).where(eq(quotes.id, quoteId)).run();
    return this.withFiles(row);
  }

  async deleteQuote(id: number): Promise<QuoteFile[] | undefined> {
    const files = db.select().from(quoteFiles).where(eq(quoteFiles.quoteId, id)).all();
    const result = db.delete(quotes).where(eq(quotes.id, id)).returning().get();
    if (!result) return undefined;
    // ON DELETE CASCADE removes the rows; caller removes the files from disk
    return files;
  }

  async getQuoteFile(fileId: number): Promise<QuoteFile | undefined> {
    return db.select().from(quoteFiles).where(eq(quoteFiles.id, fileId)).get();
  }

  async deleteQuoteFile(fileId: number): Promise<QuoteFile | undefined> {
    return db.delete(quoteFiles).where(eq(quoteFiles.id, fileId)).returning().get();
  }

  // ── App Settings ──────────────────────────────────────────────────────────
  async getAppSetting<T = unknown>(key: string): Promise<T | null> {
    const row = db.select().from(appSettings).where(eq(appSettings.key, key)).get();
    return row ? fromJson<T>(row.value as unknown as string) : null;
  }

  async setAppSetting<T = unknown>(key: string, value: T): Promise<T> {
    const now = new Date();
    const existing = db.select().from(appSettings).where(eq(appSettings.key, key)).get();
    if (existing) {
      db.update(appSettings).set({ value: toJson(value), updatedAt: now })
        .where(eq(appSettings.key, key)).run();
    } else {
      db.insert(appSettings).values({ key, value: toJson(value), updatedAt: now }).run();
    }
    return value;
  }
}

export const storage = new DatabaseStorage();
