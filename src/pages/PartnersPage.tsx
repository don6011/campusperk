import { useEffect, useState } from "react";
import PartnerInquiryModal from "@/components/PartnerInquiryModal";

export default function PartnersPage() {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!open) {
      window.location.href = "/";
    }
  }, [open]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <PartnerInquiryModal open={open} onOpenChange={setOpen} />
    </div>
  );
}
