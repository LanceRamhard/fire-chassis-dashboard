import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Save, Trash2, Pencil, Info, Settings, Link2, List,
  GripVertical, ArrowUp, ArrowDown, ChevronDown, ChevronRight,
  AlertTriangle, X, Check, EyeOff, Filter,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { ChassisConfig, DropdownOptions, DependencyRule } from "@shared/schema";
import {
  MANUFACTURERS, ALL_ENGINES, ALL_HP, ALL_TRANSMISSIONS,
  ALL_FRONT_AXLES, ALL_REAR_AXLES, ALL_CABS, ALL_BRAKES, APPARATUS_TYPES,
  FIELD_DISPLAY_META, FIELD_KEY_META, HIDDEN_FIELDS_KEY, getHiddenFields,
} from "@/lib/chassis-data";

// Shared field metadata (fieldKey → human label + group) lives in chassis-data
// so the request form can use the same labels in its dependency hints.
const FIELD_META = FIELD_KEY_META;

type OptionItem = { id: string; label: string; code?: string };

// ─── OptionGroup checkbox multi-select (used in Model Editor) ────────────────
function OptionGroup({ title, options, selected, onChange }: {
  title: string;
  options: OptionItem[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]);
  const allSel = options.every(o => selected.includes(o.id));

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--vipr-text-muted)" }}>
          {title}
        </span>
        <button type="button"
          style={{ fontSize: "10px", color: "var(--vipr-orange)", background: "none", border: "none", cursor: "pointer" }}
          onClick={() => onChange(allSel ? [] : options.map(o => o.id))}>
          {allSel ? "Deselect all" : "Select all"}
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
        {options.map(opt => (
          <label key={opt.id} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
            <input type="checkbox" className="vipr-checkbox"
              checked={selected.includes(opt.id)}
              onChange={() => toggle(opt.id)}
              data-testid={`checkbox-opt-${opt.id}`} />
            <span style={{ fontSize: "11px", color: "var(--vipr-text-muted)" }}>
              {opt.label}
              {opt.code && <span className="code-badge ml-1">{opt.code}</span>}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ─── Model Editor dialog ──────────────────────────────────────────────────────
function ModelEditor({ manufacturer, existing, trigger, liveOptions }: {
  manufacturer: string;
  existing?: ChassisConfig;
  trigger: React.ReactNode;
  liveOptions: Record<string, OptionItem[]>;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const dr = (existing?.fieldRules ?? {}) as Record<string, string[]>;

  const getOptions = (key: string, fallback: OptionItem[]) => liveOptions[key] ?? fallback;

  const [modelId,    setModelId]    = useState(existing?.modelId ?? "");
  const [modelLabel, setModelLabel] = useState(existing?.modelLabel ?? "");
  const [rules, setRules] = useState<Record<string, string[]>>({
    engines:        dr.engines        ?? getOptions("engines", ALL_ENGINES).map(e => e.id),
    hp:             dr.hp             ?? getOptions("hp", ALL_HP).map(h => h.id),
    transmissions:  dr.transmissions  ?? getOptions("transmissions", ALL_TRANSMISSIONS).map(t => t.id),
    frontAxles:     dr.frontAxles     ?? getOptions("frontAxles", ALL_FRONT_AXLES).map(a => a.id),
    rearAxles:      dr.rearAxles      ?? getOptions("rearAxles", ALL_REAR_AXLES).map(a => a.id),
    cabs:           dr.cabs           ?? getOptions("cabs", ALL_CABS).map(c => c.id),
    brakes:         dr.brakes         ?? getOptions("brakes", ALL_BRAKES).map(b => b.id),
    apparatusTypes: dr.apparatusTypes ?? getOptions("apparatusTypes", APPARATUS_TYPES).map(a => a.id),
  });

  // Field visibility — set of formKeys that are HIDDEN for this model.
  const [hiddenFields, setHiddenFields] = useState<Set<string>>(
    new Set(getHiddenFields(existing?.fieldRules as Record<string, unknown> | null | undefined))
  );
  const toggleField = (key: string) =>
    setHiddenFields(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  const fieldsBySection = FIELD_DISPLAY_META.reduce<Record<string, typeof FIELD_DISPLAY_META>>((acc, f) => {
    (acc[f.section] ??= []).push(f);
    return acc;
  }, {});

  // When dialog opens, refresh rules from current live options
  const handleOpen = (val: boolean) => {
    if (val && !existing) {
      setRules({
        engines:        getOptions("engines", ALL_ENGINES).map(e => e.id),
        hp:             getOptions("hp", ALL_HP).map(h => h.id),
        transmissions:  getOptions("transmissions", ALL_TRANSMISSIONS).map(t => t.id),
        frontAxles:     getOptions("frontAxles", ALL_FRONT_AXLES).map(a => a.id),
        rearAxles:      getOptions("rearAxles", ALL_REAR_AXLES).map(a => a.id),
        cabs:           getOptions("cabs", ALL_CABS).map(c => c.id),
        brakes:         getOptions("brakes", ALL_BRAKES).map(b => b.id),
        apparatusTypes: getOptions("apparatusTypes", APPARATUS_TYPES).map(a => a.id),
      });
    }
    setOpen(val);
  };

  const setRule = (k: string, ids: string[]) => setRules(r => ({ ...r, [k]: ids }));

  const saveMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/configs", {
      manufacturer,
      modelId: modelId.trim().toLowerCase().replace(/\s+/g, "_"),
      modelLabel: modelLabel.trim(),
      fieldRules: { ...rules, [HIDDEN_FIELDS_KEY]: Array.from(hiddenFields) },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/configs"] });
      toast({ title: "Model saved" });
      setOpen(false);
    },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent style={{ background: "var(--vipr-surface-2)", border: "1px solid var(--vipr-border)", color: "var(--vipr-text)", maxWidth: "680px", maxHeight: "88vh", overflowY: "auto" }}>
        <DialogHeader>
          <DialogTitle style={{ color: "var(--vipr-text)", fontSize: "14px" }}>
            {existing ? "Edit" : "Add"} Model — {MANUFACTURERS.find(m => m.id === manufacturer)?.label}
          </DialogTitle>
          <DialogDescription style={{ color: "var(--vipr-text-muted)", fontSize: "11px" }}>
            Check which options are available for this model. Unchecked items are hidden in the request form.
          </DialogDescription>
        </DialogHeader>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
          <div>
            <div className="vipr-field-label">Model ID</div>
            <input className="vipr-input" value={modelId} onChange={e => setModelId(e.target.value)}
              placeholder="e.g. m2_106" disabled={!!existing} data-testid="input-model-id" />
          </div>
          <div>
            <div className="vipr-field-label">Display Label</div>
            <input className="vipr-input" value={modelLabel} onChange={e => setModelLabel(e.target.value)}
              placeholder="e.g. M2 106" data-testid="input-model-label" />
          </div>
        </div>

        <hr style={{ borderColor: "var(--vipr-border)", margin: "4px 0 12px" }} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <OptionGroup title="Engines"         options={getOptions("engines", ALL_ENGINES)}           selected={rules.engines}        onChange={ids => setRule("engines", ids)} />
          <OptionGroup title="Horsepower"      options={getOptions("hp", ALL_HP)}                     selected={rules.hp}             onChange={ids => setRule("hp", ids)} />
          <OptionGroup title="Transmissions"   options={getOptions("transmissions", ALL_TRANSMISSIONS)} selected={rules.transmissions}  onChange={ids => setRule("transmissions", ids)} />
          <OptionGroup title="Cab Types"       options={getOptions("cabs", ALL_CABS)}                  selected={rules.cabs}           onChange={ids => setRule("cabs", ids)} />
          <OptionGroup title="Front Axles"     options={getOptions("frontAxles", ALL_FRONT_AXLES)}    selected={rules.frontAxles}     onChange={ids => setRule("frontAxles", ids)} />
          <OptionGroup title="Rear Axles"      options={getOptions("rearAxles", ALL_REAR_AXLES)}      selected={rules.rearAxles}      onChange={ids => setRule("rearAxles", ids)} />
          <OptionGroup title="Brakes"          options={getOptions("brakes", ALL_BRAKES)}             selected={rules.brakes}         onChange={ids => setRule("brakes", ids)} />
          <OptionGroup title="Apparatus Types" options={getOptions("apparatusTypes", APPARATUS_TYPES)} selected={rules.apparatusTypes} onChange={ids => setRule("apparatusTypes", ids)} />
        </div>

        {/* ── Visible Fields panel ─────────────────────────────────────── */}
        <hr style={{ borderColor: "var(--vipr-border)", margin: "16px 0 12px" }} />
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--vipr-text)", letterSpacing: "0.04em" }}>
                Visible Fields
              </div>
              <div style={{ fontSize: "10px", color: "var(--vipr-text-faint)" }}>
                Uncheck any field to hide it from the request form when this model is selected
                ({FIELD_DISPLAY_META.length - hiddenFields.size} of {FIELD_DISPLAY_META.length} visible)
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button"
                style={{ fontSize: "10px", color: "var(--vipr-orange)", background: "none", border: "none", cursor: "pointer" }}
                onClick={() => setHiddenFields(new Set())}>
                Show all
              </button>
              <button type="button"
                style={{ fontSize: "10px", color: "var(--vipr-text-muted)", background: "none", border: "none", cursor: "pointer" }}
                onClick={() => setHiddenFields(new Set(FIELD_DISPLAY_META.map(f => f.key)))}>
                Hide all
              </button>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {Object.entries(fieldsBySection).map(([section, fields]) => (
              <div key={section} style={{ background: "var(--vipr-surface)", border: "1px solid var(--vipr-border)", borderRadius: "4px", padding: "8px 10px" }}>
                <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--vipr-text-muted)", marginBottom: "6px" }}>
                  {section}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px" }}>
                  {fields.map(f => {
                    const visible = !hiddenFields.has(f.key);
                    return (
                      <label key={f.key} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                        <input type="checkbox" className="vipr-checkbox"
                          checked={visible}
                          onChange={() => toggleField(f.key)}
                          data-testid={`checkbox-field-${f.key}`} />
                        <span style={{ fontSize: "11px", color: visible ? "var(--vipr-text-muted)" : "var(--vipr-text-faint)", textDecoration: visible ? "none" : "line-through" }}>
                          {f.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter style={{ marginTop: "16px" }}>
          <button className="vipr-btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
          <button className="vipr-btn-primary" onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !modelId || !modelLabel} data-testid="button-save-model">
            <Save size={12} /> Save Model
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── TAB 1: Model Configs ─────────────────────────────────────────────────────
function ModelConfigsTab({ liveOptions }: { liveOptions: Record<string, OptionItem[]> }) {
  const { toast } = useToast();
  const [activeMfr, setActiveMfr] = useState("freightliner");

  const { data: configs = [] } = useQuery<ChassisConfig[]>({ queryKey: ["/api/configs"] });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/configs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/configs"] });
      toast({ title: "Deleted" });
    },
  });

  const mfrConfigs = configs.filter(c => c.manufacturer === activeMfr);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 rounded"
        style={{ background: "rgba(249,115,22,0.07)", border: "1px solid rgba(249,115,22,0.2)", fontSize: "11px", color: "var(--vipr-text-muted)" }}>
        <Info size={13} style={{ color: "var(--vipr-orange)", flexShrink: 0, marginTop: "1px" }} />
        <span>Changes here immediately affect which options appear in the request form when a model is selected.</span>
      </div>

      <div className="flex gap-1 flex-wrap">
        {MANUFACTURERS.map(m => {
          const count = configs.filter(c => c.manufacturer === m.id).length;
          const active = activeMfr === m.id;
          return (
            <button key={m.id} onClick={() => setActiveMfr(m.id)}
              data-testid={`config-tab-${m.id}`}
              className={`vipr-mfr-btn ${active ? "active" : ""}`}
              style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              {m.label}
              <span style={{
                background: active ? "rgba(0,0,0,0.25)" : "var(--vipr-surface-2)",
                color: active ? "#000" : "var(--vipr-text-muted)",
                fontSize: "9px", fontWeight: 700, padding: "1px 5px", borderRadius: "8px",
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--vipr-text)" }}>
            {MANUFACTURERS.find(m => m.id === activeMfr)?.label} Models ({mfrConfigs.length})
          </span>
          <ModelEditor
            manufacturer={activeMfr}
            liveOptions={liveOptions}
            trigger={
              <button className="vipr-btn-primary" data-testid={`button-add-model-${activeMfr}`}>
                <Plus size={12} /> Add Model
              </button>
            }
          />
        </div>

        {mfrConfigs.length === 0 ? (
          <div className="text-center py-16 rounded" style={{
            border: `1px dashed var(--vipr-border)`,
            color: "var(--vipr-text-muted)", fontSize: "12px",
          }}>
            No models configured. Add one to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {mfrConfigs.map(cfg => {
              const rules = (cfg.fieldRules ?? {}) as Record<string, string[]>;
              return (
                <div key={cfg.id} className="vipr-card" data-testid={`card-config-${cfg.id}`}>
                  <div className="vipr-card-header">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--vipr-text)" }}>{cfg.modelLabel}</div>
                      <div style={{ fontSize: "9px", fontFamily: "monospace", color: "var(--vipr-text-faint)" }}>{cfg.modelId}</div>
                    </div>
                    <span className={`mfr-${cfg.manufacturer}`}
                      style={{ fontSize: "9px", fontWeight: 700, padding: "2px 5px", borderRadius: "3px", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                      {MANUFACTURERS.find(m => m.id === cfg.manufacturer)?.label}
                    </span>
                  </div>

                  <div className="vipr-card-body" style={{ fontSize: "10px", color: "var(--vipr-text-muted)" }}>
                    <div className="space-y-1" style={{ marginBottom: "10px" }}>
                      <div>
                        <span style={{ fontWeight: 600, color: "var(--vipr-text)" }}>Engines: </span>
                        {rules.engines?.map(id => (liveOptions.engines ?? ALL_ENGINES).find(e => e.id === id)?.label ?? id).join(", ") || "All"}
                      </div>
                      <div>
                        <span style={{ fontWeight: 600, color: "var(--vipr-text)" }}>Transmission: </span>
                        {rules.transmissions?.map(id => (liveOptions.transmissions ?? ALL_TRANSMISSIONS).find(t => t.id === id)?.label ?? id).join(", ") || "All"}
                      </div>
                      <div>
                        <span style={{ fontWeight: 600, color: "var(--vipr-text)" }}>Cabs: </span>
                        {rules.cabs?.map(id => (liveOptions.cabs ?? ALL_CABS).find(c => c.id === id)?.label ?? id).join(", ") || "All"}
                      </div>
                    </div>

                    <div className="flex gap-1.5">
                      <ModelEditor
                        manufacturer={cfg.manufacturer}
                        existing={cfg}
                        liveOptions={liveOptions}
                        trigger={
                          <button className="vipr-btn-ghost" style={{ flex: 1, justifyContent: "center", padding: "5px 8px", fontSize: "11px" }}
                            data-testid={`button-edit-${cfg.id}`}>
                            <Pencil size={11} /> Edit
                          </button>
                        }
                      />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="vipr-btn-ghost"
                            style={{ padding: "5px 8px", color: "var(--vipr-red)", borderColor: "rgba(248,81,73,0.3)" }}
                            data-testid={`button-delete-config-${cfg.id}`}>
                            <Trash2 size={11} />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent style={{ background: "var(--vipr-surface-2)", border: "1px solid var(--vipr-border)", color: "var(--vipr-text)" }}>
                          <AlertDialogHeader>
                            <AlertDialogTitle style={{ color: "var(--vipr-text)" }}>Delete {cfg.modelLabel}?</AlertDialogTitle>
                            <AlertDialogDescription style={{ color: "var(--vipr-text-muted)" }}>
                              This model config will be removed. Saved requests are unaffected.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel style={{ background: "var(--vipr-surface)", border: "1px solid var(--vipr-border)", color: "var(--vipr-text)" }}>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate(cfg.id)}
                              style={{ background: "var(--vipr-red)", color: "white" }}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TAB 2: Dropdown Editor ───────────────────────────────────────────────────
function DropdownEditorTab({ allDropdowns, onSaved }: {
  allDropdowns: DropdownOptions[];
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [activeField, setActiveField] = useState<string | null>(null);
  const [editItems, setEditItems] = useState<OptionItem[]>([]);
  const [dirty, setDirty] = useState(false);

  // New item form
  const [newId, setNewId] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newCode, setNewCode] = useState("");

  const selectField = (fieldKey: string) => {
    const row = allDropdowns.find(d => d.fieldKey === fieldKey);
    const opts = (row?.options ?? []) as OptionItem[];
    setActiveField(fieldKey);
    setEditItems([...opts]);
    setDirty(false);
    setNewId(""); setNewLabel(""); setNewCode("");
  };

  const saveMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/dropdown-options", {
      fieldKey: activeField,
      options: editItems,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dropdown-options"] });
      toast({ title: "Options saved" });
      setDirty(false);
      onSaved();
    },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const moveItem = (idx: number, dir: -1 | 1) => {
    const items = [...editItems];
    const swap = idx + dir;
    if (swap < 0 || swap >= items.length) return;
    [items[idx], items[swap]] = [items[swap], items[idx]];
    setEditItems(items);
    setDirty(true);
  };

  const removeItem = (idx: number) => {
    setEditItems(items => items.filter((_, i) => i !== idx));
    setDirty(true);
  };

  const updateLabel = (idx: number, label: string) => {
    setEditItems(items => items.map((item, i) => i === idx ? { ...item, label } : item));
    setDirty(true);
  };

  const addItem = () => {
    if (!newId.trim() || !newLabel.trim()) return;
    const id = newId.trim().toLowerCase().replace(/\s+/g, "_");
    if (editItems.some(e => e.id === id)) {
      toast({ title: "ID already exists", variant: "destructive" }); return;
    }
    const item: OptionItem = { id, label: newLabel.trim(), ...(newCode.trim() ? { code: newCode.trim() } : {}) };
    setEditItems(items => [...items, item]);
    setNewId(""); setNewLabel(""); setNewCode("");
    setDirty(true);
  };

  // Group fields by category
  const groups = Object.entries(FIELD_META).reduce<Record<string, string[]>>((acc, [key, val]) => {
    (acc[val.group] ??= []).push(key);
    return acc;
  }, {});

  const activeFieldMeta = activeField ? FIELD_META[activeField] : null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "16px", minHeight: "500px" }}>
      {/* Field list sidebar */}
      <div style={{ borderRight: "1px solid var(--vipr-border)", paddingRight: "12px", overflowY: "auto" }}>
        <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--vipr-text-muted)", marginBottom: "8px" }}>
          Select a Field
        </div>
        {Object.entries(groups).map(([group, keys]) => (
          <div key={group} style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--vipr-text-faint)", marginBottom: "4px", paddingLeft: "6px" }}>
              {group}
            </div>
            {keys.map(key => {
              const row = allDropdowns.find(d => d.fieldKey === key);
              const count = ((row?.options ?? []) as OptionItem[]).length;
              const isActive = activeField === key;
              return (
                <button key={key} onClick={() => selectField(key)}
                  data-testid={`dropdown-field-${key}`}
                  style={{
                    width: "100%", textAlign: "left", padding: "5px 8px", borderRadius: "4px", cursor: "pointer",
                    background: isActive ? "var(--vipr-orange-glow)" : "transparent",
                    border: isActive ? "1px solid rgba(249,115,22,0.3)" : "1px solid transparent",
                    color: isActive ? "var(--vipr-orange)" : "var(--vipr-text-muted)",
                    fontSize: "11px", display: "flex", justifyContent: "space-between", alignItems: "center",
                    transition: "all 0.15s",
                  }}>
                  <span>{FIELD_META[key]?.label}</span>
                  <span style={{ fontSize: "9px", opacity: 0.7 }}>{count}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Editor panel */}
      <div>
        {!activeField ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "300px", color: "var(--vipr-text-faint)", fontSize: "12px", flexDirection: "column", gap: "8px" }}>
            <List size={32} style={{ opacity: 0.3 }} />
            <span>Select a field from the left to edit its options</span>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--vipr-text)" }}>
                  {activeFieldMeta?.label}
                </div>
                <div style={{ fontSize: "10px", color: "var(--vipr-text-faint)", fontFamily: "monospace" }}>
                  {activeField} · {editItems.length} options
                </div>
              </div>
              <button className="vipr-btn-primary" onClick={() => saveMutation.mutate()}
                disabled={!dirty || saveMutation.isPending}
                data-testid="button-save-dropdown">
                <Save size={12} /> {dirty ? "Save Changes" : "Saved"}
              </button>
            </div>

            {/* Option rows */}
            <div style={{ border: "1px solid var(--vipr-border)", borderRadius: "6px", overflow: "hidden", marginBottom: "12px" }}>
              {editItems.length === 0 ? (
                <div style={{ padding: "24px", textAlign: "center", color: "var(--vipr-text-faint)", fontSize: "11px" }}>
                  No options yet. Add one below.
                </div>
              ) : (
                editItems.map((item, idx) => (
                  <div key={item.id}
                    style={{
                      display: "flex", alignItems: "center", gap: "8px", padding: "7px 10px",
                      borderBottom: idx < editItems.length - 1 ? "1px solid var(--vipr-border)" : "none",
                      background: "var(--vipr-surface)",
                    }}>
                    {/* Reorder arrows */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "1px", flexShrink: 0 }}>
                      <button onClick={() => moveItem(idx, -1)} disabled={idx === 0}
                        style={{ background: "none", border: "none", cursor: idx === 0 ? "default" : "pointer", padding: "0", color: idx === 0 ? "var(--vipr-text-faint)" : "var(--vipr-text-muted)", lineHeight: 1 }}>
                        <ArrowUp size={10} />
                      </button>
                      <button onClick={() => moveItem(idx, 1)} disabled={idx === editItems.length - 1}
                        style={{ background: "none", border: "none", cursor: idx === editItems.length - 1 ? "default" : "pointer", padding: "0", color: idx === editItems.length - 1 ? "var(--vipr-text-faint)" : "var(--vipr-text-muted)", lineHeight: 1 }}>
                        <ArrowDown size={10} />
                      </button>
                    </div>

                    {/* ID (readonly) */}
                    <span style={{ fontSize: "9px", fontFamily: "monospace", color: "var(--vipr-text-faint)", minWidth: "80px", flexShrink: 0 }}>
                      {item.id}
                    </span>

                    {/* Editable label */}
                    <input
                      className="vipr-input"
                      style={{ flex: 1, padding: "3px 7px", fontSize: "11px" }}
                      value={item.label}
                      onChange={e => updateLabel(idx, e.target.value)}
                      data-testid={`input-option-label-${item.id}`}
                    />

                    {/* Code (readonly display) */}
                    {item.code && (
                      <span className="code-badge" style={{ flexShrink: 0 }}>{item.code}</span>
                    )}

                    {/* Remove */}
                    <button onClick={() => removeItem(idx)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--vipr-red)", padding: "2px", flexShrink: 0, opacity: 0.7 }}
                      data-testid={`button-remove-option-${item.id}`}>
                      <X size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add new option form */}
            <div style={{ background: "var(--vipr-surface)", border: "1px solid var(--vipr-border)", borderRadius: "6px", padding: "10px 12px" }}>
              <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--vipr-text-muted)", marginBottom: "8px" }}>
                Add New Option
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 80px auto", gap: "8px", alignItems: "end" }}>
                <div>
                  <div className="vipr-field-label" style={{ fontSize: "9px" }}>ID (slug)</div>
                  <input className="vipr-input" style={{ padding: "4px 7px", fontSize: "11px" }}
                    placeholder="e.g. jake_brake" value={newId} onChange={e => setNewId(e.target.value)}
                    data-testid="input-new-option-id" />
                </div>
                <div>
                  <div className="vipr-field-label" style={{ fontSize: "9px" }}>Display Label</div>
                  <input className="vipr-input" style={{ padding: "4px 7px", fontSize: "11px" }}
                    placeholder="e.g. Jake Brake" value={newLabel} onChange={e => setNewLabel(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addItem()}
                    data-testid="input-new-option-label" />
                </div>
                <div>
                  <div className="vipr-field-label" style={{ fontSize: "9px" }}>Code (opt.)</div>
                  <input className="vipr-input" style={{ padding: "4px 7px", fontSize: "11px" }}
                    placeholder="128" value={newCode} onChange={e => setNewCode(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addItem()}
                    data-testid="input-new-option-code" />
                </div>
                <button className="vipr-btn-primary" onClick={addItem}
                  disabled={!newId.trim() || !newLabel.trim()}
                  style={{ padding: "5px 10px", fontSize: "11px" }}
                  data-testid="button-add-option">
                  <Plus size={11} /> Add
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TAB 3: Dependency Rules Builder ─────────────────────────────────────────
function DependencyRulesTab({ allDropdowns }: { allDropdowns: DropdownOptions[] }) {
  const { toast } = useToast();

  const { data: rules = [] } = useQuery<DependencyRule[]>({ queryKey: ["/api/dependency-rules"] });

  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<DependencyRule | null>(null);

  // Form state
  const [ifField, setIfField]   = useState("");
  const [operator, setOperator] = useState<"eq" | "neq">("eq");
  const [ifValue, setIfValue]   = useState("");
  const [thenField, setThenField] = useState("");
  const [thenAllowed, setThenAllowed] = useState<string[]>([]);
  const [action, setAction] = useState<"filter" | "hide">("filter");

  const resetForm = () => {
    setIfField(""); setOperator("eq"); setIfValue(""); setThenField(""); setThenAllowed([]);
    setAction("filter");
    setEditingRule(null); setShowForm(false);
  };

  const startEdit = (rule: DependencyRule) => {
    setEditingRule(rule);
    setIfField(rule.ifField);
    setOperator((rule.operator as "eq" | "neq") ?? "eq");
    setIfValue(rule.ifValue);
    setThenField(rule.thenField);
    setThenAllowed((rule.thenAllowedValues ?? []) as string[]);
    setAction((rule.action as "filter" | "hide") ?? "filter");
    setShowForm(true);
  };

  const getOptions = (fieldKey: string): OptionItem[] => {
    const row = allDropdowns.find(d => d.fieldKey === fieldKey);
    return (row?.options ?? []) as OptionItem[];
  };

  const labelFor = (fieldKey: string, valueId: string) => {
    return getOptions(fieldKey).find(o => o.id === valueId)?.label ?? valueId;
  };

  const createMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/dependency-rules", {
      ifField, operator, ifValue, thenField,
      thenAllowedValues: action === "hide" ? [] : thenAllowed,
      action,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dependency-rules"] });
      toast({ title: "Rule added" });
      resetForm();
    },
    onError: () => toast({ title: "Failed to save rule", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async () => apiRequest("PATCH", `/api/dependency-rules/${editingRule!.id}`, {
      ifField, operator, ifValue, thenField,
      thenAllowedValues: action === "hide" ? [] : thenAllowed,
      action,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dependency-rules"] });
      toast({ title: "Rule updated" });
      resetForm();
    },
    onError: () => toast({ title: "Failed to update rule", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/dependency-rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dependency-rules"] });
      toast({ title: "Rule deleted" });
    },
  });

  const handleSave = () => {
    if (!ifField || !ifValue || !thenField) {
      toast({ title: "Fill all fields", variant: "destructive" });
      return;
    }
    if (action === "filter" && thenAllowed.length === 0) {
      toast({ title: "Select at least one allowed value", variant: "destructive" });
      return;
    }
    if (editingRule) updateMutation.mutate();
    else createMutation.mutate();
  };

  const toggleThenAllowed = (id: string) => {
    setThenAllowed(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Available source fields (ones that have options)
  const availableFields = Object.entries(FIELD_META)
    .filter(([key]) => allDropdowns.some(d => d.fieldKey === key && ((d.options as OptionItem[])?.length ?? 0) > 0));

  const ifFieldOptions   = getOptions(ifField);
  const thenFieldOptions = getOptions(thenField);

  // Group rules for display
  const rulesByIf = rules.reduce<Record<string, DependencyRule[]>>((acc, rule) => {
    const k = `${rule.ifField}::${rule.operator ?? "eq"}::${rule.ifValue}`;
    (acc[k] ??= []).push(rule);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Info */}
      <div className="flex items-start gap-2 p-3 rounded"
        style={{ background: "rgba(249,115,22,0.07)", border: "1px solid rgba(249,115,22,0.2)", fontSize: "11px", color: "var(--vipr-text-muted)" }}>
        <Link2 size={13} style={{ color: "var(--vipr-orange)", flexShrink: 0, marginTop: "1px" }} />
        <span>
          Dependency rules cascade-filter the request form in real time. Two types: <strong>Filter Options</strong> narrows a target field's choices (<em>"IF Brakes is Air Disc THEN Rear Axles only shows 21k, 23k, 24k"</em>), <strong>Hide Field</strong> removes a field entirely. The <strong>is not</strong> condition also fires while the source field is unselected — so <em>"IF Cab Config is not Crew THEN hide Rear Seats"</em> keeps Rear Seats hidden until Crew Cab is actually chosen. Multiple rules can stack on the same field.
        </span>
      </div>

      {/* Existing rules */}
      {rules.length === 0 && !showForm ? (
        <div className="text-center py-12 rounded" style={{ border: "1px dashed var(--vipr-border)", color: "var(--vipr-text-muted)", fontSize: "12px" }}>
          No dependency rules yet. Add one below to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {Object.entries(rulesByIf).map(([key, groupRules]) => {
            const [iF, op, iV] = key.split("::");
            const ifLabel = FIELD_META[iF]?.label ?? iF;
            const ivLabel = labelFor(iF, iV);
            const isNeq = op === "neq";
            return (
              <div key={key} style={{ background: "var(--vipr-surface)", border: "1px solid var(--vipr-border)", borderRadius: "6px", overflow: "hidden" }}>
                {/* IF header */}
                <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--vipr-border)", background: "rgba(249,115,22,0.04)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--vipr-orange)", textTransform: "uppercase", letterSpacing: "0.05em" }}>IF</span>
                  <span style={{ fontSize: "11px", color: "var(--vipr-text)" }}>{ifLabel}</span>
                  <span style={{ fontSize: "10px", fontWeight: isNeq ? 700 : 400, color: isNeq ? "var(--vipr-red)" : "var(--vipr-text-muted)" }}>
                    {isNeq ? "is not" : "is"}
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--vipr-text)" }}>{ivLabel}</span>
                  <span style={{ fontSize: "9px", fontFamily: "monospace", color: "var(--vipr-text-faint)", marginLeft: "2px" }}>({iV})</span>
                </div>
                {/* THEN rules */}
                {groupRules.map(rule => {
                  const thenLabel = FIELD_META[rule.thenField]?.label ?? rule.thenField;
                  const allowed = (rule.thenAllowedValues as string[]) ?? [];
                  const isHide = rule.action === "hide";
                  return (
                    <div key={rule.id} style={{ padding: "8px 12px", display: "flex", alignItems: "flex-start", gap: "8px", borderBottom: "1px solid rgba(42,50,68,0.5)" }}>
                      <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--vipr-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "2px", minWidth: "28px" }}>THEN</span>
                      <div style={{ flex: 1 }}>
                        {isHide ? (
                          <>
                            <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--vipr-red)", background: "rgba(248,81,73,0.12)", border: "1px solid rgba(248,81,73,0.3)", borderRadius: "3px", padding: "1px 5px", marginRight: "6px", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                              <EyeOff size={9} /> HIDE
                            </span>
                            <span style={{ fontSize: "11px", color: "var(--vipr-text)", fontWeight: 600 }}>{thenLabel}</span>
                            <span style={{ fontSize: "10px", color: "var(--vipr-text-muted)", marginLeft: "6px" }}>from the request form</span>
                          </>
                        ) : (
                          <>
                            <span style={{ fontSize: "11px", color: "var(--vipr-text)", fontWeight: 600 }}>{thenLabel}</span>
                            <span style={{ fontSize: "10px", color: "var(--vipr-text-muted)", marginLeft: "6px" }}>only shows:</span>
                            <div style={{ marginTop: "4px", display: "flex", flexWrap: "wrap", gap: "4px" }}>
                              {allowed.map(v => (
                                <span key={v} style={{ fontSize: "9px", background: "var(--vipr-surface-2)", border: "1px solid var(--vipr-border)", borderRadius: "3px", padding: "1px 5px", color: "var(--vipr-text-muted)", fontFamily: "monospace" }}>
                                  {labelFor(rule.thenField, v)}
                                </span>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                      <div className="flex gap-1.5" style={{ flexShrink: 0 }}>
                        <button className="vipr-btn-ghost" style={{ padding: "3px 7px", fontSize: "10px" }}
                          onClick={() => startEdit(rule)}
                          data-testid={`button-edit-rule-${rule.id}`}>
                          <Pencil size={10} /> Edit
                        </button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="vipr-btn-ghost" style={{ padding: "3px 7px", color: "var(--vipr-red)", borderColor: "rgba(248,81,73,0.3)" }}
                              data-testid={`button-delete-rule-${rule.id}`}>
                              <Trash2 size={10} />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent style={{ background: "var(--vipr-surface-2)", border: "1px solid var(--vipr-border)", color: "var(--vipr-text)" }}>
                            <AlertDialogHeader>
                              <AlertDialogTitle style={{ color: "var(--vipr-text)" }}>Delete this rule?</AlertDialogTitle>
                              <AlertDialogDescription style={{ color: "var(--vipr-text-muted)" }}>
                                The cascade filter for {thenLabel} when {ifLabel} = {ivLabel} will be removed.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel style={{ background: "var(--vipr-surface)", border: "1px solid var(--vipr-border)", color: "var(--vipr-text)" }}>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(rule.id)}
                                style={{ background: "var(--vipr-red)", color: "white" }}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Rule Form */}
      {showForm ? (
        <div style={{ background: "var(--vipr-surface)", border: "1px solid var(--vipr-border)", borderRadius: "6px", padding: "14px 16px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--vipr-text)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
            <Link2 size={13} style={{ color: "var(--vipr-orange)" }} />
            {editingRule ? "Edit Rule" : "New Dependency Rule"}
          </div>

          {/* Rule-type toggle */}
          <div style={{ marginBottom: "12px" }}>
            <div className="vipr-field-label" style={{ fontSize: "9px" }}>Rule type</div>
            <div style={{ display: "flex", gap: "6px" }}>
              <button type="button" onClick={() => setAction("filter")}
                data-testid="button-action-filter"
                style={{
                  flex: 1, padding: "6px 10px", fontSize: "11px", fontWeight: 600,
                  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "5px",
                  border: `1px solid ${action === "filter" ? "rgba(249,115,22,0.45)" : "var(--vipr-border)"}`,
                  background: action === "filter" ? "var(--vipr-orange-glow)" : "var(--vipr-surface-2)",
                  color: action === "filter" ? "var(--vipr-orange)" : "var(--vipr-text-muted)",
                  borderRadius: "4px", cursor: "pointer",
                }}>
                <Filter size={11} /> Filter Options
              </button>
              <button type="button" onClick={() => setAction("hide")}
                data-testid="button-action-hide"
                style={{
                  flex: 1, padding: "6px 10px", fontSize: "11px", fontWeight: 600,
                  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "5px",
                  border: `1px solid ${action === "hide" ? "rgba(248,81,73,0.45)" : "var(--vipr-border)"}`,
                  background: action === "hide" ? "rgba(248,81,73,0.12)" : "var(--vipr-surface-2)",
                  color: action === "hide" ? "var(--vipr-red)" : "var(--vipr-text-muted)",
                  borderRadius: "4px", cursor: "pointer",
                }}>
                <EyeOff size={11} /> Hide Field
              </button>
            </div>
            <div style={{ fontSize: "10px", color: "var(--vipr-text-faint)", marginTop: "4px" }}>
              {action === "filter"
                ? "Restrict the target field's options when the IF condition fires."
                : "Hide the target field entirely from the request form when the IF condition fires."}
            </div>
          </div>

          {/* IF row */}
          <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 90px 1fr", gap: "8px", alignItems: "end", marginBottom: "10px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--vipr-orange)", textTransform: "uppercase", letterSpacing: "0.05em", paddingBottom: "8px" }}>IF</div>
            <div>
              <div className="vipr-field-label" style={{ fontSize: "9px" }}>Field</div>
              <select className="vipr-input" style={{ padding: "5px 8px", fontSize: "11px" }}
                value={ifField} onChange={e => { setIfField(e.target.value); setIfValue(""); }}
                data-testid="select-if-field">
                <option value="">— Select field —</option>
                {availableFields.map(([key, meta]) => (
                  <option key={key} value={key}>{meta.label}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="vipr-field-label" style={{ fontSize: "9px" }}>Condition</div>
              <select className="vipr-input" style={{ padding: "5px 8px", fontSize: "11px" }}
                value={operator} onChange={e => setOperator(e.target.value as "eq" | "neq")}
                data-testid="select-if-operator">
                <option value="eq">is</option>
                <option value="neq">is not</option>
              </select>
            </div>
            <div>
              <div className="vipr-field-label" style={{ fontSize: "9px" }}>Value</div>
              <select className="vipr-input" style={{ padding: "5px 8px", fontSize: "11px" }}
                value={ifValue} onChange={e => setIfValue(e.target.value)}
                disabled={!ifField}
                data-testid="select-if-value">
                <option value="">— Select value —</option>
                {ifFieldOptions.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
          {operator === "neq" && (
            <div style={{ fontSize: "10px", color: "var(--vipr-text-faint)", margin: "-4px 0 10px 36px" }}>
              "is not" also fires while the field is unselected — use it for "show only when …" behavior.
            </div>
          )}

          {/* THEN row */}
          <div style={{ display: "grid", gridTemplateColumns: "28px 1fr", gap: "8px", alignItems: "start" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--vipr-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", paddingTop: "22px" }}>THEN</div>
            <div>
              <div className="vipr-field-label" style={{ fontSize: "9px" }}>
                {action === "hide" ? "Field to hide" : "Field to restrict"}
              </div>
              <select className="vipr-input" style={{ padding: "5px 8px", fontSize: "11px", marginBottom: "8px" }}
                value={thenField} onChange={e => { setThenField(e.target.value); setThenAllowed([]); }}
                data-testid="select-then-field">
                <option value="">— Select field —</option>
                {availableFields.filter(([key]) => key !== ifField).map(([key, meta]) => (
                  <option key={key} value={key}>{meta.label}</option>
                ))}
              </select>

              {action === "filter" && thenField && thenFieldOptions.length > 0 && (
                <div>
                  <div className="vipr-field-label" style={{ fontSize: "9px", marginBottom: "6px" }}>
                    Allowed values when rule fires
                    <span style={{ color: "var(--vipr-text-faint)", fontWeight: 400, marginLeft: "4px" }}>
                      ({thenAllowed.length} of {thenFieldOptions.length} selected)
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "4px" }}>
                    {thenFieldOptions.map(opt => (
                      <label key={opt.id}
                        style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", padding: "3px 6px", borderRadius: "3px", background: thenAllowed.includes(opt.id) ? "var(--vipr-orange-glow)" : "transparent", border: `1px solid ${thenAllowed.includes(opt.id) ? "rgba(249,115,22,0.25)" : "transparent"}` }}>
                        <input type="checkbox" className="vipr-checkbox"
                          checked={thenAllowed.includes(opt.id)}
                          onChange={() => toggleThenAllowed(opt.id)}
                          data-testid={`checkbox-then-${opt.id}`} />
                        <span style={{ fontSize: "11px", color: "var(--vipr-text-muted)" }}>
                          {opt.label}
                          {opt.code && <span className="code-badge ml-1">{opt.code}</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button type="button" style={{ fontSize: "10px", color: "var(--vipr-orange)", background: "none", border: "none", cursor: "pointer" }}
                      onClick={() => setThenAllowed(thenFieldOptions.map(o => o.id))}>Select all</button>
                    <button type="button" style={{ fontSize: "10px", color: "var(--vipr-text-muted)", background: "none", border: "none", cursor: "pointer" }}
                      onClick={() => setThenAllowed([])}>Deselect all</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 justify-end mt-4">
            <button className="vipr-btn-ghost" onClick={resetForm}>Cancel</button>
            <button className="vipr-btn-primary" onClick={handleSave}
              disabled={
                !ifField || !ifValue || !thenField ||
                (action === "filter" && thenAllowed.length === 0) ||
                createMutation.isPending || updateMutation.isPending
              }
              data-testid="button-save-rule">
              <Check size={12} /> {editingRule ? "Update Rule" : "Add Rule"}
            </button>
          </div>
        </div>
      ) : (
        <button className="vipr-btn-primary" onClick={() => setShowForm(true)}
          data-testid="button-new-rule">
          <Plus size={12} /> Add Dependency Rule
        </button>
      )}
    </div>
  );
}

// ─── Main ConfigAdmin ─────────────────────────────────────────────────────────
export default function ConfigAdmin() {
  const [activeTab, setActiveTab] = useState<"models" | "dropdowns" | "dependencies">("models");

  // Fetch live dropdown options — used by all tabs
  const { data: allDropdowns = [], refetch: refetchDropdowns } = useQuery<DropdownOptions[]>({
    queryKey: ["/api/dropdown-options"],
  });

  // Build a convenient map: fieldKey → OptionItem[]
  const liveOptions: Record<string, OptionItem[]> = {};
  allDropdowns.forEach(d => {
    liveOptions[d.fieldKey] = (d.options ?? []) as OptionItem[];
  });

  const tabs: { id: "models" | "dropdowns" | "dependencies"; label: string; icon: React.ReactNode }[] = [
    { id: "models",       label: "Model Configs",     icon: <Settings size={12} /> },
    { id: "dropdowns",    label: "Dropdown Editor",   icon: <List size={12} /> },
    { id: "dependencies", label: "Dependency Rules",  icon: <Link2 size={12} /> },
  ];

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div style={{ display: "flex", gap: "2px", borderBottom: "1px solid var(--vipr-border)", paddingBottom: "0" }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            data-testid={`admin-tab-${tab.id}`}
            style={{
              display: "flex", alignItems: "center", gap: "5px",
              padding: "7px 14px", fontSize: "11px", fontWeight: 600,
              border: "none", background: "transparent", cursor: "pointer",
              borderBottom: activeTab === tab.id ? "2px solid var(--vipr-orange)" : "2px solid transparent",
              color: activeTab === tab.id ? "var(--vipr-orange)" : "var(--vipr-text-muted)",
              letterSpacing: "0.03em",
              transition: "color 0.15s",
            }}>
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "models" && <ModelConfigsTab liveOptions={liveOptions} />}
      {activeTab === "dropdowns" && (
        <DropdownEditorTab
          allDropdowns={allDropdowns}
          onSaved={() => refetchDropdowns()}
        />
      )}
      {activeTab === "dependencies" && <DependencyRulesTab allDropdowns={allDropdowns} />}
    </div>
  );
}
