import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import WaitlistModal from "@/components/WaitlistModal";

export default function WaitlistPage() {
  const [searchParams] = useSearchParams();
  const referredBy = searchParams.get("ref") || undefined;
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) {
      navigate("/");
    }
  }, [open, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <WaitlistModal open={open} onOpenChange={setOpen} referredBy={referredBy} />
    </div>
  );
}
