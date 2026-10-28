import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
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
  User,
  Send,
  MessageSquare,
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
import {
  PHONE_NUMBER,
  MAIN_PHONE,
  MAIN_PHONE_DISPLAY,
  SECONDARY_PHONE,
  SECONDARY_PHONE_DISPLAY,
  cleanListingText,
  toTitleCase,
} from "@/lib/data";
import heroBg from "@/assets/hero-bg.jpg";
import { db, getIdToken } from "@/integrations/firebase/client";
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy } from "firebase/firestore";
import Autoplay from "embla-carousel-autoplay";
import { isValidPhone } from "@/lib/validation";
import SkeletonCard from "@/components/SkeletonCard";
import { fadeUp, staggerContainer } from "@/lib/motion";
import SEO from "@/components/SEO";

function getAreaLandingUrl(areaName: string): string {
  const lower = (areaName || "").toLowerCase();
  if (lower.includes("mavdi")) return "/rent-mavdi";
  if (lower.includes("150")) return "/rent-150-feet-ring-road";
  if (lower.includes("goverdhan")) return "/rent-goverdhan-chowk";
  if (lower.includes("nana mava")) return "/rent-nana-mava";
  if (lower.includes("kalawad")) return "/rent-kalawad-road";
  if (lower.includes("race course")) return "/rent-race-course";
  if (lower.includes("university")) return "/rent-university-road";
  if (lower.includes("raiya")) return "/rent-raiya-road";
  if (lower.includes("amin marg")) return "/rent-amin-marg";
  return `/flats-for-rent-rajkot`;
}

