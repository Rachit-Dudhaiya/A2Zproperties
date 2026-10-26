import { Building2, Phone, MapPin, Mail, Clock, ArrowUpRight, ShieldCheck, Award, Instagram } from "lucide-react";
import { Link } from "react-router-dom";
import { PHONE_NUMBER } from "@/lib/data";
import ContactMenu from "@/components/ContactMenu";
import { Button } from "@/components/ui/button";

const Footer = () => (
  <footer className="bg-primary dark:bg-card text-primary-foreground border-t border-primary-foreground/10 relative overflow-hidden">
    {/* Subtle decorative background gradient accent */}
    <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
    <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

    <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-16">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
        {/* Column 1: Brand & Credibility */}
        <div className="space-y-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent shadow-sm">
              <Building2 className="h-5 w-5" />
            </div>
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
          <div className="flex flex-wrap gap-2 pt-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-foreground/10 text-primary-foreground/90 text-xs font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-accent" /> 100% Verified
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-foreground/10 text-primary-foreground/90 text-xs font-medium">
              <Award className="h-3.5 w-3.5 text-accent" /> 18+ Years Trust
            </span>
          </div>
          <div className="pt-1">
            <a
              href="https://www.instagram.com/a_to_z_properties?srtk=YjBoZnF0dzlyNXRk"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-foreground/10 hover:bg-accent hover:text-accent-foreground text-xs font-medium transition-all"
            >
              <Instagram className="h-4 w-4" />
              <span>Instagram</span>
            </a>
          </div>
        </div>

        {/* Column 2: Quick Links */}
        <div>
          <h4 className="text-accent font-display text-base font-semibold tracking-wide uppercase mb-4">
            Navigation
          </h4>
          <ul className="space-y-2.5 font-body text-sm text-primary-foreground/75">
            <li>
              <Link to="/" className="hover:text-accent transition-colors flex items-center justify-between group">
                <span>Home Showcase</span>
                <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </li>
            <li>
              <Link to="/properties" className="hover:text-accent transition-colors flex items-center justify-between group">
                <span>Explore Properties</span>
                <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-accent transition-colors flex items-center justify-between group">
                <span>About Our Firm</span>
                <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </li>
            <li>
              <Link to="/inquiry" className="hover:text-accent transition-colors flex items-center justify-between group">
                <span>Submit Rental Inquiry</span>
                <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </li>
            <li>
              <Link to="/book" className="hover:text-accent transition-colors flex items-center justify-between group">
                <span>Schedule a Site Visit</span>
                <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 3: Property Services */}
        <div>
          <h4 className="text-accent font-display text-base font-semibold tracking-wide uppercase mb-4">
            Property Types
          </h4>
          <ul className="space-y-2.5 font-body text-sm text-primary-foreground/75">
            <li className="hover:text-primary-foreground transition-colors">
              <Link to="/properties?type=Flat">Luxury 2 & 3 BHK Apartments</Link>
            </li>
            <li className="hover:text-primary-foreground transition-colors">
              <Link to="/properties?type=Bungalow">Gated Community Bungalows</Link>
            </li>
            <li className="hover:text-primary-foreground transition-colors">
              <Link to="/properties?type=Commercial">Commercial Shops & Showrooms</Link>
            </li>
            <li className="hover:text-primary-foreground transition-colors">
              <Link to="/properties?type=Office">Corporate Office Spaces</Link>
            </li>
            <li className="hover:text-primary-foreground transition-colors">
              <Link to="/properties?type=Plot">Investment Plots & Lands</Link>
            </li>
          </ul>
        </div>

        {/* Column 4: Contact & Hours */}
        <div>
          <h4 className="text-accent font-display text-base font-semibold tracking-wide uppercase mb-4">
            Get in Touch
          </h4>
          <ul className="space-y-3 font-body text-sm text-primary-foreground/75">
            <li className="flex items-start gap-2.5">
              <MapPin className="h-4 w-4 text-accent mt-0.5 shrink-0" />
              <span>150 Feet Ring Road & Kalawad Road Corridors, Rajkot, Gujarat, India</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="h-4 w-4 text-accent shrink-0" />
              <ContactMenu phone={PHONE_NUMBER} className="inline-block hover:text-accent transition-colors font-medium">
                <Button variant="ghost" className="p-0 h-auto text-primary-foreground/90 hover:text-accent">
                  +91 {PHONE_NUMBER}
                </Button>
              </ContactMenu>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="h-4 w-4 text-accent shrink-0" />
              <a href="mailto:atozpropertiesrajkot@gmail.com" className="hover:text-accent transition-colors truncate">
                atozpropertiesrajkot@gmail.com
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <Instagram className="h-4 w-4 text-accent shrink-0" />
              <a
                href="https://www.instagram.com/a_to_z_properties?srtk=YjBoZnF0dzlyNXRk"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent transition-colors truncate font-medium flex items-center gap-1 group"
              >
                <span>Instagram</span>
                <ArrowUpRight className="h-3 w-3 opacity-70 group-hover:opacity-100 transition-opacity" />
              </a>
            </li>
            <li className="flex items-center gap-2.5 text-xs text-primary-foreground/60 pt-1">
              <Clock className="h-3.5 w-3.5 text-accent shrink-0" />
              <span>Mon - Sun: 10:00 AM – 9:00 PM</span>
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

