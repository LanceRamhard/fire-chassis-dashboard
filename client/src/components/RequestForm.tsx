import { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Printer, Save, RefreshCw, Truck, Cog, Palette, FileText, Droplets, Armchair,
  GitBranch, AlertTriangle, CheckCircle2, ClipboardCheck,
} from "lucide-react";
import type { ChassisConfig, DropdownOptions, DependencyRule, RuleCondition } from "@shared/schema";
import { ruleConditions } from "@shared/schema";
import {
  MANUFACTURERS, APPARATUS_TYPES,
  ALL_ENGINES, ALL_HP, ALL_ENGINE_BRAKES, ALL_TRANSMISSIONS,
  ALL_FRONT_AXLES, ALL_REAR_AXLES, ALL_CABS, ALL_BRAKES,
  DRIVER_SEATS, OFFICER_SEATS, REAR_SEATS, SEAT_MATERIALS,
  SUN_VISORS, RAM_MOUNTS, REAR_VIEW_CAMERAS,
  PAINT_SCHEMES, AIR_HORN_CONTROLS, TANK_SCR, AIR_HORNS, BUMPERS, WHEELS,
  SALES_PERSONS, US_STATES, PTO_CONFIGS, PUMP_TYPES,
  FIELD_KEY_META, FIELD_DISPLAY_META,
  filterOptions, getHiddenFields,
} from "@/lib/chassis-data";

type OptionItem = { id: string; label: string; code?: string };

interface FormState {
  configName: string; manufacturer: string; truckModel: string; apparatusType: string;
  requestDate: string; dateRequired: string; salesPerson: string;
  customerName: string; city: string; state: string;
  cabConfig: string; caMeasurement: string; engine: string; engineHp: string;
  engineBrake: string; transmission: string; topSpeed: string;
  frontAxle: string; awd: boolean; rearAxle: string; diffLock: boolean; brakes: string;
  waterTankSize: string; pumpType: string; ptoConfig: string; heatExchanger: boolean;
  driverSeat: string; officerSeat: string; rearSeats: string; seatMaterial: string;
  sunVisor: string; ramMount: string; rearViewCamera: string;
  paintColor: string; paintCode: string; paintScheme: string;
  airHornControls: string; tankScr: string; airHorns: string;
  bumper: string; wheels: string; ledHeadlights: boolean; comments: string;
}

const EMPTY_FORM: FormState = {
  configName: "", manufacturer: "", truckModel: "", apparatusType: "",
  requestDate: new Date().toISOString().split("T")[0],
  dateRequired: new Date().toISOString().split("T")[0],
  salesPerson: "", customerName: "", city: "", state: "",
  cabConfig: "", caMeasurement: "", engine: "", engineHp: "",
  engineBrake: "", transmission: "", topSpeed: "",
  frontAxle: "", awd: false, rearAxle: "", diffLock: false, brakes: "",
  waterTankSize: "", pumpType: "", ptoConfig: "", heatExchanger: false,
  driverSeat: "", officerSeat: "", rearSeats: "", seatMaterial: "",
  sunVisor: "", ramMount: "", rearViewCamera: "",
  paintColor: "", paintCode: "", paintScheme: "",
  airHornControls: "", tankScr: "", airHorns: "",
  bumper: "", wheels: "", ledHeadlights: false, comments: "",
};

// Map FormState keys → dropdown fieldKey in the server
const FORM_KEY_TO_FIELD: Partial<Record<keyof FormState, string>> = {
  engine:          "engines",
  engineHp:        "hp",
  engineBrake:     "engineBrakes",
  transmission:    "transmissions",
  frontAxle:       "frontAxles",
  rearAxle:        "rearAxles",
  cabConfig:       "cabs",
  brakes:          "brakes",
  apparatusType:   "apparatusTypes",
  driverSeat:      "driverSeats",
  officerSeat:     "officerSeats",
  rearSeats:       "rearSeats",
  seatMaterial:    "seatMaterials",
  sunVisor:        "sunVisors",
  ramMount:        "ramMounts",
  rearViewCamera:  "rearViewCameras",
  paintScheme:     "paintSchemes",
  airHornControls: "airHornControls",
  tankScr:         "tankScr",
  airHorns:        "airHorns",
  bumper:          "bumpers",
  wheels:          "wheels",
  ptoConfig:       "ptoConfigs",
  pumpType:        "pumpTypes",
  salesPerson:     "salesPersons",
};

// Reverse map: dropdown fieldKey → FormState key
const FIELD_TO_FORM_KEY: Record<string, keyof FormState> = Object.fromEntries(
  Object.entries(FORM_KEY_TO_FIELD).map(([formKey, fieldKey]) => [fieldKey as string, formKey as keyof FormState])
) as Record<string, keyof FormState>;

// formKey → human label (for toasts, required list, summary)
const FORM_KEY_LABELS: Record<string, string> = {
  manufacturer: "Manufacturer",
  truckModel:   "Truck Model",
  ...Object.fromEntries(FIELD_DISPLAY_META.map(f => [f.key, f.label])),
};

// Selections the request can't be submitted to a manufacturer without
const REQUIRED_FIELDS: (keyof FormState)[] = [
  "manufacturer", "truckModel", "apparatusType", "engine", "transmission",
  "cabConfig", "frontAxle", "rearAxle",
];

// Module-level pending load — survives tab remounts.
// SavedRequests writes here; RequestForm reads + clears on mount.
let pendingLoad: { form: FormState; id: number } | null = null;

