import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { db, getIdToken } from "@/integrations/firebase/client";
import {
  doc as fsDoc,
  getDoc as fsGetDoc,
  addDoc,
  collection,
  serverTimestamp,
  getDocs as fsGetDocs,
  query as fsQuery,
  where as fsWhere,
} from "firebase/firestore";
import {
  TIME_SLOTS_MORNING,
  TIME_SLOTS_EVENING,
  VISIT_CHARGE,
  MAX_PROPERTIES_PER_VISIT,
  UPI_ID,
  GOOGLE_SHEET_URL,
} from "@/lib/data";
import { openBookingWhatsApp } from "@/lib/whatsapp";
import { isValidPhone } from "@/lib/validation";
import {
  Calendar,
  Clock,
  User,
  Phone,
  Building2,
  CheckCircle2,
  QrCode,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Plus,
  Check,
  CreditCard,
  Banknote,
  MapPin,
  UploadCloud,
  FileCheck,
  Info,
} from "lucide-react";

export default function BookSlot() {
  const [search] = useSearchParams();
  const propertyId = search.get("propertyId");
  const [property, setProperty] = useState<any | null>(null);
  const [relatedProperties, setRelatedProperties] = useState<any[]>([]);
  const [extraPropertyIds, setExtraPropertyIds] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Form Fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [caste, setCaste] = useState("");
  const [bookedSlots, setBookedSlots] = useState<Record<string, number>>({});
  const [bookedProperties, setBookedProperties] = useState<Record<string, string[]>>({});
  const [todayMin, setTodayMin] = useState("");
  const [agree, setAgree] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash_upi_on_visit");
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [paymentScreenshotPreview, setPaymentScreenshotPreview] = useState<string | null>(null);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [timePeriodTab, setTimePeriodTab] = useState<"morning" | "evening">("morning");
  const [submitting, setSubmitting] = useState(false);

  const [errors, setErrors] = useState<{
    name?: string;
    phone?: string;
    date?: string;
    slot?: string;
    caste?: string;
    agree?: string;
    screenshot?: string;
  }>({});

  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const normalizeIntent = (status: any) => {
    const s = (status || "").toString().toLowerCase();
    if (/rent|rented|lease/.test(s)) return "rent";
    if (/sell|sold|sale/.test(s)) return "sell";
    return "other";
  };

  const normalizeType = (type: any) => {
    const t = (type || "").toString().toLowerCase();
    if (/commercial|shop|office|retail/.test(t)) return "commercial";
    if (/land|plot|site/.test(t)) return "land";
    return "residential";
  };

  const selectedPropertyIds = useMemo(
    () => (propertyId ? [propertyId, ...extraPropertyIds] : []),
    [propertyId, extraPropertyIds]
  );
  const brokerage =
    property && (property.status === "For Rent" || (property.listed_by && String(property.status).toLowerCase().includes("rent")))
      ? Number(property.price || 0)
      : 0;
  const totalDueNow = VISIT_CHARGE;

  const upiPayUrl = (() => {
    const note = property?.title ? `Site Visit - ${property.title}` : "Site Visit Booking";
    const params = new URLSearchParams({
      pa: UPI_ID,
      pn: "ATOZ PROPERTIES",
      am: String(totalDueNow),
      cu: "INR",
      tn: note,
    });
    return `upi://pay?${params.toString()}`;
  })();

  const isMobile = (() => {
    if (typeof navigator === "undefined") return false;
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  })();

  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(upiPayUrl)}`;

  // Load selected property & related recommendations
  useEffect(() => {
    if (!propertyId) return;
    (async () => {
      if (!db) return;
      try {
        const dref = fsDoc(db, "properties", propertyId);
        const snap = await fsGetDoc(dref);
        if (!snap.exists()) return;

        const selected = { id: snap.id, ...snap.data() } as any;
        setProperty(selected);

        const allSnap = await fsGetDocs(collection(db, "properties"));
        const all: any[] = [];
        allSnap.forEach((d) => all.push({ id: d.id, ...d.data() }));

        const selectedIntent = normalizeIntent(selected.status);
        const selectedType = normalizeType(selected.type);
        const selectedLocation = (selected.location || "").toString().trim().toLowerCase();

        const rankedBase = all
          .filter((p) => p.id !== propertyId)
          .map((p) => {
            const sameLocation = (p.location || "").toString().trim().toLowerCase() === selectedLocation;
            const sameIntent = normalizeIntent(p.status) === selectedIntent;
            const sameType = normalizeType(p.type) === selectedType;
            const relScore = (sameIntent ? 5 : 0) + (sameType ? 4 : 0) + (sameLocation ? 2 : 0);
            return { ...p, _relScore: relScore, _sameIntent: sameIntent, _sameType: sameType };
          });

        const strictMatches = rankedBase.filter((p: any) => p._sameIntent && p._sameType);
        const softMatches = rankedBase.filter((p: any) => p._sameIntent || p._sameType);
        const pool = strictMatches.length > 0 ? strictMatches : (softMatches.length > 0 ? softMatches : rankedBase);

        const ranked = pool
          .sort((a: any, b: any) => b._relScore - a._relScore)
          .slice(0, 20);

        setRelatedProperties(ranked);
      } catch (err) {
        console.warn(err);
      }
    })();
  }, [propertyId]);

  const toggleExtra = (pid: string) => {
    if (extraPropertyIds.includes(pid)) {
      setExtraPropertyIds(extraPropertyIds.filter((x) => x !== pid));
      return;
    }
    if (extraPropertyIds.length >= MAX_PROPERTIES_PER_VISIT - 1) {
      toast({
        title: "Maximum reached",
        description: `You can select up to ${MAX_PROPERTIES_PER_VISIT} properties in one single visit booking.`,
        variant: "destructive",
      });
      return;
    }
    setExtraPropertyIds([...extraPropertyIds, pid]);
  };

  // Compute today's date in IST for min on date picker
  useEffect(() => {
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const nowIst = new Date(Date.now() + IST_OFFSET_MS);
    const y = nowIst.getUTCFullYear();
    const m = String(nowIst.getUTCMonth() + 1).padStart(2, "0");
    const d = String(nowIst.getUTCDate()).padStart(2, "0");
    setTodayMin(`${y}-${m}-${d}`);
  }, []);

  useEffect(() => {
    return () => {
      if (paymentScreenshotPreview) URL.revokeObjectURL(paymentScreenshotPreview);
    };
  }, [paymentScreenshotPreview]);

  useEffect(() => {
    if (paymentMethod !== "online") {
      setPaymentScreenshot(null);
      setPaymentScreenshotPreview(null);
      setShowQr(false);
      if (errors.screenshot) setErrors((prev) => ({ ...prev, screenshot: undefined }));
    }
  }, [paymentMethod, errors.screenshot]);

  const handlePaymentScreenshotChange = (file: File | null) => {
    if (!file) {
      setPaymentScreenshot(null);
      setPaymentScreenshotPreview(null);
      return;
    }
    setPaymentScreenshot(file);
    if (errors.screenshot) setErrors((prev) => ({ ...prev, screenshot: undefined }));
    const nextPreview = URL.createObjectURL(file);
    setPaymentScreenshotPreview(nextPreview);
  };

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
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
      formData.append("amount", String(totalDueNow));
      formData.append("upi", UPI_ID);
      formData.append("propertyId", propertyId || "");
      formData.append("propertyTitle", property?.title || "");
      formData.append("visitDate", date || "");
      formData.append("timeSlot", slot || "");
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
      toast({
        title: "Screenshot upload notice",
        description: "We will verify your payment manually if sheet recording was delayed.",
        variant: "destructive",
      });
    } finally {
      setUploadingScreenshot(false);
    }
  };

  // Fetch already booked slots for selected properties + date
  useEffect(() => {
    if (selectedPropertyIds.length === 0 || !date) return;
    (async () => {
      if (!db) return;
      try {
        const q = fsQuery(collection(db, "bookings"), fsWhere("visit_date", "==", date));
        const snap = await fsGetDocs(q);
        const taken: Record<string, number> = {};
        snap.forEach((sdoc) => {
          const d = sdoc.data() as any;
          const ts = d.time_slot;
          const pids = Array.isArray(d.property_ids) ? d.property_ids : [];
          if (ts && pids.some((pid: string) => selectedPropertyIds.includes(pid))) {
            taken[ts] = (taken[ts] || 0) + 1;
          }
        });
        setBookedSlots(taken);
      } catch (err) {
        console.warn(err);
      }
    })();
  }, [selectedPropertyIds, date]);

  // Fetch bookings for the selected date across all properties
  useEffect(() => {
    if (!date) return;
    (async () => {
      if (!db) return;
      try {
        const q = fsQuery(collection(db, "bookings"), fsWhere("visit_date", "==", date));
        const snap = await fsGetDocs(q);
        const slotToPropIds: Record<string, Set<string>> = {};
        const propIdSet = new Set<string>();
        snap.forEach((docSnap) => {
          const d = docSnap.data() as any;
          const ts = d.time_slot;
          const pids = Array.isArray(d.property_ids) ? d.property_ids : [];
          if (!ts) return;
          slotToPropIds[ts] = slotToPropIds[ts] || new Set();
          pids.forEach((pid: string) => {
            slotToPropIds[ts].add(pid);
            propIdSet.add(pid);
          });
        });

        const idToTitle: Record<string, string> = {};
        if (propIdSet.size > 0) {
          const ids = Array.from(propIdSet);
          await Promise.all(
            ids.map(async (id) => {
              try {
                const pref = fsDoc(db, "properties", id);
                const psnap = await fsGetDoc(pref);
                if (psnap.exists()) idToTitle[id] = (psnap.data() as any).title || id;
                else idToTitle[id] = id;
              } catch {
                idToTitle[id] = id;
              }
            })
          );
        }

        const slotToTitles: Record<string, string[]> = {};
        Object.keys(slotToPropIds).forEach((ts) => {
          const titles: string[] = [];
          slotToPropIds[ts].forEach((pid) => {
            const title = idToTitle[pid] || pid;
            if (propertyId && pid === propertyId) return;
            titles.push(title);
          });
          slotToTitles[ts] = titles;
        });
        setBookedProperties(slotToTitles);
      } catch (err) {
        console.warn("Failed to fetch bookings for date", err);
      }
    })();
  }, [date, propertyId]);

  // Validation per step
  const validateStep1 = () => {
    const errs: { date?: string; slot?: string } = {};
    if (!date) errs.date = "Please select a visit date.";
    if (!slot) errs.slot = "Please select an available time slot.";
    setErrors((prev) => ({ ...prev, ...errs }));
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs: { name?: string; phone?: string; caste?: string } = {};
    if (!name.trim()) errs.name = "Full name is required.";
    if (!phone.trim()) errs.phone = "Phone number is required.";
    else if (!isValidPhone(phone)) errs.phone = "Enter a valid 10-digit mobile number.";
    if (!caste.trim()) errs.caste = "Community / caste details are required.";
    setErrors((prev) => ({ ...prev, ...errs }));
    return Object.keys(errs).length === 0;
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep === 1) {
      if (validateStep1()) {
        setCurrentStep(2);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else if (currentStep === 2) {
      if (validateStep2()) {
        setCurrentStep(3);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  const handleBook = async () => {
    const nextErrors: {
      name?: string;
      phone?: string;
      date?: string;
      slot?: string;
      caste?: string;
      agree?: string;
      screenshot?: string;
    } = {};

    if (!name.trim()) nextErrors.name = "Name is required";
    if (!phone.trim()) nextErrors.phone = "Phone number is required";
    else if (!isValidPhone(phone)) nextErrors.phone = "Enter a valid phone number";
    if (!date) nextErrors.date = "Visit date is required";
    if (!slot) nextErrors.slot = "Please select a time slot";
    if (!caste.trim()) nextErrors.caste = "Caste / Community is required";
    if (paymentMethod === "online" && !paymentScreenshot) nextErrors.screenshot = "Payment screenshot is required";
    if (!agree) nextErrors.agree = "You must accept the ₹200 booking charge agreement";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const firstError = Object.values(nextErrors).find(Boolean);
      toast({
        title: "Please complete required fields",
        description: firstError,
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      if (!db) throw new Error("Firebase is not initialized");

      const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
      const [y, m, d] = date.split("-").map((v) => Number(v));
      const [timePart, meridiem] = slot.split(" ");
      const [hhStr, mmStr] = timePart.split(":");
      let hh = Number(hhStr) % 12;
      const mm = Number(mmStr || 0);
      if ((meridiem || "").toUpperCase() === "PM") hh += 12;
      const utcMillis = Date.UTC(y, m - 1, d, hh, mm) - IST_OFFSET_MS;
      const visitDateTime = new Date(utcMillis);

      // Verify slot occupancy
      const checkQ = fsQuery(
        collection(db, "bookings"),
        fsWhere("visit_date", "==", date),
        fsWhere("time_slot", "==", slot)
      );
      const checkSnap = await fsGetDocs(checkQ);
      const perPropertyCount: Record<string, number> = {};
      checkSnap.forEach((sdoc) => {
        const dData = sdoc.data() as any;
        const pids = Array.isArray(dData.property_ids) ? dData.property_ids : [];
        pids.forEach((pid: string) => {
          perPropertyCount[pid] = (perPropertyCount[pid] || 0) + 1;
        });
      });

      const fullPid = selectedPropertyIds.find((pid) => (perPropertyCount[pid] || 0) >= 3);
      if (fullPid) {
        setSubmitting(false);
        return toast({
          title: "Slot reached capacity",
          description: "One or more chosen properties are already fully booked for this slot. Please pick another time slot.",
          variant: "destructive",
        });
      }

      const bkRef = await addDoc(collection(db, "bookings"), {
        user_id: user ? user.id : null,
        name,
        phone,
        email: null,
        visit_date: date,
        time_slot: slot,
        visit_datetime: visitDateTime,
        caste,
        property_ids: selectedPropertyIds,
        charge: VISIT_CHARGE,
        brokerage: brokerage || 0,
        payment: {
          amount: totalDueNow,
          status: paymentMethod === "online" ? "submitted" : "pending",
          method: paymentMethod,
          breakdown: { visit: VISIT_CHARGE },
        },
        status: "pending",
        createdAt: serverTimestamp(),
      });

      if (paymentMethod === "online") {
        await submitPaymentScreenshot(bkRef.id);
      }

      const allKnown = [property, ...relatedProperties].filter(Boolean);
      const propertyTitles = selectedPropertyIds.map((pid) => allKnown.find((p) => p.id === pid)?.title || pid);

      openBookingWhatsApp({
        bookingId: bkRef.id,
        name,
        phone,
        date,
        slot,
        propertyTitles,
        location: property?.location,
        caste,
        charge: VISIT_CHARGE,
        brokerage: brokerage || 0,
        total: totalDueNow,
      });

      try {
        await addDoc(collection(db, "notifications"), {
          type: "booking",
          refId: bkRef.id,
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
          await fetch(`${fnUrl.replace(/\/$/, "")}/sendNotification`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              type: "booking",
              refId: bkRef.id,
              title: "New Booking",
              message: `${name} • ${phone}`,
            }),
          });
        } catch (e) {
          console.warn("sendNotification call failed", e);
        }
      } catch (e) {
        console.warn("Failed to create notification", e);
      }

      toast({
        title: "Visit Request Confirmed!",
        description: "Your slot has been recorded. Our coordinator is assigned to meet you.",
      });
      navigate("/my-bookings");
    } catch (err: any) {
      toast({
        title: "Booking Failed",
        description: String(err?.message || err),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { num: 1, title: "Schedule & Properties", icon: Calendar },
    { num: 2, title: "Visitor Details", icon: User },
    { num: 3, title: "Payment & Confirm", icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <SEO title="Book a ₹200 Site Visit in Rajkot | A TO Z Properties" noindex />
      <Navbar />

      <main className="flex-1 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          {/* Top Breadcrumb & Title */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <Link
                to={propertyId ? `/property/${propertyId}` : "/properties"}
                className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-primary transition-colors mb-2"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                {propertyId ? "Back to Property" : "Back to All Properties"}
              </Link>
              <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-foreground">
                Book a Guided Site Visit
              </h1>
              <p className="text-sm text-muted-foreground font-body mt-1">
                Experience real estate in-person with a dedicated A TO Z Properties property specialist.
              </p>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-medium self-start sm:self-auto">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>₹200 Standard Visit Charge</span>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="mb-8 bg-card rounded-2xl border border-border p-4 sm:p-5 shadow-sm">
            <div className="grid grid-cols-3 gap-2">
              {steps.map((s) => {
                const isCompleted = currentStep > s.num;
                const isCurrent = currentStep === s.num;
                const IconComponent = s.icon;
                return (
                  <button
                    key={s.num}
                    type="button"
                    onClick={() => {
                      if (s.num < currentStep) setCurrentStep(s.num as any);
                    }}
                    className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl text-left transition-all ${
                      isCurrent
                        ? "bg-primary text-primary-foreground shadow-md"
                        : isCompleted
                        ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100"
                        : "text-muted-foreground opacity-60"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 text-xs sm:text-sm font-bold ${
                        isCurrent
                          ? "bg-primary-foreground/20 text-white"
                          : isCompleted
                          ? "bg-emerald-600 text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isCompleted ? <Check className="h-4 w-4" /> : s.num}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase font-semibold tracking-wider opacity-75">
                        Step {s.num}
                      </div>
                      <div className="text-xs sm:text-sm font-medium truncate">{s.title}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Card */}
          <div className="bg-card rounded-3xl border border-border shadow-xl p-6 sm:p-8">
            <AnimatePresence mode="wait">
              {/* STEP 1: Property, Related & Date/Time */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {/* Selected Primary Property preview card */}
                  {property ? (
                    <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                          <Building2 className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-primary/10 text-primary mb-1">
                            Primary Selected Property
                          </div>
                          <h2 className="text-base sm:text-lg font-semibold text-foreground leading-tight">
                            {property.title}
                          </h2>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" />
                            {property.location || "Palitana, Gujarat"} • {property.type || "Residential"} •{" "}
                            {property.status || "For Rent"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right self-end sm:self-center">
                        <div className="text-sm font-bold text-accent">
                          ₹{Number(property.price || 0).toLocaleString("en-IN")}
                          <span className="text-[11px] font-normal text-muted-foreground">/mo</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
                      <Info className="h-4 w-4 shrink-0" />
                      <span>
                        No specific property selected from URL. Please browse{" "}
                        <Link to="/properties" className="underline font-semibold">
                          all listings
                        </Link>{" "}
                        or choose related options below.
                      </span>
                    </div>
                  )}

                  {/* Add Related Properties Option */}
                  {relatedProperties.length > 0 && (
                    <div className="rounded-2xl border border-border p-4 bg-background">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                            <Plus className="h-4 w-4 text-primary" />
                            Bundle Related Properties (Free in Same Visit)
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            You can visit up to {MAX_PROPERTIES_PER_VISIT} properties in one single ₹200 slot booking.
                          </p>
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                          {selectedPropertyIds.length} / {MAX_PROPERTIES_PER_VISIT}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 max-h-48 overflow-y-auto pr-1">
                        {relatedProperties.map((p) => {
                          const isSelected = extraPropertyIds.includes(p.id);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => toggleExtra(p.id)}
                              className={`p-3 rounded-xl border text-left text-xs transition-all flex items-start justify-between gap-2 ${
                                isSelected
                                  ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary"
                                  : "border-border bg-card hover:border-primary/40 text-muted-foreground"
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="font-semibold text-foreground truncate">{p.title}</div>
                                <div className="text-[11px] text-muted-foreground truncate">{p.location}</div>
                                <div className="text-[10px] mt-1 font-mono text-accent">
                                  ₹{Number(p.price || 0).toLocaleString("en-IN")}
                                </div>
                              </div>
                              <div
                                className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                                  isSelected ? "bg-primary text-white" : "border border-border"
                                }`}
                              >
                                {isSelected && <Check className="h-3 w-3" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Date Selection */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">
                      Select Visit Date <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <Input
                        type="date"
                        min={todayMin}
                        value={date}
                        onChange={(e) => {
                          setDate(e.target.value);
                          if (errors.date) setErrors((prev) => ({ ...prev, date: undefined }));
                        }}
                        className={`h-12 text-sm bg-background ${errors.date ? "border-destructive" : ""}`}
                        aria-label="Visit date"
                      />
                    </div>
                    {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
                  </div>

                  {/* Time Slots Selector */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-primary" />
                        Select Preferred Time Slot <span className="text-destructive">*</span>
                      </label>

                      {/* Period Tabs */}
                      <div className="flex rounded-lg bg-muted p-0.5 text-xs">
                        <button
                          type="button"
                          onClick={() => setTimePeriodTab("morning")}
                          className={`px-3 py-1 rounded-md font-medium transition-all ${
                            timePeriodTab === "morning"
                              ? "bg-card text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Morning
                        </button>
                        <button
                          type="button"
                          onClick={() => setTimePeriodTab("evening")}
                          className={`px-3 py-1 rounded-md font-medium transition-all ${
                            timePeriodTab === "evening"
                              ? "bg-card text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Evening
                        </button>
                      </div>
                    </div>

                    {/* Slots Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {(timePeriodTab === "morning" ? TIME_SLOTS_MORNING : TIME_SLOTS_EVENING).map((s) => {
                        let isPast = false;
                        if (date) {
                          try {
                            const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
                            const CUTOFF_MS = 30 * 60 * 1000;
                            const cutoff = Date.now() + CUTOFF_MS;
                            const [y, m, d] = date.split("-").map((v) => Number(v));
                            const [timePart, meridiem] = s.split(" ");
                            const [hhStr, mmStr] = timePart.split(":");
                            let hh = Number(hhStr) % 12;
                            const mm = Number(mmStr || 0);
                            if ((meridiem || "").toUpperCase() === "PM") hh += 12;
                            const utcMillis = Date.UTC(y, m - 1, d, hh, mm) - IST_OFFSET_MS;
                            if (utcMillis <= cutoff) isPast = true;
                          } catch {
                            isPast = false;
                          }
                        }

                        const takenCount = bookedSlots[s] || 0;
                        const isFull = takenCount >= 3;
                        const isDisabled = isPast || isFull;
                        const isSelected = slot === s;

                        return (
                          <button
                            key={s}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => {
                              if (!isDisabled) {
                                setSlot(s);
                                if (errors.slot) setErrors((prev) => ({ ...prev, slot: undefined }));
                              }
                            }}
                            className={`p-3 rounded-xl border text-center transition-all relative ${
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground shadow-md ring-2 ring-primary/40"
                                : isDisabled
                                ? "border-border/40 bg-muted/30 text-muted-foreground/40 cursor-not-allowed"
                                : takenCount >= 2
                                ? "border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 hover:border-amber-400"
                                : "border-border bg-card hover:border-primary text-foreground"
                            }`}
                          >
                            <div className="text-xs font-semibold">{s}</div>
                            <div className="text-[10px] mt-1 font-medium">
                              {isPast ? (
                                <span className="text-muted-foreground">Passed</span>
                              ) : isFull ? (
                                <span className="text-destructive font-semibold">Fully Booked</span>
                              ) : takenCount >= 2 ? (
                                <span className="text-amber-600 dark:text-amber-400 font-semibold">Fast Filling</span>
                              ) : (
                                <span className={isSelected ? "text-primary-foreground/80" : "text-emerald-600 dark:text-emerald-400"}>
                                  Available
                                </span>
                              )}
                            </div>

                            {bookedProperties[s] && bookedProperties[s].length > 0 && !isSelected && (
                              <div className="text-[9px] text-muted-foreground truncate mt-1">
                                {bookedProperties[s].length} visit(s) active
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {errors.slot && <p className="text-xs text-destructive">{errors.slot}</p>}
                  </div>

                  {/* Step 1 Actions */}
                  <div className="pt-4 flex justify-end">
                    <Button
                      type="button"
                      onClick={handleNext}
                      className="w-full sm:w-auto h-12 px-8 bg-primary text-primary-foreground font-semibold shadow-md rounded-xl justify-center text-sm sm:text-base transition-all active:scale-95"
                    >
                      Continue to Visitor Details
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: Visitor Information */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="p-4 rounded-2xl bg-muted/40 border border-border text-xs text-muted-foreground flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-foreground">Selected Slot: </span>
                      {date} at {slot}
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="text-primary font-semibold hover:underline"
                    >
                      Change Date/Time
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-foreground">
                        Your Full Name <span className="text-destructive">*</span>
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="e.g. Rajesh Shah"
                          value={name}
                          onChange={(e) => {
                            setName(e.target.value);
                            if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                          }}
                          className={`pl-10 h-11 ${errors.name ? "border-destructive" : ""}`}
                        />
                      </div>
                      {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-foreground">
                        Phone Number (WhatsApp) <span className="text-destructive">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="tel"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={10}
                          placeholder="e.g. 9876543210"
                          value={phone}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                            setPhone(digits);
                            if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
                          }}
                          className={`pl-10 h-11 ${errors.phone ? "border-destructive" : ""}`}
                        />
                      </div>
                      {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">
                      Caste / Community <span className="text-destructive">*</span>
                    </label>
                    <Input
                      placeholder="e.g. Jain / Vaishnav / Patel / etc."
                      value={caste}
                      onChange={(e) => {
                        setCaste(e.target.value);
                        if (errors.caste) setErrors((prev) => ({ ...prev, caste: undefined }));
                      }}
                      className={`h-11 ${errors.caste ? "border-destructive" : ""}`}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Certain property owners and housing societies in Palitana require community verification.
                    </p>
                    {errors.caste && <p className="text-xs text-destructive">{errors.caste}</p>}
                  </div>

                  {/* Step 2 Actions */}
                  <div className="pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setCurrentStep(1);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="w-full sm:w-auto h-11 px-6 rounded-xl justify-center"
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      type="button"
                      onClick={handleNext}
                      className="w-full sm:w-auto h-12 px-8 bg-primary text-primary-foreground font-semibold shadow-md rounded-xl justify-center text-sm sm:text-base transition-all active:scale-95"
                    >
                      Continue to Payment
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: Payment & Final Confirmation */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {/* Summary Recap Box */}
                  <div className="rounded-2xl border border-border p-4 bg-muted/30 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Visitor</span>
                      <strong className="text-foreground truncate block">{name}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Phone</span>
                      <strong className="text-foreground">{phone}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Date</span>
                      <strong className="text-foreground">{date}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Slot</span>
                      <strong className="text-foreground">{slot}</strong>
                    </div>
                  </div>

                  {/* Fee Breakdown Card */}
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center justify-between">
                      <span>Visit Fee Summary</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {selectedPropertyIds.length} Property Selection(s)
                      </span>
                    </h3>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Physical Accompaniment & Key Inspection Fee</span>
                        <span className="font-semibold text-foreground">₹200</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Additional Property Coordination</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">FREE</span>
                      </div>
                      <div className="border-t border-border/80 pt-2 flex justify-between text-sm font-bold text-foreground">
                        <span>Total Due Now</span>
                        <span className="text-accent text-base">₹{totalDueNow}</span>
                      </div>
                    </div>

                    {brokerage > 0 && (
                      <p className="mt-3 text-[11px] text-muted-foreground border-t border-border/40 pt-2">
                        * Standard 1-month rental brokerage charge applicable at the time of final token/agreement signing.
                      </p>
                    )}
                  </div>

                  {/* Payment Method Selection */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-foreground">Select Payment Method</label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Choose payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash_upi_on_visit">
                          <div className="flex items-center gap-2">
                            <Banknote className="h-4 w-4 text-emerald-600" />
                            <span>Pay ₹200 on Site (Cash or UPI at Visit)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="online">
                          <div className="flex items-center gap-2">
                            <QrCode className="h-4 w-4 text-accent" />
                            <span>Pay Online Now via UPI / QR Code</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Online UPI Payment Section */}
                  {paymentMethod === "online" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="rounded-2xl border border-border p-5 bg-card space-y-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-semibold text-foreground">Instant UPI Payment</h4>
                          <p className="text-xs text-muted-foreground font-mono">UPI ID: {UPI_ID}</p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (isMobile) {
                              window.location.href = upiPayUrl;
                            } else {
                              setShowQr(!showQr);
                            }
                          }}
                        >
                          {isMobile ? "Open UPI App" : showQr ? "Hide QR" : "Show QR Code"}
                        </Button>
                      </div>

                      {/* QR Display */}
                      {(!isMobile || showQr) && (
                        <div className="flex flex-col items-center justify-center p-4 bg-muted/40 rounded-xl border border-border">
                          <img
                            src={qrSrc}
                            alt="Scan UPI QR"
                            className="h-48 w-48 rounded-xl border border-border bg-white p-2 shadow-sm"
                          />
                          <p className="text-xs text-muted-foreground mt-2 text-center">
                            Scan with GPay, PhonePe, Paytm, or BHIM to pay <strong>₹{totalDueNow}</strong>
                          </p>
                        </div>
                      )}

                      {/* Screenshot Upload */}
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-foreground">
                          Upload Payment Screenshot <span className="text-destructive">*</span>
                        </label>
                        <div className="relative border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors">
                          <input
                            type="file"
                            accept="image/*"
                            id="screenshot-upload"
                            onChange={(e) => handlePaymentScreenshotChange(e.target.files?.[0] || null)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <div className="flex flex-col items-center justify-center gap-1.5 pointer-events-none">
                            <UploadCloud className="h-6 w-6 text-muted-foreground" />
                            <div className="text-xs font-medium text-foreground">
                              {paymentScreenshot ? paymentScreenshot.name : "Tap to upload payment screenshot"}
                            </div>
                            <p className="text-[10px] text-muted-foreground">PNG, JPG up to 10MB</p>
                          </div>
                        </div>

                        {paymentScreenshotPreview && (
                          <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-muted border border-border">
                            <FileCheck className="h-4 w-4 text-emerald-600" />
                            <span className="text-xs text-foreground truncate flex-1">{paymentScreenshot?.name}</span>
                            <button
                              type="button"
                              onClick={() => handlePaymentScreenshotChange(null)}
                              className="text-xs text-destructive hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                        {errors.screenshot && <p className="text-xs text-destructive">{errors.screenshot}</p>}
                      </div>
                    </motion.div>
                  )}

                  {/* Agreement Checkbox */}
                  <div className="p-4 rounded-xl bg-muted/40 border border-border">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agree}
                        onChange={(e) => {
                          setAgree(e.target.checked);
                          if (errors.agree) setErrors((prev) => ({ ...prev, agree: undefined }));
                        }}
                        className="mt-0.5 rounded border-border text-primary focus:ring-primary h-4 w-4"
                      />
                      <div className="text-xs text-foreground font-body leading-relaxed">
                        I agree to pay the standard <strong>₹200 non-refundable site visit fee</strong>, and I confirm
                        that our party will be present on-time at the property location.
                      </div>
                    </label>
                    {errors.agree && <p className="mt-1.5 text-xs text-destructive">{errors.agree}</p>}
                  </div>

                  {/* Step 3 Actions */}
                  <div className="pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setCurrentStep(2);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="w-full sm:w-auto h-11 px-6 rounded-xl justify-center"
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      type="button"
                      onClick={handleBook}
                      disabled={submitting || uploadingScreenshot}
                      className="w-full sm:w-auto h-12 px-8 bg-accent text-accent-foreground font-bold shadow-md rounded-xl justify-center text-sm sm:text-base hover:brightness-110 transition-all active:scale-95"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {submitting || uploadingScreenshot ? "Confirming Visit..." : "Confirm Site Visit"}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
