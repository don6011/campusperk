import { useState, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Trophy,
  Download,
  Check,
  X,
  Loader2,
  Copy,
  Megaphone,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

function generateReferralCode(name: string, university: string): string {
  const prefix = name.replace(/[^a-zA-Z]/g, "").slice(0, 4).toUpperCase();
  const uniPart = university.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}${uniPart}${rand}`;
}

function exportCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(","),
    ...data.map((row) => headers.map((h) => `"${row[h] ?? ""}"`).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AmbassadorsManager() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [approveDialog, setApproveDialog] = useState<any>(null);
  const [referralCode, setReferralCode] = useState("");

  // Fetch applications
  const { data: applications = [], isLoading: appsLoading } = useQuery({
    queryKey: ["ambassador-applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ambassador_applications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch ambassadors
  const { data: ambassadors = [] } = useQuery({
    queryKey: ["ambassadors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ambassadors")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch referrals
  const { data: referrals = [] } = useQuery({
    queryKey: ["referrals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referrals")
        .select("*")
        .order("signup_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Update application status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("ambassador_applications")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ambassador-applications"] });
      toast({ title: "Application updated" });
    },
  });

  // Approve and create ambassador
  const approveMutation = useMutation({
    mutationFn: async ({ app, code }: { app: any; code: string }) => {
      // Update application to approved
      const { error: appErr } = await supabase
        .from("ambassador_applications")
        .update({ status: "approved" })
        .eq("id", app.id);
      if (appErr) throw appErr;

      // Create ambassador record (user_id is set to a placeholder since app may not have a user_id)
      const { error: ambErr } = await supabase
        .from("ambassadors")
        .insert({
          user_id: "00000000-0000-0000-0000-000000000000",
          university: app.university,
          referral_code: code,
          status: "active",
        });
      if (ambErr) throw ambErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ambassador-applications"] });
      queryClient.invalidateQueries({ queryKey: ["ambassadors"] });
      toast({ title: "Ambassador approved!", description: "Referral code has been assigned." });
      setApproveDialog(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const filteredApps = useMemo(() => {
    if (statusFilter === "all") return applications;
    return applications.filter((a: any) => a.status === statusFilter);
  }, [applications, statusFilter]);

  // Leaderboard data
  const leaderboard = useMemo(() => {
    return ambassadors.map((amb: any) => {
      const refs = referrals.filter((r: any) => r.referral_code === amb.referral_code);
      const verified = refs.filter((r: any) => r.verified).length;
      return {
        ...amb,
        total_referrals: refs.length,
        verified_referrals: verified,
      };
    }).sort((a: any, b: any) => b.total_referrals - a.total_referrals);
  }, [ambassadors, referrals]);

  const openApprove = (app: any) => {
    const code = generateReferralCode(app.name, app.university);
    setReferralCode(code);
    setApproveDialog(app);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" /> Ambassadors
          </h1>
        </div>

        <Tabs defaultValue="applications" className="space-y-4">
          <TabsList>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="active">Active Ambassadors</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          </TabsList>

          {/* Applications Tab */}
          <TabsContent value="applications" className="space-y-4">
            <div className="flex items-center gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 ml-auto"
                onClick={() =>
                  exportCSV(
                    filteredApps.map((a: any) => ({
                      name: a.name,
                      email: a.email,
                      university: a.university,
                      role: a.role,
                      status: a.status,
                      created_at: a.created_at,
                    })),
                    "ambassador-applications"
                  )
                }
              >
                <Download className="h-3.5 w-3.5" /> Export
              </Button>
            </div>

            <Card className="border-border bg-card">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs">Name</TableHead>
                        <TableHead className="text-xs">Email</TableHead>
                        <TableHead className="text-xs">University</TableHead>
                        <TableHead className="text-xs">Role</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {appsLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                          </TableCell>
                        </TableRow>
                      ) : filteredApps.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
                            No applications found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredApps.map((app: any) => (
                          <TableRow key={app.id}>
                            <TableCell className="text-sm font-medium">{app.name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{app.email}</TableCell>
                            <TableCell className="text-sm">{app.university}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px]">{app.role}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${
                                  app.status === "approved"
                                    ? "bg-accent/15 text-accent border-accent/30"
                                    : app.status === "rejected"
                                    ? "bg-destructive/15 text-destructive border-destructive/30"
                                    : "bg-gold/15 text-gold border-gold/30"
                                }`}
                              >
                                {app.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(app.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {app.status === "pending" && (
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs text-accent hover:bg-accent/10 gap-1"
                                    onClick={() => openApprove(app)}
                                  >
                                    <Check className="h-3 w-3" /> Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs text-destructive hover:bg-destructive/10 gap-1"
                                    onClick={() => updateStatusMutation.mutate({ id: app.id, status: "rejected" })}
                                  >
                                    <X className="h-3 w-3" /> Reject
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Active Ambassadors Tab */}
          <TabsContent value="active" className="space-y-4">
            <Card className="border-border bg-card">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs">University</TableHead>
                        <TableHead className="text-xs">Referral Code</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Referrals</TableHead>
                        <TableHead className="text-xs">Since</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ambassadors.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">
                            No ambassadors yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        ambassadors.map((amb: any) => {
                          const refCount = referrals.filter((r: any) => r.referral_code === amb.referral_code).length;
                          return (
                            <TableRow key={amb.id}>
                              <TableCell className="text-sm font-medium">{amb.university}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <code className="text-xs bg-secondary px-2 py-1 rounded">{amb.referral_code}</code>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0"
                                    onClick={() => {
                                      navigator.clipboard.writeText(`${window.location.origin}/join?ref=${amb.referral_code}`);
                                      toast({ title: "Copied referral link!" });
                                    }}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px] bg-accent/15 text-accent border-accent/30">
                                  {amb.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm font-semibold">{refCount}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {new Date(amb.created_at).toLocaleDateString()}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="space-y-4">
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() =>
                  exportCSV(
                    leaderboard.map((a: any) => ({
                      university: a.university,
                      referral_code: a.referral_code,
                      total_referrals: a.total_referrals,
                      verified_referrals: a.verified_referrals,
                    })),
                    "ambassador-leaderboard"
                  )
                }
              >
                <Download className="h-3.5 w-3.5" /> Export
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-border bg-card">
                <CardContent className="p-5">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Total Ambassadors</div>
                  <div className="text-2xl font-display font-bold text-foreground">{ambassadors.length}</div>
                </CardContent>
              </Card>
              <Card className="border-border bg-card">
                <CardContent className="p-5">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Total Referrals</div>
                  <div className="text-2xl font-display font-bold text-foreground">{referrals.length}</div>
                </CardContent>
              </Card>
              <Card className="border-border bg-card">
                <CardContent className="p-5">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Verified Referrals</div>
                  <div className="text-2xl font-display font-bold text-accent">{referrals.filter((r: any) => r.verified).length}</div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-gold" /> Ambassador Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs w-10">#</TableHead>
                        <TableHead className="text-xs">University</TableHead>
                        <TableHead className="text-xs">Code</TableHead>
                        <TableHead className="text-xs text-right">Users Referred</TableHead>
                        <TableHead className="text-xs text-right">Verified</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaderboard.map((amb: any, i: number) => (
                        <TableRow key={amb.id}>
                          <TableCell className="text-sm font-bold">
                            {i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}
                          </TableCell>
                          <TableCell className="text-sm font-medium">{amb.university}</TableCell>
                          <TableCell>
                            <code className="text-xs bg-secondary px-2 py-1 rounded">{amb.referral_code}</code>
                          </TableCell>
                          <TableCell className="text-right text-sm font-semibold">{amb.total_referrals}</TableCell>
                          <TableCell className="text-right text-sm font-semibold text-accent">{amb.verified_referrals}</TableCell>
                        </TableRow>
                      ))}
                      {leaderboard.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">
                            No ambassadors yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Approve Dialog */}
      <Dialog open={!!approveDialog} onOpenChange={(open) => !open && setApproveDialog(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <Check className="h-5 w-5 text-accent" /> Approve Ambassador
            </DialogTitle>
            <DialogDescription>
              Assign a referral code for {approveDialog?.name} at {approveDialog?.university}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Referral Code</label>
              <Input
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="e.g. JOHASU1234"
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Link: {window.location.origin}/join?ref={referralCode}
              </p>
            </div>
            <Button
              className="w-full gap-2"
              disabled={!referralCode.trim() || approveMutation.isPending}
              onClick={() => approveMutation.mutate({ app: approveDialog, code: referralCode.trim() })}
            >
              {approveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Approve & Assign Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