export function scheduleFormLoad(form: FormState, id: number) {
  pendingLoad = { form, id };
}

/* ── Primitive field components ─────────────────────────────────────────── */

function VLabel({ label, code, required }: { label: string; code?: string; required?: boolean }) {
  return (
    <div className="vipr-field-label">
      {label}
      {required && <span style={{ color: "var(--vipr-orange)" }}>*</span>}
      {code && <span className="code-badge">{code}</span>}
    </div>
  );
}

function FieldHint({ text }: { text: string }) {
  return (
    <div className="vipr-field-hint no-print">
      <GitBranch size={9} style={{ flexShrink: 0 }} />
      {text}
    </div>
  );
}

function VSection({ title, icon, id, progress, children }: {
  title: string; icon: React.ReactNode; id?: string;
  progress?: { done: number; total: number };
  children: React.ReactNode;
}) {
  return (
    <div className="vipr-card print-section" id={id}>
      <div className="vipr-card-header">
        <span style={{ color: "var(--vipr-orange)" }}>{icon}</span>
        <span className="vipr-card-header-title">{title}</span>
        {progress && progress.total > 0 && (
          <span className={`vipr-progress-chip no-print ${progress.done === progress.total ? "complete" : ""}`}>
            {progress.done}/{progress.total}
          </span>
        )}
      </div>
      <div className="vipr-card-body">
        {children}
      </div>
    </div>
  );
}

