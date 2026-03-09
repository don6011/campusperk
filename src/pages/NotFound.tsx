import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import campusperkLogo from "@/assets/campusperk-logo.png";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <motion.div
        className="text-center max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Link to="/" className="inline-block mb-8">
          <img src={campusperkLogo} alt="CampusPerk" className="h-12 w-auto mx-auto" />
        </Link>

        <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
          <Search className="h-8 w-8 text-primary" />
        </div>

        <h1 className="font-display text-5xl font-bold text-foreground mb-2">404</h1>
        <p className="text-lg text-muted-foreground mb-6">
          This page doesn't exist or may have been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/explore">Browse Deals</Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
