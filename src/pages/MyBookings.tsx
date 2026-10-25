import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  Clock,
  MapPin,
  CalendarPlus,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Building2,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import WhatsAppButton from "@/components/WhatsAppButton";
import { supabaseQuery } from "@/lib/supabase-query";
import { db } from "@/integrations/firebase/client";
import {
  collection,
  query as fsQuery,
  where as fsWhere,
  orderBy as fsOrderBy,
  getDocs as fsGetDocs,
} from "firebase/firestore";
import { generateGoogleCalendarUrl } from "@/lib/calendar";
import { motion } from "framer-motion";

const statusConfig: Record<
  string,
  { badgeClass: string; icon: any; label: string; bannerClass: string; message: string }
> = {
  pending: {
    badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-300 dark:border-amber-800",
    icon: Clock,
    label: "Pending Confirmation",
    bannerClass: "bg-amber-50/80 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/50",
    message: "A TO Z coordinator is reviewing property keys and broker schedule. You will receive an update shortly.",
  },
  confirmed: {
    badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
    icon: CheckCircle2,
    label: "Visit Confirmed",
    bannerClass: "bg-emerald-50/80 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50",
    message: "Your visit slot is locked! Our representative will meet you at the property location.",
  },
  completed: {
    badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border-blue-300 dark:border-blue-800",
    icon: Sparkles,
    label: "Visit Completed",
    bannerClass: "bg-blue-50/80 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-900/50",
    message: "Site visit completed. Interested in securing token or finalizing lease terms? Contact us directly.",
  },
  cancelled: {
    badgeClass: "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border-rose-300 dark:border-rose-800",
    icon: AlertCircle,
    label: "Cancelled",
    bannerClass: "bg-rose-50/80 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-900/50",
    message: "This site visit was cancelled. You may rebook anytime at your preferred time slot.",
  },
};