function VSelect({
  label, code, value, onChange, options, placeholder = "Select…", disabled = false, required, hint,
}: {
  label: string; code?: string; value: string; onChange: (v: string) => void;
  options: OptionItem[]; placeholder?: string; disabled?: boolean; required?: boolean; hint?: string;
}) {
  const empty = options.length === 0 && !disabled;
  return (
    <div>
      <VLabel label={label} code={code} required={required} />
      <Select value={value} onValueChange={onChange} disabled={disabled || empty}>
        <SelectTrigger className="vipr-select-trigger h-[30px] text-xs"
          data-testid={`select-${label.replace(/\s+/g, '-').toLowerCase()}`}>
          <SelectValue placeholder={empty ? "No options for this configuration" : placeholder} />
        </SelectTrigger>
        <SelectContent style={{ background: "var(--vipr-surface-2)", border: "1px solid var(--vipr-border)", color: "var(--vipr-text)" }}>
          {options.map(o => (
            <SelectItem key={o.id} value={o.id} className="text-xs" style={{ color: "var(--vipr-text)" }}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hint && <FieldHint text={hint} />}
    </div>
  );
}

function VSegmented({
  label, code, value, onChange, options, placeholder, disabled = false, required, hint,
}: {
  label: string; code?: string; value: string; onChange: (v: string) => void;
  options: OptionItem[]; placeholder?: string; disabled?: boolean; required?: boolean; hint?: string;
}) {
  const slug = label.replace(/\s+/g, '-').toLowerCase();
  return (
    <div>
      <VLabel label={label} code={code} required={required} />
      <div className="vipr-seg-group">
        {options.map(o => (
          <button
            key={o.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(o.id)}
            className={`vipr-seg-btn ${value === o.id ? "active" : ""}`}
            data-testid={`seg-${slug}-${o.id}`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {disabled && placeholder && (
        <div className="no-print" style={{ fontSize: "10px", color: "var(--vipr-text-faint)", marginTop: "3px" }}>
          {placeholder}
        </div>
      )}
      {hint && <FieldHint text={hint} />}
    </div>
  );
}

// Renders a segmented pill group when the option set is small enough to show
// at a glance, otherwise falls back to a dropdown.
function VChoice(props: Parameters<typeof VSelect>[0]) {
  const segmented =
    props.options.length > 0 &&
    props.options.length <= 4 &&
    props.options.every(o => o.label.length <= 18);
  return segmented ? <VSegmented {...props} /> : <VSelect {...props} />;
}

function VInput({
  label, code, value, onChange, placeholder = "", type = "text",
}: {
  label: string; code?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div>
      <VLabel label={label} code={code} />
      <input
        className="vipr-input"
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        data-testid={`input-${label.replace(/\s+/g, '-').toLowerCase()}`}
      />
    </div>
  );
}

function VCheck({ label, code, checked, onChange }: {
  label: string; code?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none py-0.5">
      <input
        type="checkbox"
        className="vipr-checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        data-testid={`checkbox-${label.replace(/\s+/g, '-').toLowerCase()}`}
      />
      <span className="text-xs" style={{ color: "var(--vipr-text-muted)" }}>
        {label}
        {code && <span className="code-badge ml-1">{code}</span>}
      </span>
    </label>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */
export default function RequestForm() {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | undefined>();

  // Consume any pending load written before this mount (from SavedRequests tab switch)
  useEffect(() => {
    if (pendingLoad) {
      setForm(pendingLoad.form);
      setEditingId(pendingLoad.id);
      pendingLoad = null;
    }
  }, []);

  // ── Data fetching ─────────────────────────────────────────────────────────
  const { data: configs = [] } = useQuery<ChassisConfig[]>({ queryKey: ["/api/configs"] });
  const { data: allDropdownRows = [] } = useQuery<DropdownOptions[]>({ queryKey: ["/api/dropdown-options"] });
  const { data: depRules = [] } = useQuery<DependencyRule[]>({ queryKey: ["/api/dependency-rules"] });

  // Build a convenient lookup: fieldKey → OptionItem[]
  // Falls back to the hardcoded chassis-data arrays when server data is absent (initial load)
  const liveOptions = useMemo<Record<string, OptionItem[]>>(() => {
    const map: Record<string, OptionItem[]> = {};
    allDropdownRows.forEach(d => {
      map[d.fieldKey] = (d.options ?? []) as unknown as OptionItem[];
    });
    // Fallbacks for fields not yet in the server
    if (!map.engines)          map.engines          = ALL_ENGINES;
    if (!map.hp)               map.hp               = ALL_HP;
    if (!map.engineBrakes)     map.engineBrakes     = ALL_ENGINE_BRAKES;
    if (!map.transmissions)    map.transmissions    = ALL_TRANSMISSIONS;
    if (!map.frontAxles)       map.frontAxles       = ALL_FRONT_AXLES;
    if (!map.rearAxles)        map.rearAxles        = ALL_REAR_AXLES;
    if (!map.cabs)             map.cabs             = ALL_CABS;
    if (!map.brakes)           map.brakes           = ALL_BRAKES;
    if (!map.apparatusTypes)   map.apparatusTypes   = APPARATUS_TYPES;
    if (!map.driverSeats)      map.driverSeats      = DRIVER_SEATS;
    if (!map.officerSeats)     map.officerSeats     = OFFICER_SEATS;
    if (!map.rearSeats)        map.rearSeats        = REAR_SEATS;
    if (!map.seatMaterials)    map.seatMaterials    = SEAT_MATERIALS;
    if (!map.sunVisors)        map.sunVisors        = SUN_VISORS;
    if (!map.ramMounts)        map.ramMounts        = RAM_MOUNTS;
    if (!map.rearViewCameras)  map.rearViewCameras  = REAR_VIEW_CAMERAS;
    if (!map.paintSchemes)     map.paintSchemes     = PAINT_SCHEMES;
    if (!map.airHornControls)  map.airHornControls  = AIR_HORN_CONTROLS;
    if (!map.tankScr)          map.tankScr          = TANK_SCR;
    if (!map.airHorns)         map.airHorns         = AIR_HORNS;
    if (!map.bumpers)          map.bumpers          = BUMPERS;
    if (!map.wheels)           map.wheels           = WHEELS;
    if (!map.ptoConfigs)       map.ptoConfigs       = PTO_CONFIGS;
    if (!map.pumpTypes)        map.pumpTypes        = PUMP_TYPES;
    if (!map.salesPersons)     map.salesPersons     = SALES_PERSONS;
    return map;
  }, [allDropdownRows]);

  // ── Dependency resolution ─────────────────────────────────────────────────
  const activeConfig = configs.find(
    c => c.manufacturer === form.manufacturer && c.modelId === form.truckModel
  );
  const modelRules = (activeConfig?.fieldRules ?? {}) as Record<string, string[]>;

  // Does a dependency rule fire given the current form values? A rule fires
  // when ALL of its conditions hold:
  //   in:     the source field's value is one of the condition's values
  //   not_in: the source field's value is NOT one of them — including when it
  //           is still empty, which gives "show only when …" semantics
  const conditionHolds = useCallback((c: RuleCondition): boolean => {
    const formKey = FIELD_TO_FORM_KEY[c.field];
    if (!formKey) return false;
    const cur = form[formKey];
    if (typeof cur !== "string") return false;
    const matched = c.values.includes(cur);
    return c.operator === "not_in" ? !matched : matched;
  }, [form]);

  const ruleFires = useCallback((rule: DependencyRule): boolean => {
    const conditions = ruleConditions(rule);
    return conditions.length > 0 && conditions.every(conditionHolds);
  }, [conditionHolds]);

  // Fields hidden by the model's admin config (render nothing at all)
  const modelHiddenFields = useMemo(
    () => new Set(getHiddenFields(activeConfig?.fieldRules as Record<string, unknown> | null | undefined)),
    [activeConfig]
  );

  // Fields hidden by a firing dependency rule (render an explanation instead)
  const ruleHiddenRules = useMemo(() => {
    const map = new Map<string, DependencyRule>();
    depRules.forEach(rule => {
      if (rule.action !== "hide" || !ruleFires(rule)) return;
      const thenFormKey = FIELD_TO_FORM_KEY[rule.thenField];
      if (thenFormKey && !map.has(thenFormKey)) map.set(thenFormKey, rule);
    });
    return map;
  }, [depRules, ruleFires]);

  const isHidden = useCallback(
    (formKey: keyof FormState) =>
      modelHiddenFields.has(formKey as string) || ruleHiddenRules.has(formKey as string),
    [modelHiddenFields, ruleHiddenRules]
  );

  // Human-readable reason a rule hides a field, e.g.
  //   in:     "not available with Cab Config: Regular Cab"
  //   not_in: "available with Cab Config: Crew Cab or Extended Cab only"
  const hiddenReason = useCallback((rule: DependencyRule): string => {
    const parts = ruleConditions(rule).map(c => {
      const srcLabel = FIELD_KEY_META[c.field]?.label ?? c.field;
      const valLabels = c.values
        .map(v => (liveOptions[c.field] ?? []).find(o => o.id === v)?.label ?? v)
        .join(" or ");
      return c.operator === "not_in"
        ? `available with ${srcLabel}: ${valLabels} only`
        : `not available with ${srcLabel}: ${valLabels}`;
    });
    return parts.join("; ");
  }, [liveOptions]);

  // Renders a field, or an explanation row when a dependency rule hides it.
  // Model-level hidden fields render nothing — the admin removed them on purpose.
  const show = (formKey: keyof FormState, node: React.ReactNode) => {
    if (modelHiddenFields.has(formKey as string)) return null;
    const rule = ruleHiddenRules.get(formKey as string);
    if (rule) {
      return (
        <div className="vipr-hidden-note no-print">
          <span className="field-name">{FORM_KEY_LABELS[formKey as string] ?? formKey}</span>
          {" — "}{hiddenReason(rule)}
        </div>
      );
    }
    return node;
  };
  // Rule-hidden fields still occupy the section (as an explanation row)
  const anyVisible = (...keys: (keyof FormState)[]) =>
    keys.some(k => !modelHiddenFields.has(k as string));

  const getOptions = useCallback((formKey: keyof FormState): OptionItem[] => {
    const fieldKey = FORM_KEY_TO_FIELD[formKey];
    if (!fieldKey) return [];

    const globalList = liveOptions[fieldKey] ?? [];

    // Step 1: Apply model-level whitelist
    const modelAllowed: string[] | null | undefined = modelRules[fieldKey];
    let result = filterOptions(globalList, modelAllowed);

    // Step 2: Intersect all firing "filter" rules targeting this field
    const firingRules = depRules.filter(rule =>
      rule.action !== "hide" && rule.thenField === fieldKey && ruleFires(rule)
    );
    if (firingRules.length > 0) {
      const allowedSets = firingRules.map(r => new Set((r.thenAllowedValues as unknown as string[]) ?? []));
      result = result.filter(opt => allowedSets.every(set => set.has(opt.id)));
    }

    return result;
  }, [liveOptions, modelRules, depRules, ruleFires]);

  // Inline hint naming the selection(s) that narrowed this field's options
  const filterHint = useCallback((formKey: keyof FormState): string | undefined => {
    const fieldKey = FORM_KEY_TO_FIELD[formKey];
    if (!fieldKey) return undefined;
    const firing = depRules.filter(r =>
      r.action !== "hide" && r.thenField === fieldKey && ruleFires(r)
    );
    if (firing.length === 0) return undefined;
    const parts = new Set<string>();
    firing.forEach(r => {
      ruleConditions(r).forEach(c => {
        const srcFormKey = FIELD_TO_FORM_KEY[c.field];
        const srcLabel = FIELD_KEY_META[c.field]?.label ?? c.field;
        const curVal = srcFormKey ? (form[srcFormKey] as string) : "";
        if (!curVal) {
          parts.add(`no ${srcLabel} selected`);
          return;
        }
        const valLabel = (liveOptions[c.field] ?? []).find(o => o.id === curVal)?.label ?? curVal;
        parts.add(`${srcLabel}: ${valLabel}`);
      });
    });
    return `Limited by ${Array.from(parts).join(", ")}`;
  }, [depRules, ruleFires, form, liveOptions]);

  // Count active dependency rules affecting any field
  const activeDeps = useMemo(() => depRules.filter(ruleFires).length, [depRules, ruleFires]);

  // ── Re-validation: clear any selection that is no longer offered ──────────
  // Runs after every change (and after loading a saved request), so stale
  // values can never linger when the model, rules, or upstream choices shift.
  useEffect(() => {
    const cleared: string[] = [];
    const updates: Partial<FormState> = {};

    // Model must exist for the chosen manufacturer (skip until configs load)
    if (configs.length > 0 && form.truckModel &&
        !configs.some(c => c.manufacturer === form.manufacturer && c.modelId === form.truckModel)) {
      updates.truckModel = "";
      cleared.push(FORM_KEY_LABELS.truckModel);
    }

    (Object.keys(FORM_KEY_TO_FIELD) as (keyof FormState)[]).forEach(k => {
      const v = form[k];
      if (typeof v !== "string" || !v) return;
      if (isHidden(k) || !getOptions(k).some(o => o.id === v)) {
        (updates as Record<string, unknown>)[k] = "";
        cleared.push(FORM_KEY_LABELS[k as string] ?? k);
      }
    });

    if (cleared.length > 0) {
      setForm(f => ({ ...f, ...updates }));
      toast({
        title: "Selections reset",
        description: `No longer available with this configuration: ${cleared.join(", ")}`,
      });
    }
  }, [form, configs, getOptions, isHidden, toast]);

  // ── Required fields & section progress ────────────────────────────────────
  const missingRequired = REQUIRED_FIELDS.filter(k => {
    if (k !== "manufacturer" && k !== "truckModel" && isHidden(k)) return false;
    const v = form[k];
    return !(typeof v === "string" && v);
  });

  // Completion across the section's string-valued fields (checkboxes excluded)
  const progressOf = (...keys: (keyof FormState)[]) => {
    const countable = keys.filter(k => !isHidden(k) && typeof form[k] === "string");
    const done = countable.filter(k => (form[k] as string).trim() !== "").length;
    return { done, total: countable.length };
  };

  // ── Form handlers ─────────────────────────────────────────────────────────
  const modelsForMfr = configs.filter(c => c.manufacturer === form.manufacturer);

  const handleMfr = useCallback((mfr: string) => {
    // Only the model must reset — re-validation clears anything else that the
    // next model doesn't offer, and keeps selections that remain valid.
    setForm(f => ({ ...f, manufacturer: mfr, truckModel: "" }));
  }, []);

  const up = (k: keyof FormState) => (v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }));

  // ── Save / persistence ────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      const name = form.configName || `${form.customerName || "Draft"} — ${MANUFACTURERS.find(m => m.id === form.manufacturer)?.label} ${form.truckModel}`;
      const payload = { configName: name, manufacturer: form.manufacturer, formData: form };
      return editingId
        ? apiRequest("PATCH", `/api/requests/${editingId}`, payload)
        : apiRequest("POST", "/api/requests", payload);
    },
    onSuccess: async res => {
      const data = await res.json();
      setEditingId(data.id);
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      toast({ title: "Saved", description: `"${data.configName}" saved.` });
    },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const mfrLabel = MANUFACTURERS.find(m => m.id === form.manufacturer)?.label ?? "";
  const modelLabel = modelsForMfr.find(c => c.modelId === form.truckModel)?.modelLabel ?? "";

  // ── Spec summary (sidebar) ────────────────────────────────────────────────
  const SECTION_IDS: Record<string, string> = {
    "Basic Information":  "section-basic",
    "Chassis Selection":  "section-chassis",
    "Engine & Drivetrain":"section-engine",
    "Axles & Brakes":     "section-axles",
    "Water & Pump":       "section-water",
    "Interior":           "section-interior",
    "Exterior":           "section-exterior",
    "Comments":           "section-comments",
  };

  const summary = useMemo(() => {
    const bySection = FIELD_DISPLAY_META.reduce<Record<string, typeof FIELD_DISPLAY_META>>((acc, f) => {
      (acc[f.section] ??= []).push(f);
      return acc;
    }, {});
    return Object.entries(bySection).map(([section, fields]) => {
      const items: { key: string; label: string; value: string; code?: string }[] = [];
      fields.forEach(f => {
        const k = f.key as keyof FormState;
        if (modelHiddenFields.has(f.key) || ruleHiddenRules.has(f.key)) return;
        const v = form[k];
        if (typeof v === "boolean") {
          if (v) items.push({ key: f.key, label: f.label, value: "Yes" });
          return;
        }
        if (!v) return;
        const fieldKey = FORM_KEY_TO_FIELD[k];
        if (fieldKey) {
          const opt = (liveOptions[fieldKey] ?? []).find(o => o.id === v);
          items.push({ key: f.key, label: f.label, value: opt?.label ?? v, code: opt?.code });
        } else if (k === "state") {
          items.push({ key: f.key, label: f.label, value: US_STATES.find(s => s.id === v)?.label ?? v });
        } else {
          items.push({ key: f.key, label: f.label, value: v.length > 48 ? v.slice(0, 48) + "…" : v });
        }
      });
      return { section, id: SECTION_IDS[section], items };
    }).filter(s => s.items.length > 0);
  }, [form, liveOptions, modelHiddenFields, ruleHiddenRules]);

  const scrollToSection = (id?: string) => {
    if (!id) return;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex gap-3 items-start">
      <div className="flex-1 min-w-0">

        {/* ── Toolbar ──────────────────────────────────────────────────────── */}
        <div className="no-print flex flex-wrap items-center gap-2 mb-4">
          <button className="vipr-btn-ghost" onClick={() => { setForm(EMPTY_FORM); setEditingId(undefined); }}>
            <RefreshCw size={12} /> New Form
          </button>
          <button
            className="vipr-btn-primary"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !form.manufacturer}
            data-testid="button-save"
          >
            <Save size={12} /> {editingId ? "Update" : "Save"} Request
          </button>
          <button className="vipr-btn-ghost" onClick={() => window.print()} data-testid="button-print">
            <Printer size={12} /> Print / PDF
          </button>
          {editingId && (
            <span className="text-xs px-2 py-0.5 rounded font-mono"
              style={{ background: "var(--vipr-orange-glow)", color: "var(--vipr-orange)", border: "1px solid rgba(249,115,22,0.3)" }}>
              Editing #{editingId}
            </span>
          )}
          {/* Required-field status */}
          {missingRequired.length > 0 ? (
            <span className="text-xs px-2 py-0.5 rounded flex items-center gap-1"
              title={`Missing: ${missingRequired.map(k => FORM_KEY_LABELS[k as string] ?? k).join(", ")}`}
              data-testid="badge-required-missing"
              style={{ background: "rgba(249,115,22,0.1)", color: "var(--vipr-orange)", border: "1px solid rgba(249,115,22,0.25)" }}>
              <AlertTriangle size={10} /> {missingRequired.length} required remaining
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded flex items-center gap-1"
              data-testid="badge-required-complete"
              style={{ background: "rgba(63,185,80,0.1)", color: "var(--vipr-green)", border: "1px solid rgba(63,185,80,0.25)" }}>
              <CheckCircle2 size={10} /> Required complete
            </span>
          )}
          {/* Live dependency indicator */}
          {activeDeps > 0 && (
            <span className="text-xs px-2 py-0.5 rounded flex items-center gap-1"
              style={{ background: "rgba(63,185,80,0.1)", color: "var(--vipr-green)", border: "1px solid rgba(63,185,80,0.25)" }}>
              <GitBranch size={10} /> {activeDeps} filter{activeDeps > 1 ? "s" : ""} active
            </span>
          )}
        </div>

        {/* ── Print header ─────────────────────────────────────────────────── */}
        <div className="hidden print-header" style={{ background: "#1e3a8a", color: "white", padding: "8px", borderRadius: "4px", marginBottom: "12px", textAlign: "center" }}>
          <div style={{ fontSize: "16pt", fontWeight: "bold" }}>🚒 FIRE CHASSIS REQUEST FORM</div>
          <div style={{ fontSize: "10pt", opacity: 0.85 }}>Midwest Fire Equipment — {mfrLabel} {modelLabel}</div>
        </div>

        <div className="space-y-3">

          {/* ── BASIC INFO ───────────────────────────────────────────────── */}
          {anyVisible("configName","requestDate","dateRequired","salesPerson","customerName","city","state") && (
            <VSection title="Basic Information" icon={<FileText size={13} />} id="section-basic"
              progress={progressOf("configName","requestDate","dateRequired","salesPerson","customerName","city","state")}>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {show("configName",   <VInput label="Config Name" value={form.configName} onChange={up("configName")} placeholder="Auto-generated" />)}
                {show("requestDate",  <VInput label="Request Date" value={form.requestDate} onChange={up("requestDate")} type="date" />)}
                {show("dateRequired", <VInput label="Date Required" value={form.dateRequired} onChange={up("dateRequired")} type="date" />)}
                {show("salesPerson",  <VSelect label="Sales Person" value={form.salesPerson} onChange={up("salesPerson")} options={getOptions("salesPerson")} />)}
                {show("customerName", <VInput label="Customer Name" value={form.customerName} onChange={up("customerName")} placeholder="Customer name" />)}
                {show("city",         <VInput label="City" value={form.city} onChange={up("city")} placeholder="City" />)}
                {show("state",        <VSelect label="State" value={form.state} onChange={up("state")} options={US_STATES} />)}
              </div>
            </VSection>
          )}

          {/* ── CHASSIS SELECTION ────────────────────────────────────────── */}
          <VSection title="Chassis Selection" icon={<Truck size={13} />} id="section-chassis"
            progress={progressOf("manufacturer","truckModel","apparatusType","cabConfig")}>
            <div className="flex flex-wrap items-end gap-4">
              {/* Manufacturer pills */}
              <div>
                <VLabel label="Manufacturer" required />
                <div className="flex gap-1.5 flex-wrap">
                  {MANUFACTURERS.map(m => (
                    <button
                      key={m.id}
                      data-testid={`mfr-${m.id}`}
                      onClick={() => handleMfr(m.id)}
                      className={`vipr-mfr-btn ${form.manufacturer === m.id ? "active" : ""}`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Model */}
              <div className="min-w-[160px]">
                <VSelect
                  label="Truck Model"
                  required
                  value={form.truckModel}
                  onChange={up("truckModel")}
                  options={modelsForMfr.map(c => ({ id: c.modelId, label: c.modelLabel }))}
                  disabled={!form.manufacturer}
                  placeholder={form.manufacturer ? "Select model…" : "Select manufacturer first"}
                />
              </div>

              {/* Cab config — drives seats, axles and more, so it lives up front */}
              {show("cabConfig",
                <VChoice label="Cab Config" code="829" required value={form.cabConfig} onChange={up("cabConfig")}
                  options={getOptions("cabConfig")} disabled={!form.truckModel}
                  placeholder={form.truckModel ? undefined : "Select model first"} hint={filterHint("cabConfig")} />
              )}

              {/* Apparatus type */}
              {show("apparatusType",
                <VChoice label="Apparatus Type" required value={form.apparatusType} onChange={up("apparatusType")}
                  options={getOptions("apparatusType")} disabled={!form.truckModel}
                  placeholder={form.truckModel ? undefined : "Select model first"} hint={filterHint("apparatusType")} />
              )}

              {/* Active model badge */}
              {form.manufacturer && form.truckModel && (
                <div className="flex items-end pb-0.5">
                  <span className={`mfr-${form.manufacturer} text-xs font-bold px-2.5 py-1 rounded`}
                    style={{ fontSize: "10px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    {mfrLabel} {modelLabel}
                  </span>
                </div>
              )}
            </div>
          </VSection>

          {/* ── 2-col specs ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

            {/* Engine & Drivetrain */}
            {anyVisible("engine","engineHp","engineBrake","transmission","topSpeed") && (
              <VSection title="Engine & Drivetrain" icon={<Cog size={13} />} id="section-engine"
                progress={progressOf("engine","engineHp","engineBrake","transmission","topSpeed")}>
                <div className="grid grid-cols-2 gap-3">
                  {show("engine",       <VSelect label="Engine" code="101" required value={form.engine} onChange={up("engine")}
                    options={getOptions("engine")} disabled={!form.truckModel}
                    placeholder={form.truckModel ? undefined : "Select model first"} hint={filterHint("engine")} />)}
                  {show("engineHp",     <VChoice label="Engine HP" value={form.engineHp} onChange={up("engineHp")}
                    options={getOptions("engineHp")} disabled={!form.truckModel}
                    placeholder={form.truckModel ? undefined : "Select model first"} hint={filterHint("engineHp")} />)}
                  {show("engineBrake",  <VChoice label="Engine Brake" code="128" value={form.engineBrake} onChange={up("engineBrake")}
                    options={getOptions("engineBrake")} hint={filterHint("engineBrake")} />)}
                  {show("transmission", <VChoice label="Transmission" code="342" required value={form.transmission} onChange={up("transmission")}
                    options={getOptions("transmission")} disabled={!form.truckModel}
                    placeholder={form.truckModel ? undefined : "Select model first"} hint={filterHint("transmission")} />)}
                  {show("topSpeed",     <VInput label="Top Speed" code="79A" value={form.topSpeed} onChange={up("topSpeed")}
                    placeholder="mph" type="number" />)}
                </div>
              </VSection>
            )}

            {/* Axles & Brakes */}
            {anyVisible("caMeasurement","frontAxle","awd","rearAxle","diffLock","brakes") && (
              <VSection title="Axles & Brakes" icon={<Cog size={13} />} id="section-axles"
                progress={progressOf("caMeasurement","frontAxle","rearAxle","brakes")}>
                <div className="grid grid-cols-2 gap-3">
                  {show("caMeasurement", <VInput label="CA Measurement" value={form.caMeasurement} onChange={up("caMeasurement")} placeholder='e.g. 84"' />)}
                  {show("brakes",
                    <VChoice label="Brakes" value={form.brakes} onChange={up("brakes")}
                      options={getOptions("brakes")} hint={filterHint("brakes")} />
                  )}
                  {anyVisible("frontAxle","awd") && (
                    <div>
                      {show("frontAxle", <VSelect label="Front Axle" code="400" required value={form.frontAxle} onChange={up("frontAxle")}
                        options={getOptions("frontAxle")} disabled={!form.truckModel}
                        placeholder={form.truckModel ? undefined : "Select model first"} hint={filterHint("frontAxle")} />)}
                      {show("awd", <div className="mt-1.5"><VCheck label="AWD" code="400" checked={form.awd} onChange={up("awd")} /></div>)}
                    </div>
                  )}
                  {anyVisible("rearAxle","diffLock") && (
                    <div>
                      {show("rearAxle", <VSelect label="Rear Axle" code="420" required value={form.rearAxle} onChange={up("rearAxle")}
                        options={getOptions("rearAxle")} disabled={!form.truckModel}
                        placeholder={form.truckModel ? undefined : "Select model first"} hint={filterHint("rearAxle")} />)}
                      {show("diffLock", <div className="mt-1.5"><VCheck label="Diff Lock" code="452" checked={form.diffLock} onChange={up("diffLock")} /></div>)}
                    </div>
                  )}
                </div>
              </VSection>
            )}
          </div>

          {/* ── Water & Pump ─────────────────────────────────────────────── */}
          {anyVisible("waterTankSize","pumpType","ptoConfig","heatExchanger") && (
            <VSection title="Water & Pump Systems" icon={<Droplets size={13} />} id="section-water"
              progress={progressOf("waterTankSize","pumpType","ptoConfig")}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {show("waterTankSize", <VInput label="Tank Size (gal)" value={form.waterTankSize} onChange={up("waterTankSize")} placeholder="gallons" type="number" />)}
                {show("pumpType",      <VChoice label="Pump Type" code="AA3" value={form.pumpType} onChange={up("pumpType")}
                  options={getOptions("pumpType")} hint={filterHint("pumpType")} />)}
                {show("ptoConfig",
                  <div className="col-span-2">
                    <VSelect label="PTO Configuration" code="362" value={form.ptoConfig} onChange={up("ptoConfig")}
                      options={getOptions("ptoConfig")} hint={filterHint("ptoConfig")} />
                  </div>
                )}
              </div>
              {show("heatExchanger",
                <div className="mt-2">
                  <VCheck label="Heat Exchanger Valves at Rear of Cab" code="689/724" checked={form.heatExchanger} onChange={up("heatExchanger")} />
                </div>
              )}
            </VSection>
          )}

          {/* ── Interior ────────────────────────────────────────────────── */}
          {anyVisible("driverSeat","officerSeat","rearSeats","seatMaterial","sunVisor","ramMount","rearViewCamera") && (
            <VSection title="Interior Configuration" icon={<Armchair size={13} />} id="section-interior"
              progress={progressOf("driverSeat","officerSeat","rearSeats","seatMaterial","sunVisor","ramMount","rearViewCamera")}>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {show("driverSeat",     <VChoice label="Driver Seat" code="756" value={form.driverSeat} onChange={up("driverSeat")}
                  options={getOptions("driverSeat")} hint={filterHint("driverSeat")} />)}
                {show("officerSeat",    <VSelect label="Officer Seat" code="760" value={form.officerSeat} onChange={up("officerSeat")}
                  options={getOptions("officerSeat")} hint={filterHint("officerSeat")} />)}
                {show("rearSeats",      <VSelect label="Rear Seats" code="762" value={form.rearSeats} onChange={up("rearSeats")}
                  options={getOptions("rearSeats")} hint={filterHint("rearSeats")} />)}
                {show("seatMaterial",   <VChoice label="Seat Material" code="758" value={form.seatMaterial} onChange={up("seatMaterial")}
                  options={getOptions("seatMaterial")} hint={filterHint("seatMaterial")} />)}
                {show("sunVisor",       <VChoice label="Sun Visor" code="764" value={form.sunVisor} onChange={up("sunVisor")}
                  options={getOptions("sunVisor")} hint={filterHint("sunVisor")} />)}
                {show("ramMount",       <VChoice label="Ram Mount" value={form.ramMount} onChange={up("ramMount")}
                  options={getOptions("ramMount")} hint={filterHint("ramMount")} />)}
                {show("rearViewCamera", <VChoice label="Rear View Camera" value={form.rearViewCamera} onChange={up("rearViewCamera")}
                  options={getOptions("rearViewCamera")} hint={filterHint("rearViewCamera")} />)}
              </div>
            </VSection>
          )}

          {/* ── Exterior ────────────────────────────────────────────────── */}
          {anyVisible("paintColor","paintCode","paintScheme","airHornControls","tankScr","airHorns","bumper","wheels","ledHeadlights") && (
            <VSection title="Exterior Configuration" icon={<Palette size={13} />} id="section-exterior"
              progress={progressOf("paintColor","paintCode","paintScheme","airHornControls","tankScr","airHorns","bumper","wheels")}>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {show("paintColor",      <VInput label="Paint Color" code="065" value={form.paintColor} onChange={up("paintColor")} placeholder="e.g. Red" />)}
                {show("paintCode",       <VInput label="Paint Code" value={form.paintCode} onChange={up("paintCode")} placeholder="e.g. PPG 70117" />)}
                {show("paintScheme",     <VSelect label="Paint Scheme" value={form.paintScheme} onChange={up("paintScheme")}
                  options={getOptions("paintScheme")} hint={filterHint("paintScheme")} />)}
                {show("airHornControls", <VSelect label="Air Horn Controls" code="264" value={form.airHornControls} onChange={up("airHornControls")}
                  options={getOptions("airHornControls")} hint={filterHint("airHornControls")} />)}
                {show("tankScr",         <VChoice label="Tank / SCR" code="677" value={form.tankScr} onChange={up("tankScr")}
                  options={getOptions("tankScr")} hint={filterHint("tankScr")} />)}
                {show("airHorns",        <VChoice label="Air Horns" code="727" value={form.airHorns} onChange={up("airHorns")}
                  options={getOptions("airHorns")} hint={filterHint("airHorns")} />)}
                {show("bumper",          <VSelect label="Bumper" code="556" value={form.bumper} onChange={up("bumper")}
                  options={getOptions("bumper")} hint={filterHint("bumper")} />)}
                {show("wheels",          <VSelect label="Wheels" code="502/505" value={form.wheels} onChange={up("wheels")}
                  options={getOptions("wheels")} hint={filterHint("wheels")} />)}
                {show("ledHeadlights",
                  <div className="flex items-end">
                    <VCheck label="LED Headlights" code="312" checked={form.ledHeadlights} onChange={up("ledHeadlights")} />
                  </div>
                )}
              </div>
            </VSection>
          )}

          {/* ── Comments ────────────────────────────────────────────────── */}
          {show("comments",
            <VSection title="Additional Comments & Specifications" icon={<FileText size={13} />} id="section-comments">
              <textarea
                value={form.comments}
                onChange={e => up("comments")(e.target.value)}
                rows={4}
                placeholder="Enter any additional specifications, requirements, or comments…"
                data-testid="textarea-comments"
                style={{
                  width: "100%",
                  background: "var(--vipr-bg)",
                  border: "1px solid var(--vipr-border)",
                  color: "var(--vipr-text)",
                  borderRadius: "4px",
                  padding: "8px",
                  fontSize: "12px",
                  resize: "vertical",
                  outline: "none",
                }}
                onFocus={e => { e.target.style.borderColor = "var(--vipr-orange)"; }}
                onBlur={e => { e.target.style.borderColor = "var(--vipr-border)"; }}
              />
            </VSection>
          )}

        </div>
      </div>

      {/* ── Spec summary sidebar ─────────────────────────────────────────── */}
      <aside className="no-print hidden xl:block w-60 shrink-0" style={{ position: "sticky", top: "12px" }}>
        <div className="vipr-card">
          <div className="vipr-card-header">
            <span style={{ color: "var(--vipr-orange)" }}><ClipboardCheck size={13} /></span>
            <span className="vipr-card-header-title">Spec Summary</span>
          </div>
          <div className="vipr-card-body" style={{ maxHeight: "calc(100vh - 140px)", overflowY: "auto" }}>
            {form.manufacturer && form.truckModel ? (
              <span className={`mfr-${form.manufacturer} text-xs font-bold px-2 py-0.5 rounded inline-block mb-2`}
                style={{ fontSize: "10px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                {mfrLabel} {modelLabel}
              </span>
            ) : (
              <div style={{ fontSize: "11px", color: "var(--vipr-text-faint)", marginBottom: "8px" }}>
                No chassis selected yet
              </div>
            )}

            {missingRequired.length > 0 && (
              <div style={{ fontSize: "10px", color: "var(--vipr-orange)", marginBottom: "10px", lineHeight: 1.5 }}>
                <AlertTriangle size={10} style={{ display: "inline", marginRight: "3px", verticalAlign: "-1px" }} />
                Required: {missingRequired.map(k => FORM_KEY_LABELS[k as string] ?? k).join(", ")}
              </div>
            )}

            {summary.map(s => (
              <div key={s.section} style={{ marginBottom: "10px" }}>
                <button
                  type="button"
                  onClick={() => scrollToSection(s.id)}
                  style={{
                    background: "none", border: "none", cursor: "pointer", padding: 0,
                    fontSize: "9px", fontWeight: 700, letterSpacing: "0.07em",
                    textTransform: "uppercase", color: "var(--vipr-text-muted)", marginBottom: "4px",
                  }}>
                  {s.section}
                </button>
                {s.items.map(item => (
                  <div key={item.key} style={{ display: "flex", justifyContent: "space-between", gap: "8px", fontSize: "10px", padding: "1.5px 0" }}>
                    <span style={{ color: "var(--vipr-text-faint)", flexShrink: 0 }}>{item.label}</span>
                    <span style={{ color: "var(--vipr-text)", textAlign: "right" }}>
                      {item.value}
                      {item.code && <span className="code-badge ml-1">{item.code}</span>}
                    </span>
                  </div>
                ))}
              </div>
            ))}

            {summary.length === 0 && (
              <div style={{ fontSize: "10px", color: "var(--vipr-text-faint)" }}>
                Selections appear here as you build the spec.
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