const REAL_GOOGLE_REVIEWS = [
  {
    id: "1",
    name: "Vishal Pujara",
    initials: "VP",
    avatar: "https://lh3.googleusercontent.com/a-/ALV-UjUBphcHC6Yu3RXJEORRhaJokZB4L3vz07vnrEkdkSuojJ_1xgtcZg=s1920-c-rp-mo-br100",
    avatarBg: "bg-emerald-600",
    location: "Kalawad Road (near KKV Hall), Rajkot",
    badge: "Verified Google Review",
    rating: 5,
    timeAgo: "2 weeks ago",
    text: "Thank you 😊 Finding our 1 BHK fully furnished tenement near KKV Hall, Kalawad Road was completely smooth with A to Z properties. Prompt service and transparent paperwork throughout.",
    reviewLink: "https://maps.google.com/?cid=13291349262997318503",
  },
  {
    id: "2",
    name: "Naimish Gedia",
    initials: "NG",
    avatar: "https://lh3.googleusercontent.com/a-/ALV-UjU1v5jdcJaQQesrrfxlo_ZqWXOIuRr_3g7aRCqc2fH0OX_lUL5g=s1920-c-rp-mo-br100",
    avatarBg: "bg-indigo-600",
    location: "Mavdi, 150ft Ring Road",
    badge: "Verified Google Review",
    rating: 5,
    timeAgo: "2 weeks ago",
    text: "A to Z properties gives best service in real estate. dream place to find dream home :) Highly recommended for any rental or corporate office spaces in Rajkot.",
    reviewLink: "https://maps.google.com/?cid=13291349262997318503",
  },
  {
    id: "3",
    name: "Gautam Kumbhani",
    initials: "GK",
    avatar: "https://lh3.googleusercontent.com/a/ACg8ocISMnnKaRIat3_07rqC6TgfxZtb7Y09VSMZts5o9UCnhk83Hg=s1920-c-rp-mo-br100",
    avatarBg: "bg-amber-600",
    location: "Kruti Onella, Rajkot",
    badge: "Verified Google Review",
    rating: 5,
    timeAgo: "1 month ago",
    text: "I got my rental Great flat with A To Z properties at Kruti onella , Rajkot. Very cooperative team and smooth verification process.",
    reviewLink: "https://maps.google.com/?cid=13291349262997318503",
  },
  {
    id: "4",
    name: "Meera Makwana",
    initials: "MM",
    avatar: "https://lh3.googleusercontent.com/a/ACg8ocJCQR3VrLsYGQvTlT_oVsa8m-_XwnuVmz5gYqTFZnHHBK-kTg=s1920-c-rp-mo-br100",
    avatarBg: "bg-rose-600",
    location: "Park Avenue, Kalavad Road",
    badge: "Verified Google Review",
    rating: 5,
    timeAgo: "1 month ago",
    text: "Very good behave and excellent brokerage deal. Found our ideal corporate commercial office space without hassle.",
    reviewLink: "https://maps.google.com/?cid=13291349262997318503",
  },
  {
    id: "5",
    name: "Nilu 1911",
    initials: "N",
    avatar: "https://lh3.googleusercontent.com/a/ACg8ocLEw2P6B44uNInDZWD5D13hO-8pZYkBw7V4RYQ3jrhM3MeiCw=s1920-c-rp-mo-br100",
    avatarBg: "bg-teal-600",
    location: "150 Feet Ring Road / Mavdi",
    badge: "Local Guide • 5★",
    rating: 5,
    timeAgo: "2 months ago",
    text: "Great service, All types of properties available in all area of Rajkot like 150 feet ring road , Office for rent at shital park , House and flat for rent in mavdi area, Must get your property from A To Z properties Rajkot.",
    reviewLink: "https://maps.google.com/?cid=13291349262997318503",
  },
  {
    id: "6",
    name: "Jiten Dattani",
    initials: "JD",
    avatar: "https://lh3.googleusercontent.com/a-/ALV-UjUR3_9Z-oyBfMKocLKjj2DNJPDFT-1uBlU8TG8OzIYadPuHmvA=s1920-c-rp-mo-br100",
    avatarBg: "bg-blue-600",
    location: "Jivraj Park, Rajkot",
    badge: "Verified Google Review",
    rating: 5,
    timeAgo: "2 months ago",
    text: "Outstanding experience with A to Z Property. They understand customer needs, provide genuine guidance, and offer the best property options. Thank you for your excellent support!",
    reviewLink: "https://maps.google.com/?cid=13291349262997318503",
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

  const [liveReviews, setLiveReviews] = useState<any[]>(REAL_GOOGLE_REVIEWS);

  useEffect(() => {
    // Dynamic fetch from user's widget endpoint to keep live reviews automatically synchronized
    fetch("https://reviewswidget.app/api/public/widget/3af6f16a-bc61-4b1a-8090-ee042c4eb512")
      .then((res) => res.json())
      .then((data) => {
        if (data?.reviews && Array.isArray(data.reviews) && data.reviews.length > 0) {
          const colors = [
            "bg-emerald-600",
            "bg-indigo-600",
            "bg-amber-600",
            "bg-rose-600",
            "bg-teal-600",
            "bg-blue-600",
          ];
          const defaultLocs = [
            "Kalawad Road (near KKV Hall), Rajkot",
            "Mavdi, 150ft Ring Road",
            "Kruti Onella, Rajkot",
            "Park Avenue, Kalavad Road",
            "150 Feet Ring Road / Mavdi",
            "Jivraj Park, Rajkot",
          ];
          const parsed = data.reviews.map((r: any, idx: number) => {
            let timeAgo = "recently";
            if (r.published_at) {
              const diffMs = Date.now() - new Date(r.published_at).getTime();
              const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
              if (days < 7) timeAgo = `${days || 1} day${days === 1 ? "" : "s"} ago`;
              else if (days < 30) timeAgo = `${Math.floor(days / 7)} week${Math.floor(days / 7) === 1 ? "" : "s"} ago`;
              else timeAgo = `${Math.floor(days / 30)} month${Math.floor(days / 30) === 1 ? "" : "s"} ago`;
            }
            const name = r.author_name || "Verified Customer";
            const initials = name
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);

            return {
              id: r.id || String(idx),
              name,
              initials,
              avatar: r.author_photo || null,
              avatarBg: colors[idx % colors.length],
              location: defaultLocs[idx % defaultLocs.length],
              badge: "Verified Google Review",
              rating: Number(r.rating) || 5,
              timeAgo,
              text: r.text || "Best real estate rental consultants in Rajkot!",
              reviewLink: r.review_link || "https://maps.google.com/?cid=13291349262997318503",
            };
          });
          setLiveReviews(parsed);
        }
      })
      .catch(() => {
        // Fallback silently kept as REAL_GOOGLE_REVIEWS
      });
  }, []);

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
    } catch { }
  }, [api]);

  const handleMouseLeave = useCallback(() => {
    if (!api) return;
    try {
      api.plugins()?.autoplay?.play();
    } catch { }
  }, [api]);

  const trustStats = [
    { label: "Verified Listings", value: stats.properties === null ? "500+" : `${stats.properties}+`, icon: Building, desc: "Physically audited homes" },
    { label: "Prime Corridors", value: stats.locations === null ? "15+" : `${stats.locations}+`, icon: MapPin, desc: "Across Rajkot city" },
    { label: "Happy Families", value: "3,200+", icon: Users, desc: "Settled in perfect homes" },
    { label: "Years of Trust", value: "18+", icon: Award, desc: "Transparent brokerage" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-emerald-800 selection:text-white">
      <SEO
        title="Flats &amp; Offices for Rent in Rajkot | A TO Z Properties"
        description="Verified flats, offices &amp; bungalows for rent in Rajkot: Mavdi, 150 Ft Ring Road, Nana Mava, Race Course. ₹200 site visits. WhatsApp 63533 88626"
        canonical="https://www.atozproperties.co.in/"
        ogTitle="A TO Z Properties: Verified Rentals in Rajkot"
        ogDescription="Flats, offices &amp; bungalows for rent across Rajkot. Real photos, physically checked. Book a ₹200 site visit or WhatsApp +91 63533 88626."
      />
      <Navbar />

      {/* 1. Full-Bleed Hero Section with Dark Emerald Overlay & Floating Glass Search Card */}
      <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden pt-12 pb-24 md:pt-20 md:pb-32">
        <img
          src={heroBg}
          alt="Luxury Architecture in Rajkot"
          className="absolute inset-0 w-full h-full object-cover"
          fetchPriority="high"
          loading="eager"
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
            <span>Rajkot's Most Trusted Rental &amp; Real Estate Brokerage</span>
          </motion.div>

          {/* Oversized Display Headline (Task 3: Exact H1 Requirement) */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold text-white tracking-tight leading-[1.18] max-w-4xl"
          >
            <span>Flats, Offices &amp; Bungalows for Rent in </span>
            <span className="text-gradient-gold whitespace-nowrap">Rajkot</span>
            <span className="block text-sm xs:text-base sm:text-xl font-normal text-white/80 font-body tracking-wider uppercase mt-3">
              Every Property, A to Z
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
                    Rental Budget
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
                    className={`pl-4 sm:pl-5 ${featured.length === 2
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
                    className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${currentSlide === idx
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
              to={getAreaLandingUrl(loc.name)}
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
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
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
            <div className="mt-5 flex items-center justify-center">
              <a
                href="https://g.page/r/CWfrmu67W3S4EBE/review"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center"
              >
                <Button className="h-10 px-6 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white font-semibold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                  </svg>
                  Write a Google Review
                </Button>
              </a>
            </div>
          </div>

          {/* Real Google Reviews in Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {liveReviews.map((t) => (
              <div
                key={t.id}
                className="bg-card rounded-2xl p-6 sm:p-7 border border-border shadow-card flex flex-col justify-between relative group hover:shadow-card-hover transition-all duration-300"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {t.avatar ? (
                        <img
                          src={t.avatar}
                          alt={t.name}
                          className="w-10 h-10 rounded-full object-cover border border-border/80 shadow-xs"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            const fallback = e.currentTarget.parentElement?.querySelector(".avatar-fallback") as HTMLElement;
                            if (fallback) fallback.style.display = "flex";
                          }}
                        />
                      ) : null}
                      <div
                        className={`avatar-fallback w-10 h-10 rounded-full ${t.avatarBg} text-white flex items-center justify-center font-bold text-sm shadow-xs ${t.avatar ? "hidden" : "flex"
                          }`}
                      >
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
                    <div className="p-1.5 rounded-md bg-muted/60 shrink-0" title="Posted on Google">
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z" />
                        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                        <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
                        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
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
                  <a
                    href={t.reviewLink || "https://maps.google.com/?cid=13291349262997318503"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    Verified on Google
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Requested reviewgrid embed target (maintained in DOM for embed script) */}
          <div data-reviewgrid="3af6f16a-bc61-4b1a-8090-ee042c4eb512" className="hidden" aria-hidden="true" />
        </div>
      </section>

      {/* 7. Compact CTA Band - Classic Old Design */}
      <section className="bg-hero text-primary-foreground py-16 relative overflow-hidden">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 relative z-10 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-white max-w-2xl mx-auto">
            Tour 3 Properties for ₹200
          </h2>
          <p className="mt-4 text-white/80 font-body max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
            Convenient guided visits available 7 days a week: 10:00 AM – 1:00 PM & 4:00 PM – 10:00 PM. Book your slot online in under 60 seconds.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/book">
              <Button size="lg" className="bg-accent text-accent-foreground font-semibold px-8 hover:brightness-110">
                Book Site Visit (₹200) <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <a
              href="https://wa.me/916353388626"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center"
            >
              <Button
                size="lg"
                variant="outline"
                className="h-11 px-6 rounded-full border border-white/20 bg-white/5 text-white hover:bg-white/15 hover:border-white/40 font-body text-sm backdrop-blur-sm transition-all duration-300 active:scale-95 shadow-xs"
              >
                WhatsApp Inquiry
              </Button>
            </a>
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
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 pl-1">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="e.g. Ramesh Mehta"
                        value={quickForm.name}
                        onChange={(e) => updateQuickForm("name", e.target.value)}
                        className="pl-10 font-body h-11"
                      />
                    </div>
                    {quickErrors.name && <p className="mt-1 text-xs text-destructive">{quickErrors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 pl-1">
                      Phone Number *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={10}
                        placeholder="10-digit mobile number"
                        value={quickForm.phone}
                        onChange={(e) => updateQuickForm("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                        className="pl-10 font-body h-11"
                      />
                    </div>
                    {quickErrors.phone && <p className="mt-1 text-xs text-destructive">{quickErrors.phone}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 pl-1">
                    Property Category
                  </label>
                  <Select value={quickForm.propertyType} onValueChange={(v) => updateQuickForm("propertyType", v)}>
                    <SelectTrigger className="font-body h-11">
                      <SelectValue placeholder="Select interest (e.g. Residential 2BHK, Corporate Office)" />
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
                  <div className="flex items-center justify-between mb-1.5 pl-1">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Specific Requirements *
                    </label>
                    <span className="text-[11px] text-muted-foreground">Tap tags below to auto-add</span>
                  </div>
                  <Textarea
                    placeholder="Mention preferred areas (e.g. Near Mavdi, Kalawad Rd), budget range, family vs bachelor, furnishing need..."
                    value={quickForm.requirement}
                    onChange={(e) => updateQuickForm("requirement", e.target.value)}
                    className="font-body min-h-[105px] rounded-xl text-sm"
                  />
                  {quickErrors.requirement && <p className="mt-1 text-xs text-destructive">{quickErrors.requirement}</p>}

                  {/* 1-Tap Quick Suggestion Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-2">
                    <span className="text-[11px] font-semibold text-muted-foreground mr-0.5">Quick Add:</span>
                    {["2 BHK", "3 BHK", "Furnished", "Kalawad Road", "150ft Ring Rd", "Corporate Office", "Family", "Under ₹25k"].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => {
                          setQuickForm((prev) => {
                            const current = prev.requirement.trim();
                            if (current.toLowerCase().includes(chip.toLowerCase())) return prev;
                            return {
                              ...prev,
                              requirement: current ? `${current}, ${chip}` : chip,
                            };
                          });
                          if (quickErrors.requirement) {
                            setQuickErrors((prev) => ({ ...prev, requirement: undefined }));
                          }
                        }}
                        className="px-2.5 py-1 rounded-full text-xs font-medium bg-muted/80 hover:bg-accent hover:text-accent-foreground text-foreground border border-border/80 transition-all duration-200 active:scale-95 cursor-pointer shadow-2xs"
                      >
                        + {chip}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  <Button
                    type="submit"
                    disabled={quickLoading}
                    className="w-full h-12 bg-accent text-accent-foreground hover:brightness-110 font-bold shadow-md hover:shadow-lg rounded-xl text-base transition-all duration-200 active:scale-95 flex items-center justify-center cursor-pointer"
                  >
                    {quickLoading ? (
                      <span>Submitting Inquiry...</span>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        <span>Submit Property Requirement</span>
                      </>
                    )}
                  </Button>

                  <div className="flex items-center justify-center gap-3 text-[11px] text-muted-foreground pt-1">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      100% Free Consultation
                    </span>
                    <span>•</span>
                    <span>Direct WhatsApp Updates</span>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;