const MyBookings = () => {
  const { user, isAdmin } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (db) {
        let bsnap;
        try {
          const bq = fsQuery(
            collection(db, "bookings"),
            fsWhere("user_id", "==", user.id),
            fsOrderBy("createdAt", "desc")
          );
          bsnap = await fsGetDocs(bq);
        } catch (e: any) {
          console.warn("Bookings query fallback to simple query:", e?.message || e);
          const simpleQ = fsQuery(collection(db, "bookings"), fsWhere("user_id", "==", user.id));
          bsnap = await fsGetDocs(simpleQ);
        }

        const bk: any[] = [];
        const propIds = new Set<string>();
        bsnap.forEach((docSnap) => {
          const d = docSnap.data();
          bk.push({ id: docSnap.id, ...d });
          (d.property_ids || []).forEach((pid: string) => propIds.add(pid));
        });

        bk.sort((a, b) => {
          const ta = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate().getTime() : a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tb = b.createdAt && b.createdAt.toDate ? b.createdAt.toDate().getTime() : b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tb - ta;
        });

        const props: any[] = [];
        if (propIds.size > 0) {
          await Promise.all(
            Array.from(propIds).map(async (pid) => {
              try {
                const pdoc = await fsGetDocs(fsQuery(collection(db, "properties"), fsWhere("__name__", "==", pid)));
                pdoc.forEach((pd) => props.push({ id: pd.id, ...(pd.data() as any) }));
              } catch {
                // ignore individual failure
              }
            })
          );
        } else {
          try {
            const allPropsSnap = await fsGetDocs(fsQuery(collection(db, "properties")));
            allPropsSnap.forEach((pd) => props.push({ id: pd.id, ...(pd.data() as any) }));
          } catch {
            // ignore
          }
        }
        setBookings(bk || []);
        setProperties(props || []);
      } else {
        const [bookingsRes, propsRes] = await Promise.all([
          supabaseQuery({
            table: "bookings",
            filters: { user_id: `eq.${user.id}` },
            order: { column: "created_at", ascending: false },
          }),
          supabaseQuery({ table: "properties", select: "id,title" }),
        ]);
        setBookings(bookingsRes.data || []);
        setProperties(propsRes.data || []);
      }
      setError(null);
    } catch (err: any) {
      console.error("Failed to load bookings:", err);
      setError(err?.message || String(err));
      setBookings([]);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user, fetchData]);

  const getPropertyTitle = (id: string) => {
    return properties.find((p) => p.id === id)?.title || "Property Listing";
  };

  const getPropertyLocation = (id: string) => {
    return properties.find((p) => p.id === id)?.location || "Rajkot, Gujarat";
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 py-10 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Tenant Activity Portal</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground tracking-tight">
                My Booked <span className="text-accent">Site Visits</span>
              </h1>
              <p className="text-sm text-muted-foreground font-body mt-1">
                Real-time appointment schedule, verification status, and accompanied visit passes.
              </p>
            </div>

            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchData()}
                disabled={loading}
                className="self-start sm:self-auto h-10 px-4 text-xs font-semibold"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh Status
              </Button>
            )}
          </div>

          {/* Not signed in state */}
          {!user ? (
            <div className="bg-card rounded-3xl border border-border shadow-lg p-8 sm:p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Building2 className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-display font-bold text-foreground">Sign In to View Your Bookings</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Please log in with the account you used during visit reservation to view your upcoming appointments and key inspections.
              </p>
              <div className="pt-2">
                <Link to="/auth">
                  <Button className="h-11 px-8 bg-primary text-primary-foreground font-semibold">
                    Sign In to Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          ) : loading ? (
            /* Loading Skeletons */
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card rounded-2xl border border-border p-6 animate-pulse space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="h-5 w-40 bg-muted rounded-md" />
                    <div className="h-6 w-24 bg-muted rounded-full" />
                  </div>
                  <div className="h-10 w-full bg-muted/60 rounded-xl" />
                  <div className="h-4 w-3/4 bg-muted rounded-md" />
                </div>
              ))}
            </div>
          ) : error ? (
            /* Error State */
            <div className="bg-card rounded-3xl border border-destructive/30 p-8 text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
              <h2 className="text-lg font-bold text-foreground">Could not load bookings</h2>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button onClick={() => fetchData()} className="h-10 px-6">
                Try Again
              </Button>
            </div>
          ) : bookings.length === 0 ? (
            /* Empty State */
            <div className="bg-card rounded-3xl border border-border shadow-sm p-8 sm:p-16 text-center space-y-5">
              <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <Calendar className="h-10 w-10 stroke-[1.5]" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-display font-bold text-foreground">
                  No Site Visits Scheduled Yet
                </h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
                  You haven&apos;t booked any in-person property tours. Explore verified rental homes, shops, and plots across Rajkot and schedule your first visit!
                </p>
              </div>
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link to="/properties">
                  <Button className="h-11 px-8 bg-accent text-accent-foreground font-semibold shadow-md">
                    Explore Properties
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
                <Link to="/inquiry">
                  <Button variant="outline" className="h-11 px-6">
                    Submit General Inquiry
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            /* Bookings List */
            <div className="space-y-5">
              {bookings.map((booking, idx) => {
                const cfg = statusConfig[booking.status] || statusConfig.pending;
                const StatusIcon = cfg.icon;

                return (
                  <motion.div
                    key={booking.id || idx}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-card rounded-3xl border border-border shadow-sm hover:shadow-md transition-shadow p-6 sm:p-7 space-y-4"
                  >
                    {/* Top Row: Date, Slot & Status */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                        <div className="inline-flex items-center gap-1.5 font-semibold text-foreground px-3 py-1 rounded-lg bg-muted">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span>{booking.visit_date}</span>
                        </div>
                        <div className="inline-flex items-center gap-1.5 font-semibold text-foreground px-3 py-1 rounded-lg bg-muted">
                          <Clock className="h-4 w-4 text-primary" />
                          <span>{booking.time_slot}</span>
                        </div>
                      </div>

                      <Badge
                        variant="outline"
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${cfg.badgeClass}`}
                      >
                        <StatusIcon className="h-3.5 w-3.5" />
                        <span>{cfg.label}</span>
                      </Badge>
                    </div>

                    {/* Status Message Banner */}
                    <div
                      className={`text-xs font-medium p-3.5 rounded-2xl border flex items-start gap-2.5 ${cfg.bannerClass}`}
                    >
                      <StatusIcon className="h-4 w-4 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">{cfg.message}</p>
                    </div>

                    {/* Properties bundled in this visit */}
                    <div className="space-y-2 pt-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                        Inspected Properties ({booking.property_ids?.length || 1})
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {booking.property_ids && booking.property_ids.length > 0 ? (
                          booking.property_ids.map((pid: string) => (
                            <div
                              key={pid}
                              className="p-3 rounded-xl bg-background border border-border flex items-start justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <h4 className="text-xs sm:text-sm font-semibold text-foreground truncate">
                                  {getPropertyTitle(pid)}
                                </h4>
                                <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <MapPin className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{getPropertyLocation(pid)}</span>
                                </p>
                              </div>
                              <Link
                                to={`/property/${pid}`}
                                className="text-primary hover:text-primary/80 shrink-0 p-1 rounded-md hover:bg-muted"
                                title="View details"
                              >
                                <Eye className="h-4 w-4" />
                              </Link>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 rounded-xl bg-background border border-border text-xs text-muted-foreground">
                            General Real Estate Consultation Visit
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Meta & Calendar CTA */}
                    <div className="pt-2 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">
                          Visit Fee: <strong className="text-foreground">₹{booking.charge || 200}</strong>
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground">
                          Payment:{" "}
                          <strong className="text-foreground capitalize">
                            {booking.payment?.method === "online" ? "Online UPI" : "Cash on Site"}
                          </strong>
                        </span>
                      </div>

                      {booking.status === "confirmed" && isAdmin && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 px-3 text-xs font-semibold text-primary border-primary/30 hover:bg-primary/5 self-start sm:self-auto"
                          onClick={() => {
                            const url = generateGoogleCalendarUrl({
                              title: `Property Visit - A TO Z Properties`,
                              date: booking.visit_date,
                              timeSlot: booking.time_slot,
                              description: `Site visit with A TO Z Properties\nProperties: ${booking.property_ids
                                ?.map((pid: string) => getPropertyTitle(pid))
                                .join(", ")}`,
                              location: "Rajkot, Gujarat",
                            });
                            window.open(url, "_blank");
                          }}
                        >
                          <CalendarPlus className="h-3.5 w-3.5 mr-1.5" />
                          Add to Google Calendar
                        </Button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default MyBookings;
