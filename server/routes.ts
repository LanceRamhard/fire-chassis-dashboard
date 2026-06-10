import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // ── Chassis Requests ──────────────────────────────────────────────────────
  app.get("/api/requests", async (_req, res) => {
    res.json(await storage.getChassisRequests());
  });

  app.get("/api/requests/:id", async (req, res) => {
    const item = await storage.getChassisRequest(Number(req.params.id));
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  });

  app.post("/api/requests", async (req, res) => {
    const schema = z.object({
      configName:   z.string().min(1),
      manufacturer: z.string().min(1),
      formData:     z.unknown(),  // accept any JSON shape from the frontend
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    // Pass formData as-is; storage layer serializes it
    res.json(await storage.createChassisRequest(parsed.data as any));
  });

  app.patch("/api/requests/:id", async (req, res) => {
    const updated = await storage.updateChassisRequest(Number(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  });

  app.delete("/api/requests/:id", async (req, res) => {
    const ok = await storage.deleteChassisRequest(Number(req.params.id));
    if (!ok) return res.status(404).json({ message: "Not found" });
    res.json({ success: true });
  });

  // ── Chassis Configs ───────────────────────────────────────────────────────
  app.get("/api/configs", async (_req, res) => {
    res.json(await storage.getChassisConfigs());
  });

  app.get("/api/configs/manufacturer/:manufacturer", async (req, res) => {
    res.json(await storage.getChassisConfigsByManufacturer(req.params.manufacturer));
  });

  app.get("/api/configs/:id", async (req, res) => {
    const item = await storage.getChassisConfig(Number(req.params.id));
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  });

  app.post("/api/configs", async (req, res) => {
    const schema = z.object({
      manufacturer: z.string().min(1),
      modelId:      z.string().min(1),
      modelLabel:   z.string().min(1),
      fieldRules:   z.unknown().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    res.json(await storage.upsertChassisConfig(parsed.data as any));
  });

  app.delete("/api/configs/:id", async (req, res) => {
    const ok = await storage.deleteChassisConfig(Number(req.params.id));
    if (!ok) return res.status(404).json({ message: "Not found" });
    res.json({ success: true });
  });

  // ── Dropdown Options ──────────────────────────────────────────────────────
  app.get("/api/dropdown-options", async (_req, res) => {
    res.json(await storage.getDropdownOptions());
  });

  app.get("/api/dropdown-options/:fieldKey", async (req, res) => {
    const item = await storage.getDropdownOptionsByField(req.params.fieldKey);
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  });

  app.post("/api/dropdown-options", async (req, res) => {
    const schema = z.object({
      fieldKey: z.string().min(1),
      options:  z.array(z.object({ id: z.string(), label: z.string(), code: z.string().optional() })),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    res.json(await storage.upsertDropdownOptions(parsed.data as any));
  });

  // ── Dependency Rules ──────────────────────────────────────────────────────
  app.get("/api/dependency-rules", async (_req, res) => {
    res.json(await storage.getDependencyRules());
  });

  const ruleConditionSchema = z.object({
    field:    z.string().min(1),
    operator: z.enum(["in", "not_in"]),
    values:   z.array(z.string().min(1)).min(1),
  });

  app.post("/api/dependency-rules", async (req, res) => {
    const schema = z.object({
      conditions:        z.array(ruleConditionSchema).min(1),
      thenField:         z.string().min(1),
      thenAllowedValues: z.array(z.string()),
      action:            z.enum(["filter", "hide"]).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    res.json(await storage.createDependencyRule(parsed.data as any));
  });

  app.patch("/api/dependency-rules/:id", async (req, res) => {
    const schema = z.object({
      conditions:        z.array(ruleConditionSchema).min(1).optional(),
      thenField:         z.string().min(1).optional(),
      thenAllowedValues: z.array(z.string()).optional(),
      action:            z.enum(["filter", "hide"]).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const updated = await storage.updateDependencyRule(Number(req.params.id), parsed.data as any);
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  });

  app.delete("/api/dependency-rules/:id", async (req, res) => {
    const ok = await storage.deleteDependencyRule(Number(req.params.id));
    if (!ok) return res.status(404).json({ message: "Not found" });
    res.json({ success: true });
  });

  // ── App Settings (generic key → JSON value) ───────────────────────────────
  // GET always responds 200 — an unset key returns { value: null } so clients
  // can cleanly fall back to their defaults.
  app.get("/api/settings/:key", async (req, res) => {
    const value = await storage.getAppSetting(req.params.key);
    res.json({ key: req.params.key, value });
  });

  app.put("/api/settings/:key", async (req, res) => {
    const schema = z.object({ value: z.unknown() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const value = await storage.setAppSetting(req.params.key, parsed.data.value);
    res.json({ key: req.params.key, value });
  });

  return httpServer;
}
