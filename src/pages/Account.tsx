import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  GraduationCap, BookOpen, Briefcase, Users, ShieldCheck, ShieldX,
  Clock, Upload, FileText, AlertTriangle, CheckCircle2, Loader2, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth, type CampusRole } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { format } from "date-fns";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.4 } }),
};

const ROLES: { id: CampusRole; label: string; desc: string; Icon: typeof GraduationCap }[] = [
  { id: "student", label: "Student",  desc: "Currently enrolled at a college or university.", Icon: GraduationCap },
  { id: "faculty", label: "Faculty",  desc: "Professor, lecturer, or instructor at a campus.", Icon: BookOpen },
  { id: "staff",   label: "Staff",    desc: "Administrative or support staff at a campus.",   Icon: Briefcase },
  { id: "alumni",  label: "Alumni",   desc: "Graduate of a college or university.",            Icon: Users },
];

export default function Account() {
  const { user, profile, refreshProfile, campusRole, campusRoleStatus, isCampusVerified } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [selectedRole, setSelectedRole] = useState<CampusRole | null>(campusRole);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);

  // Fetch existing verification requests
  const { data: requests = [] } = useQuery({
    queryKey: ["my-verification-requests", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("verification_requests")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch audit history visible to the user
  const { data: history = [] } = useQuery({
    queryKey: ["campus-audit-history", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("verification_audit_log")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const domain = user?.email?.split("@")[1]?.toLowerCase() ?? "";
  const hasEdu = domain.endsWith(".edu");
  const hasPendingRequest = requests.some((r: any) => r.status === "pending");
  const canAutoVerify = hasEdu;

  const handleRoleSelect = async (role: CampusRole) => {
    if (!user) return;
    setSelectedRole(role);

    // If auto-verifiable (.edu) and selecting student, or any role with .edu
    if (canAutoVerify && role === "student" && !isCampusVerified) {
      await performAutoVerify(role);
      return;
    }
  };

  const performAutoVerify = async (role: CampusRole) => {
    if (!user) return;
    setSubmitting(true);
    try {
      // Write audit log: role_selected
      await supabase.from("verification_audit_log").insert({
        user_id: user.id,
        admin_id: user.id,
        previous_status: false,
        new_status: true,
        verification_method: "edu" as any,
        reason: "Automatic .edu email verification",
        action_type: "verification_approved" as any,
        new_role: role as any,
        new_campus_status: "verified" as any,
        campus_verification_method: "edu_email" as any,
      } as any);

      // Update profile
      const { error } = await supabase.from("profiles").update({
        campus_role: role as any,
        campus_role_status: "verified" as any,
        campus_verification_method: "edu_email" as any,
        campus_domain: domain,
        campus_verified: true,
        student_verified: role === "student",
      }).eq("id", user.id);

      if (error) throw error;
      await refreshProfile();
      toast({ title: "✓ Campus Verified!", description: `Your ${role} status has been auto-verified via .edu email.` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB per file.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("verification-proofs").upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("verification-proofs").getPublicUrl(path);
      setUploadedUrls((prev) => [...prev, publicUrl]);
      toast({ title: "File uploaded", description: file.name });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitRequest = async () => {
    if (!user || !selectedRole) return;
    setSubmitting(true);
    try {
      // Check rate limit
      const { data: limited } = await supabase.rpc("check_verification_request_rate_limit", {
        p_user_id: user.id,
        p_max_requests: 3,
        p_window_hours: 24,
      } as any);
      if (limited) {
        toast({ title: "Rate limit reached", description: "Max 3 requests per 24h. Please wait.", variant: "destructive" });
        return;
      }

      // Write audit log: role_selected
      await supabase.from("verification_audit_log").insert({
        user_id: user.id,
        admin_id: user.id,
        previous_status: false,
        new_status: false,
        verification_method: "manual" as any,
        reason: "User selected campus role and requested manual verification",
        action_type: "verification_requested" as any,
        new_role: selectedRole as any,
        new_campus_status: "pending" as any,
      } as any);

      // Update profile role + status
      await supabase.from("profiles").update({
        campus_role: selectedRole as any,
        campus_role_status: "pending" as any,
        campus_domain: domain,
      }).eq("id", user.id);

      // Insert verification request
      const { error } = await supabase.from("verification_requests").insert({
        user_id: user.id,
        campus_role_requested: selectedRole as any,
        email_domain: domain,
        proof_upload_urls: uploadedUrls,
        user_message: message.trim() || null,
      } as any);
      if (error) throw error;

      await refreshProfile();
      qc.invalidateQueries({ queryKey: ["my-verification-requests"] });
      toast({ title: "Request submitted!", description: "An admin will review your campus verification request." });
      setMessage("");
      setUploadedUrls([]);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = () => {
    if (isCampusVerified) return <Badge className="bg-accent/15 text-accent border-accent/30 gap-1"><ShieldCheck className="h-3 w-3" /> Verified</Badge>;
    if (campusRoleStatus === "pending") return <Badge className="bg-gold/15 text-gold border-gold/30 gap-1"><Clock className="h-3 w-3" /> Pending Review</Badge>;
    if (campusRoleStatus === "rejected") return <Badge className="bg-destructive/15 text-destructive border-destructive/30 gap-1"><ShieldX className="h-3 w-3" /> Rejected</Badge>;
    return <Badge className="bg-secondary text-muted-foreground border-border gap-1">Unverified</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <h1 className="font-display text-2xl font-bold text-foreground">Account Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your campus verification and profile.</p>
        </motion.div>

        {/* Profile Summary */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}>
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Name</span>
                <span className="text-sm font-medium">{profile?.name || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Email</span>
                <span className="text-sm font-medium">{user?.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Campus Domain</span>
                <span className="text-sm font-medium">{profile?.campus_domain || domain || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Campus Status</span>
                {statusBadge()}
              </div>
              {isCampusVerified && campusRole && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Role</span>
                  <span className="text-sm font-medium capitalize">{campusRole}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Campus Verification Section */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2}>
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Campus Verification
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select your campus role to unlock role-specific deals and perks.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Auto-verify notice */}
              {canAutoVerify && !isCampusVerified && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/8 border border-accent/20">
                  <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    Your <strong className="text-foreground">.edu email</strong> enables instant auto-verification. Select your role below to get verified immediately.
                  </p>
                </div>
              )}

              {/* Already verified */}
              {isCampusVerified ? (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-accent/8 border border-accent/20">
                  <ShieldCheck className="h-6 w-6 text-accent shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground capitalize">Verified {campusRole}</p>
                    <p className="text-xs text-muted-foreground">Your campus status is confirmed and active.</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Role selector cards */}
                  <div className="grid grid-cols-2 gap-3">
                    {ROLES.map(({ id, label, desc, Icon }) => (
                      <button
                        key={id}
                        onClick={() => handleRoleSelect(id)}
                        disabled={submitting || hasPendingRequest}
                        className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                          selectedRole === id
                            ? "border-primary/50 bg-primary/8 shadow-[0_0_20px_-4px_hsl(217_91%_60%/0.3)]"
                            : "border-border bg-secondary/40 hover:border-border/80 hover:bg-secondary/60"
                        } disabled:opacity-60 disabled:cursor-not-allowed`}
                      >
                        <Icon className={`h-5 w-5 mb-2 ${selectedRole === id ? "text-primary" : "text-muted-foreground"}`} />
                        <div className={`text-sm font-semibold ${selectedRole === id ? "text-foreground" : "text-foreground/80"}`}>{label}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{desc}</div>
                      </button>
                    ))}
                  </div>

                  {/* Pending notice */}
                  {hasPendingRequest && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-gold/8 border border-gold/20">
                      <Clock className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground">You have a pending verification request. An admin will review it shortly.</p>
                    </div>
                  )}

                  {/* Manual verification panel — shown when non-.edu or non-student role selected */}
                  {selectedRole && !isCampusVerified && !hasPendingRequest && !(canAutoVerify && selectedRole === "student") && (
                    <div className="space-y-4 pt-2">
                      <Separator />
                      <div>
                        <p className="text-sm font-medium text-foreground mb-1">Request Manual Verification</p>
                        <p className="text-xs text-muted-foreground">
                          Since your email doesn't automatically confirm your role, upload proof (ID card, letter, etc.) and optionally add a note.
                        </p>
                      </div>

                      {/* Proof upload */}
                      <div>
                        <label className="text-xs font-medium text-foreground mb-2 block">
                          Upload Proof <span className="text-muted-foreground font-normal">(optional, max 5MB)</span>
                        </label>
                        <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileUpload} />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileRef.current?.click()}
                          disabled={uploading}
                          className="gap-2"
                        >
                          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                          {uploading ? "Uploading…" : "Choose File"}
                        </Button>
                        {uploadedUrls.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {uploadedUrls.map((url, i) => (
                              <div key={i} className="flex items-center gap-1.5 text-xs text-accent">
                                <FileText className="h-3 w-3" />
                                <span className="truncate">File {i + 1} uploaded</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="mt-2 flex items-start gap-1.5 text-[11px] text-muted-foreground/70">
                          <Info className="h-3 w-3 shrink-0 mt-0.5" />
                          <span>Only share what's needed. Sensitive info is handled securely by our team.</span>
                        </div>
                      </div>

                      {/* Message */}
                      <div>
                        <label className="text-xs font-medium text-foreground mb-1.5 block">Note to Admin <span className="text-muted-foreground font-normal">(optional)</span></label>
                        <Textarea
                          placeholder="Any context about your campus affiliation…"
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          rows={3}
                          className="text-sm resize-none"
                        />
                      </div>

                      <Button
                        onClick={handleSubmitRequest}
                        disabled={submitting || !selectedRole}
                        className="w-full gap-2"
                      >
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                        {submitting ? "Submitting…" : "Submit Verification Request"}
                      </Button>
                    </div>
                  )}

                  {/* .edu non-student: still allow auto but with manual option */}
                  {selectedRole && selectedRole !== "student" && canAutoVerify && !isCampusVerified && !hasPendingRequest && (
                    <div className="space-y-3 pt-2">
                      <Separator />
                      <p className="text-xs text-muted-foreground">
                        Faculty, staff, and alumni with a .edu email can be verified, but may require admin confirmation.
                      </p>
                      <Button onClick={handleSubmitRequest} disabled={submitting} className="w-full gap-2">
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                        {submitting ? "Submitting…" : "Request Verification"}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Verification History */}
        {history.length > 0 && (
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3}>
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Verification History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {history.map((log: any) => (
                    <div key={log.id} className="flex items-start gap-3 text-sm">
                      <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                        {log.new_status ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                        ) : (
                          <AlertTriangle className="h-3.5 w-3.5 text-gold" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground capitalize">
                          {(log.action_type || "status_change").replace(/_/g, " ")}
                          {log.new_role && ` — ${log.new_role}`}
                        </p>
                        {log.reason && <p className="text-[11px] text-muted-foreground truncate">{log.reason}</p>}
                      </div>
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.created_at), "MMM d, yyyy")}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
