import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { db, getIdToken } from "@/integrations/firebase/client";
import { doc as fsDoc, getDoc as fsGetDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatPrice, TIME_SLOTS_MORNING, TIME_SLOTS_EVENING, VISIT_CHARGE } from "@/lib/data";
import { format } from "date-fns";
import { Phone } from "lucide-react";
import ContactMenu from "@/components/ContactMenu";
import { Link } from "react-router-dom";
import { openBookingWhatsApp } from "@/lib/whatsapp";
import ResponsiveImage from "@/components/ResponsiveImage";
import ImageLightbox from "@/components/ImageLightbox";

interface Props {
  propertyId: string;
  trigger?: React.ReactNode;
}

export default function PropertyModal({ propertyId, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [property, setProperty] = useState<any | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState<string>("");
  const [slot, setSlot] = useState("");
  const [agree, setAgree] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [avatarError, setAvatarError] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    (async () => {
      if (!db) {
        toast({ title: "Configuration error", description: "Firebase not configured.", variant: "destructive" });
        return;
      }
      setLoading(true);
      try {
        const dref = fsDoc(db, "properties", propertyId);
        const snap = await fsGetDoc(dref);
        if (snap.exists()) setProperty({ id: snap.id, ...snap.data() });
        else setProperty(null);
      } catch (err: any) {
        console.error("Failed to load property", err);
        toast({ title: "Error", description: String(err?.message || err), variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [open, propertyId, toast]);

  const handleBook = async () => {
    if (!name || !phone || !date || !slot) {
      toast({ title: "Fill required", description: "Name, phone, date and slot required", variant: "destructive" });
      return;
    }
    if (!agree) {
      toast({ title: "Payment required", description: `Please agree to pay ₹${VISIT_CHARGE}`, variant: "destructive" });
      return;
    }
    try {
      if (!db) throw new Error("Firebase not configured");
      const bkRef = await addDoc(collection(db, "bookings"), {
        user_id: null,
        name,
        phone,
        email: null,
        visit_date: date,
        time_slot: slot,
        property_ids: [propertyId],
        charge: VISIT_CHARGE,
        payment: { amount: VISIT_CHARGE, status: "pending", method: "none" },
        status: "pending",
        createdAt: serverTimestamp(),
      });

      openBookingWhatsApp({
        bookingId: bkRef.id,
        name,
        phone,
        date,
        slot,
        propertyTitles: [property?.title || propertyId],
        location: property?.location || property?.address,
        charge: VISIT_CHARGE,
        total: VISIT_CHARGE,
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
          await fetch(`${fnUrl.replace(/\/$/, '')}/sendNotification`, {
            method: "POST",
            headers,
            body: JSON.stringify({ type: "booking", refId: bkRef.id, title: "New Booking", message: `${name} • ${phone}` }),
          });
        } catch (e) {
          console.warn("sendNotification call failed", e);
        }
      } catch (e) {
        console.warn("notification create failed", e);
      }
      toast({ title: "Booked", description: "Your slot request is recorded." });
      setOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: String(err?.message || err), variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? <span className="inline-block" role="button" tabIndex={0}>{trigger}</span> : <Button>View</Button>}
      </DialogTrigger>
      <DialogContent className="left-0 top-0 translate-x-0 translate-y-0 w-full h-full max-w-none overflow-auto p-4 sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:w-auto sm:max-w-lg sm:h-auto sm:overflow-visible sm:p-6 sm:rounded-lg">
        <DialogHeader>
          <DialogTitle>{property ? property.title : (loading ? "Loading..." : "Property")}</DialogTitle>
          <DialogDescription>{property ? property.location : ""}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {property && (
            <>
              {/* Images preview strip with lightbox trigger */}
              {Array.isArray(property.images) && property.images.length > 0 && (
                <div className="mt-1">
                  <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-border">
                    {property.images.map((img: string, idx: number) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setLightboxIndex(idx);
                          setLightboxOpen(true);
                        }}
                        className="relative h-16 w-24 shrink-0 rounded-xl overflow-hidden border border-border hover:border-primary transition-all group focus:outline-none focus:ring-2 focus:ring-primary"
                        title="Click to view full image in lightbox"
                      >
                        <ResponsiveImage
                          src={img}
                          alt={`${property.title} preview ${idx + 1}`}
                          ratio="none"
                          className="w-full h-full"
                          imageClassName="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-display font-bold">{property.title}</h2>
                    <div className="text-muted-foreground text-sm mt-1">{property.location || property.address}</div>
                  </div>
                  <div className="text-2xl font-display font-bold text-secondary">{formatPrice(property.price)}</div>
                </div>

                <div className="mt-4 bg-background p-3 rounded">
                  <h3 className="font-medium mb-3">Details</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">TYPE</span>
                      <span className="text-card-foreground font-medium">{property.type || "-"}</span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">BHK</span>
                      <span className="text-card-foreground font-medium">{property.bedrooms ?? property.bhk ?? "-"}</span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">SUPER BUILT-UP AREA SQFT</span>
                      <span className="text-card-foreground font-medium">{property.super_builtup ?? property.area ?? "-"}</span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">BATHROOMS</span>
                      <span className="text-card-foreground font-medium">{property.bathrooms ?? "-"}</span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">FURNISHING</span>
                      <span className="text-card-foreground font-medium">{property.furnishing || property.furnished || "-"}</span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">LISTED BY</span>
                      <span className="text-card-foreground font-medium">{property.listed_by || property.listedBy || "ATOZ PROPERTIES"}</span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">BACHELORS ALLOWED</span>
                      <span className="text-card-foreground font-medium">{(property.bachelors_allowed === true || property.bachelors_allowed === "Yes" || property.bachelors_allowed === "YES" || property.bachelorsAllowed === true) ? "YES" : (property.bachelors_allowed === false || property.bachelors_allowed === "No" || property.bachelors_allowed === "NO" || property.bachelorsAllowed === false) ? "NO" : "-"}</span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">CARPET AREA SQFT</span>
                      <span className="text-card-foreground font-medium">{property.carpet_area ?? property.area ?? "-"}</span>
                    </div>
                  </div>
                </div>

                {property.description && (
                  <div className="mt-4">
                    <h3 className="font-medium mb-2">Description</h3>
                    <div className="text-sm text-muted-foreground">{property.description}</div>
                  </div>
                )}

                <div className="mt-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border shrink-0">
                        {property.agent_avatar && !avatarError ? (
                          <img
                            src={property.agent_avatar}
                            alt={property.agent_name || "Agent"}
                            className="w-full h-full object-cover"
                            onError={() => setAvatarError(true)}
                          />
                        ) : (
                          <div className="text-muted-foreground font-bold text-xs">AZ</div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{property.listed_by === 'ATOZ PROPERTIES' ? 'ATOZ PROPERTIES' : (property.agent_name || property.owner_name || 'Agent')}</div>
                        <div className="text-sm text-muted-foreground">{property.agent_role || 'Seller'}</div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <ContactMenu phone={property.contact_phone || property.phone || "+916353388626"}>
                        <Button size="sm" className="bg-secondary text-secondary-foreground"><Phone className="h-4 w-4 mr-2" />Call</Button>
                      </ContactMenu>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        {Array.isArray(property?.images) && property.images.length > 0 && (
          <ImageLightbox
            images={property.images}
            initialIndex={lightboxIndex}
            isOpen={lightboxOpen}
            onClose={() => setLightboxOpen(false)}
            title={property?.title || "Property"}
          />
        )}
        <DialogFooter />
      </DialogContent>
    </Dialog>
  );
}
