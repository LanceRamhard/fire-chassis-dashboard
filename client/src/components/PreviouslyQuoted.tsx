import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { API_BASE, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Upload, Trash2, Search, FileText, Truck, Calendar, DollarSign, Download, Paperclip, FileQuestion, Link2,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { ChassisRequest, QuoteWithFiles } from "@shared/schema";
import { MANUFACTURERS, APPARATUS_TYPES } from "@/lib/chassis-data";
import { format } from "date-fns";

// Module-level pending slot, mirroring scheduleFormLoad in RequestForm: written
// by SavedRequests BEFORE the tab switch mounts this component, so the upload
// dialog opens pre-linked to that saved request.
let pendingLinkRequestId: number | null = null;
export function scheduleQuoteUpload(requestId: number) {
  pendingLinkRequestId = requestId;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Upload dialog ────────────────────────────────────────────────────────────
function UploadQuoteDialog({ initialLinkId = null }: { initialLinkId?: number | null }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(initialLinkId !== null);
  const [title, setTitle] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [truckModel, setTruckModel] = useState("");
  const [apparatusType, setApparatusType] = useState("");
  const [quotedPrice, setQuotedPrice] = useState("");
  const [quoteDate, setQuoteDate] = useState("");
  const [notes, setNotes] = useState("");
  const [linkRequestId, setLinkRequestId] = useState<string>(initialLinkId !== null ? String(initialLinkId) : "");
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: savedRequests = [] } = useQuery<ChassisRequest[]>({ queryKey: ["/api/requests"] });

  const reset = () => {
    setTitle(""); setManufacturer(""); setTruckModel(""); setApparatusType("");
    setQuotedPrice(""); setQuoteDate(""); setNotes(""); setLinkRequestId(""); setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Selecting a saved request fills in any truck details left blank
  const prefillFromRequest = (req: ChassisRequest | undefined) => {
    if (!req) return;
    const fd = req.formData as any;
    if (!title.trim())     setTitle(req.configName);
    if (!manufacturer)     setManufacturer(req.manufacturer);
    if (!truckModel.trim() && fd?.truckModel)    setTruckModel(String(fd.truckModel));
    if (!apparatusType     && fd?.apparatusType) setApparatusType(String(fd.apparatusType));
  };

  // Apply prefill for a dialog opened from a Saved Requests card once data arrives
  const initialReq = initialLinkId !== null ? savedRequests.find(r => r.id === initialLinkId) : undefined;
  const prefilledRef = useRef(false);
  useEffect(() => {
    if (initialReq && !prefilledRef.current && open) {
      prefilledRef.current = true;
      prefillFromRequest(initialReq);
    }
  }, [initialReq, open]);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("manufacturer", manufacturer);
      if (truckModel.trim())  fd.append("truckModel", truckModel.trim());
      if (apparatusType)      fd.append("apparatusType", apparatusType);
      if (quotedPrice.trim()) fd.append("quotedPrice", quotedPrice.trim());
      if (quoteDate)          fd.append("quoteDate", quoteDate);
      if (notes.trim())       fd.append("notes", notes.trim());
      if (linkRequestId)      fd.append("chassisRequestId", linkRequestId);
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="vipr-btn-primary" data-testid="button-upload-quote">
          <Upload size={12} /> Upload Quote
        </button>
      </DialogTrigger>
      <DialogContent style={{ background: "var(--vipr-surface-2)", border: "1px solid var(--vipr-border)", color: "var(--vipr-text)", maxWidth: "560px", maxHeight: "88vh", overflowY: "auto" }}>
        <DialogHeader>
          <DialogTitle style={{ color: "var(--vipr-text)", fontSize: "14px" }}>
            Upload Received Quote
          </DialogTitle>
          <DialogDescription style={{ color: "var(--vipr-text-muted)", fontSize: "11px" }}>
            Attach the quote and spec documents received from the manufacturer so others can reference them for similar trucks.
          </DialogDescription>
        </DialogHeader>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <div className="vipr-field-label">Link to Saved Request (optional)</div>
            <select
              className="vipr-input"
              value={linkRequestId}
              onChange={e => {
                setLinkRequestId(e.target.value);
                prefillFromRequest(savedRequests.find(r => String(r.id) === e.target.value));
              }}
              data-testid="select-quote-request"
            >
              <option value="">Not linked</option>
              {savedRequests.map(r => (
                <option key={r.id} value={r.id}>
                  {r.configName} — {MANUFACTURERS.find(m => m.id === r.manufacturer)?.label ?? r.manufacturer}
                </option>
              ))}
            </select>
          </div>
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
            <div className="vipr-field-label">Quoted Price</div>
            <input className="vipr-input" value={quotedPrice} onChange={e => setQuotedPrice(e.target.value)}
              placeholder="e.g. $187,450" data-testid="input-quote-price" />
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

// ─── Previously Quoted tab ────────────────────────────────────────────────────
export default function PreviouslyQuoted() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [mfrFilter, setMfrFilter] = useState("all");

  // Consume the pending link slot once on mount (set by SavedRequests pre-tab-switch)
  const [initialLinkId] = useState<number | null>(() => {
    const id = pendingLinkRequestId;
    pendingLinkRequestId = null;
    return id;
  });

  const { data: quotes = [], isLoading } = useQuery<QuoteWithFiles[]>({ queryKey: ["/api/quotes"] });
  const { data: savedRequests = [] } = useQuery<ChassisRequest[]>({ queryKey: ["/api/requests"] });
  const requestNames = new Map(savedRequests.map(r => [r.id, r.configName]));

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API_BASE}/api/quotes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.text()) || res.statusText);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({ title: "Deleted" });
    },
  });

  const filtered = quotes.filter(q => {
    const s = search.toLowerCase();
    const matchSearch = !s ||
      q.title.toLowerCase().includes(s) ||
      (q.truckModel ?? "").toLowerCase().includes(s) ||
      (q.notes ?? "").toLowerCase().includes(s) ||
      (q.chassisRequestId != null && (requestNames.get(q.chassisRequestId) ?? "").toLowerCase().includes(s)) ||
      q.files.some(f => f.originalName.toLowerCase().includes(s));
    const matchMfr = mfrFilter === "all" || q.manufacturer === mfrFilter;
    return matchSearch && matchMfr;
  });

  return (
    <div className="space-y-4">
      {/* Toolbar: search, manufacturer filter, upload */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search size={12} style={{ position: "absolute", left: "8px", top: "9px", color: "var(--vipr-text-muted)" }} />
          <input
            className="vipr-input"
            style={{ paddingLeft: "26px", width: "220px" }}
            placeholder="Search quotes…"
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
        <div className="ml-auto">
          <UploadQuoteDialog initialLinkId={initialLinkId} />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-16" style={{ color: "var(--vipr-text-muted)", fontSize: "12px" }}>
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3"
          style={{ color: "var(--vipr-text-muted)" }}>
          <FileQuestion size={40} style={{ opacity: 0.2 }} />
          <p style={{ fontSize: "12px" }}>
            {quotes.length === 0
              ? "No quotes uploaded yet. Upload received quotes and spec sheets so the whole team can reference them."
              : "No results match your filters."}
          </p>
          {quotes.length === 0 && <UploadQuoteDialog />}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(q => {
            const mfrLabel = MANUFACTURERS.find(m => m.id === q.manufacturer)?.label ?? q.manufacturer;
            const apparatusLabel = APPARATUS_TYPES.find(t => t.id === q.apparatusType)?.label;
            return (
              <div key={q.id} className="vipr-card" data-testid={`card-quote-${q.id}`}>
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
                      {q.title}
                    </div>
                    {q.notes && (
                      <div style={{ fontSize: "10px", color: "var(--vipr-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {q.notes}
                      </div>
                    )}
                  </div>
                  <span className={`mfr-${q.manufacturer}`}
                    style={{ fontSize: "9px", fontWeight: 700, padding: "2px 6px", borderRadius: "3px", letterSpacing: "0.05em", textTransform: "uppercase", flexShrink: 0 }}>
                    {mfrLabel}
                  </span>
                </div>

                {/* Card body */}
                <div style={{ padding: "8px 10px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px", marginBottom: "8px" }}>
                    {q.truckModel && (
                      <div className="flex items-center gap-1" style={{ fontSize: "10px", color: "var(--vipr-text-muted)" }}>
                        <Truck size={9} /> {q.truckModel.toUpperCase()}
                      </div>
                    )}
                    {apparatusLabel && (
                      <div style={{ fontSize: "10px", color: "var(--vipr-text-muted)" }}>
                        {apparatusLabel}
                      </div>
                    )}
                    {q.quotedPrice && (
                      <div className="flex items-center gap-1" style={{ fontSize: "10px", fontWeight: 600, color: "var(--vipr-orange)" }}>
                        <DollarSign size={9} /> {q.quotedPrice.replace(/^\$/, "")}
                      </div>
                    )}
                    {q.quoteDate && (
                      <div className="flex items-center gap-1" style={{ fontSize: "10px", color: "var(--vipr-text-muted)" }}>
                        <Calendar size={9} /> Quoted {format(new Date(`${q.quoteDate}T00:00:00`), "MMM d, yyyy")}
                      </div>
                    )}
                  </div>

                  {q.chassisRequestId != null && (
                    <div className="flex items-center gap-1" style={{ fontSize: "10px", color: "var(--vipr-text-muted)", marginBottom: "8px" }}
                      data-testid={`linked-request-${q.id}`}>
                      <Link2 size={9} style={{ color: "var(--vipr-orange)", flexShrink: 0 }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {requestNames.get(q.chassisRequestId) ?? "Saved request (deleted)"}
                      </span>
                    </div>
                  )}

                  {/* Attached documents */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginBottom: "8px" }}>
                    {q.files.map(f => (
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

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1" style={{ fontSize: "10px", color: "var(--vipr-text-faint)" }}>
                      <Calendar size={9} />
                      Added {format(new Date(q.createdAt), "MMM d, yyyy")}
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          className="vipr-btn-ghost"
                          style={{ padding: "4px 7px", color: "var(--vipr-red)", borderColor: "rgba(248,81,73,0.3)" }}
                          data-testid={`button-delete-quote-${q.id}`}
                        >
                          <Trash2 size={11} />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent style={{ background: "var(--vipr-surface-2)", border: "1px solid var(--vipr-border)", color: "var(--vipr-text)" }}>
                        <AlertDialogHeader>
                          <AlertDialogTitle style={{ color: "var(--vipr-text)" }}>Delete quote?</AlertDialogTitle>
                          <AlertDialogDescription style={{ color: "var(--vipr-text-muted)" }}>
                            "{q.title}" and its {q.files.length === 1 ? "document" : `${q.files.length} documents`} will be permanently removed for all users.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel style={{ background: "var(--vipr-surface)", border: "1px solid var(--vipr-border)", color: "var(--vipr-text)" }}>
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(q.id)}
                            style={{ background: "var(--vipr-red)", color: "white" }}
                          >
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
  );
}
