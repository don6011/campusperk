import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Search, Globe, ShieldCheck, ShieldX, Merge, Loader2 } from "lucide-react";
import { format } from "date-fns";

type CampusDomain = {
  id: string;
  domain_root: string;
  campus_name: string | null;
  verification_confidence: number;
  is_approved: boolean;
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
};

const CampusDomainsManager = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [mergeSource, setMergeSource] = useState<CampusDomain | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [editDomain, setEditDomain] = useState<CampusDomain | null>(null);
  const [editName, setEditName] = useState("");
  const [editConfidence, setEditConfidence] = useState(50);

  const { data: domains = [], isLoading } = useQuery({
    queryKey: ["admin-campus-domains", search],
    queryFn: async () => {
      let query = supabase.from("campus_domains").select("*").order("created_at", { ascending: false });
      if (search.trim()) {
        query = query.or(`domain_root.ilike.%${search}%,campus_name.ilike.%${search}%`);
      }
      const { data, error } = await query.limit(200);
      if (error) throw error;
      return data as CampusDomain[];
    },
  });

  const toggleApproval = useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      const { error } = await supabase.from("campus_domains").update({ is_approved: approved, is_blocked: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-campus-domains"] }); toast.success("Domain updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleBlock = useMutation({
    mutationFn: async ({ id, blocked }: { id: string; blocked: boolean }) => {
      const { error } = await supabase.from("campus_domains").update({ is_blocked: blocked, is_approved: !blocked && undefined }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-campus-domains"] }); toast.success("Domain updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateDomain = useMutation({
    mutationFn: async () => {
      if (!editDomain) return;
      const { error } = await supabase.from("campus_domains").update({
        campus_name: editName.trim() || null,
        verification_confidence: editConfidence,
      }).eq("id", editDomain.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-campus-domains"] });
      toast.success("Domain updated");
      setEditDomain(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mergeDomains = useMutation({
    mutationFn: async () => {
      if (!mergeSource || !mergeTargetId) return;
      // Update all profiles referencing the source domain to the target domain
      const target = domains.find(d => d.id === mergeTargetId);
      if (!target) throw new Error("Target domain not found");
      
      await supabase.from("profiles").update({ campus_domain: target.domain_root } as any).eq("campus_domain", mergeSource.domain_root);
      await supabase.from("campus_domains").delete().eq("id", mergeSource.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-campus-domains"] });
      toast.success("Domains merged");
      setMergeSource(null);
      setMergeTargetId("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const confidenceBadge = (score: number) => {
    if (score >= 70) return <Badge className="bg-accent/15 text-accent border-accent/30 text-[10px]">{score}</Badge>;
    if (score >= 40) return <Badge className="bg-gold/15 text-gold border-gold/30 text-[10px]">{score}</Badge>;
    return <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px]">{score}</Badge>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Campus Domains</h1>
          <p className="text-sm text-muted-foreground">Manage approved campus domains, block suspicious ones, and merge duplicates.</p>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search domains…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domain</TableHead>
                <TableHead>Campus Name</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : domains.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No domains found</TableCell></TableRow>
              ) : (
                domains.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-mono text-sm">{d.domain_root}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{d.campus_name || "—"}</TableCell>
                    <TableCell>{confidenceBadge(d.verification_confidence)}</TableCell>
                    <TableCell>
                      {d.is_blocked ? (
                        <Badge variant="destructive" className="text-[10px]">Blocked</Badge>
                      ) : d.is_approved ? (
                        <Badge className="bg-accent/15 text-accent border-accent/30 text-[10px]">Approved</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(d.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {!d.is_approved && !d.is_blocked && (
                        <Button variant="ghost" size="sm" onClick={() => toggleApproval.mutate({ id: d.id, approved: true })}>
                          <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Approve
                        </Button>
                      )}
                      {d.is_approved && (
                        <Button variant="ghost" size="sm" onClick={() => toggleApproval.mutate({ id: d.id, approved: false })}>
                          Unapprove
                        </Button>
                      )}
                      {!d.is_blocked ? (
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => toggleBlock.mutate({ id: d.id, blocked: true })}>
                          <ShieldX className="h-3.5 w-3.5 mr-1" /> Block
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => toggleBlock.mutate({ id: d.id, blocked: false })}>
                          Unblock
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => { setEditDomain(d); setEditName(d.campus_name || ""); setEditConfidence(d.verification_confidence); }}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setMergeSource(d); setMergeTargetId(""); }}>
                        <Merge className="h-3.5 w-3.5 mr-1" /> Merge
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Edit Domain Dialog */}
      <Dialog open={!!editDomain} onOpenChange={(open) => { if (!open) setEditDomain(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Domain — {editDomain?.domain_root}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Campus Name</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="e.g. Arizona State University" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Verification Confidence (0–100)</label>
              <Input type="number" min={0} max={100} value={editConfidence} onChange={(e) => setEditConfidence(Number(e.target.value))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDomain(null)}>Cancel</Button>
            <Button onClick={() => updateDomain.mutate()} disabled={updateDomain.isPending}>
              {updateDomain.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Dialog */}
      <Dialog open={!!mergeSource} onOpenChange={(open) => { if (!open) { setMergeSource(null); setMergeTargetId(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge Domain</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Merge <strong className="text-foreground">{mergeSource?.domain_root}</strong> into another domain. All users on this domain will be reassigned.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Domain</label>
              <Select value={mergeTargetId} onValueChange={setMergeTargetId}>
                <SelectTrigger><SelectValue placeholder="Select target domain…" /></SelectTrigger>
                <SelectContent>
                  {domains.filter(d => d.id !== mergeSource?.id).map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.domain_root} {d.campus_name ? `(${d.campus_name})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setMergeSource(null); setMergeTargetId(""); }}>Cancel</Button>
            <Button onClick={() => mergeDomains.mutate()} disabled={!mergeTargetId || mergeDomains.isPending} variant="destructive">
              {mergeDomains.isPending ? "Merging…" : "Merge & Delete Source"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default CampusDomainsManager;
