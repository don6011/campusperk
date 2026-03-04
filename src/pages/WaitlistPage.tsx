import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import WaitlistModal from "@/components/WaitlistModal";

export default function WaitlistPage() {
  const [searchParams] = useSearchParams();
  const referredBy = searchParams.get("ref") || undefined;
  const [open, setOpen] = useState(true);

  // Keep modal open — if closed, redirect home
  useEffect(() => {
    if (!open) {
      window.location.href = "/";
    }
  }, [open]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <WaitlistModal open={open} onOpenChange={setOpen} referredBy={referredBy} />
    </div>
  );
}
