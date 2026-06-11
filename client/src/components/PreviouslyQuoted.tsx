import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, API_BASE, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Upload, Trash2, Search, FileText, Truck, Calendar, DollarSign, Download, Paperclip, FileQuestion, Link2,
  Cog, Gauge, ArrowUp, ArrowDown, SlidersHorizontal, X, FolderOpen, MapPin,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { QuoteWithFiles, ChassisRequest, ChassisConfig } from "@shared/schema";
import { MANUFACTURERS, APPARATUS_TYPES, ALL_CABS, ALL_ENGINES, ALL_FRONT_AXLES, ALL_REAR_AXLES } from "@/lib/chassis-data";
import { scheduleFormLoad } from "./RequestForm";
import { format } from "date-fns";

// Resolve a request's truck-model id (e.g. "m2_106") to its label ("M2 106").
function modelLabelFor(req: ChassisRequest, configs: ChassisConfig[]): string {
  const fd = req.formData as any;
  if (!fd?.truckModel) return "";
  return configs.find(c => c.manufacturer === req.manufacturer && c.modelId === fd.truckModel)?.modelLabel
    ?? fd.truckModel;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Price formatting ─────────────────────────────────────────────────────────
// Quoted prices are whole dollars. As the user types we group digits and prefix a
// "$" so the field reads "$100,000". On the cards the dollar sign is drawn as an
// icon, so the display helper returns the grouped digits without the "$".
function formatPriceInput(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "");
  return digits ? `$${Number(digits).toLocaleString("en-US")}` : "";
}

function formatPriceDisplay(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "");
  return digits ? Number(digits).toLocaleString("en-US") : raw.replace(/^\$/, "");
}

// ─── Unified grid row ─────────────────────────────────────────────────────────
// Saved requests and uploaded quotes share one grid, so each is normalized to a
// common shape for searching, filtering, sorting and the shared card header/specs.
// Spec ids (cab/engine/axles) live in columns on quotes and in formData on
// requests; truckModel is normalized to its label so the two kinds line up.
interface Row {
  key: string;
  kind: "quote" | "request";
  quote?: QuoteWithFiles;
  request?: ChassisRequest;
  manufacturer: string;
  title: string;
  subtitle: string | null;        // quote notes / request customer name
  truckModel: string | null;      // resolved label
  apparatusType: string | null;
  cabConfig: string | null;
  engine: string | null;
  frontAxle: string | null;
  rearAxle: string | null;
  price: string | null;           // quotes only
  quoteDate: string | null;       // quotes only
  createdAt: Date;
  searchText: string;
}

function quoteRow(q: QuoteWithFiles): Row {
  return {
    key: `q${q.id}`, kind: "quote", quote: q,
    manufacturer: q.manufacturer,
    title: q.title,
    subtitle: q.notes || null,
    truckModel: q.truckModel || null,
    apparatusType: q.apparatusType || null,
    cabConfig: q.cabConfig || null,
    engine: q.engine || null,
    frontAxle: q.frontAxle || null,
    rearAxle: q.rearAxle || null,
    price: q.quotedPrice || null,
    quoteDate: q.quoteDate || null,
    createdAt: new Date(q.createdAt),
    searchText: [q.title, q.truckModel, q.notes, ...q.files.map(f => f.originalName)]
      .filter(Boolean).join(" ").toLowerCase(),
  };
}

function requestRow(r: ChassisRequest, configs: ChassisConfig[]): Row {
  const fd = r.formData as any;
  return {
    key: `r${r.id}`, kind: "request", request: r,
    manufacturer: r.manufacturer,
    title: r.configName,
    subtitle: fd.customerName || null,
    truckModel: modelLabelFor(r, configs) || null,
    apparatusType: fd.apparatusType || null,
    cabConfig: fd.cabConfig || null,
    engine: fd.engine || null,
    frontAxle: fd.frontAxle || null,
    rearAxle: fd.rearAxle || null,
    price: null,
    quoteDate: null,
    createdAt: new Date(r.createdAt),
    searchText: [r.configName, fd.customerName, fd.city, fd.state]
      .filter(Boolean).join(" ").toLowerCase(),
  };
}

