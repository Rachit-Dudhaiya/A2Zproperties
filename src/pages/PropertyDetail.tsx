import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, MapPin, Maximize, Phone, CheckCircle2, Clock, IndianRupee, ZoomIn, ZoomOut, RefreshCw } from "lucide-react";
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
import { db } from "@/integrations/firebase/client";
import { collection, addDoc, serverTimestamp, doc as fsDoc, getDoc as fsGetDoc, getDocs as fsGetDocs, query as fsQuery, orderBy as fsOrderBy } from "firebase/firestore";
import { formatPrice, VISIT_CHARGE, MAX_PROPERTIES_PER_VISIT, PHONE_NUMBER, UPI_ID, GOOGLE_SHEET_URL } from "@/lib/data";
import PropertyDetailSkeleton from "@/components/PropertyDetailSkeleton";
import { motion } from "framer-motion";
import { openBookingWhatsApp } from "@/lib/whatsapp";

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
        const propRef = fsDoc(db, "properties", id);
        const [propSnap, allSnap] = await Promise.all([
          fsGetDoc(propRef),
          fsGetDocs(fsQuery(collection(db, "properties"), fsOrderBy("createdAt", "desc"))),
        ]);
        if (cancelled) return;
        const propData = propSnap.exists() ? { id: propSnap.id, ...propSnap.data() } : null;
        const allData = allSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => p.id !== id);
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

  const getMaxPan = () => {
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
  };

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
  }, [zoom, naturalSize]);

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
          await fetch(`${fnUrl.replace(/\/$/, '')}/sendNotification`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
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

  return (
    <div className="min-h-screen bg-background">
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
                            <img src={src} alt={`${property.title}-${i}`} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
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
                  <Badge className="bg-secondary text-secondary-foreground font-body">{property.status}</Badge>
                  <Badge variant="outline" className="bg-card/90 font-body">{property.type}</Badge>
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
                      <img src={src} alt={`${property.title}-thumb-${i}`} className="h-full w-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">{property.title}</h1>
                    {(property.location || property.address) && (
                      <div className="flex items-center gap-2 mt-2 text-muted-foreground font-body">
                        <MapPin className="h-4 w-4" /> {property.location || property.address}
                      </div>
                    )}
                    {summaryLine && (
                      <div className="mt-2 text-sm text-muted-foreground font-body">{summaryLine}</div>
                    )}
                  </div>
                  <div className="text-2xl md:text-3xl font-display font-bold text-secondary">
                    {formatPrice(property.price)}
                    {property.status === "For Rent" && <span className="text-base font-body text-muted-foreground">/month</span>}
                  </div>
                </div>

                <div className="mt-6 border-t border-border pt-6">
                  <h3 className="text-lg font-display font-semibold text-foreground mb-4">Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm font-body">
                    {detailItems.map((item) => (
                      <div key={item.label} className="flex items-center justify-between gap-3 border-b border-border pb-2">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="text-card-foreground font-medium text-right">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {property.description && (
                  <div className="mt-6">
                    <h3 className="text-lg font-display font-semibold text-foreground mb-2">Description</h3>
                    <p className="text-muted-foreground font-body leading-relaxed">{property.description}</p>
                  </div>
                )}

                {property.features && property.features.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-display font-semibold text-foreground mb-3">Features & Amenities</h3>
                    <div className="flex flex-wrap gap-2">
                      {property.features.map((f: string) => (
                        <span key={f} className="flex items-center gap-1 bg-secondary/10 text-secondary-foreground font-body text-sm px-3 py-1.5 rounded-full">
                          <CheckCircle2 className="h-3.5 w-3.5 text-secondary" /> {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Booking form */}
          <div>
            <motion.div id="booking" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
              className="bg-card rounded-lg p-6 shadow-card sticky top-24">
              <h3 className="text-xl font-display font-bold text-card-foreground mb-1">Book a Site Visit</h3>
              <div className="flex items-center gap-2 mb-4">
                <Badge className="bg-secondary/10 text-secondary font-body text-xs">
                  <IndianRupee className="h-3 w-3 mr-0.5" /> {VISIT_CHARGE} Visit Charge
                </Badge>
                <Badge variant="outline" className="font-body text-xs">Max {MAX_PROPERTIES_PER_VISIT} Properties</Badge>
              </div>

              <div className="space-y-4">
                <div className="text-sm text-muted-foreground font-body">
                  Book using the full booking form to select a slot and upload payment proof.
                </div>
                <Link to={`/book?propertyId=${property.id}`}>
                  <Button className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-body">
                    Book Site Visit
                  </Button>
                </Link>
                <div className="text-center">
                  <ContactMenu phone={PHONE_NUMBER} className="inline-block">
                    <Button variant="ghost" className="text-sm font-body text-secondary"><Phone className="h-3.5 w-3.5 mr-1" /> {PHONE_NUMBER}</Button>
                  </ContactMenu>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      {/* <div className="fixed bottom-6 right-6 z-50 text-black bg-white/30 backdrop-blur-sm p-2 rounded-lg text-xs font-bold opacity-70 pointer-events-none">
        A to Z Properties
      </div> */}
      <Footer />

      {/* Image viewer modal (lightbox) */}
      {viewerOpen && images.length > 0 && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/80 sm:bg-black" onClick={() => setViewerOpen(false)} />
          <motion.div className="relative z-10 w-[90vw] h-[90vh] sm:w-screen sm:h-screen" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
            <div className="w-full h-full bg-black rounded-lg overflow-hidden">
              <div className="relative w-full h-full">
                <div
                  className={`w-full h-full bg-black flex items-center justify-center rounded-lg`}
                  ref={containerRef}
                  style={{ touchAction: 'none', cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'zoom-in' }}
                  onWheel={(e) => {
                    if (e.ctrlKey) return; // allow browser zoom
                    if (!viewerOpen) return;
                    e.preventDefault();
                    const delta = -e.deltaY;
                    if (Math.abs(delta) < 1) return;
                    const step = 0.15;
                    if (delta > 0) setZoom((z) => Math.min(3, +(z + step).toFixed(2)));
                    else setZoom((z) => Math.max(1, +(z - step).toFixed(2)));
                  }}
                  onPointerDown={(e) => {
                    // start panning only for mouse/pointer when zoomed
                    if (zoom <= 1) return;
                    isPanningRef.current = true;
                    setIsPanning(true);
                    lastPosRef.current = { x: e.clientX, y: e.clientY };
                    try { (e.target as Element).setPointerCapture?.(e.pointerId); } catch { }
                  }}
                  onTouchStart={(e) => {
                    // record touch start for swipe detection (only when not zoomed)
                    if (e.touches.length === 2) {
                      // start pinch
                      const a = e.touches[0];
                      const b = e.touches[1];
                      const dx = b.clientX - a.clientX;
                      const dy = b.clientY - a.clientY;
                      pinchStartDistRef.current = Math.hypot(dx, dy);
                      pinchStartZoomRef.current = zoom;
                      pinchStartPanXRef.current = panX;
                      pinchStartPanYRef.current = panY;
                      // center in container coordinates
                      const rect = containerRef.current?.getBoundingClientRect();
                      if (rect) {
                        pinchCenterRef.current = { x: (a.clientX + b.clientX) / 2 - rect.left, y: (a.clientY + b.clientY) / 2 - rect.top };
                      } else pinchCenterRef.current = null;
                      // clear single-touch swipe start
                      touchStartRef.current = null;
                      return;
                    }
                    if (zoom > 1) return;
                    const t = e.touches[0];
                    touchStartRef.current = { x: t.clientX, y: t.clientY };
                  }}
                  onTouchMove={(e) => {
                    if (e.touches.length === 2 && pinchStartDistRef.current && pinchStartZoomRef.current) {
                      // pinch-to-zoom
                      const a = e.touches[0];
                      const b = e.touches[1];
                      const dx = b.clientX - a.clientX;
                      const dy = b.clientY - a.clientY;
                      const dist = Math.hypot(dx, dy);
                      const startDist = pinchStartDistRef.current;
                      if (startDist === 0) return;
                      const scale = dist / startDist;
                      const newZoom = Math.max(1, Math.min(3, +(pinchStartZoomRef.current! * scale).toFixed(3)));
                      // adjust pan so the pinch center stays focused
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
                    // if a pinch was active, clear pinch state
                    if (pinchStartDistRef.current) {
                      pinchStartDistRef.current = null;
                      pinchStartZoomRef.current = null;
                      pinchStartPanXRef.current = null;
                      pinchStartPanYRef.current = null;
                      pinchCenterRef.current = null;
                      touchStartRef.current = null;
                      return;
                    }
                    // double-tap to reset on small devices
                    if (typeof window !== 'undefined' && window.innerWidth < 640) {
                      const now = Date.now();
                      if (lastTapRef.current && (now - lastTapRef.current) < 300) {
                        // double tap detected -> reset
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
                    // Only enable swipe on small screens
                    if (typeof window !== 'undefined' && window.innerWidth >= 640) {
                      touchStartRef.current = null;
                      return;
                    }
                    const t = e.changedTouches[0];
                    const dx = t.clientX - touchStartRef.current.x;
                    const dy = t.clientY - touchStartRef.current.y;
                    touchStartRef.current = null;
                    const absX = Math.abs(dx);
                    const absY = Math.abs(dy);
                    const threshold = 50; // px
                    if (absX > threshold && absX > absY) {
                      if (dx < 0 && images.length > 1) {
                        // swipe left -> next
                        setViewerIndex((i) => (i + 1) % images.length);
                      } else if (dx > 0 && images.length > 1) {
                        // swipe right -> prev
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
                    try { (e.target as Element).releasePointerCapture?.(e.pointerId); } catch { }
                  }}
                  onPointerCancel={() => { isPanningRef.current = false; setIsPanning(false); lastPosRef.current = null; }}
                >
                  <img
                    ref={imgRef}
                    src={images[viewerIndex]}
                    alt={`property-view-${viewerIndex}`}
                    className="w-full h-full object-contain"
                    onLoad={(e) => {
                      const el = e.currentTarget;
                      if (el && el.naturalWidth && el.naturalHeight) setNaturalSize({ w: el.naturalWidth, h: el.naturalHeight });
                    }}
                    style={{ transform: `translate(${panX}px, ${panY}px) scale(${zoom})`, transformOrigin: 'center', transition: isPanning ? 'none' : 'transform 120ms', cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'zoom-in' }}
                  />
                </div>
                <div className="absolute left-4 bottom-4 bg-black/60 text-white px-3 py-2 rounded-md z-40">
                  <div className="text-sm font-semibold">{property.title}</div>
                  <div className="text-xs opacity-80">Image {viewerIndex + 1} of {images.length}</div>
                </div>
                <div className="hidden sm:flex absolute top-1 left-1 sm:top-3 sm:left-3 flex items-center gap-2 z-50">
                  <button onClick={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))} className="bg-white/90 text-black p-2 rounded shadow"> <ZoomOut className="h-4 w-4" /></button>
                  <button onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))} className="bg-white/90 text-black p-2 rounded shadow"> <ZoomIn className="h-4 w-4" /></button>
                  <button onClick={() => { setZoom(1); setPanX(0); setPanY(0); setIsPanning(false); }} className="bg-white/90 text-black p-2 rounded shadow"> <RefreshCw className="h-4 w-4" /></button>
                </div>
                <button onClick={() => setViewerOpen(false)} className="absolute top-1 right-1 sm:top-3 sm:right-3 bg-white/90 text-black px-2 py-1 rounded text-sm z-50">Close</button>
                {images.length > 1 && (
                  <>
                    <button onClick={() => setViewerIndex((i) => (i - 1 + images.length) % images.length)} className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 text-black px-4 py-2 rounded-full shadow">‹</button>
                    <button onClick={() => setViewerIndex((i) => (i + 1) % images.length)} className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 text-black px-4 py-2 rounded-full shadow">›</button>
                  </>
                )}
                {images.length > 1 && (
                  <div className="absolute bottom-0 left-0 right-0 hidden sm:flex items-center gap-2 p-3 bg-gradient-to-t from-black/60 to-transparent rounded-b-lg">
                    <div className="flex gap-2 overflow-x-auto w-full py-1">
                      {images.map((thumb, ti) => (
                        <button key={ti} onClick={() => setViewerIndex(ti)} className={`flex-none rounded-md overflow-hidden border ${ti === viewerIndex ? 'border-rose-500' : 'border-transparent'} hover:scale-105 transition-transform`}>
                          <img src={getOptimizedUrl(thumb, { width: 80, height: 48 })} alt={`thumb-${ti}`} className="w-20 h-12 object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="fixed right-6 z-50 text-black bg-white/30 backdrop-blur-sm p-2 rounded-lg text-xs font-bold opacity-70 pointer-events-none"  style={{marginTop:'-14vh'}}>
        A to Z 
      Properties
      </div>

            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default PropertyDetail;
