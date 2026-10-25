import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  Building,
  Users,
  Phone,
  Calendar,
  MessageSquare,
  CheckCircle,
  XCircle,
  CalendarPlus,
  ShieldCheck,
  Filter,
  RotateCcw,
  Bell,
  Sparkles,
  Search,
  Check,
  ChevronRight,
  ExternalLink,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ContactMenu from "@/components/ContactMenu";
import { onForegroundMessage, registerAdminFcmToken } from "@/integrations/firebase/fcm";
import { auth, db } from "@/integrations/firebase/client";
import {
  doc as fsDoc,
  deleteDoc,
  updateDoc,
  collection,
  query as fsQuery,
  orderBy as fsOrderBy,
  onSnapshot,
  getDocs as fsGetDocs,
  writeBatch,
} from "firebase/firestore";
import { formatPrice } from "@/lib/data";
import { generateGoogleCalendarUrl } from "@/lib/calendar";
import { useAuth } from "@/hooks/useAuth";
import DashboardSkeleton from "@/components/DashboardSkeleton";
import { motion } from "framer-motion";

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 dark:border-amber-800",
  confirmed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-300 dark:border-blue-800",
  cancelled: "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-300 dark:border-rose-800",
  new: "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-300 dark:border-sky-800",
  contacted: "bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-300 dark:border-purple-800",
  closed: "bg-muted text-muted-foreground border border-border",
};

