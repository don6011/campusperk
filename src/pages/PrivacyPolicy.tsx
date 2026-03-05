import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import campusperkLogo from "@/assets/campusperk-logo.png";
import LegalFooter from "@/components/LegalFooter";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-primary/6 blur-[160px]" />
      </div>

      {/* Nav */}
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
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground mb-10 leading-relaxed">
            CampusPerk ("we", "our", or "us") respects your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, and protect your information when you use our website, services, and mobile applications.
          </p>

          <div className="space-y-8">
            <Section title="Information We Collect">
              <p>We may collect information including:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                <li>Email address</li>
                <li>Campus or university</li>
                <li>Device information</li>
                <li>Usage data such as pages visited and interactions</li>
                <li>Optional profile information if users create accounts</li>
              </ul>
            </Section>

            <Section title="How We Use Your Information">
              <p>We use collected information to:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                <li>Provide and improve CampusPerk services</li>
                <li>Deliver student deal recommendations</li>
                <li>Send notifications about deals and product updates</li>
                <li>Analyze platform usage</li>
                <li>Prevent fraud or misuse</li>
              </ul>
            </Section>

            <Section title="Affiliate Links">
              <p>CampusPerk may use affiliate links. If you click a deal and make a purchase, we may earn a commission at no additional cost to you.</p>
            </Section>

            <Section title="Data Sharing">
              <p>We do not sell personal data. We may share limited information with trusted partners or service providers necessary to operate the platform.</p>
            </Section>

            <Section title="Cookies and Tracking">
              <p>CampusPerk may use cookies and analytics tools to understand how users interact with our services.</p>
            </Section>

            <Section title="Security">
              <p>We implement reasonable technical and organizational safeguards to protect user data.</p>
            </Section>

            <Section title="User Rights">
              <p>Users may request access, correction, or deletion of personal data by contacting us.</p>
            </Section>

            <Section title="Changes to This Policy">
              <p>This Privacy Policy may be updated periodically.</p>
            </Section>

            <Section title="Contact">
              <p>For privacy-related questions, contact:</p>
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
