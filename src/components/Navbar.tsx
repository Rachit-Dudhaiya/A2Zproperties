import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Phone, Building2, LogIn, LogOut, PlusCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import ContactMenu from "@/components/ContactMenu";
import { PHONE_NUMBER } from "@/lib/data";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const isScrolled = window.scrollY > 15;
          setScrolled((prev) => (prev !== isScrolled ? isScrolled : prev));
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/properties", label: "Properties" },
    { to: "/about", label: "About" },
    { to: "/inquiry", label: "Quick Inquiry" },
    ...(user ? [{ to: "/my-bookings", label: "My Bookings" }] : []),
    ...(isAdmin ? [{ to: "/dashboard", label: "Admin Portal" }] : []),
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-primary/95 dark:bg-card/95 backdrop-blur-md shadow-lg py-2.5 border-b border-primary-foreground/10"
          : "bg-primary dark:bg-card/90 backdrop-blur-sm py-4 border-b border-transparent"
      }`}
    >
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 flex items-center justify-between">
        {/* Logo / Brand Left */}
        <Link
          to="/"
          className="flex items-center gap-2.5 sm:gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg"
          aria-label="A TO Z Properties Home"
        >
          <img
            src="/az-logo-clean.png"
            alt="A TO Z Properties"
            className="h-10 sm:h-11 w-auto object-contain transition-transform duration-300 group-hover:scale-105 filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.3)]"
          />
          <div className="leading-tight">
            <div className="font-display font-bold text-lg text-primary-foreground tracking-tight">
              A TO Z <span className="text-accent font-normal text-sm">PROPERTIES</span>
            </div>
            <div className="text-[10px] text-primary-foreground/70 tracking-widest uppercase font-mono">
              Real Estate • Rajkot
            </div>
          </div>
        </Link>

        {/* Centered Navigation Links with Animated Underline */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2" aria-label="Main Navigation">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`relative px-3.5 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg ${
                  isActive ? "text-accent font-semibold" : "text-primary-foreground/80 hover:text-primary-foreground"
                }`}
              >
                {link.label}
                {isActive && (
                  <motion.div
                    layoutId="navbar-indicator"
                    className="absolute bottom-0 left-3.5 right-3.5 h-0.5 bg-accent rounded-full"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Action Cluster */}
        <div className="hidden sm:flex items-center gap-3">
          {/* Phone Quick Dial */}
          <ContactMenu phone={PHONE_NUMBER} className="inline-block">
            <Button
              size="sm"
              variant="outline"
              className="h-9 border-primary-foreground/20 bg-primary-foreground/5 text-primary-foreground hover:bg-primary-foreground/15 hover:border-primary-foreground/40 font-body text-xs"
              aria-label={`Call ${PHONE_NUMBER}`}
            >
              <Phone className="h-3.5 w-3.5 mr-1.5 text-accent" />
              <span className="hidden xl:inline">{PHONE_NUMBER}</span>
              <span className="xl:hidden">Call</span>
            </Button>
          </ContactMenu>

          {/* List Property / Dashboard CTA */}
          {isAdmin ? (
            <Link to="/add-property">
              <Button
                size="sm"
                className="h-9 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold shadow-md hover:shadow-lg text-xs px-4 rounded-full border border-amber-300/80 transition-all active:scale-95"
              >
                <PlusCircle className="h-3.5 w-3.5 mr-1.5 text-stone-950" />
                List Property
              </Button>
            </Link>
          ) : (
            <Link to="/inquiry">
              <Button
                size="sm"
                className="h-9 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold shadow-md hover:shadow-lg text-xs px-4 rounded-full border border-amber-300/80 transition-all active:scale-95"
              >
                <PlusCircle className="h-3.5 w-3.5 mr-1.5 text-stone-950" />
                Post Requirement
              </Button>
            </Link>
          )}

          {/* User Sign In / Out */}
          {user ? (
            <div className="flex items-center gap-2 pl-1 border-l border-primary-foreground/20">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSignOut}
                className="h-9 text-xs text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 px-2.5"
                title="Sign out of account"
              >
                <LogOut className="h-3.5 w-3.5 mr-1" />
                Sign Out
              </Button>
            </div>
          ) : (
            <Link to="/auth">
              <Button
                size="sm"
                variant="ghost"
                className="h-9 text-xs text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 px-2.5"
              >
                <LogIn className="h-3.5 w-3.5 mr-1" />
                Sign In
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile Hamburger Trigger */}
        <button
          className="lg:hidden p-2 rounded-xl text-primary-foreground hover:bg-primary-foreground/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="h-6 w-6 text-accent" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Animated Drawer Menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="lg:hidden border-t border-primary-foreground/10 bg-primary/98 dark:bg-card/98 backdrop-blur-xl px-5 pt-4 pb-6 overflow-hidden"
          >
            <div className="flex flex-col space-y-1">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-base font-medium transition-colors ${
                      isActive
                        ? "bg-accent/15 text-accent font-semibold"
                        : "text-primary-foreground/85 hover:bg-primary-foreground/5 hover:text-primary-foreground"
                    }`}
                  >
                    <span>{link.label}</span>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
                  </Link>
                );
              })}
            </div>

            <div className="mt-5 pt-4 border-t border-primary-foreground/10 space-y-2.5">
              <ContactMenu phone={PHONE_NUMBER} className="block w-full">
                <Button
                  size="default"
                  variant="outline"
                  className="w-full justify-center border-primary-foreground/20 bg-primary-foreground/5 text-primary-foreground hover:bg-primary-foreground/10 font-body text-sm"
                >
                  <Phone className="h-4 w-4 mr-2 text-accent" />
                  Call Directly ({PHONE_NUMBER})
                </Button>
              </ContactMenu>

              {isAdmin ? (
                <Link to="/add-property" onClick={() => setOpen(false)} className="block">
                  <Button className="w-full justify-center bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-sm h-11 rounded-xl shadow-md">
                    <PlusCircle className="h-4 w-4 mr-2 text-stone-950" />
                    List New Property
                  </Button>
                </Link>
              ) : (
                <Link to="/inquiry" onClick={() => setOpen(false)} className="block">
                  <Button className="w-full justify-center bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-sm h-11 rounded-xl shadow-md">
                    <PlusCircle className="h-4 w-4 mr-2 text-stone-950" />
                    Post Rental Requirement
                  </Button>
                </Link>
              )}

              {user ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    handleSignOut();
                    setOpen(false);
                  }}
                  className="w-full justify-center text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 text-sm"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out ({user.full_name || user.phone || user.email?.split("@")[0] || "Account"})
                </Button>
              ) : (
                <Link to="/auth" onClick={() => setOpen(false)} className="block">
                  <Button
                    variant="ghost"
                    className="w-full justify-center text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 text-sm"
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In to Account
                  </Button>
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;

