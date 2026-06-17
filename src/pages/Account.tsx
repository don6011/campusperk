import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FoundingMemberBadge } from "@/components/FoundingMemberBadge";
import { BadgeEngine } from "@/components/BadgeEngine";
import { motion } from "framer-motion";
import {
  GraduationCap, BookOpen, Briefcase, Users, ShieldCheck, ShieldX,
  Clock, Upload, FileText, AlertTriangle, CheckCircle2, Loader2, Info,
  TrendingUp, MapPin, Tag, ShoppingBag, DollarSign, Heart, Sparkles, Bell, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth, type CampusRole } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { format } from "date-fns";
import { normalizeCampusDomain, isEduDomain, computeVerificationScore, scoreLabel } from "@/lib/campus-domain";
import { toStateCode, STATE_MAP } from "@/lib/state-codes";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";

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
  const navigate = useNavigate();
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

  const normalizedDomain = user?.email ? normalizeCampusDomain(user.email) : "";
  const rawDomain = user?.email?.split("@")[1]?.toLowerCase() ?? "";
  const hasEdu = isEduDomain(normalizedDomain);
  const hasPendingRequest = requests.some((r: any) => r.status === "pending");

  // Fetch domain info for approval status
  const { data: domainInfo } = useQuery({
    queryKey: ["campus-domain", normalizedDomain],
    enabled: !!normalizedDomain,
    queryFn: async () => {
      const { data } = await supabase
        .from("campus_domains")
        .select("*")
        .eq("domain_root", normalizedDomain)
        .maybeSingle();
      return data;
    },
  });

  const domainApproved = domainInfo?.is_approved ?? false;
  const domainBlocked = domainInfo?.is_blocked ?? false;

  // Role-based auto-verification rules
  const canAutoVerify = (role: CampusRole): boolean => {
    if (domainBlocked) return false;
    switch (role) {
      case "student":
        return hasEdu;
      case "faculty":
        return (hasEdu && rawDomain.includes("faculty")) || domainApproved;
      case "staff":
        return domainApproved;
      case "alumni":
        return rawDomain.startsWith("alumni.") || (domainApproved && rawDomain.includes("alumni"));
      default:
        return false;
    }
  };

  const handleRoleSelect = async (role: CampusRole) => {
    if (!user) return;
    setSelectedRole(role);

    if (canAutoVerify(role) && !isCampusVerified) {
      await performAutoVerify(role);
      return;
    }
  };

  const performAutoVerify = async (role: CampusRole) => {
    if (!user) return;
    setSubmitting(true);
    try {
      // Ensure campus domain entry exists
      await supabase.rpc("ensure_campus_domain", { p_domain_root: normalizedDomain } as any);

      // Compute verification score
      const score = computeVerificationScore({
        hasEdu,
        domainApproved,
        adminVerified: false,
        hasProof: false,
      });

      const { error } = await supabase.rpc("self_auto_verify_campus_role" as any, {
        p_role: role,
        p_domain_root: normalizedDomain,
        p_score: score,
      });

      if (error) throw error;

      const { data: assignment, error: assignmentError } = await supabase.rpc("assign_user_campus" as any, {
        p_role: role,
      });
      if (assignmentError) throw assignmentError;
      const assignmentStatus = (assignment as any)?.status;
      if (assignmentStatus && assignmentStatus !== "assigned") {
        throw new Error(`campus_assignment_failed:${assignmentStatus}`);
      }

      await refreshProfile();
      toast({ title: "✓ Campus Verified!", description: `Your ${role} status has been auto-verified (score: ${score}).` });
      navigate("/campus");
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
      const { error } = await supabase.rpc("request_campus_verification" as any, {
        p_role: selectedRole,
        p_domain_root: normalizedDomain,
        p_proof_upload_urls: uploadedUrls,
        p_user_message: message.trim() || null,
      });
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

        {/* Quick Links */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0.5}>
          <Card className="border-border bg-card">
            <CardContent className="py-3">
              <Link to="/notification-settings" className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/40 transition-colors">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Bell className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Notification Settings</p>
                <p className="text-xs text-muted-foreground">Manage push notifications, quiet hours & alert preferences</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
              <Link to="/badges" className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/40 transition-colors">
                <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Badge Collection</p>
                  <p className="text-xs text-muted-foreground">View earned badges, locked badges, rarity, and unlock progress</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </CardContent>
          </Card>
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
                <span className="text-sm font-medium">{profile?.campus_domain || normalizedDomain || "—"}</span>
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
              {profile?.is_founding_member && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <FoundingMemberBadge />
                </div>
              )}
              {/* Verification Strength Score */}
              {profile?.verification_strength_score != null && profile.verification_strength_score > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5" /> Trust Score
                    </span>
                    <span className={`text-sm font-semibold ${scoreLabel(profile.verification_strength_score).color}`}>
                      {profile.verification_strength_score}/100 — {scoreLabel(profile.verification_strength_score).label}
                    </span>
                  </div>
                  <Progress value={profile.verification_strength_score} className="h-1.5" />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Your Stats */}
        <AccountStatsSection userId={user?.id} />

        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1.6}>
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Badge Engine
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Badges unlock from verification, founding member status, ambassador activity, and trust score.
              </p>
            </CardHeader>
            <CardContent>
              <BadgeEngine />
            </CardContent>
          </Card>
        </motion.div>


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
              {hasEdu && !isCampusVerified && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/8 border border-accent/20">
                  <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    Your <strong className="text-foreground">.edu email</strong> ({normalizedDomain}) enables auto-verification for eligible roles. Select your role below.
                  </p>
                </div>
              )}
              {domainBlocked && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/8 border border-destructive/20">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    Your domain <strong className="text-foreground">{normalizedDomain}</strong> has been blocked. Contact support for help.
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
                  {selectedRole && !isCampusVerified && !hasPendingRequest && !canAutoVerify(selectedRole) && (
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

                  {/* .edu non-student with auto-verify available: show auto-verify button */}
                  {selectedRole && selectedRole !== "student" && canAutoVerify(selectedRole) && !isCampusVerified && !hasPendingRequest && (
                    <div className="space-y-3 pt-2">
                      <Separator />
                      <p className="text-xs text-muted-foreground">
                        Your domain <strong className="text-foreground">{normalizedDomain}</strong> qualifies for auto-verification as {selectedRole}.
                      </p>
                      <Button onClick={() => performAutoVerify(selectedRole)} disabled={submitting} className="w-full gap-2">
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                        {submitting ? "Verifying…" : "Auto-Verify Now"}
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

        {/* Location & Local Deals */}
        <LocationOptInCard />
      </div>
    </DashboardLayout>
  );
}

const US_STATES = Object.entries(STATE_MAP).map(([name, code]) => ({
  code,
  label: `${name.replace(/\b\w/g, c => c.toUpperCase())} (${code})`,
  name,
})).sort((a, b) => a.name.localeCompare(b.name));

function StateCombobox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const normalized = toStateCode(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="h-9 w-full justify-between text-sm font-normal">
          {normalized ? US_STATES.find(s => s.code === normalized)?.label ?? value : <span className="text-muted-foreground">Select state…</span>}
          <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search state…" className="h-9" />
          <CommandList>
            <CommandEmpty>No state found.</CommandEmpty>
            <CommandGroup>
              {US_STATES.map(s => (
                <CommandItem
                  key={s.code}
                  value={s.label}
                  onSelect={() => { onChange(s.code); setOpen(false); }}
                >
                  {s.label}
                  {normalized === s.code && <Check className="ml-auto h-3.5 w-3.5" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function LocationOptInCard() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [optIn, setOptIn] = useState(profile?.location_opt_in ?? false);
  const [city, setCity] = useState(profile?.user_city ?? profile?.campus_city ?? "");
  const [state, setState] = useState(profile?.user_state ?? profile?.campus_state ?? "");
  const [useCampus, setUseCampus] = useState(!profile?.user_city);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const effectiveCity = useCampus ? null : (city.trim() || null);
      const effectiveState = useCampus ? null : (state.trim() || null);
      const stateCode = toStateCode(effectiveState ?? profile?.campus_state);

      const { error } = await supabase.from("profiles").update({
        location_opt_in: optIn,
        user_city: effectiveCity,
        user_state: effectiveState,
        user_state_code: stateCode,
        use_campus_location: useCampus,
      } as any).eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast({ title: "Location preferences saved" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { delay: 0.28, duration: 0.4 } } }}>
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            Local Deals
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Enable location-based deals near your campus. We use city/state only to filter offers — no GPS.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">Enable local deals</span>
            <Switch checked={optIn} onCheckedChange={setOptIn} />
          </div>

          {optIn && (
            <>
              <Separator />
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useCampus"
                  checked={useCampus}
                  onChange={(e) => setUseCampus(e.target.checked)}
                  className="rounded border-border"
                />
                <label htmlFor="useCampus" className="text-xs text-muted-foreground">
                  Use my campus location ({profile?.campus_city || "unknown"}, {profile?.campus_state || "unknown"})
                </label>
              </div>

              {!useCampus && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">City</label>
                    <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Phoenix" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">State</label>
                    <StateCombobox value={state} onChange={setState} />
                  </div>
                </div>
              )}

              <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5" />}
                {saving ? "Saving…" : "Save Location Preferences"}
              </Button>
            </>
          )}

          {!optIn && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {["🍔 Campus dining", "💪 Local gyms", "🏠 Student housing perks", "🚌 Transit discounts"].map(item => (
                  <div key={item} className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/50 rounded-lg px-3 py-2">
                    {item}
                  </div>
                ))}
              </div>
              <Button onClick={handleSave} disabled={saving} variant="outline" size="sm" className="gap-2">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Save
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function AccountStatsSection({ userId }: { userId?: string }) {
  const { data: deals = [] } = useQuery({
    queryKey: ["account-stats-deals"],
    queryFn: async () => {
      const { data } = await supabase
        .from("deals")
        .select("id, category, discount_value, stores(name)")
        .eq("status", "active");
      return data || [];
    },
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ["account-stats-favorites", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("favorites")
        .select("deal_id")
        .eq("user_id", userId!);
      return data || [];
    },
  });

  const { data: userClicks = [] } = useQuery({
    queryKey: ["account-stats-clicks", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("affiliate_clicks")
        .select("deal_id")
        .eq("user_id", userId!);
      return data || [];
    },
  });

  const uniqueRedeemed = new Set(userClicks.map(c => c.deal_id));
  const dealsRedeemed = uniqueRedeemed.size;

  const stats = [
    { label: "Active Deals", value: `${deals.length}`, icon: Tag, color: "text-primary" },
    { label: "Deals Redeemed", value: `${dealsRedeemed}`, icon: ShoppingBag, color: "text-accent" },
    { label: "Savings Tracking", value: "Preview", icon: DollarSign, color: "text-accent" },
    { label: "Your Favorites", value: `${favorites.length}`, icon: Heart, color: "text-destructive" },
  ];

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1.5}>
      <Card className="border-accent/20 bg-card relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />
        <CardHeader className="pb-3 relative z-10">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent" /> Your Stats
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="grid grid-cols-2 gap-4">
            {stats.map(stat => (
              <div key={stat.label} className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-lg bg-secondary flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="font-display text-lg font-bold text-foreground">{stat.value}</div>
                  <div className="text-[11px] text-muted-foreground">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>          <div className="mt-4 pt-4 border-t border-accent/10">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Sparkles className="h-3 w-3 text-accent" />
              Beta Preview: verified savings totals will appear after real redemption amounts are recorded.
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}


