import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Building2,
  ShieldCheck,
  Award,
  Compass,
  ArrowRight,
  CheckCircle2,
  Phone,
  Sparkles,
  MapPin,
  Clock,
  PlusCircle,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";
import { MAIN_PHONE, MAIN_PHONE_DISPLAY, SECONDARY_PHONE, SECONDARY_PHONE_DISPLAY, OFFICE_ADDRESS, OFFICE_HOURS } from "@/lib/data";

const VALUES = [
  {
    icon: ShieldCheck,
    title: "100% Verified Truth",
    desc: "Every property in our portfolio is physically inspected and photographed. We reject inaccurate specs and ghost listings outright.",
  },
  {
    icon: Award,
    title: "Zero Hidden Fees",
    desc: "We stand for clear, upfront brokerage terms. No surprise overheads, no arbitrary commissions — just honest, professional representation.",
  },
  {
    icon: Clock,
    title: "Assisted Site Visits",
    desc: "We value your schedule. Our structured ₹200 visit model allows you to tour up to 3 shortlisted properties with a dedicated chaperone.",
  },
  {
    icon: Compass,
    title: "Legal & RERA Alignment",
    desc: "We vet landlord titles, lease documents, and municipal compliance so tenants and buyers invest with absolute peace of mind.",
  },
];

const MILESTONES = [
  { year: "2006", title: "Goverdhan Chowk Inception", desc: "Started as a boutique advisory firm helping local families find honest rentals." },
  { year: "2014", title: "Commercial Expansion", desc: "Pioneered retail and showroom placements along the newly emergent 150 Feet Ring Road." },
  { year: "2020", title: "Digital Verified Platform", desc: "Launched full digital listings with high-resolution photography and virtual previews." },
  { year: "Present", title: "3,200+ Settled Residents", desc: "Recognized as Rajkot's benchmark for reliable real estate brokerage." },
];

