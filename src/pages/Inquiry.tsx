import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Send,
  User,
  Phone,
  MapPin,
  IndianRupee,
  FileText,
  MessageSquare,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { db, getIdToken } from "@/integrations/firebase/client";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { isValidPhone } from "@/lib/validation";
import WhatsAppButton from "@/components/WhatsAppButton";

const Inquiry = () => {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedId, setSubmittedId] = useState("");
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  const [form, setForm] = useState({
    name: "",
    phone: "",
    caste: "",
    location: "",
    budget: "",
    property_type: "",
    message: "",
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field as "name" | "phone"]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleNextStep = () => {
    if (step === 1) {
      const nextErrors: { name?: string; phone?: string } = {};
      if (!form.name.trim()) nextErrors.name = "Full name is required";
      if (!form.phone.trim()) nextErrors.phone = "Phone number is required";
      else if (!isValidPhone(form.phone)) nextErrors.phone = "Enter a valid 10-digit number";

      setErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0) return;
    }
    setStep((s) => Math.min(3, s + 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: { name?: string; phone?: string } = {};
    if (!form.name.trim()) nextErrors.name = "Name is required";
    if (!form.phone.trim()) nextErrors.phone = "Phone number is required";
    else if (!isValidPhone(form.phone)) nextErrors.phone = "Enter a valid phone number";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setStep(1);
      toast({ title: "Please fill required details", description: Object.values(nextErrors)[0], variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      if (!db) throw new Error("Firebase not configured. Set VITE_FIREBASE_* env vars.");
      const docRef = await addDoc(collection(db, "inquiries"), {
        name: form.name.trim(),
        phone: form.phone.trim(),
        caste: form.caste.trim() || null,
        location: form.location.trim() || null,
        budget: form.budget.trim() || null,
        property_type: form.property_type || null,
        message: form.message.trim() || null,
        status: "new",
        createdAt: serverTimestamp(),
      });

      setSubmittedId(docRef.id);
      setIsSuccess(true);
      toast({ title: "Inquiry Submitted!", description: "We will contact you shortly." });

      try {
        await addDoc(collection(db, "notifications"), {
          type: "inquiry",
          refId: docRef.id,
          title: "New Inquiry",
          message: `${form.name.trim()} • ${form.phone.trim()}`,
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
            body: JSON.stringify({ type: "inquiry", refId: docRef.id, title: "New Inquiry", message: `${form.name.trim()} • ${form.phone.trim()}` }),
          });
        } catch (e) {
          console.warn("sendNotification call failed", e);
        }
      } catch (e) {
        console.warn("Failed to create notification", e);
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
            body: JSON.stringify({ ...form, submittedAt: new Date().toISOString() }),
          });
        }
      } catch (err) {
        console.warn("Apps Script webhook failed", err);
      }
    } catch (err: any) {
      toast({ title: "Submission Failed", description: String(err?.message || err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <section className="bg-primary/95 dark:bg-card border-b border-primary-foreground/10 text-primary-foreground py-12 text-center">
        <div className="container mx-auto max-w-4xl px-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-accent text-xs font-mono uppercase tracking-widest mb-3">
            <Sparkles className="h-3.5 w-3.5" /> Fast Response Guaranteed
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-white tracking-tight">
            Submit Your <span className="text-gradient-gold">Rental Requirement</span>
          </h1>
          <p className="mt-2 text-white/80 font-body text-sm sm:text-base max-w-xl mx-auto">
            Tell us your preferred localities, budget, and layout. We will match you with verified off-market units within 2 hours.
          </p>
        </div>
      </section>

      <div className="container mx-auto max-w-3xl px-4 sm:px-6 py-12 flex-1">
        {isSuccess ? (
          /* Clear Success State */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-3xl p-8 sm:p-12 border border-border shadow-xl text-center space-y-6"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="h-9 w-9" />
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                Inquiry Successfully Logged!
              </h2>
              <p className="mt-2 text-muted-foreground font-body text-sm sm:text-base max-w-md mx-auto">
                Thank you, <strong className="text-foreground">{form.name}</strong>. Our senior property advisor will reach out to you via call or WhatsApp on{" "}
                <strong className="text-foreground">{form.phone}</strong>.
              </p>
              {submittedId && (
                <div className="mt-3 inline-block px-3 py-1 rounded-lg bg-muted text-xs font-mono text-muted-foreground">
                  Reference ID: {submittedId}
                </div>
              )}
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/properties">
                <Button className="w-full sm:w-auto bg-accent text-accent-foreground font-semibold px-6">
                  Browse Verified Listings
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => {
                  setIsSuccess(false);
                  setStep(1);
                  setForm({ name: "", phone: "", caste: "", location: "", budget: "", property_type: "", message: "" });
                }}
                className="w-full sm:w-auto"
              >
                Submit Another Request
              </Button>
            </div>
          </motion.div>
        ) : (
          /* Card-in-Card Multi-step Form */
          <div className="bg-card rounded-3xl p-6 sm:p-10 border border-border shadow-xl">
            {/* Step Progress Indicator */}
            <div className="mb-8">
              <div className="flex items-center justify-between relative">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-muted -translate-y-1/2 -z-0" />
                {[
                  { s: 1, label: "Contact Info" },
                  { s: 2, label: "Preferences" },
                  { s: 3, label: "Specifics" },
                ].map((item) => (
                  <div key={item.s} className="relative z-10 flex flex-col items-center">
                    <button
                      type="button"
                      onClick={() => item.s < step && setStep(item.s)}
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                        step >= item.s
                          ? "bg-accent text-accent-foreground shadow-md ring-4 ring-accent/20"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {item.s}
                    </button>
                    <span className="text-[11px] font-semibold mt-1 text-muted-foreground">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    className="space-y-4"
                  >
                    <div className="p-5 rounded-2xl bg-muted/40 border border-border/60 space-y-4">
                      <h3 className="font-display font-bold text-base text-foreground">
                        Step 1: Your Contact Details
                      </h3>

                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 pl-1">
                          Full Name *
                        </label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="e.g. Ramesh Patel"
                            value={form.name}
                            onChange={(e) => handleChange("name", e.target.value)}
                            className="pl-10 font-body"
                          />
                        </div>
                        {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 pl-1">
                          Phone Number (WhatsApp Active) *
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="10-digit mobile number"
                            value={form.phone}
                            onChange={(e) => handleChange("phone", e.target.value)}
                            className="pl-10 font-body"
                          />
                        </div>
                        {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone}</p>}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 pl-1">
                          Community / Background (Optional)
                        </label>
                        <div className="relative">
                          <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Helpful for specific society criteria"
                            value={form.caste}
                            onChange={(e) => handleChange("caste", e.target.value)}
                            className="pl-10 font-body"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    className="space-y-4"
                  >
                    <div className="p-5 rounded-2xl bg-muted/40 border border-border/60 space-y-4">
                      <h3 className="font-display font-bold text-base text-foreground">
                        Step 2: Property Preferences
                      </h3>

                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 pl-1">
                          Property Category
                        </label>
                        <Select value={form.property_type} onValueChange={(v) => handleChange("property_type", v)}>
                          <SelectTrigger className="font-body">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="flat">Flat / Apartment</SelectItem>
                            <SelectItem value="bungalow">Bungalow / Villa</SelectItem>
                            <SelectItem value="shop">Shop / Commercial Showroom</SelectItem>
                            <SelectItem value="office">Corporate Office Space</SelectItem>
                            <SelectItem value="plot">Plot / Land</SelectItem>
                            <SelectItem value="other">Other / Warehouse</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 pl-1">
                          Preferred Localities
                        </label>
                        <div className="relative">
                          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="e.g. Kalawad Road, Nana Mava, 150ft Ring Rd"
                            value={form.location}
                            onChange={(e) => handleChange("location", e.target.value)}
                            className="pl-10 font-body"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 pl-1">
                          Target Budget Range
                        </label>
                        <div className="relative">
                          <IndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="e.g. ₹20,000 – ₹30,000 / month"
                            value={form.budget}
                            onChange={(e) => handleChange("budget", e.target.value)}
                            className="pl-10 font-body"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    className="space-y-4"
                  >
                    <div className="p-5 rounded-2xl bg-muted/40 border border-border/60 space-y-4">
                      <h3 className="font-display font-bold text-base text-foreground">
                        Step 3: Specific Notes & Review
                      </h3>

                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 pl-1">
                          Special Requirements
                        </label>
                        <div className="relative">
                          <MessageSquare className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                          <Textarea
                            placeholder="Furnishing requirements, lift/parking essential, move-in timeline (e.g. 1st of next month)..."
                            value={form.message}
                            onChange={(e) => handleChange("message", e.target.value)}
                            className="pl-10 font-body min-h-[110px]"
                          />
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-card border border-border text-xs space-y-1 text-muted-foreground">
                        <div className="font-semibold text-foreground">Submission Summary:</div>
                        <div>Name: {form.name || "—"}</div>
                        <div>Phone: {form.phone || "—"}</div>
                        <div>Category: {form.property_type || "Any"}</div>
                        <div>Location: {form.location || "Any across Rajkot"}</div>
                        <div>Budget: {form.budget || "Flexible"}</div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Step Navigation Buttons */}
              <div className="flex items-center justify-between pt-2">
                {step > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep((s) => s - 1)}
                    className="h-11 px-5"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
                  </Button>
                ) : (
                  <div />
                )}

                {step < 3 ? (
                  <Button
                    type="button"
                    onClick={handleNextStep}
                    className="h-11 px-6 bg-accent text-accent-foreground font-semibold"
                  >
                    Continue <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-11 px-8 bg-accent text-accent-foreground font-semibold shadow-md"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {loading ? "Submitting Inquiry..." : "Confirm & Submit Inquiry"}
                  </Button>
                )}
              </div>
            </form>
          </div>
        )}
      </div>

      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default Inquiry;