// ─── Sorting ──────────────────────────────────────────────────────────────────
type SortKey =
  | "added" | "quoteDate" | "price" | "title" | "model"
  | "manufacturer" | "cab" | "engine" | "frontAxle" | "rearAxle";

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: "added",        label: "Date Added" },
  { id: "quoteDate",    label: "Quote Date" },
  { id: "price",        label: "Price" },
  { id: "title",        label: "Title" },
  { id: "model",        label: "Model" },
  { id: "manufacturer", label: "Manufacturer" },
  { id: "cab",          label: "Cab Type" },
  { id: "engine",       label: "Engine" },
  { id: "frontAxle",    label: "Front Axle" },
  { id: "rearAxle",     label: "Rear Axle" },
];

// Parse the numeric portion of a value (price, axle weight) — "$187,450" → 187450,
// "14,600 Lbs" → 14600. Returns null when there's nothing to compare.
function numericOf(s: string | null | undefined): number | null {
  if (!s) return null;
  const n = parseInt(s.replace(/[^0-9]/g, ""), 10);
  return Number.isNaN(n) ? null : n;
}

// The axle id (e.g. "14.6k") maps to a label whose number is the rating, so sort
// by that weight rather than the id/label string.
function axleWeight(list: { id: string; label: string }[], id: string | null): number | null {
  return numericOf(list.find(o => o.id === id)?.label);
}

// Comparable value for a row under the chosen sort key. Numbers sort numerically,
// strings case-insensitively; null means "no value" and always sorts last.
function sortValue(r: Row, key: SortKey): number | string | null {
  switch (key) {
    case "added":        return r.createdAt.getTime();
    case "quoteDate":    return r.quoteDate ? new Date(`${r.quoteDate}T00:00:00`).getTime() : null;
    case "price":        return numericOf(r.price);
    case "title":        return r.title.toLowerCase() || null;
    case "model":        return r.truckModel?.toLowerCase() || null;
    case "manufacturer": return (MANUFACTURERS.find(m => m.id === r.manufacturer)?.label ?? r.manufacturer).toLowerCase() || null;
    case "cab":          return ALL_CABS.find(o => o.id === r.cabConfig)?.label.toLowerCase() ?? null;
    case "engine":       return ALL_ENGINES.find(o => o.id === r.engine)?.label.toLowerCase() ?? null;
    case "frontAxle":    return axleWeight(ALL_FRONT_AXLES, r.frontAxle);
    case "rearAxle":     return axleWeight(ALL_REAR_AXLES, r.rearAxle);
  }
}

function sortRows(list: Row[], key: SortKey, dir: "asc" | "desc"): Row[] {
  return [...list].sort((a, b) => {
    const av = sortValue(a, key);
    const bv = sortValue(b, key);
    // Rows missing the sorted field sink to the bottom regardless of direction.
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = typeof av === "number" && typeof bv === "number"
      ? av - bv
      : String(av).localeCompare(String(bv));
    return dir === "asc" ? cmp : -cmp;
  });
}

// ─── Filtering ──────────────────────────────────────────────────────────────
// The component-style filters and how each picks its value off a row.
type SpecFilterKey = "model" | "cab" | "engine" | "frontAxle" | "rearAxle";

const SPEC_FILTERS: { key: SpecFilterKey; label: string; pick: (r: Row) => string | null }[] = [
  { key: "model",     label: "Model",      pick: r => r.truckModel },
  { key: "cab",       label: "Cab",        pick: r => r.cabConfig },
  { key: "engine",    label: "Engine",     pick: r => r.engine },
  { key: "frontAxle", label: "Front Axle", pick: r => r.frontAxle },
  { key: "rearAxle",  label: "Rear Axle",  pick: r => r.rearAxle },
];

type SpecFilters = Record<SpecFilterKey, string>;
const NO_SPEC_FILTERS: SpecFilters = { model: "all", cab: "all", engine: "all", frontAxle: "all", rearAxle: "all" };

// The selectable values for a spec filter, drawn only from values that actually
// appear in the supplied rows so the dropdowns never offer empty results.
// Option-id fields (cab/engine/axles) map through their master tables for labels
// and ordering; truckModel is already a label, so distinct values are sorted as-is.
function specFilterOptions(rows: Row[], key: SpecFilterKey): { id: string; label: string }[] {
  const pick = SPEC_FILTERS.find(f => f.key === key)!.pick;
  const present = new Set(rows.map(pick).filter((v): v is string => !!v));
  if (key === "model") {
    return Array.from(present).sort((a, b) => a.localeCompare(b)).map(v => ({ id: v, label: v.toUpperCase() }));
  }
  const list: Record<Exclude<SpecFilterKey, "model">, { id: string; label: string }[]> = {
    cab: ALL_CABS as any, engine: ALL_ENGINES as any,
    frontAxle: ALL_FRONT_AXLES as any, rearAxle: ALL_REAR_AXLES as any,
  };
  return list[key as Exclude<SpecFilterKey, "model">].filter(o => present.has(o.id))
    .map(o => ({ id: o.id, label: o.label }));
}

