import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, Eye, Building, Users, Phone, Calendar, MessageSquare, CheckCircle, XCircle, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ContactMenu from "@/components/ContactMenu";
import { registerAdminFcmToken, onForegroundMessage } from "@/integrations/firebase/fcm";
import { auth, db } from "@/integrations/firebase/client";
import { doc as fsDoc, deleteDoc, updateDoc, collection, query as fsQuery, orderBy as fsOrderBy, onSnapshot, getDocs as fsGetDocs, writeBatch } from "firebase/firestore";
import { formatPrice, PHONE_NUMBER } from "@/lib/data";
import { generateGoogleCalendarUrl } from "@/lib/calendar";
import { useAuth } from "@/hooks/useAuth";
import DashboardSkeleton from "@/components/DashboardSkeleton";

const statusColors: Record<string, string> = {
  pending: "bg-accent/20 text-accent-foreground",
  confirmed: "bg-secondary/20 text-secondary",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-destructive/10 text-destructive",
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-secondary/20 text-secondary",
  closed: "bg-muted text-muted-foreground",
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
    // register for push notifications when admin opens dashboard
    if (typeof window !== 'undefined' && (window as any).Notification && (window as any).Notification.requestPermission) {
      (async () => {
        try {
          if ((await (window as any).Notification.requestPermission()) === 'granted') {
            await registerAdminFcmToken();
          }
        } catch (e) {
          console.warn('FCM register failed', e);
        }
      })();
    }

    // optional: show an in-app toast when a foreground push arrives
    const off = onForegroundMessage((payload: any) => {
      try {
        toast({ title: payload?.notification?.title || 'Notification', description: payload?.notification?.body });
      } catch (e) {
        console.warn('Foreground message handler error', e);
      }
    });
    if (!db) {
      toast({ title: "Configuration error", description: "Firebase not configured. Set VITE_FIREBASE_* env vars.", variant: "destructive" });
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
        setTimeout(() => setLoading(false), 200); // Small delay to avoid flicker
      }
    };

    const propsQ = fsQuery(collection(db, "properties"), fsOrderBy("createdAt", "desc"));
    const bookingsQ = fsQuery(collection(db, "bookings"), fsOrderBy("createdAt", "desc"));
    const inquiriesQ = fsQuery(collection(db, "inquiries"), fsOrderBy("createdAt", "desc"));

    const unsubProps = onSnapshot(propsQ, (snap) => {
      const out: any[] = [];
      snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
      setProperties(out);
      if (!initialLoadStatus.properties) { initialLoadStatus.properties = true; checkAllLoaded(); }
    }, (err) => { console.error("Properties listener error:", err); if (!initialLoadStatus.properties) { initialLoadStatus.properties = true; checkAllLoaded(); } });

    const unsubBookings = onSnapshot(bookingsQ, (snap) => {
      const out: any[] = [];
      snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
      setBookings(out);
      if (!initialLoadStatus.bookings) { initialLoadStatus.bookings = true; checkAllLoaded(); }
    }, (err) => { console.error("Bookings listener error:", err); if (!initialLoadStatus.bookings) { initialLoadStatus.bookings = true; checkAllLoaded(); } });

    const unsubInquiries = onSnapshot(inquiriesQ, (snap) => {
      const out: any[] = [];
      snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
      setInquiries(out);
      if (!initialLoadStatus.inquiries) { initialLoadStatus.inquiries = true; checkAllLoaded(); }
    }, (err) => { console.error("Inquiries listener error:", err); if (!initialLoadStatus.inquiries) { initialLoadStatus.inquiries = true; checkAllLoaded(); } });

    const notifsQ = fsQuery(collection(db, "notifications"), fsOrderBy("createdAt", "desc"));
    const unsubNotifs = onSnapshot(notifsQ, (snap) => {
      const out: any[] = [];
      snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
      setNotifications(out);
      if (!initialLoadStatus.notifications) { initialLoadStatus.notifications = true; checkAllLoaded(); }
    }, (err) => { console.error("Notifications listener error:", err); if (!initialLoadStatus.notifications) { initialLoadStatus.notifications = true; checkAllLoaded(); } });

    const rolesQ = fsQuery(collection(db, "roles"));
    const unsubRoles = onSnapshot(rolesQ, (snap) => {
      const out: any[] = [];
      snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
      setUserRoles(out);
      if (!initialLoadStatus.roles) { initialLoadStatus.roles = true; checkAllLoaded(); }
    }, (err) => { console.error("Roles listener error:", err); if (!initialLoadStatus.roles) { initialLoadStatus.roles = true; checkAllLoaded(); } });

    return () => {
      unsubProps();
      unsubBookings();
      unsubInquiries();
      unsubNotifs();
      unsubRoles();
      if (typeof off === 'function') off();
    };
  }, [toast]);


  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this property?")) return;
    try {
      await deleteDoc(fsDoc(db, "properties", id));
    } catch (err: any) {
      toast({ title: "Error", description: String(err?.message || err), variant: "destructive" });
      return;
    }
    toast({ title: "Property deleted" });
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateDoc(fsDoc(db, "bookings", id), { status });
    } catch (err: any) {
      toast({ title: "Error", description: String(err?.message || err), variant: "destructive" });
      return;
    }
    
    if (status === "confirmed") {
      const booking = bookings.find(b => b.id === id);
      if (booking) {
        // Generate Google Calendar link for admin
        const calUrl = generateGoogleCalendarUrl({
          title: `Site Visit - ${booking.name}`,
          date: booking.visit_date,
          timeSlot: booking.time_slot,
          description: `Customer: ${booking.name}\nPhone: ${booking.phone}\nEmail: ${booking.email || 'N/A'}\nProperties: ${getBookedPropertyNames(booking.property_ids || [])}`,
          location: "Rajkot, Gujarat",
        });
        if (calUrl) {
          window.open(calUrl, "_blank");
        }
      }
      toast({ title: "✅ Booking Confirmed!", description: "Customer will see the confirmation in their bookings. Google Calendar event opened." });
    } else {
      toast({ title: `Booking marked as ${status}` });
    }
  };

  const handleInquiryStatus = async (id: string, status: string) => {
    try {
      await updateDoc(fsDoc(db, "inquiries", id), { status });
    } catch (err: any) {
      toast({ title: "Error", description: String(err?.message || err), variant: "destructive" });
      return;
    }
    toast({ title: `Inquiry marked as ${status}` });
  };

  const handleDeleteInquiry = async (id: string) => {
    if (!confirm("Delete this inquiry?")) return;
    try {
      await deleteDoc(fsDoc(db, "inquiries", id));
    } catch (err: any) {
      toast({ title: "Error", description: String(err?.message || err), variant: "destructive" });
      return;
    }
    toast({ title: "Inquiry deleted" });
  };

  const handleDeleteBooking = async (id: string) => {
    if (!confirm("Delete this booking?")) return;
    try {
      await deleteDoc(fsDoc(db, "bookings", id));
    } catch (err: any) {
      toast({ title: "Error", description: String(err?.message || err), variant: "destructive" });
      return;
    }
    toast({ title: "Booking deleted" });
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
      toast({ title: "Role updated" });
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
      toast({ title: "User deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: String(err?.message || err), variant: "destructive" });
    }
  };

  const pendingBookings = bookings.filter(b => b.status === "pending").length;
  const newInquiries = inquiries.filter(i => i.status === "new").length;
  const filteredBookings = bookings.filter((b) => {
    if (filterStatus !== "all" && b.status !== filterStatus) return false;
    if (filterProperty !== "all" && (!b.property_ids || !b.property_ids.includes(filterProperty))) return false;
    if (filterDate && b.visit_date !== filterDate) return false;
    return true;
  });
  const getBookedPropertyNames = (propertyIds: string[] = []) => {
    if (!Array.isArray(propertyIds) || propertyIds.length === 0) return "No properties";
    return propertyIds
      .map((pid) => properties.find((p) => p.id === pid)?.title || pid)
      .join(", ");
  };

  const getInquiryMessage = (inq: any) => {
    return inq?.message || inq?.requirement || inq?.description || "";
  };

  const renderInquiryDetailsBody = (inq: any, inquiryMessage: string) => (
    <div className="grid gap-3 text-sm">
      <div>
        <div className="text-xs text-muted-foreground">Message</div>
        <div className="whitespace-pre-wrap">{inquiryMessage || "-"}</div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-muted-foreground">Phone</div>
          <div>{inq.phone || "-"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Status</div>
          <div className="capitalize">{inq.status || "-"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Location</div>
          <div>{inq.location || "-"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Budget</div>
          <div>{inq.budget || "-"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Property Type</div>
          <div>{inq.property_type || "-"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Caste</div>
          <div>{inq.caste || "-"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Submitted</div>
          <div>{formatTimestamp(inq.createdAt)}</div>
        </div>
      </div>
    </div>
  );

  const getPaymentLabel = (booking: any) => {
    const method = booking?.payment?.method || "-";
    const status = booking?.payment?.status || "-";
    const amount = booking?.payment?.amount ?? booking?.charge ?? null;
    const methodLabel = method === "online" ? "Online" : method === "cash_upi_on_visit" ? "Cash at site Visit" : method;
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

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground font-body text-sm">Manage properties, bookings & inquiries</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link to="/add-property">
              <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-body">
                <Plus className="h-4 w-4 mr-2" /> Add Property
              </Button>
            </Link>
            <Button size="sm" variant="ghost" onClick={async () => {
              if (!confirm('Delete all notifications? This cannot be undone.')) return;
              if (!db) { toast({ title: 'Error', description: 'Firebase not configured', variant: 'destructive' }); return; }
              try {
                const q = fsQuery(collection(db, 'notifications'), fsOrderBy('createdAt', 'desc'));
                const snap = await fsGetDocs(q);
                const batch = writeBatch(db);
                snap.forEach((d) => batch.delete(fsDoc(db, 'notifications', d.id)));
                await batch.commit();
                toast({ title: 'Notifications cleared' });
              } catch (e) {
                console.error('Failed to clear notifications', e);
                toast({ title: 'Error', description: String(e), variant: 'destructive' });
              }
            }}>
              Clear Notifications
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          {[
            { label: "Properties", value: properties.length, icon: Building },
            { label: "Bookings", value: bookings.length, icon: Users },
            { label: "Pending Visits", value: pendingBookings, icon: Calendar },
            { label: "New Inquiries", value: newInquiries, icon: MessageSquare },
            { label: "Notifications", value: notifications.filter(n => !n.read).length, icon: MessageSquare },
            { label: "Available", value: properties.filter((p) => p.status === "available").length, icon: Building },
          ].map((s) => (
            <div key={s.label} className="bg-card rounded-lg p-4 shadow-card">
              <div className="flex items-center gap-3">
                <s.icon className="h-5 w-5 text-secondary" />
                <div>
                  <div className="text-xl font-display font-bold text-card-foreground">{s.value}</div>
                  <div className="text-xs font-body text-muted-foreground">{s.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Tabs defaultValue="bookings" className="space-y-4">
          <TabsList className="font-body w-full flex-wrap justify-start h-auto gap-1">
            <TabsTrigger value="bookings">
              Bookings ({bookings.length})
              {pendingBookings > 0 && <span className="ml-1 bg-destructive text-destructive-foreground text-xs rounded-full px-1.5">{pendingBookings}</span>}
            </TabsTrigger>
            <TabsTrigger value="inquiries">
              Inquiries ({inquiries.length})
              {newInquiries > 0 && <span className="ml-1 bg-destructive text-destructive-foreground text-xs rounded-full px-1.5">{newInquiries}</span>}
            </TabsTrigger>
            <TabsTrigger value="properties">Properties ({properties.length})</TabsTrigger>
            <TabsTrigger value="users">Users ({userRoles.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="bookings">
            <div className="bg-card rounded-lg shadow-card overflow-hidden">
              <div className="p-4 border-b border-border flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <label className="text-sm text-muted-foreground w-20 shrink-0">Status</label>
                  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="flex-1 sm:flex-none sm:w-auto px-2 py-1 rounded border">
                    <option value="all">All</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <label className="text-sm text-muted-foreground w-20 shrink-0">Property</label>
                  <select value={filterProperty} onChange={(e) => setFilterProperty(e.target.value)} style={{width: "50%"}} className="flex-1 sm:flex-none sm:w-auto px-2 py-1 rounded border">
                    <option value="all">All</option>
                    {properties.map((p) => (<option key={p.id} value={p.id}>{p.title}</option>))}
                  </select>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:ml-auto">
                  <label className="text-sm text-muted-foreground w-20 shrink-0">Date</label>
                  <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="flex-1 sm:flex-none sm:w-auto px-2 py-1 rounded border" />
                  <Button size="sm" variant="ghost" className="w-full sm:w-auto" onClick={() => { setFilterStatus("all"); setFilterProperty("all"); setFilterDate(""); }}>Reset</Button>
                </div>
              </div>
              {isMobile ? (
                <div className="p-4 space-y-3">
                  {filteredBookings.map((b) => (
                    <div key={b.id} className={`rounded-lg border border-border bg-background p-4 ${b.status === "pending" ? "bg-accent/5" : ""}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-card-foreground">{b.name}</div>
                          {b.email && <div className="text-xs text-muted-foreground">{b.email}</div>}
                        </div>
                        <Badge className={`${statusColors[b.status] || ""} font-body text-xs`}>{b.status}</Badge>
                      </div>
                      <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
                        <div>{b.visit_date} • {b.time_slot}</div>
                        <div>Properties: {getBookedPropertyNames(b.property_ids || [])}</div>
                        <div>Payment: {getPaymentLabel(b)}</div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <ContactMenu phone={b.phone} className="inline-block">
                          <Button variant="ghost" size="sm" title="Call">
                            <Phone className="h-4 w-4" />
                          </Button>
                        </ContactMenu>
                        {b.status === "pending" && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => handleStatusChange(b.id, "confirmed")} title="Approve & Add to Calendar">
                              <CheckCircle className="h-4 w-4 text-secondary" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleStatusChange(b.id, "cancelled")} title="Cancel">
                              <XCircle className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                        {b.status === "confirmed" && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => {
                              const url = generateGoogleCalendarUrl({
                                title: `Site Visit - ${b.name}`,
                                date: b.visit_date,
                                timeSlot: b.time_slot,
                                description: `Customer: ${b.name}\nPhone: ${b.phone}\nProperties: ${getBookedPropertyNames(b.property_ids || [])}`,
                                location: "Rajkot, Gujarat",
                              });
                              window.open(url, "_blank");
                            }} title="Add to Google Calendar">
                              <CalendarPlus className="h-4 w-4 text-secondary" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleStatusChange(b.id, "completed")} title="Complete">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleStatusChange(b.id, "cancelled")} title="Cancel">
                              <XCircle className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteBooking(b.id)} title="Delete booking">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {filteredBookings.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">No bookings yet</div>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm font-body">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3 text-muted-foreground">Name</th>
                        <th className="text-left p-3 text-muted-foreground">Phone</th>
                        <th className="text-left p-3 text-muted-foreground hidden md:table-cell">Date</th>
                        <th className="text-left p-3 text-muted-foreground hidden md:table-cell">Slot</th>
                        <th className="text-left p-3 text-muted-foreground hidden md:table-cell">Payment</th>
                        <th className="text-left p-3 text-muted-foreground hidden md:table-cell">Properties</th>
                        <th className="text-left p-3 text-muted-foreground">Status</th>
                        <th className="text-right p-3 text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBookings.map((b) => (
                        <tr key={b.id} className={`border-t border-border hover:bg-muted/50 transition-colors ${b.status === "pending" ? "bg-accent/5" : ""}`}>
                          <td className="p-3 text-card-foreground font-medium">
                            {b.name}
                            {b.email && <div className="text-xs text-muted-foreground">{b.email}</div>}
                            <div className="md:hidden text-xs text-muted-foreground mt-1">
                              Properties: {getBookedPropertyNames(b.property_ids || [])}
                            </div>
                            <div className="md:hidden text-xs text-muted-foreground mt-1">
                              Payment: {getPaymentLabel(b)}
                            </div>
                          </td>
                          <td className="p-3">
                            <ContactMenu phone={b.phone} className="inline-block">
                              <Button variant="ghost" size="sm"><Phone className="h-4 w-4" /></Button>
                            </ContactMenu>
                          </td>
                          <td className="p-3 hidden md:table-cell">{b.visit_date}</td>
                          <td className="p-3 hidden md:table-cell">{b.time_slot}</td>
                          <td className="p-3 hidden md:table-cell text-xs text-muted-foreground">{getPaymentLabel(b)}</td>
                          <td className="p-3 hidden md:table-cell">
                            <div className="max-w-[320px] text-xs text-muted-foreground line-clamp-2">
                              {getBookedPropertyNames(b.property_ids || [])}
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge className={`${statusColors[b.status] || ""} font-body text-xs`}>{b.status}</Badge>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {b.status === "pending" && (
                                <>
                                  <Button size="sm" variant="ghost" onClick={() => handleStatusChange(b.id, "confirmed")} className="text-xs font-body text-secondary" title="Approve & Add to Calendar">
                                    <CheckCircle className="h-4 w-4 mr-1" /> Approve
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => handleStatusChange(b.id, "cancelled")} className="text-xs font-body text-destructive">
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              {b.status === "confirmed" && (
                                <>
                                  <Button size="sm" variant="ghost" onClick={() => {
                                    const url = generateGoogleCalendarUrl({
                                      title: `Site Visit - ${b.name}`,
                                      date: b.visit_date,
                                      timeSlot: b.time_slot,
                                      description: `Customer: ${b.name}\nPhone: ${b.phone}\nProperties: ${getBookedPropertyNames(b.property_ids || [])}`,
                                      location: "Rajkot, Gujarat",
                                    });
                                    window.open(url, "_blank");
                                  }} className="text-xs font-body text-secondary" title="Add to Google Calendar">
                                    <CalendarPlus className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => handleStatusChange(b.id, "completed")} className="text-xs font-body text-green-600">Complete</Button>
                                  <Button size="sm" variant="ghost" onClick={() => handleStatusChange(b.id, "cancelled")} className="text-xs font-body text-destructive">
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              <Button size="sm" variant="ghost" onClick={() => handleDeleteBooking(b.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredBookings.length === 0 && (
                        <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No bookings yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="inquiries">
            <div className="bg-card rounded-lg shadow-card overflow-hidden">
              {isMobile ? (
                <div className="p-4 space-y-3">
                  {inquiries.map((inq: any) => {
                    const inquiryMessage = getInquiryMessage(inq);
                    return (
                      <div key={inq.id} className={`rounded-lg border border-border bg-background p-4 ${inq.status === "new" ? "bg-blue-50/50" : ""}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium text-card-foreground">{inq.name}</div>
                            <div className="text-xs text-muted-foreground line-clamp-2">{inquiryMessage || "-"}</div>
                          </div>
                          <Badge className={`${statusColors[inq.status] || ""} font-body text-xs`}>{inq.status}</Badge>
                        </div>
                        <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
                          <div>Location: {inq.location || "-"}</div>
                          <div>Budget: {inq.budget || "-"}</div>
                          <div>Type: {inq.property_type || "-"}</div>
                          <div>Caste: {inq.caste || "-"}</div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <ContactMenu phone={inq.phone} className="inline-block">
                            <Button variant="ghost" size="sm" title="Call">
                              <Phone className="h-4 w-4" />
                            </Button>
                          </ContactMenu>
                          <Drawer>
                            <DrawerTrigger asChild>
                              <Button size="sm" variant="ghost" title="View inquiry details">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DrawerTrigger>
                            <DrawerContent className="max-h-[90vh] overflow-y-auto">
                              <DrawerHeader>
                                <DrawerTitle>Inquiry Details</DrawerTitle>
                                <DrawerDescription>{inq.name || "-"}</DrawerDescription>
                              </DrawerHeader>
                              <div className="px-4 pb-4">
                                {renderInquiryDetailsBody(inq, inquiryMessage)}
                              </div>
                            </DrawerContent>
                          </Drawer>
                          {inq.status === "new" && (
                            <Button size="sm" variant="ghost" onClick={() => handleInquiryStatus(inq.id, "contacted")} className="text-xs font-body text-secondary">
                              Contacted
                            </Button>
                          )}
                          {inq.status === "contacted" && (
                            <Button size="sm" variant="ghost" onClick={() => handleInquiryStatus(inq.id, "closed")} className="text-xs font-body text-green-600">
                              Close
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteInquiry(inq.id)} title="Delete inquiry">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {inquiries.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">No inquiries yet</div>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm font-body">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3 text-muted-foreground">Name</th>
                        <th className="text-left p-3 text-muted-foreground hidden md:table-cell">Message</th>
                        <th className="text-left p-3 text-muted-foreground">Phone</th>
                        <th className="text-left p-3 text-muted-foreground">View</th>
                        <th className="text-left p-3 text-muted-foreground hidden md:table-cell">Location</th>
                        <th className="text-left p-3 text-muted-foreground hidden md:table-cell">Budget</th>
                        <th className="text-left p-3 text-muted-foreground hidden md:table-cell">Type</th>
                        <th className="text-left p-3 text-muted-foreground hidden lg:table-cell">Caste</th>
                        <th className="text-left p-3 text-muted-foreground">Status</th>
                        <th className="text-right p-3 text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inquiries.map((inq: any) => {
                        const inquiryMessage = getInquiryMessage(inq);
                        return (
                          <tr key={inq.id} className={`border-t border-border hover:bg-muted/50 transition-colors ${inq.status === "new" ? "bg-blue-50/50" : ""}`}>
                            <td className="p-3 text-card-foreground font-medium">
                              {inq.name}
                              {inquiryMessage && <div className="text-xs text-muted-foreground truncate max-w-[150px]">{inquiryMessage}</div>}
                            </td>
                            <td className="p-3 hidden md:table-cell">
                              <div className="max-w-[260px] text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">
                                {inquiryMessage || "-"}
                              </div>
                            </td>
                            <td className="p-3">
                              <ContactMenu phone={inq.phone} className="inline-block">
                                <Button variant="ghost" size="sm"><Phone className="h-4 w-4" /></Button>
                              </ContactMenu>
                            </td>
                            <td className="p-3">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="ghost" title="View inquiry details">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
                                  <DialogHeader>
                                    <DialogTitle>Inquiry Details</DialogTitle>
                                    <DialogDescription>{inq.name || "-"}</DialogDescription>
                                  </DialogHeader>
                                  {renderInquiryDetailsBody(inq, inquiryMessage)}
                                </DialogContent>
                              </Dialog>
                            </td>
                            <td className="p-3 hidden md:table-cell text-muted-foreground">{inq.location || "-"}</td>
                            <td className="p-3 hidden md:table-cell text-muted-foreground">{inq.budget || "-"}</td>
                            <td className="p-3 hidden md:table-cell text-muted-foreground">{inq.property_type || "-"}</td>
                            <td className="p-3 hidden lg:table-cell text-muted-foreground">{inq.caste || "-"}</td>
                            <td className="p-3">
                              <Badge className={`${statusColors[inq.status] || ""} font-body text-xs`}>{inq.status}</Badge>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {inq.status === "new" && (
                                  <Button size="sm" variant="ghost" onClick={() => handleInquiryStatus(inq.id, "contacted")} className="text-xs font-body text-secondary">
                                    Contacted
                                  </Button>
                                )}
                                {inq.status === "contacted" && (
                                  <Button size="sm" variant="ghost" onClick={() => handleInquiryStatus(inq.id, "closed")} className="text-xs font-body text-green-600">
                                    Close
                                  </Button>
                                )}
                                <Button size="sm" variant="ghost" onClick={() => handleDeleteInquiry(inq.id)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {inquiries.length === 0 && (
                        <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">No inquiries yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="properties">
            <div className="bg-card rounded-lg shadow-card overflow-hidden">
              {isMobile ? (
                <div className="p-4 space-y-3">
                  {properties.map((p) => (
                    <div key={p.id} className="rounded-lg border border-border bg-background p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-card-foreground">{p.title}</div>
                          <div className="text-xs text-muted-foreground">{p.type}</div>
                        </div>
                        <Badge className="bg-secondary/10 text-secondary font-body text-xs">{p.status}</Badge>
                      </div>
                      <div className="mt-2 text-secondary font-semibold">{formatPrice(p.price)}</div>
                      <div className="mt-3 flex items-center gap-2">
                        <Link to="/properties">
                          <Button size="sm" variant="ghost" title="View property"><Eye className="h-4 w-4" /></Button>
                        </Link>
                        <Link to={`/edit-property/${p.id}`}>
                          <Button size="sm" variant="ghost" title="Edit property"><Pencil className="h-4 w-4" /></Button>
                        </Link>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(p.id)} title="Delete property">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {properties.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">No properties yet</div>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm font-body">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3 text-muted-foreground">Title</th>
                        <th className="text-left p-3 text-muted-foreground hidden md:table-cell">Type</th>
                        <th className="text-left p-3 text-muted-foreground">Price</th>
                        <th className="text-left p-3 text-muted-foreground hidden md:table-cell">Status</th>
                        <th className="text-right p-3 text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {properties.map((p) => (
                        <tr key={p.id} className="border-t border-border hover:bg-muted/50 transition-colors">
                          <td className="p-3 text-card-foreground font-medium">{p.title}</td>
                          <td className="p-3 hidden md:table-cell"><Badge variant="outline" className="font-body text-xs">{p.type}</Badge></td>
                          <td className="p-3 text-secondary font-semibold">{formatPrice(p.price)}</td>
                          <td className="p-3 hidden md:table-cell"><Badge className="bg-secondary/10 text-secondary font-body text-xs">{p.status}</Badge></td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Link to="/properties"><Button size="sm" variant="ghost"><Eye className="h-4 w-4" /></Button></Link>
                              <Link to={`/edit-property/${p.id}`}><Button size="sm" variant="ghost"><Pencil className="h-4 w-4" /></Button></Link>
                              <Button size="sm" variant="ghost" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {properties.length === 0 && (
                        <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No properties yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="users">
            <div className="bg-card rounded-lg shadow-card overflow-hidden">
              {isMobile ? (
                <div className="p-4 space-y-3">
                  {userRoles.map((u) => (
                    <div key={u.id} className="rounded-lg border border-border bg-background p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-card-foreground">
                            {u.full_name || u.name || (u.email ? String(u.email).split("@")[0] : "-")}
                          </div>
                          <div className="text-xs text-muted-foreground">{u.email || "-"}</div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveUser(u.id)}
                          disabled={!isAdmin || (user?.id && u.id === user.id)}
                          title={user?.id && u.id === user.id ? "Cannot delete yourself" : "Delete user"}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Role</span>
                        <select
                          value={u.role || "user"}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="px-2 py-1 rounded border"
                          disabled={!isAdmin}
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
                        <div>Last Login: {formatTimestamp(u.lastLogin)}</div>
                        <div>Created: {formatTimestamp(u.createdAt)}</div>
                      </div>
                    </div>
                  ))}
                  {userRoles.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">No users yet</div>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm font-body">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3 text-muted-foreground">Name</th>
                        <th className="text-left p-3 text-muted-foreground">Email</th>
                        <th className="text-left p-3 text-muted-foreground">Role</th>
                        <th className="text-left p-3 text-muted-foreground hidden md:table-cell">Last Login</th>
                        <th className="text-left p-3 text-muted-foreground hidden lg:table-cell">Created</th>
                        <th className="text-right p-3 text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userRoles.map((u) => (
                        <tr key={u.id} className="border-t border-border hover:bg-muted/50 transition-colors">
                          <td className="p-3 text-card-foreground font-medium">
                            {u.full_name || u.name || (u.email ? String(u.email).split("@")[0] : "-")}
                          </td>
                          <td className="p-3 text-muted-foreground">{u.email || "-"}</td>
                          <td className="p-3">
                            <select
                              value={u.role || "user"}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              className="px-2 py-1 rounded border"
                              disabled={!isAdmin}
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                          <td className="p-3 hidden md:table-cell text-muted-foreground">{formatTimestamp(u.lastLogin)}</td>
                          <td className="p-3 hidden lg:table-cell text-muted-foreground">{formatTimestamp(u.createdAt)}</td>
                          <td className="p-3 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveUser(u.id)}
                              disabled={!isAdmin || (user?.id && u.id === user.id)}
                              title={user?.id && u.id === user.id ? "Cannot delete yourself" : "Delete user"}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {userRoles.length === 0 && (
                        <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No users yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};

export default Dashboard;
