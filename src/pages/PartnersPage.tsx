import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PartnerInquiryModal from "@/components/PartnerInquiryModal";

export default function PartnersPage() {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) {
      navigate("/");
    }
  }, [open, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <PartnerInquiryModal open={open} onOpenChange={setOpen} />
    </div>
  );
}
