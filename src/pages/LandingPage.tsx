import React, { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import PropertyCard from "@/components/PropertyCard";
import { LANDING_PAGES, LandingPageData } from "@/lib/landingPagesData";
import {
  MAIN_PHONE,
  MAIN_PHONE_DISPLAY,
  SECONDARY_PHONE,
  SECONDARY_PHONE_DISPLAY,
  OFFICE_ADDRESS,
  OFFICE_HOURS,
  OFFICE_MAP_URL,
} from "@/lib/data";
import { db } from "@/integrations/firebase/client";
import { collection, query as fsQuery, orderBy as fsOrderBy, onSnapshot, getDocs } from "firebase/firestore";
import {
  MapPin,
  Phone,
  MessageSquare,
  Sparkles,
  CalendarCheck,
  Building2,
  ChevronRight,
  ShieldCheck,
  HelpCircle,
  Compass,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface LandingPageProps {
  slugOverride?: string;
}

export default function LandingPage({ slugOverride }: LandingPageProps) {
  const location = useLocation();
  const slug = slugOverride || location.pathname.replace(/^\//, "");
  const pageData: LandingPageData | undefined = LANDING_PAGES[slug];

  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    const col = collection(db, "properties");
    const q = fsQuery(col, fsOrderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const out: any[] = [];
        snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
        setProperties(out);
        setLoading(false);
      },
      async (err) => {
        console.warn("Snapshot error, falling back to one-time getDocs:", err);
        try {
          const snap = await getDocs(col);
          const out: any[] = [];
          snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
          setProperties(out);
        } catch (e) {
          console.error("Firestore getDocs fallback error:", e);
        } finally {
          setLoading(false);
        }
      }
    );
    return () => unsub();
  }, []);

  const matchingProperties = useMemo(() => {
    if (!pageData) return [];
    return properties.filter((p) => {
      try {
        return pageData.filter(p);
      } catch {
        return false;
      }
    });
  }, [properties, pageData]);

  if (!pageData) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <h1 className="text-2xl font-bold mb-2">Category Not Found</h1>
          <p className="text-muted-foreground mb-4">The rental category or area you requested does not exist.</p>
          <Link to="/properties">
            <Button>View All Properties</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  // Build FAQPage JSON-LD schema
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: pageData.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  const whatsappMessage = encodeURIComponent(
    `Hello A TO Z Properties! I am looking for rental options for "${pageData.h1}". Please share available verified properties.`
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <SEO
        title={pageData.title}
        description={pageData.metaDescription}
        canonical={`https://www.atozproperties.co.in${pageData.path}`}
        jsonLd={faqSchema}
      />

      <Navbar />

      <main className="flex-1">
        {/* Hero & Intro Section */}
        <section className="bg-gradient-to-b from-primary/10 via-background to-background border-b border-border/40 py-10 sm:py-14">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6">
            {/* Breadcrumbs */}
            <nav aria-label="Breadcrumb" className="mb-4">
              <ol className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                <li>
                  <Link to="/" className="hover:text-primary transition-colors">Home</Link>
                </li>
                <li><ChevronRight className="h-3 w-3 text-muted-foreground/60" /></li>
                <li>
                  <Link to="/properties" className="hover:text-primary transition-colors">Properties</Link>
                </li>
                <li><ChevronRight className="h-3 w-3 text-muted-foreground/60" /></li>
                <li className="text-foreground font-semibold truncate max-w-[200px] sm:max-w-none">
                  {pageData.h1}
                </li>
              </ol>
            </nav>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/15 text-accent-foreground text-xs font-semibold mb-3 border border-accent/25">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              <span>Verified Rentals in Rajkot • Real Photos & Physical Checks</span>
            </div>

            {/* Exactly one H1 tag per page */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold tracking-tight text-foreground">
              {pageData.h1}
            </h1>

            {/* 150-250 word Unique Intro Content */}
            <div className="mt-4 max-w-3xl text-sm sm:text-base text-muted-foreground leading-relaxed font-body">
              <p>{pageData.intro.summary}</p>
            </div>

            {/* Key Area / Type Highlights Pill Grid */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-4xl pt-2">
              <div className="p-3.5 rounded-xl bg-card border border-border shadow-sm">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground block mb-1">
                  Expected Monthly Rent
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {pageData.intro.rentRange}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-card border border-border shadow-sm">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground block mb-1">
                  Key Corridor Landmarks
                </span>
                <div className="flex flex-wrap gap-1">
                  {pageData.intro.landmarks.map((lm) => (
                    <span key={lm} className="text-xs font-medium text-foreground bg-muted px-2 py-0.5 rounded-md">
                      {lm}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-card border border-border shadow-sm">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground block mb-1">
                  Ideal For
                </span>
                <span className="text-xs text-foreground font-medium">
                  {pageData.intro.suitableFor}
                </span>
              </div>
            </div>

            {/* Special Goverdhan Chowk Head Office Box with Google Map */}
            {pageData.isHeadOffice && (
              <div className="mt-8 p-6 rounded-2xl bg-card border-2 border-accent/40 shadow-md">
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                  <div className="space-y-2 max-w-xl">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                      <Building2 className="h-3.5 w-3.5" /> A TO Z Properties Main Headquarters
                    </div>
                    <h3 className="text-xl font-display font-bold text-foreground">
                      Our Head Office is Located at Goverdhan Chowk
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {OFFICE_ADDRESS}
                    </p>
                    <p className="text-xs font-medium text-foreground">
                      Office Timings: <span className="text-primary font-semibold">{OFFICE_HOURS}</span>
                    </p>
                    <div className="pt-2 flex flex-wrap gap-2">
                      <a
                        href={OFFICE_MAP_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-xs font-semibold text-primary hover:underline"
                      >
                        <MapPin className="h-3.5 w-3.5 mr-1 text-accent" /> Open in Google Maps
                      </a>
                    </div>
                  </div>

                  {/* Embedded Google Map */}
                  <div className="w-full md:w-96 h-52 sm:h-56 rounded-xl overflow-hidden border border-border shadow-md">
                    <iframe
                      title="A TO Z Properties Office Location - Goverdhan Chowk"
                      src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d1846.3465262892541!2d70.78813499325395!3d22.251722010857517!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3959cb8dea02cffd%3A0xb8745bbbee9aeb67!2sA%20to%20Z%20properties!5e0!3m2!1sen!2sin!4v1793191932854!5m2!1sen!2sin"
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen={true}
                      loading="lazy"
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Live Matching Listings Section */}
        <section className="py-12 bg-background">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-border/60 gap-3">
              <div>
                <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                  Current Verified Listings
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  {loading
                    ? "Searching database..."
                    : `${matchingProperties.length} active rental ${matchingProperties.length === 1 ? "unit" : "units"} matching this category`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link to="/properties">
                  <Button variant="outline" size="sm" className="text-xs">
                    <Compass className="h-3.5 w-3.5 mr-1" /> View All Rajkot Listings
                  </Button>
                </Link>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-96 rounded-2xl bg-muted/40 animate-pulse border border-border" />
                ))}
              </div>
            ) : matchingProperties.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-8">
                {matchingProperties.map((prop) => (
                  <PropertyCard key={prop.id} property={prop} />
                ))}
              </div>
            ) : (
              /* Empty state: "Tell us your requirement" + WhatsApp button */
              <div className="my-10 p-8 sm:p-12 rounded-3xl bg-card border border-border text-center max-w-2xl mx-auto space-y-4 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-accent/15 text-accent-foreground flex items-center justify-center mx-auto">
                  <Building2 className="h-8 w-8 text-accent stroke-[1.75]" />
                </div>
                <h3 className="text-xl sm:text-2xl font-display font-bold text-foreground">
                  Looking for {pageData.h1}?
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Active listings in this specific category lease fast! We frequently have freshly vacated and off-market units that haven&apos;t been published to the web yet. Tell us your exact budget and move-in timeline.
                </p>
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <a
                    href={`https://wa.me/${MAIN_PHONE.replace("+", "")}?text=${whatsappMessage}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto"
                  >
                    <Button className="w-full sm:w-auto h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Tell Us Your Requirement on WhatsApp
                    </Button>
                  </a>
                  <Link to="/inquiry" className="w-full sm:w-auto">
                    <Button variant="outline" className="w-full sm:w-auto h-11 px-6">
                      Post Online Inquiry
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Task 1 & 5 Required Standard Contact & ₹200 Site Visit Block */}
        <section className="py-10 bg-primary/95 dark:bg-card border-y border-primary-foreground/10 text-primary-foreground">
          <div className="container mx-auto max-w-5xl px-4 sm:px-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-accent text-xs font-semibold">
                  <ShieldCheck className="h-3.5 w-3.5" /> 100% Genuine Physical Inspection
                </span>
                <h2 className="text-2xl sm:text-3xl font-display font-bold text-white">
                  Want an In-Person Property Visit?
                </h2>
                <p className="text-sm text-white/80 max-w-xl">
                  Inspect genuine interiors with our executive for a flat ₹200 fee. No fake pictures, zero misrepresentation.
                </p>
                {/* Standard Contact details */}
                <p className="text-sm font-semibold text-accent pt-1">
                  Call / WhatsApp:{" "}
                  <a href={`tel:${MAIN_PHONE}`} className="underline hover:text-white">
                    {MAIN_PHONE_DISPLAY}
                  </a>
                  {" · Also: "}
                  <a href={`tel:${SECONDARY_PHONE}`} className="underline hover:text-white">
                    {SECONDARY_PHONE_DISPLAY}
                  </a>
                </p>
                <p className="text-xs text-white/70">
                  Address: {OFFICE_ADDRESS} • Hours: {OFFICE_HOURS}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <Link to="/book">
                  <Button className="h-12 px-7 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold shadow-md hover:shadow-xl rounded-full border border-amber-300/80 transition-all duration-300 hover:scale-105 active:scale-95 text-sm sm:text-base flex items-center justify-center cursor-pointer">
                    <CalendarCheck className="h-4 w-4 mr-2 text-stone-950" /> Book ₹200 Site Visit
                  </Button>
                </Link>
                <a
                  href={`https://wa.me/${MAIN_PHONE.replace("+", "")}?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" className="h-12 px-6 bg-white/10 text-white border-white/20 hover:bg-white/20 font-semibold rounded-xl text-sm">
                    <MessageSquare className="h-4 w-4 mr-2" /> WhatsApp Inquiry
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* FAQs Section */}
        <section className="py-14 bg-background">
          <div className="container mx-auto max-w-4xl px-4 sm:px-6">
            <div className="text-center mb-8">
              <span className="text-xs font-mono font-bold tracking-widest text-accent uppercase">
                Tenant Knowledge Base
              </span>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mt-1">
                Frequently Asked Questions about {pageData.h1}
              </h2>
            </div>

            <div className="space-y-3">
              {pageData.faqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={faq.question}
                    className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between p-4 sm:p-5 text-left text-foreground font-semibold text-sm sm:text-base hover:text-primary transition-colors"
                    >
                      <span>{faq.question}</span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 transition-transform duration-200 text-muted-foreground ${
                          isOpen ? "rotate-180 text-primary" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-4 sm:px-5 pb-5 text-xs sm:text-sm text-muted-foreground font-body leading-relaxed border-t border-border/40 pt-3">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Browse Related Pages */}
        <section className="py-12 bg-muted/30 border-t border-border">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center mb-8">
              <h3 className="text-xl font-display font-bold text-foreground">
                Browse More Rentals in Rajkot
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Explore verified homes and commercial properties across all top corridors.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-4xl mx-auto">
              {Object.values(LANDING_PAGES)
                .filter((p) => p.slug !== pageData.slug)
                .slice(0, 8)
                .map((other) => (
                  <Link
                    key={other.slug}
                    to={other.path}
                    className="p-3 rounded-xl bg-card border border-border hover:border-primary/50 text-xs font-medium text-foreground hover:text-primary transition-all text-center flex items-center justify-center shadow-xs"
                  >
                    {other.h1}
                  </Link>
                ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