function FilterSelect(
  { label, value, options, onChange, testId }:
  { label: string; value: string; options: { id: string; label: string }[]; onChange: (v: string) => void; testId: string }
) {
  const active = value !== "all";
  return (
    <select
      className="vipr-input"
      style={{ width: "auto", paddingRight: "24px", borderColor: active ? "var(--vipr-orange)" : undefined, color: active ? "var(--vipr-text)" : "var(--vipr-text-muted)" }}
      value={value}
      onChange={e => onChange(e.target.value)}
      data-testid={testId}
    >
      <option value="all">{label}: All</option>
      {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
    </select>
  );
}

// ─── Upload dialog ────────────────────────────────────────────────────────────
export function UploadQuoteDialog(
  { presetRequestId, trigger }: { presetRequestId?: number; trigger?: React.ReactNode } = {}
) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [title, setTitle] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [truckModel, setTruckModel] = useState("");
  const [apparatusType, setApparatusType] = useState("");
  const [cabConfig, setCabConfig] = useState("");
  const [engine, setEngine] = useState("");
  const [frontAxle, setFrontAxle] = useState("");
  const [rearAxle, setRearAxle] = useState("");
  const [quotedPrice, setQuotedPrice] = useState("");
  const [quoteDate, setQuoteDate] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: requests = [] } = useQuery<ChassisRequest[]>({ queryKey: ["/api/requests"] });
  const { data: configs = [] } = useQuery<ChassisConfig[]>({ queryKey: ["/api/configs"] });

  const reset = () => {
    setRequestId(presetRequestId ? String(presetRequestId) : "");
    setTitle(""); setManufacturer(""); setTruckModel(""); setApparatusType("");
    setCabConfig(""); setEngine(""); setFrontAxle(""); setRearAxle("");
    setQuotedPrice(""); setQuoteDate(""); setNotes(""); setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Pull manufacturer / model / apparatus from a saved request so the user
  // doesn't have to re-enter what the request already captured.
  const linkToRequest = (id: string) => {
    setRequestId(id);
    const req = requests.find(r => String(r.id) === id);
    if (!req) return;
    const fd = req.formData as any;
    setTitle(t => t || req.configName);
    setManufacturer(req.manufacturer);
    setTruckModel(modelLabelFor(req, configs));
    if (fd?.apparatusType) setApparatusType(fd.apparatusType);
    if (fd?.cabConfig)     setCabConfig(fd.cabConfig);
    if (fd?.engine)        setEngine(fd.engine);
    if (fd?.frontAxle)     setFrontAxle(fd.frontAxle);
    if (fd?.rearAxle)      setRearAxle(fd.rearAxle);
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      if (requestId)          fd.append("requestId", requestId);
      fd.append("title", title.trim());
      fd.append("manufacturer", manufacturer);
      if (truckModel.trim())  fd.append("truckModel", truckModel.trim());
      if (apparatusType)      fd.append("apparatusType", apparatusType);
      if (cabConfig)          fd.append("cabConfig", cabConfig);
      if (engine)             fd.append("engine", engine);
      if (frontAxle)          fd.append("frontAxle", frontAxle);
      if (rearAxle)           fd.append("rearAxle", rearAxle);
      if (quotedPrice.trim()) fd.append("quotedPrice", quotedPrice.trim());
      if (quoteDate)          fd.append("quoteDate", quoteDate);
      if (notes.trim())       fd.append("notes", notes.trim());
      files.forEach(f => fd.append("files", f));
      const res = await fetch(`${API_BASE}/api/quotes`, { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.text()) || res.statusText);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({ title: "Quote uploaded", description: `"${title.trim()}" is now available to everyone.` });
      reset();
      setOpen(false);
    },
    onError: (err: Error) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const canSubmit = title.trim() && manufacturer && files.length > 0 && !uploadMutation.isPending;

  // Reset on close; prefill from the preset request on open.
  const handleOpenChange = (next: boolean) => {
    if (next) {
      reset();
      if (presetRequestId) linkToRequest(String(presetRequestId));
    }
    setOpen(next);
  };

  const linkedReq = requests.find(r => String(r.id) === requestId);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <button className="vipr-btn-primary" data-testid="button-upload-quote">
            <Upload size={12} /> Upload Quote
          </button>
        )}
      </DialogTrigger>
      <DialogContent style={{ background: "var(--vipr-surface-2)", border: "1px solid var(--vipr-border)", color: "var(--vipr-text)", maxWidth: "560px", maxHeight: "88vh", overflowY: "auto" }}>
        <DialogHeader>
          <DialogTitle style={{ color: "var(--vipr-text)", fontSize: "14px" }}>
            {presetRequestId ? "Attach Documents to Request" : "Upload Received Quote"}
          </DialogTitle>
          <DialogDescription style={{ color: "var(--vipr-text-muted)", fontSize: "11px" }}>
            Attach the quote and spec documents received from the manufacturer so others can reference them for similar trucks.
          </DialogDescription>
        </DialogHeader>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          {/* Link to a saved request — pre-fills metadata so it isn't re-entered */}
          {presetRequestId ? (
            linkedReq && (
              <div style={{ gridColumn: "1 / -1" }} className="flex items-center gap-1.5"
                data-testid="text-linked-request">
                <Link2 size={11} style={{ color: "var(--vipr-orange)" }} />
                <span style={{ fontSize: "11px", color: "var(--vipr-text-muted)" }}>
                  Linking to <strong style={{ color: "var(--vipr-text)" }}>{linkedReq.configName}</strong>
                </span>
              </div>
            )
          ) : (
            <div style={{ gridColumn: "1 / -1" }}>
              <div className="vipr-field-label">Link to Saved Request (optional)</div>
              <select className="vipr-input" value={requestId}
                onChange={e => linkToRequest(e.target.value)}
                data-testid="select-quote-request">
                <option value="">None — standalone quote</option>
                {requests.map(r => <option key={r.id} value={r.id}>{r.configName}</option>)}
              </select>
            </div>
          )}
          <div style={{ gridColumn: "1 / -1" }}>
            <div className="vipr-field-label">Title *</div>
            <input className="vipr-input" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Springfield FD — M2 106 Pumper" data-testid="input-quote-title" />
          </div>
          <div>
            <div className="vipr-field-label">Manufacturer *</div>
            <select className="vipr-input" value={manufacturer} onChange={e => setManufacturer(e.target.value)}
              data-testid="select-quote-manufacturer">
              <option value="">Select…</option>
              {MANUFACTURERS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <div className="vipr-field-label">Truck Model</div>
            <input className="vipr-input" value={truckModel} onChange={e => setTruckModel(e.target.value)}
              placeholder="e.g. M2 106" data-testid="input-quote-model" />
          </div>
          <div>
            <div className="vipr-field-label">Apparatus Type</div>
            <select className="vipr-input" value={apparatusType} onChange={e => setApparatusType(e.target.value)}
              data-testid="select-quote-apparatus">
              <option value="">Select…</option>
              {APPARATUS_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <div className="vipr-field-label">Cab Config</div>
            <select className="vipr-input" value={cabConfig} onChange={e => setCabConfig(e.target.value)}
              data-testid="select-quote-cab">
              <option value="">Select…</option>
              {ALL_CABS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <div className="vipr-field-label">Engine</div>
            <select className="vipr-input" value={engine} onChange={e => setEngine(e.target.value)}
              data-testid="select-quote-engine">
              <option value="">Select…</option>
              {ALL_ENGINES.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <div className="vipr-field-label">Front Axle</div>
            <select className="vipr-input" value={frontAxle} onChange={e => setFrontAxle(e.target.value)}
              data-testid="select-quote-front-axle">
              <option value="">Select…</option>
              {ALL_FRONT_AXLES.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <div className="vipr-field-label">Rear Axle</div>
            <select className="vipr-input" value={rearAxle} onChange={e => setRearAxle(e.target.value)}
              data-testid="select-quote-rear-axle">
              <option value="">Select…</option>
              {ALL_REAR_AXLES.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <div className="vipr-field-label">Quoted Price</div>
            <input className="vipr-input" value={quotedPrice}
              onChange={e => setQuotedPrice(formatPriceInput(e.target.value))}
              inputMode="numeric" placeholder="e.g. $187,450" data-testid="input-quote-price" />
          </div>
          <div>
            <div className="vipr-field-label">Quote Date</div>
            <input className="vipr-input" type="date" value={quoteDate} onChange={e => setQuoteDate(e.target.value)}
              data-testid="input-quote-date" />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <div className="vipr-field-label">Notes</div>
            <textarea className="vipr-input" rows={2} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Options included, validity period, dealer contact…" data-testid="input-quote-notes"
              style={{ resize: "vertical", minHeight: "48px" }} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <div className="vipr-field-label">Documents * (quote, spec sheet — PDF, Word, Excel, images)</div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.gif,.webp"
              onChange={e => setFiles(Array.from(e.target.files ?? []))}
              data-testid="input-quote-files"
              className="vipr-input"
              style={{ padding: "6px" }}
            />
            {files.length > 0 && (
              <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "2px" }}>
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5" style={{ fontSize: "10px", color: "var(--vipr-text-muted)" }}>
                    <Paperclip size={9} /> {f.name} <span style={{ color: "var(--vipr-text-faint)" }}>({formatFileSize(f.size)})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter style={{ marginTop: "16px" }}>
          <button className="vipr-btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
          <button className="vipr-btn-primary" onClick={() => uploadMutation.mutate()}
            disabled={!canSubmit} style={{ opacity: canSubmit ? 1 : 0.5 }}
            data-testid="button-submit-quote">
            <Upload size={12} /> {uploadMutation.isPending ? "Uploading…" : "Upload"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Saved & Quoted tab ───────────────────────────────────────────────────────
// Merged view: saved chassis requests and uploaded quotes in one filtered,
// sortable grid of cards. Requests can be loaded back into the form or have
// documents attached; quotes expose their downloadable documents.
export default function PreviouslyQuoted({ onLoad }: { onLoad?: () => void } = {}) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [mfrFilter, setMfrFilter] = useState("all");
  const [specFilters, setSpecFilters] = useState<SpecFilters>(NO_SPEC_FILTERS);
  const [sortKey, setSortKey] = useState<SortKey>("added");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const setSpecFilter = (key: SpecFilterKey, value: string) =>
    setSpecFilters(prev => ({ ...prev, [key]: value }));
  const clearSpecFilters = () => setSpecFilters(NO_SPEC_FILTERS);
  const activeSpecCount = SPEC_FILTERS.filter(f => specFilters[f.key] !== "all").length;

  const { data: quotes = [], isLoading: quotesLoading } = useQuery<QuoteWithFiles[]>({ queryKey: ["/api/quotes"] });
  const { data: requests = [], isLoading: requestsLoading } = useQuery<ChassisRequest[]>({ queryKey: ["/api/requests"] });
  const { data: configs = [] } = useQuery<ChassisConfig[]>({ queryKey: ["/api/configs"] });
  const isLoading = quotesLoading || requestsLoading;

  const requestName = (id: number | null) =>
    id == null ? undefined : requests.find(r => r.id === id)?.configName;

  const deleteQuoteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API_BASE}/api/quotes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.text()) || res.statusText);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({ title: "Deleted" });
    },
  });

  const deleteRequestMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/requests/${id}`),
    onSuccess: () => {
      // A deleted request unlinks its quotes (set null), so refresh both lists.
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({ title: "Deleted" });
    },
  });

  const handleLoad = (req: ChassisRequest) => {
    // Write to the module-level pending slot BEFORE the tab switch mounts RequestForm.
    scheduleFormLoad(req.formData as any, req.id);
    toast({ title: "Loaded", description: `"${req.configName}" loaded.` });
    onLoad?.(); // switches tab → RequestForm mounts → reads pendingLoad
  };

  // Normalize both kinds into rows, then search / filter / sort over the unified set.
  const allRows: Row[] = [
    ...quotes.map(quoteRow),
    ...requests.map(r => requestRow(r, configs)),
  ];

  // Spec-filter dropdowns only offer values present in the manufacturer-scoped
  // rows, so the choices stay relevant as the manufacturer filter narrows.
  const mfrScoped = mfrFilter === "all" ? allRows : allRows.filter(r => r.manufacturer === mfrFilter);

  const filtered = allRows.filter(r => {
    const s = search.toLowerCase();
    const matchSearch = !s || r.searchText.includes(s);
    const matchMfr = mfrFilter === "all" || r.manufacturer === mfrFilter;
    const matchSpecs = SPEC_FILTERS.every(f =>
      specFilters[f.key] === "all" || f.pick(r) === specFilters[f.key]);
    return matchSearch && matchMfr && matchSpecs;
  });

  const sorted = sortRows(filtered, sortKey, sortDir);

  return (
    <div className="space-y-4">
      {/* Toolbar: search, manufacturer filter, sort, upload */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search size={12} style={{ position: "absolute", left: "8px", top: "9px", color: "var(--vipr-text-muted)" }} />
          <input
            className="vipr-input"
            style={{ paddingLeft: "26px", width: "220px" }}
            placeholder="Search requests & quotes…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            data-testid="input-search-quotes"
          />
        </div>
        <div className="flex gap-1">
          {[{ id: "all", label: "All" }, ...MANUFACTURERS].map(m => (
            <button
              key={m.id}
              onClick={() => setMfrFilter(m.id)}
              className={`vipr-mfr-btn ${mfrFilter === m.id ? "active" : ""}`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <span style={{ fontSize: "10px", color: "var(--vipr-text-muted)" }}>Sort</span>
          <select
            className="vipr-input"
            style={{ width: "auto", paddingRight: "24px" }}
            value={sortKey}
            onChange={e => setSortKey(e.target.value as SortKey)}
            data-testid="select-sort-quotes"
          >
            {SORT_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
          <button
            className="vipr-btn-ghost"
            style={{ padding: "5px 7px" }}
            onClick={() => setSortDir(d => (d === "asc" ? "desc" : "asc"))}
            title={sortDir === "asc" ? "Ascending" : "Descending"}
            data-testid="button-sort-direction"
          >
            {sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
          </button>
        </div>
        <div>
          <UploadQuoteDialog />
        </div>
      </div>

      {/* Component-style filters: model, cab, engine, axles */}
      {allRows.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-1" style={{ fontSize: "10px", color: "var(--vipr-text-muted)" }}>
            <SlidersHorizontal size={12} /> Filter
          </div>
          {SPEC_FILTERS.map(f => (
            <FilterSelect
              key={f.key}
              label={f.label}
              value={specFilters[f.key]}
              options={specFilterOptions(mfrScoped, f.key)}
              onChange={v => setSpecFilter(f.key, v)}
              testId={`select-filter-${f.key}`}
            />
          ))}
          {activeSpecCount > 0 && (
            <button
              className="vipr-btn-ghost"
              style={{ padding: "5px 8px", display: "flex", alignItems: "center", gap: "4px" }}
              onClick={clearSpecFilters}
              data-testid="button-clear-filters"
            >
              <X size={11} /> Clear {activeSpecCount === 1 ? "filter" : `filters (${activeSpecCount})`}
            </button>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-16" style={{ color: "var(--vipr-text-muted)", fontSize: "12px" }}>
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3"
          style={{ color: "var(--vipr-text-muted)" }}>
          <FileQuestion size={40} style={{ opacity: 0.2 }} />
          <p style={{ fontSize: "12px" }}>
            {allRows.length === 0
              ? "Nothing saved yet. Save a request from the form, or upload received quotes and spec sheets so the whole team can reference them."
              : "No results match your filters."}
          </p>
          {allRows.length === 0 && <UploadQuoteDialog />}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {sorted.map(r => {
            const mfrLabel = MANUFACTURERS.find(m => m.id === r.manufacturer)?.label ?? r.manufacturer;
            const apparatusLabel = APPARATUS_TYPES.find(t => t.id === r.apparatusType)?.label;
            const cabLabel = ALL_CABS.find(o => o.id === r.cabConfig)?.label;
            const engineLabel = ALL_ENGINES.find(o => o.id === r.engine)?.label;
            const frontAxleLabel = ALL_FRONT_AXLES.find(o => o.id === r.frontAxle)?.label;
            const rearAxleLabel = ALL_REAR_AXLES.find(o => o.id === r.rearAxle)?.label;
            const axleLabel = frontAxleLabel && rearAxleLabel
              ? `${frontAxleLabel} / ${rearAxleLabel}`
              : (frontAxleLabel || rearAxleLabel);
            const isQuote = r.kind === "quote";
            const fd = r.request?.formData as any;
            const cityState = !isQuote && fd?.city && fd?.state ? `${fd.city}, ${fd.state}` : null;
            const linkedName = isQuote ? requestName(r.quote!.requestId ?? null) : undefined;

            return (
              <div key={r.key} className="vipr-card" data-testid={`card-${r.kind}-${isQuote ? r.quote!.id : r.request!.id}`}>
                {/* Card header */}
                <div style={{
                  background: "var(--vipr-surface-2)",
                  borderBottom: "1px solid var(--vipr-border)",
                  padding: "8px 10px",
                  borderRadius: "8px 8px 0 0",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: "8px",
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--vipr-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.title}
                    </div>
                    {r.subtitle && (
                      <div style={{ fontSize: "10px", color: "var(--vipr-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.subtitle}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1" style={{ flexShrink: 0 }}>
                    {/* Kind chip — distinguishes requests from quotes in the mixed grid */}
                    <span style={{ fontSize: "9px", fontWeight: 700, padding: "2px 6px", borderRadius: "3px", letterSpacing: "0.05em", textTransform: "uppercase", background: "var(--vipr-surface)", border: "1px solid var(--vipr-border)", color: "var(--vipr-text-muted)" }}>
                      {isQuote ? "Quote" : "Request"}
                    </span>
                    <span className={`mfr-${r.manufacturer}`}
                      style={{ fontSize: "9px", fontWeight: 700, padding: "2px 6px", borderRadius: "3px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                      {mfrLabel}
                    </span>
                  </div>
                </div>

                {/* Card body */}
                <div style={{ padding: "8px 10px" }}>
                  {linkedName && (
                    <div className="flex items-center gap-1" data-testid={`link-quote-request-${r.quote!.id}`}
                      style={{ fontSize: "10px", color: "var(--vipr-orange)", marginBottom: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      title={`Linked to saved request: ${linkedName}`}>
                      <Link2 size={9} style={{ flexShrink: 0 }} /> {linkedName}
                    </div>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px", marginBottom: "8px" }}>
                    {r.truckModel && (
                      <div className="flex items-center gap-1" style={{ fontSize: "10px", color: "var(--vipr-text-muted)" }}>
                        <Truck size={9} /> {r.truckModel.toUpperCase()}
                      </div>
                    )}
                    {apparatusLabel && (
                      <div style={{ fontSize: "10px", color: "var(--vipr-text-muted)" }}>
                        {apparatusLabel}
                      </div>
                    )}
                    {cabLabel && (
                      <div data-testid={`text-${r.kind}-cab-${isQuote ? r.quote!.id : r.request!.id}`}
                        style={{ fontSize: "10px", color: "var(--vipr-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        title={`Cab: ${cabLabel}`}>
                        {cabLabel}
                      </div>
                    )}
                    {engineLabel && (
                      <div className="flex items-center gap-1"
                        style={{ gridColumn: "1 / -1", fontSize: "10px", color: "var(--vipr-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        title={`Engine: ${engineLabel}`}>
                        <Cog size={9} style={{ flexShrink: 0 }} /> {engineLabel}
                      </div>
                    )}
                    {axleLabel && (
                      <div className="flex items-center gap-1"
                        style={{ gridColumn: "1 / -1", fontSize: "10px", color: "var(--vipr-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        title={`Axles (front / rear): ${axleLabel}`}>
                        <Gauge size={9} style={{ flexShrink: 0 }} /> {axleLabel}
                      </div>
                    )}
                    {cityState && (
                      <div className="flex items-center gap-1" style={{ fontSize: "10px", color: "var(--vipr-text-muted)" }}>
                        <MapPin size={9} /> {cityState}
                      </div>
                    )}
                    {r.price && (
                      <div className="flex items-center gap-1" style={{ fontSize: "10px", fontWeight: 600, color: "var(--vipr-orange)" }}>
                        <DollarSign size={9} /> {formatPriceDisplay(r.price)}
                      </div>
                    )}
                    {r.quoteDate && (
                      <div className="flex items-center gap-1" style={{ fontSize: "10px", color: "var(--vipr-text-muted)" }}>
                        <Calendar size={9} /> Quoted {format(new Date(`${r.quoteDate}T00:00:00`), "MMM d, yyyy")}
                      </div>
                    )}
                  </div>

                  {/* Quote documents */}
                  {isQuote && r.quote!.files.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginBottom: "8px" }}>
                      {r.quote!.files.map(f => (
                        <a
                          key={f.id}
                          href={`${API_BASE}/api/quote-files/${f.id}/download`}
                          className="flex items-center gap-1.5"
                          style={{ fontSize: "10px", color: "var(--vipr-text)", textDecoration: "none", padding: "3px 6px", borderRadius: "4px", border: "1px solid var(--vipr-border)", background: "var(--vipr-surface-2)" }}
                          data-testid={`link-download-${f.id}`}
                          title={`Download ${f.originalName}`}
                        >
                          <FileText size={10} style={{ color: "var(--vipr-orange)", flexShrink: 0 }} />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{f.originalName}</span>
                          <span style={{ color: "var(--vipr-text-faint)", flexShrink: 0 }}>{formatFileSize(f.fileSize)}</span>
                          <Download size={10} style={{ color: "var(--vipr-text-muted)", flexShrink: 0 }} />
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Footer — quotes: added date + delete; requests: load / attach / delete */}
                  {isQuote ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1" style={{ fontSize: "10px", color: "var(--vipr-text-faint)" }}>
                        <Calendar size={9} />
                        Added {format(r.createdAt, "MMM d, yyyy")}
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            className="vipr-btn-ghost"
                            style={{ padding: "4px 7px", color: "var(--vipr-red)", borderColor: "rgba(248,81,73,0.3)" }}
                            data-testid={`button-delete-quote-${r.quote!.id}`}
                          >
                            <Trash2 size={11} />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent style={{ background: "var(--vipr-surface-2)", border: "1px solid var(--vipr-border)", color: "var(--vipr-text)" }}>
                          <AlertDialogHeader>
                            <AlertDialogTitle style={{ color: "var(--vipr-text)" }}>Delete quote?</AlertDialogTitle>
                            <AlertDialogDescription style={{ color: "var(--vipr-text-muted)" }}>
                              "{r.title}" and its {r.quote!.files.length === 1 ? "document" : `${r.quote!.files.length} documents`} will be permanently removed for all users.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel style={{ background: "var(--vipr-surface)", border: "1px solid var(--vipr-border)", color: "var(--vipr-text)" }}>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteQuoteMutation.mutate(r.quote!.id)}
                              style={{ background: "var(--vipr-red)", color: "white" }}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1" style={{ fontSize: "10px", color: "var(--vipr-text-faint)", marginBottom: "8px" }}>
                        <Calendar size={9} />
                        Added {format(r.createdAt, "MMM d, yyyy")}
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          className="vipr-btn-primary"
                          style={{ flex: 1, justifyContent: "center", padding: "5px 8px", fontSize: "11px" }}
                          onClick={() => handleLoad(r.request!)}
                          data-testid={`button-load-${r.request!.id}`}
                        >
                          <FolderOpen size={11} /> Load
                        </button>
                        <UploadQuoteDialog
                          presetRequestId={r.request!.id}
                          trigger={
                            <button
                              className="vipr-btn-ghost"
                              style={{ padding: "5px 8px" }}
                              title="Attach quote / spec documents"
                              data-testid={`button-attach-${r.request!.id}`}
                            >
                              <Paperclip size={11} />
                            </button>
                          }
                        />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              className="vipr-btn-ghost"
                              style={{ padding: "5px 8px", color: "var(--vipr-red)", borderColor: "rgba(248,81,73,0.3)" }}
                              data-testid={`button-delete-${r.request!.id}`}
                            >
                              <Trash2 size={11} />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent style={{ background: "var(--vipr-surface-2)", border: "1px solid var(--vipr-border)", color: "var(--vipr-text)" }}>
                            <AlertDialogHeader>
                              <AlertDialogTitle style={{ color: "var(--vipr-text)" }}>Delete request?</AlertDialogTitle>
                              <AlertDialogDescription style={{ color: "var(--vipr-text-muted)" }}>
                                "{r.title}" will be permanently removed.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel style={{ background: "var(--vipr-surface)", border: "1px solid var(--vipr-border)", color: "var(--vipr-text)" }}>
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteRequestMutation.mutate(r.request!.id)}
                                style={{ background: "var(--vipr-red)", color: "white" }}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
