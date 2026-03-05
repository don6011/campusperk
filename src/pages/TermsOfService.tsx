import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import campusperkLogo from "@/assets/campusperk-logo.png";
import LegalFooter from "@/components/LegalFooter";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-primary/6 blur-[160px]" />
      </div>

      <nav className="sticky top-0 z-50 border-b border-border/30 bg-background/70 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={campusperkLogo} alt="CampusPerk" className="h-20 w-auto" />
          </Link>
          <Link to="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
        </div>
      </nav>

      <main className="flex-1 relative z-10">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="container mx-auto max-w-3xl px-4 py-16 md:py-24">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">Terms of Service</h1>
          <p className="text-muted-foreground mb-10 leading-relaxed">
            By using CampusPerk, you agree to the following terms and conditions.
          </p>

          <div className="space-y-8">
            <Section title="Use of Service">
              <p>CampusPerk provides a platform for discovering student discounts and deals. Users must use the service responsibly and comply with applicable laws.</p>
            </Section>

            <Section title="Eligibility">
              <p>Users may be required to verify student or campus affiliation to access certain features.</p>
            </Section>

            <Section title="Affiliate Relationships">
              <p>CampusPerk may receive compensation from affiliate partners when users interact with deal links.</p>
            </Section>

            <Section title="Accuracy of Deals">
              <p>While we strive to provide accurate information, CampusPerk does not guarantee the availability or validity of third-party offers.</p>
            </Section>

            <Section title="User Conduct">
              <p>Users agree not to misuse the platform, scrape data, or attempt unauthorized access.</p>
            </Section>

            <Section title="Intellectual Property">
              <p>All content, branding, and platform design are property of CampusPerk unless otherwise stated.</p>
            </Section>

            <Section title="Limitation of Liability">
              <p>CampusPerk is not responsible for transactions, products, or services provided by third-party merchants.</p>
            </Section>

            <Section title="Termination">
              <p>We reserve the right to suspend or terminate accounts that violate these terms.</p>
            </Section>

            <Section title="Changes to Terms">
              <p>These terms may be updated from time to time.</p>
            </Section>

            <Section title="Contact">
              <p>Business inquiries:</p>
              <a href="mailto:Business@campusperk.com" className="text-primary hover:underline mt-1 inline-block">Business@campusperk.com</a>
            </Section>
          </div>
        </motion.div>
      </main>

      <LegalFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm p-6">
      <h2 className="font-display text-xl font-semibold text-foreground mb-3">{title}</h2>
      <div className="text-muted-foreground leading-relaxed">{children}</div>
    </div>
  );
}