const Dashboard = () => {
  const { toast } = useToast();
  const { isAdmin, user } = useAuth();
  const [properties, setProperties] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [userRoles, setUserRoles] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterProperty, setFilterProperty] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).Notification && (window as any).Notification.requestPermission) {
      (async () => {
        try {
          if ((await (window as any).Notification.requestPermission()) === "granted") {
            await registerAdminFcmToken();
          }
        } catch (e) {
          console.warn("FCM register failed", e);
        }
      })();
    }

    const off = onForegroundMessage((payload: any) => {
      try {
        toast({ title: payload?.notification?.title || "Notification", description: payload?.notification?.body });
      } catch (e) {
        console.warn("Foreground message handler error", e);
      }
    });

    if (!db) {
      toast({
        title: "Configuration error",
        description: "Firebase not configured. Set VITE_FIREBASE_* env vars.",
        variant: "destructive",
      });
      return;
    }

    const initialLoadStatus = {
      properties: false,
      bookings: false,
      inquiries: false,
      notifications: false,
      roles: false,
    };

    const checkAllLoaded = () => {
      if (Object.values(initialLoadStatus).every(Boolean)) {
        setTimeout(() => setLoading(false), 200);
      }
    };

    const propsQ = fsQuery(collection(db, "properties"), fsOrderBy("createdAt", "desc"));
    const bookingsQ = fsQuery(collection(db, "bookings"), fsOrderBy("createdAt", "desc"));
    const inquiriesQ = fsQuery(collection(db, "inquiries"), fsOrderBy("createdAt", "desc"));

    const unsubProps = onSnapshot(
      propsQ,
      (snap) => {
        const out: any[] = [];
        snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
        setProperties(out);
        if (!initialLoadStatus.properties) {
          initialLoadStatus.properties = true;
          checkAllLoaded();
        }
      },
      (err) => {
        console.error("Properties listener error:", err);
        if (!initialLoadStatus.properties) {
          initialLoadStatus.properties = true;
          checkAllLoaded();
        }
      }
    );

    const unsubBookings = onSnapshot(
      bookingsQ,
      (snap) => {
        const out: any[] = [];
        snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
        setBookings(out);
        if (!initialLoadStatus.bookings) {
          initialLoadStatus.bookings = true;
          checkAllLoaded();
        }
      },
      (err) => {
        console.error("Bookings listener error:", err);
        if (!initialLoadStatus.bookings) {
          initialLoadStatus.bookings = true;
          checkAllLoaded();
        }
      }
    );

    const unsubInquiries = onSnapshot(
      inquiriesQ,
      (snap) => {
        const out: any[] = [];
        snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
        setInquiries(out);
        if (!initialLoadStatus.inquiries) {
          initialLoadStatus.inquiries = true;
          checkAllLoaded();
        }
      },
      (err) => {
        console.error("Inquiries listener error:", err);
        if (!initialLoadStatus.inquiries) {
          initialLoadStatus.inquiries = true;
          checkAllLoaded();
        }
      }
    );

    const notifsQ = fsQuery(collection(db, "notifications"), fsOrderBy("createdAt", "desc"));
    const unsubNotifs = onSnapshot(
      notifsQ,
      (snap) => {
        const out: any[] = [];
        snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
        setNotifications(out);
        if (!initialLoadStatus.notifications) {
          initialLoadStatus.notifications = true;
          checkAllLoaded();
        }
      },
      (err) => {
        console.error("Notifications listener error:", err);
        if (!initialLoadStatus.notifications) {
          initialLoadStatus.notifications = true;
          checkAllLoaded();
        }
      }
    );

    const rolesQ = fsQuery(collection(db, "roles"));
    const unsubRoles = onSnapshot(
      rolesQ,
      (snap) => {
        const out: any[] = [];
        snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
        setUserRoles(out);
        if (!initialLoadStatus.roles) {
          initialLoadStatus.roles = true;
          checkAllLoaded();
        }
      },
      (err) => {
        console.error("Roles listener error:", err);
        if (!initialLoadStatus.roles) {
          initialLoadStatus.roles = true;
          checkAllLoaded();
        }
      }
    );

    return () => {
      unsubProps();
      unsubBookings();
      unsubInquiries();
      unsubNotifs();
      unsubRoles();
      if (typeof off === "function") off();
    };
  }, [toast]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this property?")) return;
    try {
      await deleteDoc(fsDoc(db, "properties", id));
      toast({ title: "Property removed from database" });
    } catch (err: any) {
      toast({ title: "Error", description: String(err?.message || err), variant: "destructive" });
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateDoc(fsDoc(db, "bookings", id), { status });
    } catch (err: any) {
      toast({ title: "Error", description: String(err?.message || err), variant: "destructive" });
      return;
    }

    if (status === "confirmed") {
      const booking = bookings.find((b) => b.id === id);
      if (booking) {
        const calUrl = generateGoogleCalendarUrl({
          title: `Site Visit - ${booking.name}`,
          date: booking.visit_date,
          timeSlot: booking.time_slot,
          description: `Customer: ${booking.name}\nPhone: ${booking.phone}\nEmail: ${booking.email || "N/A"}\nProperties: ${getBookedPropertyNames(
            booking.property_ids || []
          )}`,
          location: "Rajkot, Gujarat",
        });
        if (calUrl) {
          window.open(calUrl, "_blank");
        }
      }
      toast({
        title: "Visit Confirmed",
        description: "Customer can view their confirmation status now. Google Calendar event opened.",
      });
    } else {
      toast({ title: `Booking status updated to ${status}` });
    }
  };

  const handleInquiryStatus = async (id: string, status: string) => {
    try {
      await updateDoc(fsDoc(db, "inquiries", id), { status });
      toast({ title: `Inquiry marked as ${status}` });
    } catch (err: any) {
      toast({ title: "Error", description: String(err?.message || err), variant: "destructive" });
    }
  };

  const handleDeleteInquiry = async (id: string) => {
    if (!confirm("Delete this inquiry record?")) return;
    try {
      await deleteDoc(fsDoc(db, "inquiries", id));
      toast({ title: "Inquiry deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: String(err?.message || err), variant: "destructive" });
    }
  };

  const handleDeleteBooking = async (id: string) => {
    if (!confirm("Delete this visit booking record?")) return;
    try {
      await deleteDoc(fsDoc(db, "bookings", id));
      toast({ title: "Booking deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: String(err?.message || err), variant: "destructive" });
    }
  };

  const handleRoleChange = async (id: string, role: string) => {
    if (!db) {
      toast({ title: "Error", description: "Firebase not configured", variant: "destructive" });
      return;
    }
    if (!isAdmin) {
      toast({ title: "Not allowed", description: "Only admins can change roles", variant: "destructive" });
      return;
    }
    try {
      await updateDoc(fsDoc(db, "roles", id), { role });
      toast({ title: "User role updated successfully" });
    } catch (err: any) {
      toast({ title: "Error", description: String(err?.message || err), variant: "destructive" });
    }
  };

  const handleRemoveUser = async (id: string) => {
    if (!confirm("Remove this user? This will permanently delete their account.")) return;
    if (!db) {
      toast({ title: "Error", description: "Firebase not configured", variant: "destructive" });
      return;
    }
    if (!isAdmin) {
      toast({ title: "Not allowed", description: "Only admins can remove users", variant: "destructive" });
      return;
    }
    try {
      const token = await auth?.currentUser?.getIdToken();
      if (!token) throw new Error("Missing auth token");
      const fnUrl = import.meta.env.VITE_FUNCTIONS_URL || "/api";
      const resp = await fetch(`${fnUrl.replace(/\/$/, "")}/deleteUser`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ uid: id }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data?.ok) throw new Error(data?.error || "Delete failed");
      toast({ title: "User account deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: String(err?.message || err), variant: "destructive" });
    }
  };

  const pendingBookings = bookings.filter((b) => b.status === "pending").length;
  const newInquiries = inquiries.filter((i) => i.status === "new").length;

  const filteredBookings = bookings.filter((b) => {
    if (filterStatus !== "all" && b.status !== filterStatus) return false;
    if (filterProperty !== "all" && (!b.property_ids || !b.property_ids.includes(filterProperty))) return false;
    if (filterDate && b.visit_date !== filterDate) return false;
    return true;
  });

  const getBookedPropertyNames = (propertyIds: string[] = []) => {
    if (!Array.isArray(propertyIds) || propertyIds.length === 0) return "No properties";
    return propertyIds.map((pid) => properties.find((p) => p.id === pid)?.title || pid).join(", ");
  };

  const renderBookedPropertiesList = (propertyIds: string[] = []) => {
    if (!Array.isArray(propertyIds) || propertyIds.length === 0) {
      return <span className="text-xs text-muted-foreground italic">General Site Visit (No property selected)</span>;
    }

    return (
      <div className="space-y-1.5 py-1">
        {propertyIds.map((pid) => {
          const prop = properties.find((p) => p.id === pid);
          const title = prop?.title || "Property ID: " + pid.slice(0, 8);
          const loc = prop?.location || prop?.address || "Rajkot, Gujarat";
          const image = prop?.photos?.[0] || prop?.images?.[0];

          return (
            <div
              key={pid}
              className="flex items-center justify-between gap-2 p-2 rounded-xl bg-background border border-border shadow-xs hover:border-primary/40 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                {image ? (
                  <img
                    src={image}
                    alt={title}
                    className="w-8 h-8 rounded-lg object-cover shrink-0 border border-border"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Building className="h-4 w-4" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-semibold text-xs text-foreground truncate max-w-[140px] sm:max-w-[200px]" title={title}>
                    {title}
                  </div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
                    <MapPin className="h-2.5 w-2.5 shrink-0" />
                    <span className="truncate">{loc}</span>
                  </div>
                </div>
              </div>
              <Link
                to={`/property/${pid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 px-2 py-1 rounded-lg bg-primary/10 hover:bg-primary hover:text-primary-foreground text-primary transition-colors flex items-center gap-1 text-[11px] font-medium"
                title="View Property in New Tab"
              >
                <Eye className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">View</span>
              </Link>
            </div>
          );
        })}
      </div>
    );
  };

  const getInquiryMessage = (inq: any) => {
    return inq?.message || inq?.requirement || inq?.description || "";
  };

  const renderInquiryDetailsBody = (inq: any, inquiryMessage: string) => (
    <div className="grid gap-4 text-sm pt-2 overflow-y-auto max-h-[70vh] pr-1">
      <div className="p-3.5 rounded-xl bg-muted/50 border border-border">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Inquiry Requirement</div>
        <div className="text-foreground leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto pr-1">
          {inquiryMessage || "No special notes provided."}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3 rounded-xl border border-border bg-card">
          <div className="text-[11px] text-muted-foreground">Contact Phone</div>
          <div className="font-semibold text-foreground text-sm">{inq.phone || "-"}</div>
        </div>
        <div className="p-3 rounded-xl border border-border bg-card">
          <div className="text-[11px] text-muted-foreground">Inquiry Status</div>
          <div className="font-semibold text-foreground capitalize text-sm">{inq.status || "-"}</div>
        </div>
        <div className="p-3 rounded-xl border border-border bg-card">
          <div className="text-[11px] text-muted-foreground">Preferred Location</div>
          <div className="font-semibold text-foreground text-sm">{inq.location || "-"}</div>
        </div>
        <div className="p-3 rounded-xl border border-border bg-card">
          <div className="text-[11px] text-muted-foreground">Target Budget</div>
          <div className="font-semibold text-foreground text-sm">{inq.budget || "-"}</div>
        </div>
        <div className="p-3 rounded-xl border border-border bg-card">
          <div className="text-[11px] text-muted-foreground">Property Type</div>
          <div className="font-semibold text-foreground text-sm">{inq.property_type || "-"}</div>
        </div>
        <div className="p-3 rounded-xl border border-border bg-card">
          <div className="text-[11px] text-muted-foreground">Caste / Community</div>
          <div className="font-semibold text-foreground text-sm">{inq.caste || "-"}</div>
        </div>
        <div className="p-3 rounded-xl border border-border bg-card sm:col-span-2">
          <div className="text-[11px] text-muted-foreground">Received On</div>
          <div className="font-medium text-foreground text-xs">{formatTimestamp(inq.createdAt)}</div>
        </div>
      </div>
    </div>
  );

  const getPaymentLabel = (booking: any) => {
    const method = booking?.payment?.method || "-";
    const status = booking?.payment?.status || "-";
    const amount = booking?.payment?.amount ?? booking?.charge ?? null;
    const methodLabel = method === "online" ? "UPI Online" : method === "cash_upi_on_visit" ? "Cash at Site" : method;
    const statusLabel = typeof status === "string" ? status : String(status);
    const amountLabel = typeof amount === "number" ? formatPrice(amount) : "-";
    return `${methodLabel} • ${statusLabel} • ${amountLabel}`;
  };

  const formatTimestamp = (ts: any) => {
    if (!ts) return "-";
    const date = typeof ts?.seconds === "number" ? new Date(ts.seconds * 1000) : new Date(ts);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden">
        <Navbar />
        <DashboardSkeleton />
        <Footer />
      </div>
    );
  }

  const statMetrics = [
    { label: "Total Properties", value: properties.length, icon: Building, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40" },
    { label: "Total Bookings", value: bookings.length, icon: Users, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40" },
    { label: "Pending Visits", value: pendingBookings, icon: Calendar, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40" },
    { label: "New Inquiries", value: newInquiries, icon: MessageSquare, color: "text-sky-600 bg-sky-50 dark:bg-sky-950/40" },
    { label: "Unread Alerts", value: notifications.filter((n) => !n.read).length, icon: Bell, color: "text-purple-600 bg-purple-50 dark:bg-purple-950/40" },
    { label: "Ready to Move", value: properties.filter((p) => p.status === "available" || p.status === "For Rent").length, icon: Sparkles, color: "text-accent bg-accent/10" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Admin Operations Center</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground tracking-tight">
                Brokerage <span className="text-accent">Dashboard</span>
              </h1>
              <p className="text-sm text-muted-foreground font-body mt-1">
                Oversee rental inventory, site visit inspections, buyer inquiries, and staff permissions.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link to="/add-property">
                <Button className="h-11 px-6 bg-accent text-accent-foreground font-semibold shadow-md">
                  <Plus className="h-4 w-4 mr-2" /> Add Property
                </Button>
              </Link>
              <Button
                size="sm"
                variant="outline"
                className="h-11 px-4 text-xs font-medium"
                onClick={async () => {
                  if (!confirm("Delete all notifications? This cannot be undone.")) return;
                  if (!db) {
                    toast({ title: "Error", description: "Firebase not configured", variant: "destructive" });
                    return;
                  }
                  try {
                    const q = fsQuery(collection(db, "notifications"), fsOrderBy("createdAt", "desc"));
                    const snap = await fsGetDocs(q);
                    const batch = writeBatch(db);
                    snap.forEach((d) => batch.delete(fsDoc(db, "notifications", d.id)));
                    await batch.commit();
                    toast({ title: "Notifications cleared" });
                  } catch (e) {
                    console.error("Failed to clear notifications", e);
                    toast({ title: "Error", description: String(e), variant: "destructive" });
                  }
                }}
              >
                Clear Notifications
              </Button>
            </div>
          </div>

          {/* Metric Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4 mb-8">
            {statMetrics.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-card rounded-2xl border border-border p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.color}`}>
                    <s.icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-display font-bold text-foreground">{s.value}</div>
                <div className="text-xs font-medium text-muted-foreground mt-0.5 truncate">{s.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Main Tabs */}
          <Tabs defaultValue="bookings" className="space-y-6">
            <div className="bg-card rounded-2xl border border-border p-2 shadow-sm">
              <TabsList className="bg-transparent w-full flex-wrap justify-start h-auto gap-2 p-0">
                <TabsTrigger
                  value="bookings"
                  className="rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Bookings ({bookings.length})
                  {pendingBookings > 0 && (
                    <span className="ml-2 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full px-2 py-0.5">
                      {pendingBookings}
                    </span>
                  )}
                </TabsTrigger>

                <TabsTrigger
                  value="inquiries"
                  className="rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Inquiries ({inquiries.length})
                  {newInquiries > 0 && (
                    <span className="ml-2 bg-sky-600 text-white text-[10px] font-bold rounded-full px-2 py-0.5">
                      {newInquiries}
                    </span>
                  )}
                </TabsTrigger>

                <TabsTrigger
                  value="properties"
                  className="rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                >
                  <Building className="h-4 w-4 mr-2" />
                  Properties ({properties.length})
                </TabsTrigger>

                <TabsTrigger
                  value="users"
                  className="rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Users ({userRoles.length})
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB 1: BOOKINGS */}
            <TabsContent value="bookings" className="space-y-4">
              <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
                {/* Filter Toolbar */}
                <div className="p-4 sm:p-5 border-b border-border/80 bg-muted/30 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Filters:</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 flex-1">
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="h-10 px-3 rounded-xl border border-border bg-background text-xs font-medium focus:ring-1 focus:ring-primary"
                    >
                      <option value="all">All Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>

                    <select
                      value={filterProperty}
                      onChange={(e) => setFilterProperty(e.target.value)}
                      className="h-10 px-3 rounded-xl border border-border bg-background text-xs font-medium max-w-[220px] truncate focus:ring-1 focus:ring-primary"
                    >
                      <option value="all">All Properties</option>
                      {properties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </select>

                    <input
                      type="date"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      className="h-10 px-3 rounded-xl border border-border bg-background text-xs font-medium focus:ring-1 focus:ring-primary"
                    />

                    {(filterStatus !== "all" || filterProperty !== "all" || filterDate) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setFilterStatus("all");
                          setFilterProperty("all");
                          setFilterDate("");
                        }}
                        className="h-10 text-xs font-semibold text-muted-foreground hover:text-foreground"
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        Reset
                      </Button>
                    )}
                  </div>
                </div>

                {/* Mobile Bookings List */}
                {isMobile ? (
                  <div className="p-4 space-y-3">
                    {filteredBookings.map((b) => (
                      <div
                        key={b.id}
                        className={`rounded-2xl border border-border p-4 space-y-3 bg-card shadow-sm ${
                          b.status === "pending" ? "ring-1 ring-amber-400/40" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold text-foreground text-sm flex items-center gap-1.5 flex-wrap">
                              <span>{b.name}</span>
                              {b.user_id ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                  Registered
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                                  New Guest
                                </span>
                              )}
                            </div>
                            {b.email && <div className="text-xs text-muted-foreground">{b.email}</div>}
                          </div>
                          <Badge className={`${statusColors[b.status] || ""} text-xs font-semibold`}>{b.status}</Badge>
                        </div>

                        <div className="grid gap-1.5 text-xs text-muted-foreground bg-muted/40 p-3 rounded-xl">
                          <div>
                            <span className="font-medium text-foreground">Schedule:</span> {b.visit_date} • {b.time_slot}
                          </div>
                          <div>
                            <span className="font-medium text-foreground">Payment:</span> {getPaymentLabel(b)}
                          </div>
                        </div>

                        {/* Property Cards in visit (Similar to MyBookings) */}
                        <div className="pt-1">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                            Booked Properties ({b.property_ids?.length || 0})
                          </span>
                          {renderBookedPropertiesList(b.property_ids || [])}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border">
                          <ContactMenu phone={b.phone} className="inline-block">
                            <Button variant="outline" size="sm" className="h-9 px-3 text-xs">
                              <Phone className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                              Call
                            </Button>
                          </ContactMenu>

                          {b.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleStatusChange(b.id, "confirmed")}
                                className="h-9 px-3 text-xs bg-emerald-600 text-white font-semibold"
                              >
                                <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusChange(b.id, "cancelled")}
                                className="h-9 px-3 text-xs text-destructive hover:bg-destructive/10"
                              >
                                <XCircle className="h-3.5 w-3.5 mr-1.5" /> Cancel
                              </Button>
                            </>
                          )}

                          {b.status === "confirmed" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const url = generateGoogleCalendarUrl({
                                    title: `Site Visit - ${b.name}`,
                                    date: b.visit_date,
                                    timeSlot: b.time_slot,
                                    description: `Customer: ${b.name}\nPhone: ${b.phone}\nProperties: ${getBookedPropertyNames(
                                      b.property_ids || []
                                    )}`,
                                    location: "Rajkot, Gujarat",
                                  });
                                  window.open(url, "_blank");
                                }}
                                className="h-9 px-3 text-xs text-primary"
                              >
                                <CalendarPlus className="h-3.5 w-3.5 mr-1.5" /> Calendar
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleStatusChange(b.id, "completed")}
                                className="h-9 px-3 text-xs bg-blue-600 text-white"
                              >
                                Complete
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusChange(b.id, "cancelled")}
                                className="h-9 px-3 text-xs text-destructive"
                              >
                                Cancel
                              </Button>
                            </>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteBooking(b.id)}
                            className="h-9 px-2 text-destructive hover:bg-destructive/10 ml-auto"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {filteredBookings.length === 0 && (
                      <div className="p-8 text-center text-muted-foreground text-sm">
                        No bookings matching current filter criteria.
                      </div>
                    )}
                  </div>
                ) : (
                  /* Desktop Bookings Table */
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border">
                        <tr>
                          <th className="text-left p-4">Visitor</th>
                          <th className="text-left p-4">Contact</th>
                          <th className="text-left p-4">Date</th>
                          <th className="text-left p-4">Time Slot</th>
                          <th className="text-left p-4">Payment</th>
                          <th className="text-left p-4">Booked Properties</th>
                          <th className="text-left p-4">Status</th>
                          <th className="text-right p-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {filteredBookings.map((b) => (
                          <tr
                            key={b.id}
                            className={`hover:bg-muted/30 transition-colors ${
                              b.status === "pending" ? "bg-amber-50/30 dark:bg-amber-950/10" : ""
                            }`}
                          >
                            <td className="p-4">
                              <div className="font-semibold text-foreground flex items-center gap-1.5 flex-wrap">
                                <span>{b.name}</span>
                                {b.user_id ? (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                    Registered
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                                    New Guest
                                  </span>
                                )}
                              </div>
                              {b.email && <div className="text-xs font-normal text-muted-foreground">{b.email}</div>}
                            </td>
                            <td className="p-4">
                              <ContactMenu phone={b.phone} className="inline-block">
                                <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs">
                                  <Phone className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                                  <span>{b.phone}</span>
                                </Button>
                              </ContactMenu>
                            </td>
                            <td className="p-4 text-xs font-medium text-foreground">{b.visit_date}</td>
                            <td className="p-4 text-xs font-medium text-foreground">{b.time_slot}</td>
                            <td className="p-4 text-xs text-muted-foreground">{getPaymentLabel(b)}</td>
                            <td className="p-4">
                              <div className="min-w-[220px] max-w-[320px]">
                                {renderBookedPropertiesList(b.property_ids || [])}
                              </div>
                            </td>
                            <td className="p-4">
                              <Badge className={`${statusColors[b.status] || ""} text-xs font-semibold`}>
                                {b.status}
                              </Badge>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {b.status === "pending" && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => handleStatusChange(b.id, "confirmed")}
                                      className="h-8 px-3 text-xs bg-emerald-600 text-white font-semibold shadow-sm"
                                    >
                                      <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleStatusChange(b.id, "cancelled")}
                                      className="h-8 px-2 text-destructive hover:bg-destructive/10"
                                      title="Cancel Booking"
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}

                                {b.status === "confirmed" && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        const url = generateGoogleCalendarUrl({
                                          title: `Site Visit - ${b.name}`,
                                          date: b.visit_date,
                                          timeSlot: b.time_slot,
                                          description: `Customer: ${b.name}\nPhone: ${b.phone}\nProperties: ${getBookedPropertyNames(
                                            b.property_ids || []
                                          )}`,
                                          location: "Rajkot, Gujarat",
                                        });
                                        window.open(url, "_blank");
                                      }}
                                      className="h-8 px-2.5 text-xs text-primary"
                                      title="Google Calendar"
                                    >
                                      <CalendarPlus className="h-3.5 w-3.5 mr-1" /> Calendar
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleStatusChange(b.id, "completed")}
                                      className="h-8 px-2.5 text-xs text-blue-600 hover:bg-blue-50"
                                    >
                                      Complete
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleStatusChange(b.id, "cancelled")}
                                      className="h-8 px-2 text-destructive hover:bg-destructive/10"
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}

                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteBooking(b.id)}
                                  className="h-8 px-2 text-destructive hover:bg-destructive/10"
                                  title="Delete record"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredBookings.length === 0 && (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-muted-foreground text-sm">
                              No bookings found matching current filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB 2: INQUIRIES */}
            <TabsContent value="inquiries" className="space-y-4">
              <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
                {isMobile ? (
                  <div className="p-4 space-y-3">
                    {inquiries.map((inq: any) => {
                      const inquiryMessage = getInquiryMessage(inq);
                      return (
                        <div
                          key={inq.id}
                          className={`rounded-2xl border border-border p-4 space-y-3 bg-card shadow-sm ${
                            inq.status === "new" ? "ring-1 ring-sky-400/40" : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-semibold text-foreground text-sm">{inq.name}</div>
                              <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                {inquiryMessage || "No message"}
                              </div>
                            </div>
                            <Badge className={`${statusColors[inq.status] || ""} text-xs font-semibold`}>
                              {inq.status}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground bg-muted/40 p-3 rounded-xl">
                            <div>Loc: {inq.location || "-"}</div>
                            <div>Budget: {inq.budget || "-"}</div>
                            <div>Type: {inq.property_type || "-"}</div>
                            <div>Caste: {inq.caste || "-"}</div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border">
                            <ContactMenu phone={inq.phone} className="inline-block">
                              <Button variant="outline" size="sm" className="h-9 px-3 text-xs">
                                <Phone className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                                Call
                              </Button>
                            </ContactMenu>

                            <Drawer>
                              <DrawerTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-9 px-2">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DrawerTrigger>
                              <DrawerContent className="max-h-[90vh] flex flex-col">
                                <DrawerHeader className="shrink-0 border-b border-border">
                                  <DrawerTitle>Inquiry Details</DrawerTitle>
                                  <DrawerDescription>{inq.name || "-"}</DrawerDescription>
                                </DrawerHeader>
                                <div className="px-4 pb-8 overflow-y-auto flex-1">{renderInquiryDetailsBody(inq, inquiryMessage)}</div>
                              </DrawerContent>
                            </Drawer>

                            {inq.status === "new" && (
                              <Button
                                size="sm"
                                onClick={() => handleInquiryStatus(inq.id, "contacted")}
                                className="h-9 px-3 text-xs bg-purple-600 text-white font-semibold"
                              >
                                Mark Contacted
                              </Button>
                            )}

                            {inq.status === "contacted" && (
                              <Button
                                size="sm"
                                onClick={() => handleInquiryStatus(inq.id, "closed")}
                                className="h-9 px-3 text-xs bg-muted text-foreground"
                              >
                                Close
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteInquiry(inq.id)}
                              className="h-9 px-2 text-destructive hover:bg-destructive/10 ml-auto"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    {inquiries.length === 0 && (
                      <div className="p-8 text-center text-muted-foreground text-sm">No inquiries logged yet.</div>
                    )}
                  </div>
                ) : (
                  /* Desktop Inquiries Table */
                  <div className="overflow-x-auto max-h-[750px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border sticky top-0 z-10 backdrop-blur-md">
                        <tr>
                          <th className="text-left p-4">Inquirer</th>
                          <th className="text-left p-4">Requirement / Message</th>
                          <th className="text-left p-4">Phone</th>
                          <th className="text-left p-4">Details</th>
                          <th className="text-left p-4">Location</th>
                          <th className="text-left p-4">Budget</th>
                          <th className="text-left p-4">Type</th>
                          <th className="text-left p-4">Status</th>
                          <th className="text-right p-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {inquiries.map((inq: any) => {
                          const inquiryMessage = getInquiryMessage(inq);
                          return (
                            <tr
                              key={inq.id}
                              className={`hover:bg-muted/30 transition-colors ${
                                inq.status === "new" ? "bg-sky-50/30 dark:bg-sky-950/10" : ""
                              }`}
                            >
                              <td className="p-4 font-semibold text-foreground">{inq.name}</td>
                              <td className="p-4">
                                <div className="max-w-[240px] text-xs text-muted-foreground line-clamp-2">
                                  {inquiryMessage || "-"}
                                </div>
                              </td>
                              <td className="p-4">
                                <ContactMenu phone={inq.phone} className="inline-block">
                                  <Button variant="outline" size="sm" className="h-8 px-2 text-xs">
                                    <Phone className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                                    <span>{inq.phone}</span>
                                  </Button>
                                </ContactMenu>
                              </td>
                              <td className="p-4">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button size="sm" variant="ghost" className="h-8 px-2" title="Inspect Inquiry">
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-xl max-h-[85vh] flex flex-col overflow-hidden">
                                    <DialogHeader className="shrink-0 pb-2 border-b border-border">
                                      <DialogTitle>Inquiry Dossier</DialogTitle>
                                      <DialogDescription>{inq.name || "Prospect Client"}</DialogDescription>
                                    </DialogHeader>
                                    <div className="overflow-y-auto pr-1 flex-1 py-1">
                                      {renderInquiryDetailsBody(inq, inquiryMessage)}
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </td>
                              <td className="p-4 text-xs text-muted-foreground">{inq.location || "-"}</td>
                              <td className="p-4 text-xs font-semibold text-foreground">{inq.budget || "-"}</td>
                              <td className="p-4 text-xs text-muted-foreground">{inq.property_type || "-"}</td>
                              <td className="p-4">
                                <Badge className={`${statusColors[inq.status] || ""} text-xs font-semibold`}>
                                  {inq.status}
                                </Badge>
                              </td>
                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {inq.status === "new" && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleInquiryStatus(inq.id, "contacted")}
                                      className="h-8 px-3 text-xs bg-purple-600 text-white font-semibold"
                                    >
                                      Contacted
                                    </Button>
                                  )}
                                  {inq.status === "contacted" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleInquiryStatus(inq.id, "closed")}
                                      className="h-8 px-2.5 text-xs text-muted-foreground"
                                    >
                                      Close
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteInquiry(inq.id)}
                                    className="h-8 px-2 text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {inquiries.length === 0 && (
                          <tr>
                            <td colSpan={9} className="p-8 text-center text-muted-foreground text-sm">
                              No inquiries logged yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB 3: PROPERTIES */}
            <TabsContent value="properties" className="space-y-4">
              <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
                {isMobile ? (
                  <div className="p-4 space-y-3">
                    {properties.map((p) => (
                      <div key={p.id} className="rounded-2xl border border-border bg-card p-4 space-y-2 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold text-foreground text-sm">{p.title}</div>
                            <div className="text-xs text-muted-foreground">{p.location || "Palitana"}</div>
                          </div>
                          <Badge variant="outline" className="text-xs font-semibold">
                            {p.status || "For Rent"}
                          </Badge>
                        </div>
                        <div className="text-accent font-bold text-sm">{formatPrice(p.price)}</div>
                        <div className="flex items-center gap-2 pt-2 border-t border-border">
                          <Link to={`/property/${p.id}`}>
                            <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs">
                              <Eye className="h-3.5 w-3.5 mr-1" /> View
                            </Button>
                          </Link>
                          <Link to={`/edit-property/${p.id}`}>
                            <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs">
                              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(p.id)}
                            className="h-8 px-2 text-destructive hover:bg-destructive/10 ml-auto"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {properties.length === 0 && (
                      <div className="p-8 text-center text-muted-foreground text-sm">No properties in inventory.</div>
                    )}
                  </div>
                ) : (
                  /* Desktop Properties Table */
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border">
                        <tr>
                          <th className="text-left p-4">Property Title</th>
                          <th className="text-left p-4">Type</th>
                          <th className="text-left p-4">Monthly Rent / Price</th>
                          <th className="text-left p-4">Status</th>
                          <th className="text-right p-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {properties.map((p) => (
                          <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-4 font-semibold text-foreground">
                              {p.title}
                              <div className="text-xs font-normal text-muted-foreground">{p.location}</div>
                            </td>
                            <td className="p-4">
                              <Badge variant="outline" className="text-xs">
                                {p.type || "Residential"}
                              </Badge>
                            </td>
                            <td className="p-4 font-bold text-accent">
                              {p.price ? formatPrice(p.price) : "Contact for price"}
                            </td>
                            <td className="p-4">
                              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-medium">
                                {p.status || "For Rent"}
                              </Badge>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Link to={`/property/${p.id}`}>
                                  <Button size="sm" variant="ghost" className="h-8 px-2" title="Inspect Listing">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </Link>
                                <Link to={`/edit-property/${p.id}`}>
                                  <Button size="sm" variant="ghost" className="h-8 px-2 text-primary" title="Edit Listing">
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </Link>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDelete(p.id)}
                                  className="h-8 px-2 text-destructive hover:bg-destructive/10"
                                  title="Delete Listing"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {properties.length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">
                              No property listings found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB 4: USERS & PERMISSIONS */}
            <TabsContent value="users" className="space-y-4">
              <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
                {isMobile ? (
                  <div className="p-4 space-y-3">
                    {userRoles.map((u) => (
                      <div key={u.id} className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold text-foreground text-sm">
                              {u.full_name || u.name || (u.email ? String(u.email).split("@")[0] : "-")}
                            </div>
                            <div className="text-xs text-muted-foreground">{u.email || "-"}</div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveUser(u.id)}
                            disabled={!isAdmin || (user?.id && u.id === user.id)}
                            className="h-8 px-2 text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground font-medium">Assigned Role:</span>
                          <select
                            value={u.role || "user"}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            className="h-8 px-2 rounded-lg border border-border bg-background text-xs"
                            disabled={!isAdmin}
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                      </div>
                    ))}
                    {userRoles.length === 0 && (
                      <div className="p-8 text-center text-muted-foreground text-sm">No registered user roles yet.</div>
                    )}
                  </div>
                ) : (
                  /* Desktop Users Table */
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border">
                        <tr>
                          <th className="text-left p-4">User</th>
                          <th className="text-left p-4">Email</th>
                          <th className="text-left p-4">Access Role</th>
                          <th className="text-left p-4">Last Login</th>
                          <th className="text-left p-4">Created Date</th>
                          <th className="text-right p-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {userRoles.map((u) => (
                          <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-4 font-semibold text-foreground">
                              {u.full_name || u.name || (u.email ? String(u.email).split("@")[0] : "-")}
                            </td>
                            <td className="p-4 text-xs text-muted-foreground">{u.email || "-"}</td>
                            <td className="p-4">
                              <select
                                value={u.role || "user"}
                                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                className="h-8 px-2.5 rounded-lg border border-border bg-background text-xs font-medium focus:ring-1 focus:ring-primary"
                                disabled={!isAdmin}
                              >
                                <option value="user">Tenant / Client (User)</option>
                                <option value="admin">Administrator</option>
                              </select>
                            </td>
                            <td className="p-4 text-xs text-muted-foreground">{formatTimestamp(u.lastLogin)}</td>
                            <td className="p-4 text-xs text-muted-foreground">{formatTimestamp(u.createdAt)}</td>
                            <td className="p-4 text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveUser(u.id)}
                                disabled={!isAdmin || (user?.id && u.id === user.id)}
                                className="h-8 px-2 text-destructive hover:bg-destructive/10"
                                title={user?.id && u.id === user.id ? "Cannot delete yourself" : "Delete user"}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                        {userRoles.length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">
                              No registered users found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
