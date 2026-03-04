import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export type CampusRole = "student" | "faculty" | "staff" | "alumni";
export type CampusRoleStatus = "unselected" | "pending" | "verified" | "rejected";
export type CampusVerificationMethod = "edu_email" | "manual_admin" | "partner_provider";

interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  student_verified: boolean;
  premium_status: boolean;
  campus_role: CampusRole | null;
  campus_role_status: CampusRoleStatus;
  campus_verification_method: CampusVerificationMethod | null;
  campus_domain: string | null;
  campus_name: string | null;
  verification_notes: string | null;
  campus_verified: boolean;
  verification_strength_score: number;
  campus_id: string | null;
  campus_city: string | null;
  has_seen_splash: boolean;
  campus_state: string | null;
  user_city: string | null;
  user_state: string | null;
  location_opt_in: boolean;
  use_campus_location: boolean;
  is_founding_member: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoggedIn: boolean;
  isStudentVerified: boolean;
  isCampusVerified: boolean;
  campusRole: CampusRole | null;
  campusRoleStatus: CampusRoleStatus;
  isPremium: boolean;
  isFoundingMember: boolean;
  isLoading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function isEduEmail(email: string) {
  const domain = email.split("@")[1]?.toLowerCase() || "";
  return domain.endsWith(".edu");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const linkPendingReferral = async (userId: string) => {
    // Check localStorage for a referral code saved during signup
    const refCode = localStorage.getItem("campusperk_ref");
    if (!refCode) return;

    // Find the most recent unlinked referral with this code
    const { data: pending } = await supabase
      .from("referrals")
      .select("id")
      .eq("referral_code", refCode)
      .is("referred_user_id", null)
      .order("signup_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pending) {
      await supabase
        .from("referrals")
        .update({ referred_user_id: userId, verified: true })
        .eq("id", pending.id);
      localStorage.removeItem("campusperk_ref");
    }
  };

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, name, email, student_verified, premium_status, campus_role, campus_role_status, campus_verification_method, campus_domain, campus_name, verification_notes, campus_verified, verification_strength_score, campus_id, campus_city, campus_state, user_city, user_state, location_opt_in, use_campus_location, has_seen_splash, is_founding_member")
      .eq("id", userId)
      .single();
    setProfile(data as Profile | null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    // Set up auth listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          // Use setTimeout to avoid Supabase client deadlock
          setTimeout(() => {
            fetchProfile(newSession.user.id);
            // Link any pending referral on first confirmed login
            linkPendingReferral(newSession.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    // THEN check existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      if (existingSession?.user) {
        fetchProfile(existingSession.user.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Realtime subscription to keep profile in sync with DB changes
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`profile-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (payload) => {
          setProfile(payload.new as Profile);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const signUp = async (email: string, password: string, name: string) => {
    if (!isEduEmail(email)) {
      return { error: "Please use a valid .edu email address." };
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error: error?.message ?? null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoggedIn: !!user,
        isStudentVerified: profile?.student_verified ?? false,
        isCampusVerified: profile?.campus_verified ?? false,
        campusRole: (profile?.campus_role as CampusRole | null) ?? null,
        campusRoleStatus: (profile?.campus_role_status as CampusRoleStatus) ?? "unselected",
        isPremium: profile?.premium_status ?? false,
        isLoading,
        signUp,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
