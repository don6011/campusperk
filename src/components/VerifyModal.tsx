import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GraduationCap, ShieldCheck, Lock, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface VerifyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: string;
}

export const VerifyModal = ({ open, onOpenChange, reason }: VerifyModalProps) => {
  const { user, isLoggedIn, isStudentVerified } = useAuth();
  const hasEdu = user?.email?.split("@")[1]?.toLowerCase().endsWith(".edu");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Student Verification Required
          </DialogTitle>
          <DialogDescription>
            {reason || "This deal requires a verified student account to access."}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-5">
          {!isLoggedIn ? (
            <>
              <div className="rounded-xl border border-border bg-secondary/50 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Lock className="h-4 w-4 text-muted-foreground" /> You need to sign up first
                </div>
                <p className="text-xs text-muted-foreground">
                  Create an account with your .edu email to verify your student status and unlock exclusive deals.
                </p>
              </div>
              <div className="flex gap-3">
                <Button asChild className="flex-1">
                  <Link to="/sign-up">Sign Up with .edu</Link>
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <Link to="/sign-in">Sign In</Link>
                </Button>
              </div>
            </>
          ) : !hasEdu ? (
            <>
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                  <Mail className="h-4 w-4" /> Non-.edu email detected
                </div>
                <p className="text-xs text-muted-foreground">
                  Your current email <span className="font-medium text-foreground">{user?.email}</span> is not a .edu address. Student verification requires a valid .edu email.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Please sign up with a .edu email to access student-verified deals.
              </p>
              <Button asChild className="w-full">
                <Link to="/sign-up">Sign Up with .edu Email</Link>
              </Button>
            </>
          ) : (
            <>
              <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-accent">
                  <ShieldCheck className="h-4 w-4" /> Ready to verify
                </div>
                <p className="text-xs text-muted-foreground">
                  We'll send a verification link to <span className="font-medium text-foreground">{user?.email}</span>. Click the link to confirm your student status.
                </p>
              </div>

              <div className="space-y-3 text-sm">
                <p className="font-medium text-foreground">After verification you'll unlock:</p>
                {[
                  "All student-verified deals",
                  "Premium student-only offers",
                  "Partner discount codes",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 text-accent shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <Button
                className="w-full gap-2"
                onClick={() => {
                  // In a real app, this would trigger an email verification flow
                  onOpenChange(false);
                }}
              >
                <Mail className="h-4 w-4" /> Send Verification Email
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
