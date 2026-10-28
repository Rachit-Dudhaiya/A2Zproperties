import { useLocation, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Building2, Search, ArrowRight, Home, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { motion } from "framer-motion";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    console.error("404 Error: Route not found:", location.pathname);
  }, [location.pathname]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/properties?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate("/properties") ;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <SEO title="404 Page Not Found | A TO Z Properties" noindex />
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-16 px-4 sm:px-6 relative overflow-hidden">
        {/* Decorative backdrop blobs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="max-w-md w-full text-center relative z-10 space-y-6"
        >
          {/* Badge Icon */}
          <div className="w-20 h-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-inner">
            <Building2 className="h-10 w-10 text-accent stroke-[1.75]" />
          </div>

          <div>
            <span className="text-xs font-mono font-bold tracking-widest text-accent uppercase">
              Error 404 • Lost on the Map
            </span>
            <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tight text-foreground mt-2">
              Property Not Found
            </h1>
            <p className="text-sm text-muted-foreground font-body mt-2 leading-relaxed">
              The address or page you are looking for has been relocated, rented out, or doesn&apos;t exist in our current
              catalog.
            </p>
          </div>

          {/* Quick Search */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search rentals by locality or type..."
                className="pl-10 h-11 bg-card rounded-xl border-border"
              />
            </div>
            <Button type="submit" className="h-11 px-5 bg-primary text-primary-foreground font-semibold">
              Search
            </Button>
          </form>

          {/* Location Quick Tags */}
          <div className="pt-2">
            <span className="text-xs text-muted-foreground block mb-2 font-medium">Explore Popular Rajkot Rental Localities:</span>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {[
                { name: "Mavdi", path: "/rent-mavdi" },
                { name: "150 Feet Ring Road", path: "/rent-150-feet-ring-road" },
                { name: "Nana Mava", path: "/rent-nana-mava" },
                { name: "Race Course", path: "/rent-race-course" },
                { name: "Kalawad Road", path: "/rent-kalawad-road" },
              ].map((loc) => (
                <Link
                  key={loc.path}
                  to={loc.path}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-muted text-foreground/80 hover:bg-primary hover:text-white transition-colors border border-border"
                >
                  {loc.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto h-11 px-6 bg-accent text-accent-foreground font-semibold shadow-md">
                <Home className="h-4 w-4 mr-2" />
                Return to Home
              </Button>
            </Link>
            <Link to="/properties" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto h-11 px-6">
                <Compass className="h-4 w-4 mr-2" />
                Browse All Properties
              </Button>
            </Link>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default NotFound;
