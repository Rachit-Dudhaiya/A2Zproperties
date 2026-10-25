import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  Phone,
  Building,
  Home,
  MapPin,
  Star,
  ShieldCheck,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  Award,
  Users,
  Compass,
} from "lucide-react";
import ContactMenu from "@/components/ContactMenu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import PropertyCard from "@/components/PropertyCard";
import { PHONE_NUMBER } from "@/lib/data";
import heroBg from "@/assets/hero-bg.jpg";
import { db, getIdToken } from "@/integrations/firebase/client";
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy } from "firebase/firestore";
import Autoplay from "embla-carousel-autoplay";
import { isValidPhone } from "@/lib/validation";
import WhatsAppButton from "@/components/WhatsAppButton";
import SkeletonCard from "@/components/SkeletonCard";
import { fadeUp, staggerContainer } from "@/lib/motion";

const GOOGLE_REVIEWS = [
  {
    name: "Dr. Nilesh Dave",
    location: "Kalawad Road, Rajkot",
    badge: "Local Guide • 28 reviews",
    avatarBg: "bg-emerald-600",
    initials: "ND",
    rating: 5,
    timeAgo: "2 weeks ago",
    text: "Finding a 3 BHK near Kalawad Road was completely smooth with A TO Z Properties. The site visit for 3 homes was arranged punctually with their ₹200 slot pass. Zero hassle and all agreement papers were verified. Best rental consultants in Rajkot!",
  },
  {
    name: "Pooja Patel",
    location: "Mavdi, 150ft Ring Road",
    badge: "Verified Google Review",
    avatarBg: "bg-indigo-600",
    initials: "PP",
    rating: 5,
    timeAgo: "1 month ago",
    text: "Zero hidden charges and completely honest brokerage. They respected my family budget and negotiated a fantastic rental deal near Madhav Park, Mavdi within 48 hours. Extremely transparent and supportive team!",
  },
  {
    name: "Rajesh Trivedi",
    location: "150 Feet Ring Road, Rajkot",
    badge: "Local Guide • 15 reviews",
    avatarBg: "bg-amber-600",
    initials: "RT",
    rating: 5,
    timeAgo: "3 weeks ago",
    text: "The best brokerage in Rajkot for commercial office spaces. Mr. Rachit personally showed us verified office locations on 150 Feet Ring Road. Highly recommended for corporate leases and genuine property deals.",
  },
];

