import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, API_BASE, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FolderOpen, Trash2, Search, Clock, Truck, Calendar, Paperclip, FileText, Download, X } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { ChassisRequest, QuoteWithFiles } from "@shared/schema";
import { MANUFACTURERS } from "@/lib/chassis-data";
import { scheduleFormLoad } from "./RequestForm";
import { UploadQuoteDialog } from "./PreviouslyQuoted";
import { format } from "date-fns";

export default function SavedRequests({ onLoad }: { onLoad: () => void }) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [mfrFilter, setMfrFilter] = useState("all");

  const { data: requests = [], isLoading } = useQuery<ChassisRequest[]>({ queryKey: ["/api/requests"] });
  const { data: quotes = [] } = useQuery<QuoteWithFiles[]>({ queryKey: ["/api/quotes"] });

  // Documents linked to a request: flatten the files of every quote tied to it.
  const docsFor = (requestId: number) =>
    quotes.filter(q => q.requestId === requestId).flatMap(q => q.files);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/requests/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      toast({ title: "Deleted" });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: number) => {
      const res = await fetch(`${API_BASE}/api/quote-files/${fileId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.text()) || res.statusText);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({ title: "Document removed" });
    },
  });

  const handleLoad = (req: ChassisRequest) => {
    // Write to module-level pending slot BEFORE tab switch causes RequestForm to mount
    scheduleFormLoad(req.formData as any, req.id);
    toast({ title: "Loaded", description: `"${req.configName}" loaded.` });
    onLoad(); // switches tab → RequestForm mounts → reads pendingLoad
  };

  const filtered = requests.filter(r => {
    const fd = r.formData as any;
    const matchSearch = !search ||
      r.configName.toLowerCase().includes(search.toLowerCase()) ||
      (fd.customerName ?? "").toLowerCase().includes(search.toLowerCase());
    const matchMfr = mfrFilter === "all" || r.manufacturer === mfrFilter;
    return matchSearch && matchMfr;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search size={12} style={{ position: "absolute", left: "8px", top: "9px", color: "var(--vipr-text-muted)" }} />
          <input
            className="vipr-input"
            style={{ paddingLeft: "26px", width: "220px" }}
            placeholder="Search requests…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            data-testid="input-search"
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
      </div>

      {isLoading ? (
        <div className="text-center py-16" style={{ color: "var(--vipr-text-muted)", fontSize: "12px" }}>
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3"
          style={{ color: "var(--vipr-text-muted)" }}>
          <Clock size={40} style={{ opacity: 0.2 }} />
          <p style={{ fontSize: "12px" }}>
            {requests.length === 0 ? "No saved requests yet." : "No results match your filters."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(req => {
            const fd = req.formData as any;
            const mfrLabel = MANUFACTURERS.find(m => m.id === req.manufacturer)?.label ?? req.manufacturer;
            return (
              <div key={req.id} className="vipr-card" data-testid={`card-request-${req.id}`}>
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
                      {req.configName}
                    </div>
                    {fd.customerName && (
                      <div style={{ fontSize: "10px", color: "var(--vipr-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {fd.customerName}
                      </div>
                    )}
                  </div>
                  <span className={`mfr-${req.manufacturer}`}
                    style={{ fontSize: "9px", fontWeight: 700, padding: "2px 6px", borderRadius: "3px", letterSpacing: "0.05em", textTransform: "uppercase", flexShrink: 0 }}>
                    {mfrLabel}
                  </span>
                </div>

                {/* Card body */}
                <div style={{ padding: "8px 10px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px", marginBottom: "8px" }}>
                    {fd.truckModel && (
                      <div className="flex items-center gap-1" style={{ fontSize: "10px", color: "var(--vipr-text-muted)" }}>
                        <Truck size={9} /> {fd.truckModel.toUpperCase()}
                      </div>
                    )}
                    {fd.apparatusType && (
                      <div style={{ fontSize: "10px", color: "var(--vipr-text-muted)", textTransform: "capitalize" }}>
                        {fd.apparatusType.replace(/_/g, " ")}
                      </div>
                    )}
                    {fd.engine && (
                      <div style={{ fontSize: "10px", color: "var(--vipr-text-muted)" }}>
                        {fd.engine.toUpperCase()}
                      </div>
                    )}
                    {fd.city && fd.state && (
                      <div style={{ fontSize: "10px", color: "var(--vipr-text-muted)" }}>
                        {fd.city}, {fd.state}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1" style={{ fontSize: "10px", color: "var(--vipr-text-faint)", marginBottom: "8px" }}>
                    <Calendar size={9} />
                    {format(new Date(req.createdAt), "MMM d, yyyy")}
                  </div>

                  {/* Linked quote & spec documents */}
                  {(() => {
                    const docs = docsFor(req.id);
                    if (docs.length === 0) return null;
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginBottom: "8px" }}>
                        {docs.map(f => (
                          <div key={f.id} className="flex items-center gap-1.5"
                            style={{ fontSize: "10px", padding: "3px 6px", borderRadius: "4px", border: "1px solid var(--vipr-border)", background: "var(--vipr-surface-2)" }}>
                            <FileText size={10} style={{ color: "var(--vipr-orange)", flexShrink: 0 }} />
                            <a href={`${API_BASE}/api/quote-files/${f.id}/download`}
                              className="flex items-center gap-1"
                              style={{ color: "var(--vipr-text)", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}
                              data-testid={`link-request-doc-${f.id}`}
                              title={`Download ${f.originalName}`}>
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.originalName}</span>
                              <Download size={9} style={{ color: "var(--vipr-text-muted)", flexShrink: 0 }} />
                            </a>
                            <button
                              onClick={() => deleteFileMutation.mutate(f.id)}
                              title="Remove document"
                              data-testid={`button-remove-doc-${f.id}`}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--vipr-text-muted)", padding: 0, display: "flex", flexShrink: 0 }}>
                              <X size={11} />
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  <div className="flex gap-1.5">
                    <button
                      className="vipr-btn-primary"
                      style={{ flex: 1, justifyContent: "center", padding: "5px 8px", fontSize: "11px" }}
                      onClick={() => handleLoad(req)}
                      data-testid={`button-load-${req.id}`}
                    >
                      <FolderOpen size={11} /> Load
                    </button>
                    <UploadQuoteDialog
                      presetRequestId={req.id}
                      trigger={
                        <button
                          className="vipr-btn-ghost"
                          style={{ padding: "5px 8px" }}
                          title="Attach quote / spec documents"
                          data-testid={`button-attach-${req.id}`}
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
                          data-testid={`button-delete-${req.id}`}
                        >
                          <Trash2 size={11} />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent style={{ background: "var(--vipr-surface-2)", border: "1px solid var(--vipr-border)", color: "var(--vipr-text)" }}>
                        <AlertDialogHeader>
                          <AlertDialogTitle style={{ color: "var(--vipr-text)" }}>Delete request?</AlertDialogTitle>
                          <AlertDialogDescription style={{ color: "var(--vipr-text-muted)" }}>
                            "{req.configName}" will be permanently removed.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel style={{ background: "var(--vipr-surface)", border: "1px solid var(--vipr-border)", color: "var(--vipr-text)" }}>
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(req.id)}
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
