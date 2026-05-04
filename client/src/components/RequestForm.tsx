import { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Save, RefreshCw, Truck, Cog, Layers, Palette, FileText, Droplets, Armchair, FlameKindling, GitBranch } from "lucide-react";
import type { ChassisConfig, DropdownOptions, DependencyRule } from "@shared/schema";
import {
  MANUFACTURERS, APPARATUS_TYPES,
  ALL_ENGINES, ALL_HP, ALL_ENGINE_BRAKES, ALL_TRANSMISSIONS,
  ALL_FRONT_AXLES, ALL_REAR_AXLES, ALL_CABS, ALL_BRAKES,
  DRIVER_SEATS, OFFICER_SEATS, REAR_SEATS, SEAT_MATERIALS,
  SUN_VISORS, RAM_MOUNTS, REAR_VIEW_CAMERAS,
  PAINT_SCHEMES, AIR_HORN_CONTROLS, TANK_SCR, AIR_HORNS, BUMPERS, WHEELS,
  SALES_PERSONS, US_STATES, PTO_CONFIGS, PUMP_TYPES,
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

// Module-level pending load — survives tab remounts.
// SavedRequests writes here; RequestForm reads + clears on mount.
let pendingLoad: { form: FormState; id: number } | null = null;

export function scheduleFormLoad(form: FormState, id: number) {
  pendingLoad = { form, id };
}

// Keep legacy export so SavedRequests import doesn't break at compile time
export let currentFormSetter: ((f: FormState) => void) | null = null;

/* ── Primitive field components ─────────────────────────────────────────── */

function VLabel({ label, code }: { label: string; code?: string }) {
  return (
    <div className="vipr-field-label">
      {label}
      {code && <span className="code-badge">{code}</span>}
    </div>
  );
}

function VSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="vipr-card print-section">
      <div className="vipr-card-header">
        <span style={{ color: "var(--vipr-orange)" }}>{icon}</span>
        <span className="vipr-card-header-title">{title}</span>
      </div>
      <div className="vipr-card-body">
        {children}
      </div>
    </div>
  );
}

