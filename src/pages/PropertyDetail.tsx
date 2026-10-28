import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, MapPin, Maximize, Phone, CheckCircle2, Clock, IndianRupee, ZoomIn, ZoomOut, RefreshCw, Instagram, MessageSquare, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ContactMenu from "@/components/ContactMenu";
import { useAuth } from "@/hooks/useAuth";
import { db, getIdToken } from "@/integrations/firebase/client";
import { collection, addDoc, serverTimestamp, doc as fsDoc, getDoc as fsGetDoc, getDocs as fsGetDocs, query as fsQuery, orderBy as fsOrderBy } from "firebase/firestore";
import {
  formatPrice,
  VISIT_CHARGE,
  MAX_PROPERTIES_PER_VISIT,
  PHONE_NUMBER,
  MAIN_PHONE,
  MAIN_PHONE_DISPLAY,
  SECONDARY_PHONE,
  SECONDARY_PHONE_DISPLAY,
  UPI_ID,
  GOOGLE_SHEET_URL,
  toTitleCase,
  cleanListingText,
  getOptimizedCloudinaryUrl,
} from "@/lib/data";
import PropertyDetailSkeleton from "@/components/PropertyDetailSkeleton";
import { motion } from "framer-motion";
import { openBookingWhatsApp } from "@/lib/whatsapp";
import PropertyCard from "@/components/PropertyCard";
import SEO from "@/components/SEO";

const PropertyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [property, setProperty] = useState<any>(null);
  const [allProperties, setAllProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedSlot, setSelectedSlot] = useState("");
  const [extraPropertyIds, setExtraPropertyIds] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [agreeToPay, setAgreeToPay] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash_upi_on_visit");
  const location = useLocation();
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [paymentScreenshotPreview, setPaymentScreenshotPreview] = useState<string | null>(null);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const isPanningRef = useRef(false);
  const [isPanning, setIsPanning] = useState(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number | null>(null);
  const pinchStartPanXRef = useRef<number | null>(null);
  const pinchStartPanYRef = useRef<number | null>(null);
  const pinchCenterRef = useRef<{ x: number; y: number } | null>(null);
  const lastTapRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    let cancelled = false;
    const fetchData = async () => {
      if (!id) return;
      if (!db) {
        toast({ title: "Configuration error", description: "Firebase not configured. Set VITE_FIREBASE_* env vars.", variant: "destructive" });
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        let propRef = fsDoc(db, "properties", id);
        let [propSnap, allSnap] = await Promise.all([
          fsGetDoc(propRef),
          fsGetDocs(fsQuery(collection(db, "properties"), fsOrderBy("createdAt", "desc"))),
        ]);
        if (!propSnap.exists() && id.includes("-")) {
          const suffixId = id.split("-").pop();
          if (suffixId) {
            const fallbackSnap = await fsGetDoc(fsDoc(db, "properties", suffixId));
            if (fallbackSnap.exists()) {
              propSnap = fallbackSnap;
            }
          }
        }
        if (cancelled) return;
        const propData = propSnap.exists() ? { id: propSnap.id, ...propSnap.data() } : null;
        const allData = allSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => p.id !== propSnap.id);
        setProperty(propData);
        setAllProperties(allData);
      } catch (err: any) {
        console.error("Failed to load property", err);
        toast({ title: "Error", description: String(err?.message || err), variant: "destructive" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [id, toast]);

  const similarProperties = useMemo(() => {
    if (!property || !allProperties.length) return [];
    const currentType = (property.type || "").toString().trim().toLowerCase();

    const normalizeType = (t: string) => {
      const lower = t.toLowerCase();
      if (/flat|apartment|bhk|residential|penthouse|studio/.test(lower)) return "flat";
      if (/bungalow|villa|tenement|row house|independent house/.test(lower)) return "bungalow";
      if (/commercial|shop|retail|showroom/.test(lower)) return "commercial";
      if (/office|corporate|workspace/.test(lower)) return "office";
      if (/plot|land|industrial land/.test(lower)) return "plot";
      return lower;
    };

    const targetCategory = normalizeType(currentType);

    return allProperties.filter((p) => {
      if (p.id === property.id) return false;
      const otherCategory = normalizeType((p.type || "").toString().trim());
      if (targetCategory && otherCategory === targetCategory) return true;
      if (currentType && (p.type || "").toString().toLowerCase().includes(currentType)) return true;
      return false;
    });
  }, [property, allProperties]);

  useEffect(() => {
    // if URL has #booking, scroll to booking form
    if (location.hash === "#booking") {
      setTimeout(() => {
        const el = document.getElementById("booking");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 200);
    }
  }, [location.hash]);

  const getOptimizedUrl = (url: string, options: { width: number; height: number }) => {
    if (url && url.includes('res.cloudinary.com')) {
      const parts = url.split('/upload/');
      if (parts.length === 2) {
        return `${parts[0]}/upload/w_${options.width},h_${options.height},c_fill,q_auto,f_auto/${parts[1]}`;
      }
    }
    return url;
  };

  const images = useMemo(() => {
    const list = Array.isArray(property?.images) ? property.images : [];
    const cleaned = list.filter((src: any) => typeof src === "string" && src.trim() !== "");
    const fallback = property?.image_url || property?.image || null;
    if (fallback && !cleaned.includes(fallback)) cleaned.unshift(fallback);
    return cleaned;
  }, [property]);

  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

  const getMaxPan = useCallback(() => {
    const c = containerRef.current;
    const img = imgRef.current;
    if (!c || !img || !naturalSize) return { maxX: 0, maxY: 0 };
    const cw = c.clientWidth;
    const ch = c.clientHeight;
    const nw = naturalSize.w;
    const nh = naturalSize.h;
    // base fit scale (object-contain)
    const baseScale = Math.min(cw / nw, ch / nh);
    const baseW = nw * baseScale;
    const baseH = nh * baseScale;
    const scaledW = baseW * zoom;
    const scaledH = baseH * zoom;
    const maxX = Math.max(0, (scaledW - cw) / 2);
    const maxY = Math.max(0, (scaledH - ch) / 2);
    return { maxX, maxY };
  }, [naturalSize, zoom]);

  const summaryLine = useMemo(() => {
    if (!property) return "";
    const parts: string[] = [];
    if (property.bedrooms) parts.push(`${property.bedrooms} BHK`);
    if (property.bathrooms) parts.push(`${property.bathrooms} Bathroom${property.bathrooms > 1 ? "s" : ""}`);
    if (property.area) parts.push(`${property.area} sqft`);
    return parts.join(" - ");
  }, [property]);

  const displayValue = (value: any) => {
    if (value === null || value === undefined || value === "") return "-";
    return String(value);
  };

  const detailItems: { label: string; value: string }[] = property
    ? [
      { label: "Type", value: displayValue(property.type) },
      { label: "Super Built-up area sqft", value: displayValue(property.super_builtup ?? property.superBuiltup ?? property.area) },
      { label: "Furnishing", value: displayValue(property.furnishing ?? property.furnished) },
      { label: "Listed By", value: displayValue(property.listed_by ?? property.listedBy ?? "ATOZ PROPERTIES") },
      { label: "Carpet area sqft", value: displayValue(property.carpet_area ?? property.carpetArea ?? property.area) },
      { label: "Maintenance (Monthly)", value: displayValue(property.maintenance ?? property.maintenance_monthly ?? property.maintenanceMonthly) },
      { label: "Floor No", value: displayValue(property.floor_no ?? property.floorNo) },
      { label: "Bedrooms", value: displayValue(property.bedrooms ?? property.bhk) },
      { label: "Bathrooms", value: displayValue(property.bathrooms) },
      { label: "Project Status", value: displayValue(property.project_status ?? property.projectStatus) },
      { label: "Facing", value: displayValue(property.facing) },
      { label: "Car Parking", value: displayValue(property.car_parking ?? property.carParking) },
      { label: "Total Floors", value: displayValue(property.total_floors ?? property.totalFloors) },
    ]
    : [];

  const upiPayUrl = useMemo(() => {
    const note = property?.title ? `Site Visit - ${property.title}` : "Site Visit Booking";
    const params = new URLSearchParams({
      pa: UPI_ID,
      pn: "ATOZ PROPERTIES",
      am: String(VISIT_CHARGE),
      cu: "INR",
      tn: note,
    });
    return `upi://pay?${params.toString()}`;
  }, [property?.title]);

  const isMobile = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  }, []);

  const qrSrc = useMemo(() => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiPayUrl)}`;
  }, [upiPayUrl]);

  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => setSelectedIndex(carouselApi.selectedScrollSnap());
    onSelect();
    carouselApi.on("select", onSelect);
    return () => {
      carouselApi.off("select", onSelect);
    };
  }, [carouselApi]);

  useEffect(() => {
    if (!carouselApi) return;
    carouselApi.scrollTo(0, true);
    setSelectedIndex(0);
  }, [carouselApi, property?.id]);

  useEffect(() => {
    if (paymentMethod !== "online") {
      setPaymentScreenshot(null);
      setPaymentScreenshotPreview(null);
      setShowQr(false);
    }
  }, [paymentMethod]);

  useEffect(() => {
    return () => {
      if (paymentScreenshotPreview) URL.revokeObjectURL(paymentScreenshotPreview);
    };
  }, [paymentScreenshotPreview]);

  useEffect(() => {
    if (!viewerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setViewerOpen(false);
      }
      if (e.key === 'ArrowLeft' && images.length > 1) {
        e.preventDefault();
        setViewerIndex((i) => (i - 1 + images.length) % images.length);
      }
      if (e.key === 'ArrowRight' && images.length > 1) {
        e.preventDefault();
        setViewerIndex((i) => (i + 1) % images.length);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewerOpen, images.length]);

  // reset zoom when opening viewer or changing image
  useEffect(() => {
    if (viewerOpen) setZoom(1);
    setPanX(0);
    setPanY(0);
    isPanningRef.current = false;
    setIsPanning(false);
  }, [viewerOpen, viewerIndex]);

  // clamp pan when zoom or measurements change
  useEffect(() => {
    const { maxX, maxY } = getMaxPan();
    setPanX((px) => clamp(px, -maxX, maxX));
    setPanY((py) => clamp(py, -maxY, maxY));
  }, [getMaxPan]);

  const handlePaymentScreenshotChange = (file: File | null) => {
    if (!file) {
      setPaymentScreenshot(null);
      setPaymentScreenshotPreview(null);
      return;
    }
    setPaymentScreenshot(file);
    const nextPreview = URL.createObjectURL(file);
    setPaymentScreenshotPreview(nextPreview);
  };

  const fileToBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

  const submitPaymentScreenshot = async (bookingId?: string) => {
    if (!paymentScreenshot) return;
    setUploadingScreenshot(true);
    try {
      const base64 = await fileToBase64(paymentScreenshot);
      const formData = new FormData();
      formData.append("bookingId", bookingId || "");
      formData.append("name", name || "");
      formData.append("phone", phone || "");
      formData.append("amount", String(VISIT_CHARGE));
      formData.append("upi", UPI_ID);
      formData.append("propertyId", property?.id || "");
      formData.append("propertyTitle", property?.title || "");
      formData.append("visitDate", selectedDate ? format(selectedDate, "yyyy-MM-dd") : "");
      formData.append("timeSlot", selectedSlot || "");
      formData.append("paymentMethod", paymentMethod);
      formData.append("screenshotName", paymentScreenshot.name);
      formData.append("screenshot", base64);
      formData.append("timestamp", new Date().toISOString());

      try {
        const res = await fetch(GOOGLE_SHEET_URL, { method: "POST", body: formData });
        if (res.type !== "opaque" && !res.ok) throw new Error(`Sheet error ${res.status}`);
      } catch (err) {
        await fetch(GOOGLE_SHEET_URL, { method: "POST", mode: "no-cors", body: formData });
      }
    } catch (err: any) {
      console.warn("Failed to upload payment screenshot", err);
      toast({ title: "Screenshot upload failed", description: "We will verify manually if needed.", variant: "destructive" });
    } finally {
      setUploadingScreenshot(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <PropertyDetailSkeleton />
        <Footer />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-display font-bold">Property Not Found</h1>
          <Link to="/properties"><Button className="mt-4 font-body">Back to Properties</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  const selectedPropertyIds = [property.id, ...extraPropertyIds];

  const toggleExtra = (pid: string) => {
    if (extraPropertyIds.includes(pid)) {
      setExtraPropertyIds(extraPropertyIds.filter((x) => x !== pid));
    } else if (extraPropertyIds.length < MAX_PROPERTIES_PER_VISIT - 1) {
      setExtraPropertyIds([...extraPropertyIds, pid]);
    } else {
      toast({ title: "Maximum 3 properties", description: `You can select up to ${MAX_PROPERTIES_PER_VISIT} properties per visit.`, variant: "destructive" });
    }
  };

  const handleBooking = async () => {
    if (!user) {
      toast({ title: "Please sign in", description: "You need to sign in to book a visit.", variant: "destructive" });
      navigate("/auth");
      return;
    }
    if (!name || !phone || !selectedDate || !selectedSlot) {
      toast({ title: "Please fill all required fields", description: "Name, phone, date and time slot are required.", variant: "destructive" });
      return;
    }
    if (!agreeToPay) {
      toast({ title: "Payment required", description: `Please agree to pay ₹${VISIT_CHARGE} booking charge.`, variant: "destructive" });
      return;
    }
    if (paymentMethod === "online" && !paymentScreenshot) {
      toast({ title: "Upload required", description: "Please upload your payment screenshot.", variant: "destructive" });
      return;
    }
    try {
      if (!db) {
        toast({ title: "Configuration error", description: "Firebase not configured. Set VITE_FIREBASE_* env vars.", variant: "destructive" });
        return;
      }
      // compute visit_datetime from selectedDate (Date) + selectedSlot (e.g. "10:30 AM")
      const [timePart, meridiem] = selectedSlot.split(" ");
      const [hhStr, mmStr] = timePart.split(":");
      let hh = Number(hhStr) % 12;
      const mm = Number(mmStr || 0);
      if ((meridiem || "").toUpperCase() === "PM") hh += 12;
      const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
      const utcMillis = Date.UTC(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), hh, mm) - IST_OFFSET_MS;
      const visitDateTime = new Date(utcMillis);

      const bookingRef = await addDoc(collection(db, "bookings"), {
        user_id: user.id,
        name,
        phone,
        email: email || null,
        visit_date: format(selectedDate, "yyyy-MM-dd"),
        time_slot: selectedSlot,
        visit_datetime: visitDateTime,
        property_ids: selectedPropertyIds,
        charge: VISIT_CHARGE,
        payment: { amount: VISIT_CHARGE, status: paymentMethod === "online" ? "submitted" : "pending", method: paymentMethod },
        status: "pending",
        createdAt: serverTimestamp(),
      });

      if (paymentMethod === "online") {
        await submitPaymentScreenshot(bookingRef.id);
      }

      const propertyTitleMap = [property, ...allProperties].reduce((acc: Record<string, string>, p: any) => {
        if (p?.id) acc[p.id] = p.title || p.id;
        return acc;
      }, {});
      openBookingWhatsApp({
        bookingId: bookingRef.id,
        name,
        phone,
        date: format(selectedDate, "yyyy-MM-dd"),
        slot: selectedSlot,
        propertyTitles: selectedPropertyIds.map((pid) => propertyTitleMap[pid] || pid),
        location: property?.location || property?.address,
        charge: VISIT_CHARGE,
        total: VISIT_CHARGE,
        notes: message || undefined,
      });

      toast({ title: "Visit Booked!", description: "We will confirm your visit shortly." });
      try {
        // create admin notification referencing the booking id
        await addDoc(collection(db, "notifications"), {
          type: "booking",
          refId: bookingRef.id,
          title: "New Booking",
          message: `${name} • ${phone}`,
          read: false,
          createdAt: serverTimestamp(),
        });
        try {
          const fnUrl = import.meta.env.VITE_FUNCTIONS_URL || "/api";
          const token = await getIdToken();
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (token) headers.Authorization = `Bearer ${token}`;
          await fetch(`${fnUrl.replace(/\/$/, '')}/sendNotification`, {
            method: "POST",
            headers,
            body: JSON.stringify({ type: "booking", refId: bookingRef.id, title: "New Booking", message: `${name} • ${phone}` }),
          });
        } catch (e) {
          console.warn("sendNotification call failed", e);
        }
      } catch (e) {
        console.warn("Failed to create notification", e);
      }
    } catch (err: any) {
      toast({ title: "Error", description: String(err?.message || err), variant: "destructive" });
      return;
    }
    setName(""); setPhone(""); setEmail(""); setMessage("");
    setSelectedDate(undefined); setSelectedSlot(""); setExtraPropertyIds([]);
    setPaymentScreenshot(null);
    setPaymentScreenshotPreview(null);
  };

  const bhkStr = property.bedrooms ? `${property.bedrooms} BHK` : cleanListingText(property.type || "Flat");
  const areaStr = cleanListingText(property.location || property.address || "Rajkot");
  const rentStr = property.price ? Number(property.price).toLocaleString("en-IN") : "";
  const furnishingStr = property.furnishing || property.furnished || "Semi-Furnished";
  const typeStr = property.type || "Flat";
  const carpetStr = property.carpet_area || property.carpetArea || property.area || "Spacious";
  const floorStr = property.floor || property.total_floors || "1st Floor";
  const depositStr = property.deposit
    ? formatPrice(property.deposit)
    : property.security_deposit
    ? formatPrice(property.security_deposit)
    : "1 Month (Standard)";
  const brokerageStr = property.brokerage || "1 Month Rent (Standard)";

  // Task 3: Exact Title pattern
  const pageTitle = `${bhkStr} for Rent in ${areaStr}, Rajkot – ₹${rentStr}/month | A TO Z`;
  const pageDesc = `${bhkStr} ${furnishingStr} ${typeStr} for rent at ${areaStr}, Rajkot. ${carpetStr} sq ft, ₹${rentStr}/month. Call/WhatsApp for a site visit.`;
  const pageH1 = `${bhkStr} ${toTitleCase(furnishingStr)} ${toTitleCase(typeStr)} for Rent – ${toTitleCase(areaStr)}, Rajkot`;

  // Task 4: RealEstateListing JSON-LD Schema
  const listingJsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    "name": toTitleCase(property.title || pageH1),
    "url": `https://www.atozproperties.co.in/property/${property.id}`,
    "image":
      Array.isArray(property.images) && property.images.length > 0
        ? getOptimizedCloudinaryUrl(property.images[0], 1200)
        : "https://www.atozproperties.co.in/og-image.jpg",
    "datePosted": property.createdAt?.seconds
      ? new Date(property.createdAt.seconds * 1000).toISOString()
      : new Date().toISOString(),
    "offers": {
      "@type": "Offer",
      "price": property.price || 0,
      "priceCurrency": "INR",
      "businessFunction": "http://purl.org/goodrelations/v1#LeaseOut",
    },
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={pageTitle}
        description={pageDesc}
        canonical={`https://www.atozproperties.co.in/property/${property.id}`}
        ogTitle={pageTitle}
        ogDescription={pageDesc}
        ogImage={
          Array.isArray(property.images) && property.images.length > 0
            ? getOptimizedCloudinaryUrl(property.images[0], 1200)
            : undefined
        }
        jsonLd={listingJsonLd}
      />
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Link to="/properties" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground font-body text-sm mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Properties
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="relative">
                <Carousel setApi={setCarouselApi} className="h-64 md:h-[420px]">
                  <CarouselContent className="h-full">
                    {images.length > 0 ? (
                      images.map((src, i) => (
                        <CarouselItem key={`${src}-${i}`} className="h-full">
                          <div className="relative h-64 md:h-[420px] bg-muted rounded-lg overflow-hidden group/item" onClick={() => { setViewerIndex(i); setViewerOpen(true); }}>
                            <img
                              src={getOptimizedCloudinaryUrl(src, i === 0 ? 1200 : 800)}
                              alt={`${toTitleCase(property.title)}-${i}`}
                              className="absolute inset-0 w-full h-full object-cover"
                              loading={i === 0 ? "eager" : "lazy"}
                              decoding="async"
                              fetchPriority={i === 0 ? "high" : "auto"}
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                              <Maximize className="h-10 w-10 text-white" />
                            </div>
                          </div>
                        </CarouselItem>
                      ))
                    ) : (
                      <CarouselItem className="h-full">
                        <div className="relative h-64 md:h-[420px] bg-muted rounded-lg flex items-center justify-center">
                          <div className="text-muted-foreground flex flex-col items-center gap-2">
                            <Maximize className="h-10 w-10" />
                            <span className="text-sm">No image</span>
                          </div>
                        </div>
                      </CarouselItem>
                    )}
                  </CarouselContent>
                  {images.length > 1 && (
                    <>
                      <CarouselPrevious className="left-3 bg-white/90 hover:bg-white" />
                      <CarouselNext className="right-3 bg-white/90 hover:bg-white" />
                    </>
                  )}
                </Carousel>

                <div className="absolute top-4 left-4 flex gap-2 z-10">
                  <Badge className="bg-secondary text-secondary-foreground font-body">{cleanListingText(property.status)}</Badge>
                  <Badge variant="outline" className="bg-card/90 font-body">{cleanListingText(property.type)}</Badge>
                </div>
              </div>

              {images.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {images.map((src, i) => (
                    <button
                      key={`${src}-thumb-${i}`}
                      type="button"
                      onClick={() => carouselApi?.scrollTo(i)}
                      className={cn(
                        "h-16 w-20 shrink-0 rounded-md overflow-hidden border",
                        selectedIndex === i ? "border-secondary" : "border-border",
                      )}
                    >
                      <img
                        src={getOptimizedCloudinaryUrl(src, 200)}
                        alt={`${toTitleCase(property.title)}-thumb-${i}`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        width={80}
                        height={64}
                      />
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <span className="text-xs font-mono uppercase tracking-widest text-accent font-semibold">
                      {cleanListingText(property.type)} • {cleanListingText(property.status)}
                    </span>
                    {/* Task 3 & 4 H1 */}
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-foreground mt-1">
                      {pageH1}
                    </h1>
                    <div className="text-sm font-body text-muted-foreground mt-0.5">
                      Listing Title: {toTitleCase(property.title)}
                    </div>
                    {(property.location || property.address) && (
                      <div className="flex items-center gap-2 mt-2 text-muted-foreground font-body text-sm sm:text-base">
                        <MapPin className="h-4 w-4 text-accent shrink-0" /> {areaStr}
                      </div>
                    )}

                    {(property.video_url || property.instagram_reel_url || property.walkthrough_url) && (
                      <div className="mt-3">
                        <a
                          href={property.video_url || property.instagram_reel_url || property.walkthrough_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-indigo-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/30 hover:border-pink-500/60 hover:scale-[1.02] active:scale-95 transition-all shadow-xs"
                          title="Watch Property Walkthrough on Instagram"
                        >
                          <Instagram className="h-4 w-4 text-pink-500" />
                          <span>View Walkthrough Video (Instagram Reel)</span>
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="text-left md:text-right">
                    <div className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-accent">
                      {formatPrice(property.price)}
                      {property.status === "For Rent" && (
                        <span className="text-sm font-body text-muted-foreground ml-1">/month</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                      Verified Rental Listing
                    </span>
                  </div>
                </div>

                {/* Task 4: Near the top of each property page show rent, deposit, brokerage, carpet area, furnishing, floor and exact area name */}
                <div className="mt-6 p-5 rounded-2xl bg-card border border-border/80 shadow-xs">
                  <div className="text-xs font-mono font-semibold uppercase tracking-wider text-accent mb-3">
                    Key Rental Facts &amp; Pricing Details
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-left">
                    <div className="p-2.5 rounded-xl bg-muted/50 border border-border/50">
                      <div className="text-[11px] text-muted-foreground font-body">Monthly Rent</div>
                      <div className="text-sm font-display font-bold text-accent mt-0.5">{formatPrice(property.price)}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-muted/50 border border-border/50">
                      <div className="text-[11px] text-muted-foreground font-body">Security Deposit</div>
                      <div className="text-sm font-display font-bold text-foreground mt-0.5">{depositStr}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-muted/50 border border-border/50">
                      <div className="text-[11px] text-muted-foreground font-body">Brokerage</div>
                      <div className="text-sm font-display font-bold text-foreground mt-0.5">{brokerageStr}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-muted/50 border border-border/50">
                      <div className="text-[11px] text-muted-foreground font-body">Carpet Area</div>
                      <div className="text-sm font-display font-bold text-foreground mt-0.5">{carpetStr} sqft</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-muted/50 border border-border/50">
                      <div className="text-[11px] text-muted-foreground font-body">Furnishing</div>
                      <div className="text-sm font-display font-bold text-foreground mt-0.5">{toTitleCase(furnishingStr)}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-muted/50 border border-border/50">
                      <div className="text-[11px] text-muted-foreground font-body">Floor</div>
                      <div className="text-sm font-display font-bold text-foreground mt-0.5">{floorStr}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-muted/50 border border-border/50 col-span-2 sm:col-span-1">
                      <div className="text-[11px] text-muted-foreground font-body">Exact Locality</div>
                      <div className="text-sm font-display font-bold text-foreground mt-0.5 truncate">{areaStr}</div>
                    </div>
                  </div>
                </div>

                {/* Detailed Specifications Table */}
                <div className="mt-8 bg-card rounded-2xl p-6 border border-border shadow-card">
                  <h3 className="text-xl font-display font-bold text-foreground mb-4">
                    Property Specifications
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm font-body">
                    {detailItems.map((item) => (
                      <div key={item.label} className="flex items-center justify-between py-2 border-b border-border/60">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-semibold text-foreground text-right">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Description */}
                {property.description && (
                  <div className="mt-8 bg-card rounded-2xl p-6 border border-border shadow-card">
                    <h3 className="text-xl font-display font-bold text-foreground mb-3">About This Property</h3>
                    <p className="text-muted-foreground font-body leading-relaxed whitespace-pre-line text-sm sm:text-base">
                      {property.description}
                    </p>
                  </div>
                )}

                {/* Features & Amenities */}
                {property.features && property.features.length > 0 && (
                  <div className="mt-8 bg-card rounded-2xl p-6 border border-border shadow-card">
                    <h3 className="text-xl font-display font-bold text-foreground mb-4">Features & Amenities</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {property.features.map((f: string) => (
                        <div
                          key={f}
                          className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/50 border border-border/50 text-foreground text-sm font-body"
                        >
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="truncate">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Sticky Agent & Booking Sidebar */}
          <div>
            <motion.div
              id="booking"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-card rounded-2xl p-6 border border-border shadow-card sticky top-24 space-y-6"
            >
              {/* Agent Profile Strip */}
              <div className="flex items-center gap-3.5 pb-4 border-b border-border">
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center font-display font-bold text-primary text-lg">
                  AZ
                </div>
                <div>
                  <h4 className="font-display font-bold text-base text-card-foreground">
                    A TO Z Properties
                  </h4>
                  <p className="text-xs text-muted-foreground font-mono">
                    Official Advisory Desk • Rajkot
                  </p>
                </div>
              </div>

              {/* Visit Charge Pill */}
              <div className="p-4 rounded-xl bg-muted/60 border border-border space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Site Visit Charge
                  </span>
                  <span className="font-display font-bold text-lg text-foreground">
                    ₹{VISIT_CHARGE}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Tour up to 3 shortlisted properties accompanied by our senior advisor.
                </p>
              </div>

              {/* Action Buttons & Contact Box (Proper view call numbers) */}
              <div className="space-y-3">
                <Link to={`/book?propertyId=${property.id}`} className="block">
                  <Button className="w-full h-12 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold shadow-md hover:shadow-xl rounded-full border border-amber-300/80 transition-all duration-300 hover:scale-[1.02] active:scale-95 text-sm sm:text-base flex items-center justify-center cursor-pointer">
                    Book Site Visit (₹{VISIT_CHARGE})
                  </Button>
                </Link>

                {/* User-friendly Contact Broker Desk Card */}
                <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-3.5 text-xs font-body">
                  <div className="flex items-center justify-between pb-2.5 border-b border-border/60">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-accent/15 text-accent flex items-center justify-center font-bold text-xs">
                          <Phone className="h-4 w-4" />
                        </div>
                        <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-card" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground leading-tight">A TO Z Broker Desk</h4>
                        <p className="text-[11px] text-muted-foreground">Rajkot Rental Specialists</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      ● Active
                    </span>
                  </div>

                  {/* Primary Number + Quick Action Buttons */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium text-xs">Primary Contact:</span>
                      <a
                        href={`tel:+91${MAIN_PHONE}`}
                        className="text-base font-bold font-mono tracking-tight text-foreground hover:text-accent transition-colors"
                      >
                        +91 {MAIN_PHONE_DISPLAY}
                      </a>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={`tel:+91${MAIN_PHONE}`}
                        className="h-9 px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-xs"
                      >
                        <Phone className="h-3.5 w-3.5 text-accent" /> Call Now
                      </a>
                      <a
                        href={`https://wa.me/91${MAIN_PHONE}?text=${encodeURIComponent(
                          `Hello A TO Z Properties, I am interested in viewing: ${toTitleCase(property.title)} (ID: ${property.id})`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-xs"
                      >
                        <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
                      </a>
                    </div>
                  </div>

                  {/* Secondary Number */}
                  <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Alternate Line:</p>
                      <a
                        href={`tel:+91${SECONDARY_PHONE}`}
                        className="text-sm font-semibold font-mono tracking-tight text-foreground hover:text-accent transition-colors"
                      >
                        +91 {SECONDARY_PHONE_DISPLAY}
                      </a>
                    </div>
                    <a
                      href={`tel:+91${SECONDARY_PHONE}`}
                      className="h-8 px-3 rounded-lg bg-muted hover:bg-muted/80 text-foreground font-semibold text-xs flex items-center gap-1.5 border border-border/80 transition-all active:scale-95"
                    >
                      <Phone className="h-3.5 w-3.5 text-accent" /> Call
                    </a>
                  </div>

                  {/* Timings */}
                  <div className="pt-2 border-t border-border/60 text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-accent shrink-0" />
                    <span>Office Hours: Mon–Sun 10:00 AM – 10:00 PM</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Similar Properties Row (Filtered by Category / Type) */}
        {similarProperties.length > 0 && (
          <section className="mt-16 pt-12 border-t border-border">
            <div className="flex items-center justify-between mb-8">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-accent font-semibold">
                  Matching Category
                </span>
                <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mt-1">
                  Similar Verified {property?.type ? `${property.type}s` : "Properties"}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Showing verified {property?.type || "properties"} available across Rajkot
                </p>
              </div>
              <Link to={`/properties?type=${encodeURIComponent(property?.type || "")}`}>
                <Button variant="outline" size="sm" className="hidden sm:inline-flex">
                  Explore All {property?.type ? `${property.type}s` : "Properties"}
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {similarProperties.slice(0, 3).map((similar, i) => (
                <PropertyCard key={similar.id} property={similar} index={i} />
              ))}
            </div>
          </section>
        )}
      </div>
      {/* <div className="fixed bottom-6 right-6 z-50 text-black bg-white/30 backdrop-blur-sm p-2 rounded-lg text-xs font-bold opacity-70 pointer-events-none">
        A to Z Properties
      </div> */}
      <Footer />

      {/* Image viewer modal (lightbox) */}
      {viewerOpen && images.length > 0 && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
            onClick={() => setViewerOpen(false)}
          />

          <motion.div
            className="relative z-10 w-full max-w-5xl bg-zinc-950/95 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[96vh]"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            {/* Top Control Bar */}
            <div className="flex items-center justify-between px-3 sm:px-5 py-3 border-b border-white/10 bg-black/40 backdrop-blur-sm z-30">
              <div className="min-w-0 pr-2">
                <h4 className="text-sm sm:text-base font-semibold text-white truncate font-display">
                  {toTitleCase(property.title)}
                </h4>
                <p className="text-xs text-white/60 font-medium">
                  Photo {viewerIndex + 1} of {images.length}
                  {property.location ? ` • ${cleanListingText(property.location)}` : ''}
                </p>
              </div>

              {/* Actions: Zoom & Close */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <div className="flex items-center bg-white/10 rounded-lg p-0.5 border border-white/10">
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))}
                    className="p-1.5 rounded-md hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                    title="Zoom Out"
                    aria-label="Zoom Out"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}
                    className="p-1.5 rounded-md hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                    title="Zoom In"
                    aria-label="Zoom In"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setZoom(1); setPanX(0); setPanY(0); setIsPanning(false); }}
                    className="p-1.5 rounded-md hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                    title="Reset Zoom"
                    aria-label="Reset Zoom"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setViewerOpen(false)}
                  className="p-2 rounded-lg bg-white/10 hover:bg-red-500/80 text-white border border-white/10 transition-colors ml-1 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  aria-label="Close photo viewer"
                  title="Close (Esc)"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Main Stage */}
            <div className="relative flex-1 bg-black flex items-center justify-center min-h-[50vh] max-h-[65vh] sm:max-h-[72vh] overflow-hidden select-none">
              <div
                className="w-full h-full flex items-center justify-center overflow-hidden"
                ref={containerRef}
                style={{ touchAction: 'none', cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'zoom-in' }}
                onWheel={(e) => {
                  if (e.ctrlKey) return;
                  if (!viewerOpen) return;
                  e.preventDefault();
                  const delta = -e.deltaY;
                  if (Math.abs(delta) < 1) return;
                  const step = 0.15;
                  if (delta > 0) setZoom((z) => Math.min(3, +(z + step).toFixed(2)));
                  else setZoom((z) => Math.max(1, +(z - step).toFixed(2)));
                }}
                onPointerDown={(e) => {
                  if (zoom <= 1) return;
                  isPanningRef.current = true;
                  setIsPanning(true);
                  lastPosRef.current = { x: e.clientX, y: e.clientY };
                  try { (e.target as Element).setPointerCapture?.(e.pointerId); } catch {}
                }}
                onTouchStart={(e) => {
                  if (!e.touches?.length) return;
                  if (e.touches.length === 2) {
                    const a = e.touches[0];
                    const b = e.touches[1];
                    const dx = b.clientX - a.clientX;
                    const dy = b.clientY - a.clientY;
                    pinchStartDistRef.current = Math.hypot(dx, dy);
                    pinchStartZoomRef.current = zoom;
                    pinchStartPanXRef.current = panX;
                    pinchStartPanYRef.current = panY;
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (rect) {
                      pinchCenterRef.current = { x: (a.clientX + b.clientX) / 2 - rect.left, y: (a.clientY + b.clientY) / 2 - rect.top };
                    } else pinchCenterRef.current = null;
                    touchStartRef.current = null;
                    return;
                  }
                  if (zoom > 1) return;
                  const t = e.touches[0];
                  touchStartRef.current = { x: t.clientX, y: t.clientY };
                }}
                onTouchMove={(e) => {
                  if (e.touches?.length === 2 && pinchStartDistRef.current && pinchStartZoomRef.current) {
                    const a = e.touches[0];
                    const b = e.touches[1];
                    const dx = b.clientX - a.clientX;
                    const dy = b.clientY - a.clientY;
                    const dist = Math.hypot(dx, dy);
                    const startDist = pinchStartDistRef.current;
                    if (startDist === 0) return;
                    const scale = dist / startDist;
                    const newZoom = Math.max(1, Math.min(3, +(pinchStartZoomRef.current! * scale).toFixed(3)));
                    const rect = containerRef.current?.getBoundingClientRect();
                    const center = pinchCenterRef.current;
                    const startPanX = pinchStartPanXRef.current ?? 0;
                    const startPanY = pinchStartPanYRef.current ?? 0;
                    if (rect && center) {
                      const ratio = newZoom / (pinchStartZoomRef.current ?? 1);
                      const cx = center.x;
                      const cy = center.y;
                      const candidateX = ratio * startPanX + (1 - ratio) * cx;
                      const candidateY = ratio * startPanY + (1 - ratio) * cy;
                      const { maxX, maxY } = getMaxPan();
                      setPanX(clamp(candidateX, -maxX, maxX));
                      setPanY(clamp(candidateY, -maxY, maxY));
                    }
                    setZoom(newZoom);
                    e.preventDefault();
                  }
                }}
                onTouchCancel={() => {
                  pinchStartDistRef.current = null;
                  pinchStartZoomRef.current = null;
                  pinchStartPanXRef.current = null;
                  pinchStartPanYRef.current = null;
                  pinchCenterRef.current = null;
                  touchStartRef.current = null;
                }}
                onTouchEnd={(e) => {
                  if (pinchStartDistRef.current) {
                    pinchStartDistRef.current = null;
                    pinchStartZoomRef.current = null;
                    pinchStartPanXRef.current = null;
                    pinchStartPanYRef.current = null;
                    pinchCenterRef.current = null;
                    touchStartRef.current = null;
                    return;
                  }
                  if (typeof window !== 'undefined' && window.innerWidth < 640) {
                    const now = Date.now();
                    if (lastTapRef.current && (now - lastTapRef.current) < 300) {
                      setZoom(1);
                      setPanX(0);
                      setPanY(0);
                      lastTapRef.current = null;
                      touchStartRef.current = null;
                      e.preventDefault?.();
                      return;
                    }
                    lastTapRef.current = now;
                  }
                  if (zoom > 1) return;
                  if (!touchStartRef.current) return;
                  const t = e.changedTouches?.[0];
                  if (!t) {
                    touchStartRef.current = null;
                    return;
                  }
                  const dx = t.clientX - touchStartRef.current.x;
                  const dy = t.clientY - touchStartRef.current.y;
                  touchStartRef.current = null;
                  const absX = Math.abs(dx);
                  const absY = Math.abs(dy);
                  const threshold = 40;
                  if (absX > threshold && absX > absY) {
                    if (dx < 0 && images.length > 1) {
                      setViewerIndex((i) => (i + 1) % images.length);
                    } else if (dx > 0 && images.length > 1) {
                      setViewerIndex((i) => (i - 1 + images.length) % images.length);
                    }
                  }
                }}
                onPointerMove={(e) => {
                  if (!isPanningRef.current || !lastPosRef.current) return;
                  const dx = e.clientX - lastPosRef.current.x;
                  const dy = e.clientY - lastPosRef.current.y;
                  lastPosRef.current = { x: e.clientX, y: e.clientY };
                  const { maxX, maxY } = getMaxPan();
                  setPanX((px) => clamp(px + dx, -maxX, maxX));
                  setPanY((py) => clamp(py + dy, -maxY, maxY));
                }}
                onPointerUp={(e) => {
                  if (!isPanningRef.current) return;
                  isPanningRef.current = false;
                  setIsPanning(false);
                  lastPosRef.current = null;
                  try { (e.target as Element).releasePointerCapture?.(e.pointerId); } catch {}
                }}
                onPointerCancel={() => { isPanningRef.current = false; setIsPanning(false); lastPosRef.current = null; }}
              >
                <img
                  ref={imgRef}
                  src={images[viewerIndex]}
                  alt={`${property.title} - photo ${viewerIndex + 1}`}
                  className="w-full h-full object-contain pointer-events-auto"
                  onLoad={(e) => {
                    const el = e.currentTarget;
                    if (el && el.naturalWidth && el.naturalHeight) setNaturalSize({ w: el.naturalWidth, h: el.naturalHeight });
                  }}
                  style={{
                    transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                    transformOrigin: 'center',
                    transition: isPanning ? 'none' : 'transform 120ms',
                  }}
                />
              </div>

              {/* Left / Right Navigation Chevrons - ALWAYS VISIBLE on both Mobile & Desktop */}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewerIndex((i) => (i - 1 + images.length) % images.length);
                    }}
                    className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/20 transition-all shadow-xl active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent z-40"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewerIndex((i) => (i + 1) % images.length);
                    }}
                    className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/20 transition-all shadow-xl active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent z-40"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>
                </>
              )}
            </div>

            {/* Bottom Thumbnail Strip - Responsive on Mobile & Desktop */}
            {images.length > 1 && (
              <div className="p-2 sm:p-3 bg-zinc-950/90 border-t border-white/10 z-30">
                <div className="flex gap-2 overflow-x-auto py-1 px-1 scrollbar-thin scrollbar-thumb-white/20">
                  {images.map((thumb, ti) => (
                    <button
                      key={ti}
                      type="button"
                      onClick={() => setViewerIndex(ti)}
                      className={`flex-none rounded-lg overflow-hidden border-2 transition-all ${
                        ti === viewerIndex
                          ? 'border-accent ring-2 ring-accent/30 scale-105'
                          : 'border-white/20 opacity-60 hover:opacity-100 hover:border-white/50'
                      }`}
                    >
                      <img
                        src={getOptimizedCloudinaryUrl(thumb, 90, 60,)}
                        alt={`Thumbnail ${ti + 1}`}
                        className="w-14 h-10 sm:w-20 sm:h-14 object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default PropertyDetail;
