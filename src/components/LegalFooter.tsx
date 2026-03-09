import { Link } from "react-router-dom";
import campusperkLogo from "@/assets/campusperk-logo.png";

export default function LegalFooter() {
  return (
    <footer className="glass-strong relative z-10">
      <div className="gradient-divider" />
      <div className="container mx-auto px-4 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-2">
            <img src={campusperkLogo} alt="CampusPerk" className="h-14 w-auto" />
          </Link>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground transition-colors duration-300">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors duration-300">Terms of Service</Link>
            <Link to="/contact" className="hover:text-foreground transition-colors duration-300">Contact</Link>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} CampusPerk. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
