import { Building2, Phone, MapPin, Mail, Clock, ArrowUpRight, ShieldCheck, Award, Instagram } from "lucide-react";
import { Link } from "react-router-dom";
import { MAIN_PHONE, MAIN_PHONE_DISPLAY, SECONDARY_PHONE, SECONDARY_PHONE_DISPLAY, OFFICE_ADDRESS, OFFICE_HOURS } from "@/lib/data";

const Footer = () => (
  <footer className="bg-primary dark:bg-card text-primary-foreground border-t border-primary-foreground/10 relative overflow-hidden">
    {/* Subtle decorative background gradient accent */}
    <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
    <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

    <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-16">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
        {/* Column 1: Brand & Credibility */}
        <div className="space-y-4">
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src="/az-logo-clean.png"
              alt="A TO Z Properties"
              className="h-11 sm:h-12 w-auto object-contain transition-transform duration-300 group-hover:scale-105 filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]"
            />
            <div>
              <span className="font-display font-bold text-xl text-primary-foreground tracking-tight">
                A TO Z <span className="text-accent font-normal text-sm">PROPERTIES</span>
              </span>
              <p className="text-[10px] text-primary-foreground/60 tracking-widest uppercase font-mono">
                Rajkot's Premier Rental Brokerage
              </p>
            </div>
          </Link>
          <p className="text-primary-foreground/75 font-body text-sm leading-relaxed">
            Your premier real estate partner in Rajkot. Specializing in verified residential rentals, commercial leases, and prime investments with complete transparency.
          </p>
          <div className="pt-1">
            <a
              href="https://www.instagram.com/a_to_z_properties?srtk=YjBoZnF0dzlyNXRk"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-foreground/10 hover:bg-accent hover:text-accent-foreground text-xs font-medium transition-all"
            >
              <Instagram className="h-4 w-4" />
              <span>Instagram Profile</span>
            </a>
          </div>
        </div>

        {/* Column 2: Quick Links */}
        <div>
          <h4 className="text-accent font-display text-base font-semibold tracking-wide uppercase mb-4">
            Quick Links
          </h4>
          <ul className="space-y-2.5 font-body text-xs sm:text-sm text-primary-foreground/80">
            <li>
              <Link to="/" className="hover:text-accent transition-colors">
                Home
              </Link>
            </li>
            <li>
              <Link to="/properties" className="hover:text-accent transition-colors">
                All Properties
              </Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-accent transition-colors">
                About Us
              </Link>
            </li>
            <li>
              <Link to="/inquiry" className="hover:text-accent transition-colors">
                Post Requirement
              </Link>
            </li>
            <li>
              <Link to="/book" className="hover:text-accent transition-colors">
                Book a Site Visit (₹200)
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 3: Explore Localities */}
        <div>
          <h4 className="text-accent font-display text-base font-semibold tracking-wide uppercase mb-4">
            Explore Localities
          </h4>
          <ul className="space-y-2.5 font-body text-xs sm:text-sm text-primary-foreground/80">
            <li>
              <Link to="/rent-mavdi" className="hover:text-accent transition-colors">
                Mavdi, Rajkot
              </Link>
            </li>
            <li>
              <Link to="/rent-150-feet-ring-road" className="hover:text-accent transition-colors">
                150 Feet Ring Road
              </Link>
            </li>
            <li>
              <Link to="/rent-goverdhan-chowk" className="hover:text-accent transition-colors">
                Goverdhan Chowk
              </Link>
            </li>
            <li>
              <Link to="/rent-nana-mava" className="hover:text-accent transition-colors">
                Nana Mava
              </Link>
            </li>
            <li>
              <Link to="/rent-race-course" className="hover:text-accent transition-colors">
                Race Course Ring Road
              </Link>
            </li>
            <li>
              <Link to="/rent-kalawad-road" className="hover:text-accent transition-colors">
                Kalawad Road
              </Link>
            </li>
            <li>
              <Link to="/rent-university-road" className="hover:text-accent transition-colors">
                University Road
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 4: Contact & Office */}
        <div>
          <h4 className="text-accent font-display text-base font-semibold tracking-wide uppercase mb-4">
            Contact &amp; Office
          </h4>
          <ul className="space-y-3.5 font-body text-xs sm:text-sm text-primary-foreground/80">
            {/* Phone Numbers - Proper view like old design */}
            <li className="flex items-start gap-2.5">
              <Phone className="h-4 w-4 text-accent mt-0.5 shrink-0" />
              <div className="space-y-1 font-medium text-primary-foreground">
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${MAIN_PHONE}`}
                    className="hover:text-accent transition-colors"
                  >
                    +91 {MAIN_PHONE_DISPLAY}
                  </a>
                  <a
                    href={`https://wa.me/${MAIN_PHONE.replace("+", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 text-xs px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 font-semibold"
                  >
                    WhatsApp
                  </a>
                </div>
                <div>
                  <a
                    href={`tel:${SECONDARY_PHONE}`}
                    className="hover:text-accent transition-colors"
                  >
                    +91 {SECONDARY_PHONE_DISPLAY}
                  </a>
                </div>
              </div>
            </li>

            {/* Email */}
            <li className="flex items-center gap-2.5">
              <Mail className="h-4 w-4 text-accent shrink-0" />
              <a href="mailto:atozpropertiesrajkot@gmail.com" className="hover:text-accent transition-colors truncate">
                atozpropertiesrajkot@gmail.com
              </a>
            </li>

            {/* Address */}
            <li className="flex items-start gap-2.5">
              <MapPin className="h-4 w-4 text-accent mt-0.5 shrink-0" />
              <span className="leading-snug">
                {OFFICE_ADDRESS}
              </span>
            </li>

            {/* Office Hours */}
            <li className="flex items-center gap-2.5">
              <Clock className="h-4 w-4 text-accent shrink-0" />
              <span>{OFFICE_HOURS}</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Legal & Attribution Row */}
      <div className="border-t border-primary-foreground/10 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-primary-foreground/60 font-body">
        <div>
          © {new Date().getFullYear()} A TO Z Properties, Rajkot. All rights reserved.
        </div>
        <div className="flex items-center gap-6">
          <span>RERA Compliant Brokerage</span>
          <span className="text-primary-foreground/30">•</span>
          <span>Crafted with Precision by Rachit Dudhaiya</span>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