const Index = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [featured, setFeatured] = useState<any[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [allDbProperties, setAllDbProperties] = useState<any[]>([]);
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [stats, setStats] = useState<{ properties: number | null; locations: number | null }>({
    properties: null,
    locations: null,
  });

  // Search filter bar states (Default to "all" for dropdown)
  const [searchLocation, setSearchLocation] = useState("all");
  const [searchType, setSearchType] = useState("all");
  const [searchBudget, setSearchBudget] = useState("all");

  const [quickForm, setQuickForm] = useState({
    name: "",
    phone: "",
    requirement: "",
    propertyType: "",
  });
  const [quickErrors, setQuickErrors] = useState<{ name?: string; phone?: string; requirement?: string }>({});
  const [quickLoading, setQuickLoading] = useState(false);
  const plugin = useRef(
    Autoplay({ delay: 3500, stopOnInteraction: false, stopOnMouseEnter: true })
  );
  const [api, setApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  useEffect(() => {
    if (!api) return;
    setScrollSnaps(api.scrollSnapList());
    setCurrentSlide(api.selectedScrollSnap());

    const onSelect = () => {
      setCurrentSlide(api.selectedScrollSnap());
    };
    api.on("select", onSelect);
    api.on("reInit", () => {
      setScrollSnaps(api.scrollSnapList());
      setCurrentSlide(api.selectedScrollSnap());
    });
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  useEffect(() => {
    const fetchFeatured = async () => {
      if (!db) return;
      setFeaturedLoading(true);
      try {
        // Query properties marked is_featured == true
        const q = query(collection(db, "properties"), where("is_featured", "==", true));
        const querySnapshot = await getDocs(q);
        let propertiesList = querySnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((p: any) => p.is_featured === true || p.is_featured === "true" || p.isFeatured === true);

        // Fallback scan if where query returns 0 (handles missing Firestore index or field naming variations)
        if (propertiesList.length === 0) {
          try {
            const allSnap = await getDocs(collection(db, "properties"));
            propertiesList = allSnap.docs
              .map((doc) => ({ id: doc.id, ...doc.data() }))
              .filter((p: any) => p.is_featured === true || p.is_featured === "true" || p.isFeatured === true);
          } catch (e) {
            console.warn("Fallback featured scan failed:", e);
          }
        }

        const uniqueProperties = Array.from(new Map(propertiesList.map((p) => [p.id, p])).values());
        setFeatured(uniqueProperties);
      } catch (error) {
        console.error("Error fetching featured properties from Firestore:", error);
      } finally {
        setFeaturedLoading(false);
      }
    };

    const fetchStats = async () => {
      if (!db) return;
      try {
        const querySnapshot = await getDocs(collection(db, "properties"));
        const items = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setAllDbProperties(items);
        const locationSet = new Set<string>();
        items.forEach((p: any) => {
          const loc = (p.location || p.address || "").toString().trim();
          if (loc) locationSet.add(loc);
        });
        setStats({ properties: items.length, locations: locationSet.size });
        setAvailableLocations(Array.from(locationSet).sort((a, b) => a.localeCompare(b)));
      } catch (error) {
        console.error("Error fetching stats from Firestore:", error);
      }
    };

    fetchFeatured();
    fetchStats();
  }, []);

  // Compute top Rajkot locations dynamically with real-time property counts
  const topRajkotLocations = useMemo(() => {
    const defaultAreas = [
      {
        name: "150 Feet Ring Road",
        image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Kalawad Road",
        image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "University Road",
        image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Nana Mava",
        image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop&q=80",
      },
    ];

    const computed = defaultAreas.map((area) => {
      const matching = allDbProperties.filter((p) => {
        const pLoc = (p.location || p.address || "").toString().toLowerCase();
        return pLoc.includes(area.name.toLowerCase());
      });
      const photoProp = matching.find((p) => (p.photos && p.photos.length > 0) || (p.images && p.images.length > 0));
      const liveImage = photoProp?.photos?.[0] || photoProp?.images?.[0] || area.image;
      return {
        name: area.name,
        count: matching.length > 0 ? `${matching.length} Propert${matching.length === 1 ? "y" : "ies"} Available` : "Verified Area",
        rawCount: matching.length,
        image: liveImage,
      };
    });

    // Also include any other locations from the database with active properties
    const existingAreaNames = new Set(defaultAreas.map((a) => a.name.toLowerCase()));
    const otherLocationsMap = new Map<string, any[]>();
    allDbProperties.forEach((p) => {
      const loc = (p.location || p.address || "").toString().trim();
      if (!loc) return;
      const lower = loc.toLowerCase();
      if (!Array.from(existingAreaNames).some((ea) => lower.includes(ea))) {
        if (!otherLocationsMap.has(loc)) otherLocationsMap.set(loc, []);
        otherLocationsMap.get(loc)!.push(p);
      }
    });

    const additionalAreas = Array.from(otherLocationsMap.entries()).map(([locName, props]) => {
      const photoProp = props.find((p) => (p.photos && p.photos.length > 0) || (p.images && p.images.length > 0));
      return {
        name: locName,
        count: `${props.length} Propert${props.length === 1 ? "y" : "ies"} Available`,
        rawCount: props.length,
        image: photoProp?.photos?.[0] || photoProp?.images?.[0] || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop&q=80",
      };
    });

    const combined = [...computed, ...additionalAreas];
    combined.sort((a, b) => b.rawCount - a.rawCount);
    return combined.slice(0, 4);
  }, [allDbProperties]);

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchLocation && searchLocation !== "all") {
      params.append("location", searchLocation);
      params.append("search", searchLocation);
    }
    if (searchType && searchType !== "all") params.append("type", searchType);
    if (searchBudget && searchBudget !== "all") params.append("budget", searchBudget);
    navigate(`/properties?${params.toString()}`);
  };

  const updateQuickForm = (field: string, value: string) => {
    setQuickForm((prev) => ({ ...prev, [field]: value }));
    if (quickErrors[field as "name" | "phone" | "requirement"]) {
      setQuickErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: { name?: string; phone?: string; requirement?: string } = {};
    if (!quickForm.name.trim()) nextErrors.name = "Name is required";
    if (!quickForm.phone.trim()) nextErrors.phone = "Phone number is required";
    else if (!isValidPhone(quickForm.phone)) nextErrors.phone = "Enter a valid phone number";
    if (!quickForm.requirement.trim()) nextErrors.requirement = "Requirement is required";
    setQuickErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const firstError = Object.values(nextErrors).find(Boolean);
      toast({ title: "Please fix highlighted fields", description: firstError, variant: "destructive" });
      return;
    }

    setQuickLoading(true);
    try {
      if (!db) throw new Error("Firebase not configured. Set VITE_FIREBASE_* env vars.");
      const docRef = await addDoc(collection(db, "inquiries"), {
        name: quickForm.name.trim(),
        phone: quickForm.phone.trim(),
        requirement: quickForm.requirement.trim(),
        message: quickForm.requirement.trim(),
        property_type: quickForm.propertyType || null,
        source: "homepage_quick_enquiry",
        status: "new",
        createdAt: serverTimestamp(),
      });

      try {
        await addDoc(collection(db, "notifications"), {
          type: "inquiry",
          refId: docRef.id,
          title: "New Inquiry",
          message: `${quickForm.name.trim()} • ${quickForm.phone.trim()}`,
          read: false,
          createdAt: serverTimestamp(),
        });
        try {
          const fnUrl = import.meta.env.VITE_FUNCTIONS_URL || "/api";
          const token = await getIdToken();
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (token) headers.Authorization = `Bearer ${token}`;
          await fetch(`${fnUrl.replace(/\/$/, "")}/sendNotification`, {
            method: "POST",
            headers,
            body: JSON.stringify({ type: "inquiry", refId: docRef.id, title: "New Inquiry", message: `${quickForm.name.trim()} • ${quickForm.phone.trim()}` }),
          });
        } catch (err) {
          console.warn("sendNotification call failed", err);
        }
      } catch (err) {
        console.warn("Failed to create notification", err);
      }

      try {
        const webhookUrl = import.meta.env.VITE_APPS_SCRIPT_WEBHOOK_URL;
        const webhookSecret = import.meta.env.VITE_APPS_SCRIPT_WEBHOOK_SECRET;
        if (webhookUrl) {
          await fetch(webhookUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(webhookSecret ? { "x-webhook-secret": webhookSecret } : {}),
            },
            body: JSON.stringify({ ...quickForm, submittedAt: new Date().toISOString() }),
          });
        }
      } catch (err) {
        console.warn("Apps Script webhook failed", err);
      }

      toast({ title: "Inquiry Submitted!", description: "Our property specialist will reach out within 2 hours." });
      setQuickForm({ name: "", phone: "", requirement: "", propertyType: "" });
    } catch (err: any) {
      toast({ title: "Submission Failed", description: String(err?.message || err), variant: "destructive" });
    } finally {
      setQuickLoading(false);
    }
  };

  const handleMouseEnter = useCallback(() => {
    if (!api) return;
    try {
      api.plugins()?.autoplay?.stop();
    } catch {}
  }, [api]);

  const handleMouseLeave = useCallback(() => {
    if (!api) return;
    try {
      api.plugins()?.autoplay?.play();
    } catch {}
  }, [api]);

  const trustStats = [
    { label: "Verified Listings", value: stats.properties === null ? "500+" : `${stats.properties}+`, icon: Building, desc: "Physically audited homes" },
    { label: "Prime Corridors", value: stats.locations === null ? "15+" : `${stats.locations}+`, icon: MapPin, desc: "Across Rajkot city" },
    { label: "Happy Families", value: "3,200+", icon: Users, desc: "Settled in perfect homes" },
    { label: "Years of Trust", value: "18+", icon: Award, desc: "Transparent brokerage" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-emerald-800 selection:text-white">
      <Navbar />

      {/* 1. Full-Bleed Hero Section with Dark Emerald Overlay & Floating Glass Search Card */}
      <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden pt-12 pb-24 md:pt-20 md:pb-32">
        <img
          src={heroBg}
          alt="Luxury Architecture in Rajkot"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Layered Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/90 via-primary/80 to-primary/95 dark:from-background/95 dark:via-background/85 dark:to-background" />

        <div className="relative z-10 container mx-auto max-w-7xl px-4 sm:px-6 flex flex-col items-center text-center">
          {/* Trust Pill */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-white backdrop-blur-md border border-white/20 text-xs sm:text-sm font-medium mb-6 shadow-sm"
          >
            <Sparkles className="h-4 w-4 text-accent" />
            <span>Rajkot's Most Trusted Rental & Real Estate Brokerage</span>
          </motion.div>

          {/* Oversized Display Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold text-white tracking-tight leading-[1.15] max-w-4xl"
          >
            Every Property, <span className="text-gradient-gold">A to Z.</span>
            <span className="block text-xl sm:text-2xl md:text-3xl lg:text-4xl font-medium text-white/90 tracking-normal mt-2 sm:mt-3">
              Residential • Commercial • Rajkot
            </span>
          </motion.h1>

          {/* Sub-Copy */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-5 text-base sm:text-lg md:text-xl text-white/85 font-body max-w-2xl leading-relaxed"
          >
            Verified apartments, bungalows, and premium offices. Transparent rental agreements, zero hassle, and personalized site visits.
          </motion.p>

          {/* Floating Glass Search Card */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="w-full max-w-4xl mt-10"
          >
            <form
              onSubmit={handleHeroSearch}
              className="bg-card/95 dark:bg-card/90 backdrop-blur-xl rounded-2xl p-4 sm:p-5 shadow-2xl border border-white/30 dark:border-white/10 text-foreground"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Location Dropdown populated from Database */}
                <div>
                  <label className="block text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 pl-1">
                    Location
                  </label>
                  <Select value={searchLocation} onValueChange={setSearchLocation}>
                    <SelectTrigger className="h-11 bg-background/60">
                      <div className="flex items-center gap-2 truncate">
                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                        <SelectValue placeholder="All Locations in Rajkot" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations in Rajkot</SelectItem>
                      {availableLocations.map((loc) => (
                        <SelectItem key={loc} value={loc}>
                          {loc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Property Type Select */}
                <div>
                  <label className="block text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 pl-1">
                    Property Type
                  </label>
                  <Select value={searchType} onValueChange={setSearchType}>
                    <SelectTrigger className="h-11 bg-background/60">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="Flat">Flats / Apartments</SelectItem>
                      <SelectItem value="Bungalow">Bungalow / Villa</SelectItem>
                      <SelectItem value="Commercial">Commercial Shop</SelectItem>
                      <SelectItem value="Office">Office Space</SelectItem>
                      <SelectItem value="Plot">Plot / Land</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Budget Range Select */}
                <div>
                  <label className="block text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 pl-1">
                    Monthly Budget
                  </label>
                  <Select value={searchBudget} onValueChange={setSearchBudget}>
                    <SelectTrigger className="h-11 bg-background/60">
                      <SelectValue placeholder="Any Price" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any Price</SelectItem>
                      <SelectItem value="under-15000">Under ₹15,000</SelectItem>
                      <SelectItem value="15000-30000">₹15,000 – ₹30,000</SelectItem>
                      <SelectItem value="30000-60000">₹30,000 – ₹60,000</SelectItem>
                      <SelectItem value="above-60000">₹60,000+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Submit Button */}
                <div className="flex items-end">
                  <Button
                    type="submit"
                    className="w-full h-11 bg-accent text-accent-foreground hover:brightness-110 font-semibold shadow-md text-sm"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Search Properties
                  </Button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      </section>

      {/* 2. Trust Strip (Stats Counters - Animate on View) */}
      <section className="relative -mt-8 sm:-mt-14 z-20 container mx-auto max-w-7xl px-3 sm:px-6">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-5"
        >
          {trustStats.map((stat) => (
            <motion.div
              key={stat.label}
              variants={fadeUp}
              className="bg-card rounded-2xl p-3.5 sm:p-5 md:p-6 border border-border/80 shadow-card hover:shadow-card-hover transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-4 group"
            >
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary shrink-0 transition-transform group-hover:scale-105">
                <stat.icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="text-left min-w-0 flex-1">
                <div className="text-xl sm:text-2xl lg:text-3xl font-display font-bold text-card-foreground tracking-tight leading-tight">
                  {stat.value}
                </div>
                <div className="text-xs sm:text-sm font-semibold text-foreground/90 font-body leading-tight mt-0.5">
                  {stat.label}
                </div>
                <div className="text-[11px] text-muted-foreground hidden md:block mt-0.5">
                  {stat.desc}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* 3. Featured Properties Carousel */}
      <section className="section-padding container mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-8 sm:mb-10 text-left">
          <span className="text-xs font-mono uppercase tracking-widest text-accent font-semibold flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Curated Selections
          </span>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mt-1">
            Featured <span className="text-gradient-emerald">Properties</span>
          </h2>
          <p className="mt-2 text-muted-foreground font-body text-sm sm:text-base max-w-xl">
            Handpicked residences and prime commercial locations across Rajkot's finest neighborhoods.
          </p>
        </div>

        {featuredLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : featured.length === 1 ? (
          <div className="max-w-sm sm:max-w-md mx-auto">
            <PropertyCard property={featured[0]} index={0} />
          </div>
        ) : featured.length > 1 ? (
          <div className="relative group/carousel">
            <Carousel
              setApi={setApi}
              plugins={[plugin.current]}
              opts={{
                align: "start",
                loop: featured.length > 1,
              }}
              className="w-full"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <CarouselContent className="-ml-4 sm:-ml-5">
                {featured.map((p, i) => (
                  <CarouselItem
                    key={p.id}
                    className={`pl-4 sm:pl-5 ${
                      featured.length === 2
                        ? "basis-full sm:basis-1/2 max-w-lg"
                        : featured.length === 3
                        ? "basis-full sm:basis-1/2 lg:basis-1/3"
                        : "basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4"
                    }`}
                  >
                    <PropertyCard property={p} index={i} />
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>

            {/* Pagination Indicator Dots */}
            {scrollSnaps.length > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                {scrollSnaps.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => api?.scrollTo(idx)}
                    className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                      currentSlide === idx
                        ? "w-8 bg-accent"
                        : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/60"
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-12 text-center rounded-3xl bg-card border border-border shadow-xs max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="font-display font-bold text-lg text-foreground mb-1">No Featured Properties Yet</h3>
            <p className="text-muted-foreground font-body text-sm mb-4">
              Properties marked as "Feature on Homepage Carousel" in the Admin Portal will appear here.
            </p>
            <Link to="/properties">
              <Button variant="outline" className="text-sm">
                Browse All Properties <ArrowRight className="ml-1.5 h-4 w-4 text-accent" />
              </Button>
            </Link>
          </div>
        )}
      </section>

      {/* 4. "Why Us" 3-Column Editorial Features */}
      <section className="py-20 bg-muted/40 border-y border-border/60">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-mono uppercase tracking-widest text-accent font-semibold">
              The A TO Z Distinction
            </span>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mt-1">
              Why Tenants & Landlords Trust Us
            </h2>
            <p className="mt-2 text-muted-foreground font-body text-sm sm:text-base">
              We took the traditional brokerage chaos and replaced it with verified facts, transparency, and executive service.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-card rounded-2xl p-8 border border-border/80 shadow-card hover:shadow-card-hover transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-400 flex items-center justify-center mb-6">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="font-display font-bold text-xl text-card-foreground mb-2">
                100% Physically Verified
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed font-body">
                No misleading wide-angle photos or phantom listings. Every home is personally inspected, measured, and verified before being listed.
              </p>
            </div>

            <div className="bg-card rounded-2xl p-8 border border-border/80 shadow-card hover:shadow-card-hover transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 flex items-center justify-center mb-6">
                <Award className="h-6 w-6" />
              </div>
              <h3 className="font-display font-bold text-xl text-card-foreground mb-2">
                Zero Surprise Pricing
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed font-body">
                Completely upfront rental advisory terms. We ensure fair rent agreements, legal vetting, and clear security deposit clauses.
              </p>
            </div>

            <div className="bg-card rounded-2xl p-8 border border-border/80 shadow-card hover:shadow-card-hover transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 flex items-center justify-center mb-6">
                <Clock className="h-6 w-6" />
              </div>
              <h3 className="font-display font-bold text-xl text-card-foreground mb-2">
                ₹200 Assisted Visits
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed font-body">
                Save hours of commute. Schedule a single curated slot to tour up to 3 shortlisted properties accompanied by our senior advisor.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Location Highlights Grid - Real-Time Database Inventory */}
      <section className="section-padding container mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-mono uppercase tracking-widest text-accent font-semibold">
            Live Verified Inventory
          </span>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mt-1">
            Explore Top Rajkot Neighborhoods
          </h2>
          <p className="mt-2 text-muted-foreground font-body text-sm sm:text-base">
            Real-time properties available across prime residential and commercial corridors in Rajkot.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {topRajkotLocations.map((loc) => (
            <Link
              key={loc.name}
              to={`/properties?location=${encodeURIComponent(loc.name)}`}
              className="group relative rounded-2xl overflow-hidden aspect-[4/3] shadow-card hover:shadow-card-hover transition-all duration-300 border border-border/60"
            >
              <img
                src={loc.image}
                alt={loc.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 text-white text-left">
                <span className="inline-block px-2 py-0.5 rounded-md bg-accent/80 text-[10px] font-semibold text-accent-foreground uppercase tracking-wider mb-1">
                  Active Area
                </span>
                <h3 className="font-display font-bold text-xl text-white group-hover:text-accent transition-colors">
                  {loc.name}
                </h3>
                <span className="text-xs text-white/90 font-mono mt-0.5 inline-block">
                  {loc.count}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 6. Google Verified Reviews */}
      <section className="py-20 bg-muted/30 border-t border-border/60">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-card border border-border shadow-sm text-xs font-semibold mb-3">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              <span className="text-foreground">Google Verified Reviews</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-amber-500 font-bold">5.0 ★★★★★</span>
              <span className="text-muted-foreground">(Google Maps Verified)</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mt-1">
              Real Stories from <span className="text-gradient-emerald">Google Reviews</span>
            </h2>
            <p className="mt-2 text-muted-foreground font-body text-sm sm:text-base">
              Original reviews left by genuine tenants and property buyers who relied on our assisted site visits and honest brokerage in Rajkot.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {GOOGLE_REVIEWS.map((t, i) => (
              <div
                key={i}
                className="bg-card rounded-2xl p-6 sm:p-7 border border-border shadow-card flex flex-col justify-between relative group hover:shadow-card-hover transition-all duration-300"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full ${t.avatarBg} text-white flex items-center justify-center font-bold text-sm shadow-sm`}>
                        {t.initials}
                      </div>
                      <div className="text-left">
                        <div className="font-display font-bold text-sm text-foreground flex items-center gap-1.5">
                          <span>{t.name}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                          <span>{t.badge}</span>
                        </div>
                      </div>
                    </div>
                    {/* Google G small logo */}
                    <div className="p-1.5 rounded-md bg-muted/60" title="Posted on Google">
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"/>
                        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                        <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                      </svg>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-0.5 text-amber-500">
                      {Array.from({ length: t.rating }).map((_, starIdx) => (
                        <Star key={starIdx} className="h-4 w-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono">{t.timeAgo}</span>
                  </div>

                  <p className="text-card-foreground/90 font-body text-sm leading-relaxed text-left">
                    "{t.text}"
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-border/60 text-left flex items-center justify-between text-xs text-muted-foreground">
                  <span>Location: {t.location}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Verified Customer</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Compact CTA Band */}
      <section className="bg-hero text-primary-foreground py-16 relative overflow-hidden">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 relative z-10 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-white max-w-2xl mx-auto">
            Tour 3 Properties for <span className="text-gradient-gold">₹200</span>
          </h2>
          <p className="mt-4 text-white/80 font-body max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
            Convenient guided visits available 7 days a week: 10:00 AM – 1:00 PM & 4:00 PM – 10:00 PM. Book your slot online in under 60 seconds.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/book">
              <Button size="lg" className="bg-accent text-accent-foreground hover:brightness-110 font-semibold shadow-lg px-8">
                <Home className="mr-2 h-5 w-5" /> Schedule Site Visit
              </Button>
            </Link>
            <ContactMenu phone={PHONE_NUMBER}>
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                <Phone className="mr-2 h-4 w-4 text-accent" /> Speak With Advisor
              </Button>
            </ContactMenu>
          </div>
        </div>
      </section>

      {/* 8. Quick Inquiry Form (2-Column Editorial Card) */}
      <section className="section-padding container mx-auto max-w-7xl px-4 sm:px-6">
        <div className="bg-card rounded-3xl p-6 sm:p-10 lg:p-12 border border-border shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Narrative Column */}
            <div className="lg:col-span-5 text-left space-y-4">
              <span className="text-xs font-mono uppercase tracking-widest text-accent font-semibold">
                Personalized Matching
              </span>
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-card-foreground">
                Didn't Find What You're Looking For?
              </h2>
              <p className="text-muted-foreground font-body text-sm sm:text-base leading-relaxed">
                Tell us your budget, preferred zone, and requirements. Our agents have access to unlisted off-market rentals and new landlord listings daily.
              </p>
              <div className="pt-2 space-y-2.5 text-sm text-foreground/85 font-body">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Response within 2 hours</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Curated list of verified units directly to WhatsApp</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>No spam, 100% privacy respected</span>
                </div>
              </div>
            </div>

            {/* Right Form Column */}
            <div className="lg:col-span-7">
              <form onSubmit={handleQuickSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 pl-1">
                      Full Name *
                    </label>
                    <Input
                      placeholder="e.g. Ramesh Mehta"
                      value={quickForm.name}
                      onChange={(e) => updateQuickForm("name", e.target.value)}
                      className="font-body"
                    />
                    {quickErrors.name && <p className="mt-1 text-xs text-destructive">{quickErrors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 pl-1">
                      Phone Number *
                    </label>
                    <Input
                      placeholder="10-digit mobile"
                      value={quickForm.phone}
                      onChange={(e) => updateQuickForm("phone", e.target.value)}
                      className="font-body"
                    />
                    {quickErrors.phone && <p className="mt-1 text-xs text-destructive">{quickErrors.phone}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 pl-1">
                    Property Category
                  </label>
                  <Select value={quickForm.propertyType} onValueChange={(v) => updateQuickForm("propertyType", v)}>
                    <SelectTrigger className="font-body">
                      <SelectValue placeholder="Select interest (e.g. Residential 2BHK, Office)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rent_flat">Rent – 2/3 BHK Apartment</SelectItem>
                      <SelectItem value="rent_bungalow">Rent – Independent Bungalow</SelectItem>
                      <SelectItem value="commercial_shop">Commercial Showroom / Shop</SelectItem>
                      <SelectItem value="office_space">Corporate Office</SelectItem>
                      <SelectItem value="buy_property">Purchase / Investment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 pl-1">
                    Specific Requirements *
                  </label>
                  <Textarea
                    placeholder="Mention preferred areas (e.g. Near Mavdi, Kalawad Rd), budget range, family vs bachelor, furnishing need..."
                    value={quickForm.requirement}
                    onChange={(e) => updateQuickForm("requirement", e.target.value)}
                    className="font-body min-h-[110px] rounded-xl"
                  />
                  {quickErrors.requirement && <p className="mt-1 text-xs text-destructive">{quickErrors.requirement}</p>}
                </div>

                <Button
                  type="submit"
                  disabled={quickLoading}
                  className="w-full h-12 bg-accent text-accent-foreground hover:brightness-110 font-semibold shadow-md text-base"
                >
                  {quickLoading ? "Submitting Inquiry..." : "Submit Property Requirement"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default Index;