export default function About() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO
        title="About A TO Z Properties, Rental Broker in Rajkot"
        description="About A TO Z Properties: Rajkot's benchmark rental brokerage since 2006. Located at Goverdhan Chowk, Mavdi. Verified residential and commercial leases. WhatsApp 63533 88626."
        canonical="https://www.atozproperties.co.in/about"
      />
      <Navbar />

      {/* Editorial Hero Banner */}
      <section className="bg-primary/95 dark:bg-card border-b border-primary-foreground/10 text-primary-foreground py-16 md:py-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 relative z-10 text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-accent text-xs font-mono uppercase tracking-widest mb-4">
            <Sparkles className="h-3.5 w-3.5" /> Established 2006
          </span>
          {/* Task 3: Exact H1 */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-display font-bold text-white tracking-tight max-w-4xl mx-auto leading-tight">
            About A TO Z Properties – <span className="text-gradient-gold">Goverdhan Chowk, Rajkot</span>
          </h1>
          <p className="mt-4 text-white/80 font-body text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Eighteen years of integrity in Rajkot real estate. From our roots at Goverdhan Chowk to managing premier luxury homes and commercial hubs, we guide every client from A to Z with transparency.
          </p>
        </div>
      </section>

      {/* Editorial Narrative & Image Collage */}
      <section className="section-padding container mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Narrative Column */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <span className="text-xs font-mono uppercase tracking-widest text-accent font-semibold">
              Our Journey
            </span>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground leading-snug">
              A Brokerage Built on Handshakes and Unshakeable Trust
            </h2>

            <blockquote className="border-l-4 border-accent pl-4 italic text-base sm:text-lg text-muted-foreground font-serif">
              "Your property journey, from A to Z, is not a transaction to us — it is our personal responsibility."
            </blockquote>

            <p className="text-muted-foreground font-body text-sm sm:text-base leading-relaxed">
              Founded on the bedrock of transparency, A TO Z Properties has stood at the crossroads of Rajkot's rapid urban growth for over 18 years. We recognized early on that navigating property in Gujarat was plagued by unverified rumors, phantom rates, and opaque middle-men.
            </p>

            <p className="text-muted-foreground font-body text-sm sm:text-base leading-relaxed">
              We changed that standard by inspecting every single property, verifying landlord paperwork, and providing assisted site visits. Today, our footprint covers gated family bungalows on Kalawad Road,University road ,Mavdi area and prime corporate offices on 150 Feet Ring Road.
            </p>

            <div className="pt-2 flex items-center gap-6">
              <div>
                <div className="text-3xl font-display font-bold text-primary dark:text-accent">18+</div>
                <div className="text-xs text-muted-foreground font-mono">Years in Rajkot</div>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <div className="text-3xl font-display font-bold text-primary dark:text-accent">3,200+</div>
                <div className="text-xs text-muted-foreground font-mono">Families Housed</div>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <div className="text-3xl font-display font-bold text-primary dark:text-accent">100%</div>
                <div className="text-xs text-muted-foreground font-mono">Verified Units</div>
              </div>
            </div>
          </div>

          {/* Image Collage Column */}
          <div className="lg:col-span-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="rounded-2xl overflow-hidden aspect-[3/4] shadow-card border border-border">
                  <img
                    src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop&q=80"
                    alt="Modern Villa in Rajkot"
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
                <div className="rounded-2xl overflow-hidden aspect-[4/3] shadow-card border border-border">
                  <img
                    src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=80"
                    alt="Apartment Corridor"
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
              </div>
              <div className="pt-8 space-y-4">
                <div className="rounded-2xl overflow-hidden aspect-[4/3] shadow-card border border-border">
                  <img
                    src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&auto=format&fit=crop&q=80"
                    alt="Corporate Office rajkot"
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
                <div className="rounded-2xl overflow-hidden aspect-[3/4] shadow-card border border-border">
                  <img
                    src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&auto=format&fit=crop&q=80"
                    alt="Architectural Luxury Interior"
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values & Mission Grid */}
      <section className="py-20 bg-muted/40 border-y border-border">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-mono uppercase tracking-widest text-accent font-semibold">
              Our Principles
            </span>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mt-1">
              Mission, Vision & Core Values
            </h2>
            <p className="mt-2 text-muted-foreground font-body text-sm sm:text-base">
              To be the most reliable, tech-driven property advisory brand in Gujarat through unyielding integrity.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {VALUES.map((val) => (
              <div
                key={val.title}
                className="bg-card rounded-2xl p-6 border border-border shadow-card hover:shadow-card-hover transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary dark:text-accent flex items-center justify-center mb-5">
                    <val.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-display font-bold text-lg text-card-foreground mb-2">
                    {val.title}
                  </h3>
                  <p className="text-muted-foreground text-sm font-body leading-relaxed">
                    {val.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* Historical Milestones */}
      <section className="py-20 bg-muted/30 border-t border-border">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-mono uppercase tracking-widest text-accent font-semibold">
              Heritage & Milestones
            </span>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mt-1">
              Two Decades of Evolution
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {MILESTONES.map((m, i) => (
              <div
                key={m.year}
                className="bg-card rounded-2xl p-6 border border-border relative text-left"
              >
                <div className="font-display font-bold text-3xl text-accent mb-2">
                  {m.year}
                </div>
                <h3 className="font-display font-bold text-base text-foreground mb-1">
                  {m.title}
                </h3>
                <p className="text-xs text-muted-foreground font-body leading-relaxed">
                  {m.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Action Banner */}
      <section className="bg-hero text-primary-foreground py-16 text-center">
        <div className="container mx-auto max-w-4xl px-4">
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-white">
            Ready to Discover Your Next Address?
          </h2>
          <p className="mt-3 text-white/80 font-body text-base max-w-xl mx-auto">
            Browse our curated inventory or consult directly with our senior advisors today.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/properties">
              <Button
                size="lg"
                className="h-11 px-8 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold shadow-md hover:shadow-xl rounded-full border border-amber-300/80 transition-all duration-300 hover:scale-105 active:scale-95 text-sm sm:text-base flex items-center justify-center cursor-pointer"
              >
                Explore Properties <ArrowRight className="ml-2 h-4 w-4 text-stone-950" />
              </Button>
            </Link>
            <Link to="/inquiry">
              <Button
                size="lg"
                variant="outline"
                className="h-11 px-6 rounded-full border border-white/20 bg-white/5 text-white hover:bg-white/15 hover:border-white/40 font-body text-sm backdrop-blur-sm transition-all duration-300 active:scale-95 shadow-xs"
              >
                <PlusCircle className="mr-2 h-4 w-4 text-accent" />
                Post Requirement
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