function VSelect({
  label, code, value, onChange, options, placeholder = "Select…", disabled = false,
}: {
  label: string; code?: string; value: string; onChange: (v: string) => void;
  options: OptionItem[]; placeholder?: string; disabled?: boolean;
}) {
  return (
    <div>
      <VLabel label={label} code={code} />
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="vipr-select-trigger h-[30px] text-xs"
          data-testid={`select-${label.replace(/\s+/g, '-').toLowerCase()}`}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent style={{ background: "var(--vipr-surface-2)", border: "1px solid var(--vipr-border)", color: "var(--vipr-text)" }}>
          {options.map(o => (
            <SelectItem key={o.id} value={o.id} className="text-xs" style={{ color: "var(--vipr-text)" }}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
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

  currentFormSetter = setForm;

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
      map[d.fieldKey] = (d.options ?? []) as OptionItem[];
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
  // Returns the final allowed IDs for a given formKey, after applying:
  //   1. Model-level fieldRules (per-model whitelist)
  //   2. Dependency rules triggered by current form values
  const activeConfig = configs.find(
    c => c.manufacturer === form.manufacturer && c.modelId === form.truckModel
  );
  const modelRules = (activeConfig?.fieldRules ?? {}) as Record<string, string[]>;

  // Per-model field visibility. When no model is selected (or the model has
  // no hidden list), every field renders. Additionally, dependency rules with
  // action="hide" can hide fields when their condition fires.
  const hiddenFields = useMemo(() => {
    const set = new Set(getHiddenFields(activeConfig?.fieldRules as Record<string, unknown> | null | undefined));
    (depRules as DependencyRule[]).forEach(rule => {
      if (rule.action !== "hide") return;
      const ifFormKey = Object.entries(FORM_KEY_TO_FIELD).find(([, v]) => v === rule.ifField)?.[0] as keyof FormState | undefined;
      if (!ifFormKey) return;
      const currentVal = form[ifFormKey];
      if (typeof currentVal !== "string" || currentVal !== rule.ifValue) return;
      const thenFormKey = Object.entries(FORM_KEY_TO_FIELD).find(([, v]) => v === rule.thenField)?.[0];
      if (thenFormKey) set.add(thenFormKey);
    });
    return set;
  }, [activeConfig, depRules, form]);
  const isHidden = (formKey: keyof FormState) => hiddenFields.has(formKey as string);
  const show = (formKey: keyof FormState, node: React.ReactNode) =>
    isHidden(formKey) ? null : node;
  const anyVisible = (...keys: (keyof FormState)[]) => keys.some(k => !isHidden(k));

  const getOptions = useCallback((formKey: keyof FormState): OptionItem[] => {
    const fieldKey = FORM_KEY_TO_FIELD[formKey];
    if (!fieldKey) return [];

    const globalList = liveOptions[fieldKey] ?? [];

    // Step 1: Apply model-level whitelist (uses old fieldRules keys which map identically)
    // The fieldRules keys in the DB match the fieldKey names for vehicle fields
    const modelAllowed: string[] | null | undefined = modelRules[fieldKey];
    let step1 = filterOptions(globalList, modelAllowed);

    // Step 2: Apply any dependency rules that fire given the current form values
    // A rule fires when form[rule.ifField] === rule.ifValue AND rule.thenField === this field.
    // Only "filter" rules narrow the option list; "hide" rules are handled by hiddenFields.
    const firingRules = (depRules as DependencyRule[]).filter(rule => {
      if (rule.action === "hide") return false;
      if (rule.thenField !== fieldKey) return false;
      // Find which FormState key maps to the ifField
      const ifFormKey = Object.entries(FORM_KEY_TO_FIELD).find(([, v]) => v === rule.ifField)?.[0] as keyof FormState | undefined;
      if (!ifFormKey) return false;
      const currentVal = form[ifFormKey];
      return typeof currentVal === "string" && currentVal === rule.ifValue;
    });

    if (firingRules.length > 0) {
      // Intersect all firing rules (most restrictive wins)
      const allowedSets = firingRules.map(r => new Set((r.thenAllowedValues as string[]) ?? []));
      step1 = step1.filter(opt => allowedSets.every(set => set.has(opt.id)));
    }

    return step1;
  }, [liveOptions, modelRules, depRules, form]);

  // Count active dependency rules affecting any field
  const activeDeps = useMemo(() => {
    return (depRules as DependencyRule[]).filter(rule => {
      const ifFormKey = Object.entries(FORM_KEY_TO_FIELD).find(([, v]) => v === rule.ifField)?.[0] as keyof FormState | undefined;
      if (!ifFormKey) return false;
      const currentVal = form[ifFormKey];
      return typeof currentVal === "string" && currentVal === rule.ifValue;
    }).length;
  }, [depRules, form]);

  // ── Form handlers ─────────────────────────────────────────────────────────
  const modelsForMfr = configs.filter(c => c.manufacturer === form.manufacturer);

  const handleMfr = useCallback((mfr: string) => {
    setForm(f => ({ ...f, manufacturer: mfr, truckModel: "", engine: "", transmission: "", engineHp: "", frontAxle: "", rearAxle: "", cabConfig: "", brakes: "", apparatusType: "" }));
  }, []);

  const handleModel = useCallback((model: string) => {
    setForm(f => ({ ...f, truckModel: model, engine: "", transmission: "", engineHp: "", frontAxle: "", rearAxle: "", cabConfig: "", brakes: "", apparatusType: "" }));
  }, []);

  // When a dependency-source field changes, clear any downstream fields that may
  // now have invalid values (their current value might not be in the new filtered list).
  const handleFieldChange = useCallback((formKey: keyof FormState, value: string) => {
    setForm(prev => {
      const updated = { ...prev, [formKey]: value };
      const fieldKey = FORM_KEY_TO_FIELD[formKey];
      if (!fieldKey) return updated;

      // Find all rules triggered by this field change
      const triggeredRules = (depRules as DependencyRule[]).filter(r => r.ifField === fieldKey && r.ifValue === value);

      if (triggeredRules.length > 0) {
        // Clear downstream fields where the current value would be excluded
        triggeredRules.forEach(rule => {
          const thenFormKey = Object.entries(FORM_KEY_TO_FIELD).find(([, v]) => v === rule.thenField)?.[0] as keyof FormState | undefined;
          if (!thenFormKey) return;
          const allowed = (rule.thenAllowedValues as string[]) ?? [];
          const curVal = updated[thenFormKey];
          if (typeof curVal === "string" && curVal && !allowed.includes(curVal)) {
            (updated as Record<string, unknown>)[thenFormKey] = "";
          }
        });
      }

      return updated;
    });
  }, [depRules]);

  const up = (k: keyof FormState) => (v: string | boolean) => {
    if (typeof v === "string") {
      handleFieldChange(k, v);
    } else {
      setForm(f => ({ ...f, [k]: v }));
    }
  };

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

  return (
    <div>
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
          <VSection title="Basic Information" icon={<FileText size={13} />}>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {show("configName",   <VInput label="Config Name" value={form.configName} onChange={up("configName")} placeholder="Auto-generated" />)}
              {show("requestDate",  <VInput label="Request Date" value={form.requestDate} onChange={up("requestDate")} type="date" />)}
              {show("dateRequired", <VInput label="Date Required" value={form.dateRequired} onChange={up("dateRequired")} type="date" />)}
              {show("salesPerson",  <VSelect label="Sales Person" value={form.salesPerson} onChange={up("salesPerson")} options={liveOptions.salesPersons ?? SALES_PERSONS} />)}
              {show("customerName", <VInput label="Customer Name" value={form.customerName} onChange={up("customerName")} placeholder="Customer name" />)}
              {show("city",         <VInput label="City" value={form.city} onChange={up("city")} placeholder="City" />)}
              {show("state",        <VSelect label="State" value={form.state} onChange={up("state")} options={US_STATES} />)}
            </div>
          </VSection>
        )}

        {/* ── CHASSIS SELECTION ────────────────────────────────────────── */}
        <VSection title="Chassis Selection" icon={<Truck size={13} />}>
          <div className="flex flex-wrap items-end gap-4">
            {/* Manufacturer pills */}
            <div>
              <div className="vipr-field-label">Manufacturer</div>
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
                value={form.truckModel}
                onChange={handleModel}
                options={modelsForMfr.map(c => ({ id: c.modelId, label: c.modelLabel }))}
                disabled={!form.manufacturer}
                placeholder={form.manufacturer ? "Select model…" : "Select mfr first"}
              />
            </div>

            {/* Apparatus type */}
            {show("apparatusType",
              <div className="min-w-[160px]">
                <VSelect
                  label="Apparatus Type"
                  value={form.apparatusType}
                  onChange={up("apparatusType")}
                  options={getOptions("apparatusType")}
                />
              </div>
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
            <VSection title="Engine & Drivetrain" icon={<Cog size={13} />}>
              <div className="grid grid-cols-2 gap-3">
                {show("engine",       <VSelect label="Engine" code="101" value={form.engine} onChange={up("engine")}
                  options={getOptions("engine")} disabled={!form.truckModel} />)}
                {show("engineHp",     <VSelect label="Engine HP" value={form.engineHp} onChange={up("engineHp")}
                  options={getOptions("engineHp")} disabled={!form.truckModel} />)}
                {show("engineBrake",  <VSelect label="Engine Brake" code="128" value={form.engineBrake} onChange={up("engineBrake")}
                  options={getOptions("engineBrake")} />)}
                {show("transmission", <VSelect label="Transmission" code="342" value={form.transmission} onChange={up("transmission")}
                  options={getOptions("transmission")} disabled={!form.truckModel} />)}
                {show("topSpeed",     <VInput label="Top Speed" code="79A" value={form.topSpeed} onChange={up("topSpeed")}
                  placeholder="mph" type="number" />)}
              </div>
            </VSection>
          )}

          {/* Axles & Brakes */}
          {anyVisible("cabConfig","caMeasurement","frontAxle","awd","rearAxle","diffLock","brakes") && (
            <VSection title="Axles & Brakes" icon={<Cog size={13} />}>
              <div className="grid grid-cols-2 gap-3">
                {show("cabConfig",     <VSelect label="Cab Config" code="829" value={form.cabConfig} onChange={up("cabConfig")}
                  options={getOptions("cabConfig")} disabled={!form.truckModel} />)}
                {show("caMeasurement", <VInput label="CA Measurement" value={form.caMeasurement} onChange={up("caMeasurement")} placeholder='e.g. 84"' />)}
                {anyVisible("frontAxle","awd") && (
                  <div>
                    {show("frontAxle", <VSelect label="Front Axle" code="400" value={form.frontAxle} onChange={up("frontAxle")}
                      options={getOptions("frontAxle")} disabled={!form.truckModel} />)}
                    {show("awd", <div className="mt-1.5"><VCheck label="AWD" code="400" checked={form.awd} onChange={up("awd")} /></div>)}
                  </div>
                )}
                {anyVisible("rearAxle","diffLock") && (
                  <div>
                    {show("rearAxle", <VSelect label="Rear Axle" code="420" value={form.rearAxle} onChange={up("rearAxle")}
                      options={getOptions("rearAxle")} disabled={!form.truckModel} />)}
                    {show("diffLock", <div className="mt-1.5"><VCheck label="Diff Lock" code="452" checked={form.diffLock} onChange={up("diffLock")} /></div>)}
                  </div>
                )}
                {show("brakes",
                  <div className="col-span-2">
                    <VSelect label="Brakes" value={form.brakes} onChange={up("brakes")}
                      options={getOptions("brakes")} />
                  </div>
                )}
              </div>
            </VSection>
          )}
        </div>

        {/* ── Water & Pump ─────────────────────────────────────────────── */}
        {anyVisible("waterTankSize","pumpType","ptoConfig","heatExchanger") && (
          <VSection title="Water & Pump Systems" icon={<Droplets size={13} />}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {show("waterTankSize", <VInput label="Tank Size (gal)" value={form.waterTankSize} onChange={up("waterTankSize")} placeholder="gallons" type="number" />)}
              {show("pumpType",      <VSelect label="Pump Type" code="AA3" value={form.pumpType} onChange={up("pumpType")} options={getOptions("pumpType")} />)}
              {show("ptoConfig",
                <div className="col-span-2">
                  <VSelect label="PTO Configuration" code="362" value={form.ptoConfig} onChange={up("ptoConfig")} options={getOptions("ptoConfig")} />
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
          <VSection title="Interior Configuration" icon={<Armchair size={13} />}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {show("driverSeat",     <VSelect label="Driver Seat" code="756" value={form.driverSeat} onChange={up("driverSeat")} options={getOptions("driverSeat")} />)}
              {show("officerSeat",    <VSelect label="Officer Seat" code="760" value={form.officerSeat} onChange={up("officerSeat")} options={getOptions("officerSeat")} />)}
              {show("rearSeats",      <VSelect label="Rear Seats" code="762" value={form.rearSeats} onChange={up("rearSeats")} options={getOptions("rearSeats")} />)}
              {show("seatMaterial",   <VSelect label="Seat Material" code="758" value={form.seatMaterial} onChange={up("seatMaterial")} options={getOptions("seatMaterial")} />)}
              {show("sunVisor",       <VSelect label="Sun Visor" code="764" value={form.sunVisor} onChange={up("sunVisor")} options={getOptions("sunVisor")} />)}
              {show("ramMount",       <VSelect label="Ram Mount" value={form.ramMount} onChange={up("ramMount")} options={getOptions("ramMount")} />)}
              {show("rearViewCamera", <VSelect label="Rear View Camera" value={form.rearViewCamera} onChange={up("rearViewCamera")} options={getOptions("rearViewCamera")} />)}
            </div>
          </VSection>
        )}

        {/* ── Exterior ────────────────────────────────────────────────── */}
        {anyVisible("paintColor","paintCode","paintScheme","airHornControls","tankScr","airHorns","bumper","wheels","ledHeadlights") && (
          <VSection title="Exterior Configuration" icon={<Palette size={13} />}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {show("paintColor",      <VInput label="Paint Color" code="065" value={form.paintColor} onChange={up("paintColor")} placeholder="e.g. Red" />)}
              {show("paintCode",       <VInput label="Paint Code" value={form.paintCode} onChange={up("paintCode")} placeholder="e.g. PPG 70117" />)}
              {show("paintScheme",     <VSelect label="Paint Scheme" value={form.paintScheme} onChange={up("paintScheme")} options={getOptions("paintScheme")} />)}
              {show("airHornControls", <VSelect label="Air Horn Controls" code="264" value={form.airHornControls} onChange={up("airHornControls")} options={getOptions("airHornControls")} />)}
              {show("tankScr",         <VSelect label="Tank / SCR" code="677" value={form.tankScr} onChange={up("tankScr")} options={getOptions("tankScr")} />)}
              {show("airHorns",        <VSelect label="Air Horns" code="727" value={form.airHorns} onChange={up("airHorns")} options={getOptions("airHorns")} />)}
              {show("bumper",          <VSelect label="Bumper" code="556" value={form.bumper} onChange={up("bumper")} options={getOptions("bumper")} />)}
              {show("wheels",          <VSelect label="Wheels" code="502/505" value={form.wheels} onChange={up("wheels")} options={getOptions("wheels")} />)}
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
          <VSection title="Additional Comments & Specifications" icon={<FileText size={13} />}>
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
  );
}
