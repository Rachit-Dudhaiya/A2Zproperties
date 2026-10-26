import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  UploadCloud,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Plus,
  X,
  Sparkles,
  MapPin,
  IndianRupee,
  Layers,
  Home,
  ShieldCheck,
  Instagram,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { db, storage } from "@/integrations/firebase/client";
import uploadImageToCloudinary from "@/lib/cloudinary";
import {
  collection,
  addDoc,
  setDoc,
  doc as fsDoc,
  getDoc as fsGetDoc,
  serverTimestamp,
} from "firebase/firestore";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { motion } from "framer-motion";

const defaultForm = {
  title: "",
  type: "Flat",
  status: "For Sale",
  listed_by: "ATOZ PROPERTIES",
  furnishing: "-",
  bachelors_allowed: "-",
  price: 0,
  area: 0,
  bedrooms: 0,
  bathrooms: 0,
  location: "",
  address: "",
  description: "",
  features: [] as string[],
  image_url: "",
  images: [] as string[],
  is_featured: false,
  maintenance_monthly: "",
  floor_no: "",
  car_parking: "",
  facing: "",
  project_status: "",
  total_floors: "",
  has_walkthrough: false,
  video_url: "",
};

const AddEditProperty = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [form, setForm] = useState({ ...defaultForm });
  const [featureInput, setFeatureInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [tempPreviews, setTempPreviews] = useState<string[]>([]);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(!!id);
  const [errors, setErrors] = useState<{ title?: string; price?: string; location?: string }>({});
  const isEdit = !!id;

  const isCommercial = ["commercial", "shop", "office"].includes((form.type || "").toLowerCase().trim());

  useEffect(() => {
    if (id) {
      (async () => {
        try {
          const docRef = fsDoc(db, "properties", id);
          const snap = await fsGetDoc(docRef);
          if (snap.exists()) {
            const d = snap.data();
            const loadedVideoUrl = d.video_url || d.instagram_reel_url || d.walkthrough_url || "";
            setForm({
              title: d.title || "",
              type: d.type || "Flat",
              status: d.status || "For Sale",
              listed_by: d.listed_by || "ATOZ PROPERTIES",
              furnishing: d.furnishing ?? "-",
              bachelors_allowed: d.bachelors_allowed ?? d.bachelorsAllowed ?? "-",
              price: d.price || 0,
              area: d.area || 0,
              bedrooms: d.bedrooms || 0,
              bathrooms: d.bathrooms || 0,
              location: d.location || "",
              address: d.address || "",
              description: d.description || "",
              features: d.features || [],
              image_url: d.image_url || "",
              images: d.images || [],
              is_featured: d.is_featured || false,
              maintenance_monthly: d.maintenance_monthly || "",
              floor_no: d.floor_no || "",
              car_parking: d.car_parking || "",
              facing: d.facing || "",
              project_status: d.project_status || "",
              total_floors: d.total_floors || "",
              has_walkthrough: Boolean(d.has_walkthrough || loadedVideoUrl),
              video_url: loadedVideoUrl,
            });
          }
        } catch (err) {
          console.warn("Failed to read Firestore property", err);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [id]);

  const uploadToFirebase = async (file: File) => {
    if (!storage) throw new Error("Firebase Storage not configured");
    const path = `properties/${Date.now()}_${file.name}`;
    const fileStorageRef = storageRef(storage, path);
    return await new Promise<string>((resolve, reject) => {
      const uploadTask = uploadBytesResumable(fileStorageRef, file);
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          if (snapshot.totalBytes) {
            const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(Math.round(p));
          }
        },
        (err) => reject(err),
        async () => {
          try {
            const url = await getDownloadURL(fileStorageRef);
            resolve(url);
          } catch (e) {
            reject(e);
          }
        }
      );
    });
  };

  const handleFileChange = async (files?: FileList | null, replaceIdx?: number | null) => {
    if (!files || files.length === 0) return;
    const localUrls: string[] = [];
    for (let i = 0; i < files.length; i++) localUrls.push(URL.createObjectURL(files[i]));
    setTempPreviews((p) => [...p, ...localUrls]);

    try {
      setUploading(true);
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(0);
        let uploadedUrl: string | undefined;

        try {
          if (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME && import.meta.env.VITE_CLOUDINARY_UNSIGNED_UPLOAD_PRESET) {
            uploadedUrl = await uploadImageToCloudinary(file);
          }
        } catch (e) {
          console.warn("Client Cloudinary upload failed, will try server fallback", e);
          uploadedUrl = undefined;
        }

        if (!uploadedUrl) {
          const inferredLocal =
            typeof window !== "undefined" &&
            window.location &&
            (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
              ? `${window.location.protocol}//${window.location.hostname}:3000`
              : undefined;
          const fnUrl = (import.meta.env.VITE_FUNCTIONS_URL || inferredLocal || "/api").replace(/\/$/, "");
          const url = `${fnUrl}/uploadImage`;

          uploadedUrl = await new Promise<string>(async (resolve, reject) => {
            try {
              const xhr = new XMLHttpRequest();
              xhr.open("POST", url);
              xhr.onload = () => {
                try {
                  if (xhr.status >= 200 && xhr.status < 300) {
                    const body = JSON.parse(xhr.responseText);
                    const returned =
                      body?.secure_url || body?.url || body?.image?.url || body?.image?.secure_url || body?.image?.secureUrl;
                    if (returned) {
                      resolve(returned);
                      return;
                    }
                    return reject(new Error("Missing url in functions response"));
                  }
                  return reject(new Error(`Functions responded ${xhr.status}`));
                } catch (e) {
                  return reject(e);
                }
              };
              xhr.onerror = () => reject(new Error("Network error to functions endpoint"));
              if (xhr.upload && typeof xhr.upload.addEventListener === "function") {
                xhr.upload.addEventListener("progress", (ev: ProgressEvent) => {
                  if (ev.lengthComputable) setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
                });
              }
              const fd = new FormData();
              fd.append("image", file, file.name);
              xhr.send(fd);
            } catch (e) {
              reject(e);
            }
          }).catch(async () => {
            try {
              const fb = await uploadToFirebase(file);
              return fb;
            } catch (e) {
              throw e;
            }
          });
        }

        try {
          if (db && uploadedUrl) {
            await addDoc(collection(db, "images"), {
              url: uploadedUrl,
              propertyId: id || null,
              source: "cloudinary",
              createdAt: serverTimestamp(),
              uploadedAtClient: new Date().toISOString(),
            });
          }
        } catch (e) {
          console.warn("Failed to persist image metadata to Firestore", e);
        }

        setForm((prev) => {
          const imgs = Array.isArray(prev.images) ? [...prev.images] : [];
          if (typeof replaceIdx === "number") imgs[replaceIdx] = uploadedUrl!;
          else imgs.push(uploadedUrl!);
          return { ...prev, images: imgs, image_url: imgs[0] || prev.image_url } as any;
        });
      }
    } catch (err) {
      console.error("Upload error", err);
      toast({ title: "Upload failed", description: String(err), variant: "destructive" });
    } finally {
      setUploading(false);
      setUploadProgress(null);
      setTimeout(() => {
        tempPreviews.forEach((u) => URL.revokeObjectURL(u));
        setTempPreviews([]);
      }, 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploading) {
      toast({
        title: "Upload in progress",
        description: "Please wait for property images to complete uploading.",
        variant: "destructive",
      });
      return;
    }
    const nextErrors: { title?: string; price?: string; location?: string } = {};
    if (!form.title.trim()) nextErrors.title = "Property title is required";
    if (!form.location.trim()) nextErrors.location = "Location / Area is required";
    if (!form.price || form.price <= 0) nextErrors.price = "Enter a valid rental or sale price";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const firstError = Object.values(nextErrors).find(Boolean);
      toast({ title: "Please fill required fields", description: firstError, variant: "destructive" });
      return;
    }

    const walkthrough = form.has_walkthrough && form.video_url?.trim() ? form.video_url.trim() : null;

    const payload = {
      title: form.title,
      type: form.type,
      listed_by: (form as any).listed_by || "ATOZ PROPERTIES",
      furnishing: (form as any).furnishing || "-",
      bachelors_allowed: isCommercial ? "-" : ((form as any).bachelors_allowed || "-"),
      status: form.status,
      price: form.price,
      area: form.area || null,
      bedrooms: isCommercial ? null : (form.bedrooms || null),
      bathrooms: isCommercial ? null : (form.bathrooms || null),
      location: form.location,
      address: form.address || null,
      description: form.description || null,
      features: form.features,
      image_url: form.image_url || (form.images && form.images[0]) || null,
      images: form.images || [],
      is_featured: form.is_featured,
      maintenance_monthly: form.maintenance_monthly || null,
      floor_no: form.floor_no || null,
      car_parking: form.car_parking || null,
      facing: form.facing || null,
      project_status: form.project_status || null,
      total_floors: form.total_floors || null,
      has_walkthrough: form.has_walkthrough && !!walkthrough,
      video_url: walkthrough,
      instagram_reel_url: walkthrough,
    };

    try {
      if (!db) {
        toast({
          title: "Configuration error",
          description: "Firebase not configured. Set VITE_FIREBASE_* env vars.",
          variant: "destructive",
        });
        return;
      }
      if (isEdit && id) {
        await setDoc(
          fsDoc(db, "properties", id),
          {
            ...payload,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        toast({ title: "Property Listing Updated!" });
      } else {
        const col = collection(db, "properties");
        await addDoc(col, { ...payload, createdAt: serverTimestamp() });
        toast({ title: "New Property Published Successfully!" });
      }
      navigate("/dashboard");
    } catch (err: any) {
      console.error("Failed to save property:", err);
      toast({ title: "Error saving property", description: String(err.message || err), variant: "destructive" });
    }
  };

  const addFeature = () => {
    if (featureInput.trim()) {
      setForm({ ...form, features: [...form.features, featureInput.trim()] });
      setFeatureInput("");
    }
  };

  const removeFeature = (idx: number) => {
    setForm({ ...form, features: form.features.filter((_, i) => i !== idx) });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-12 text-muted-foreground">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          <span>Loading property details...</span>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          {/* Top Breadcrumb & Header */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <Link
                to="/dashboard"
                className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-primary transition-colors mb-2"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Dashboard
              </Link>
              <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground tracking-tight">
                {isEdit ? "Edit Property Listing" : "Add New Property"}
              </h1>
              <p className="text-sm text-muted-foreground font-body mt-1">
                Configure rental or sale inventory details, verified specs, amenities, and gallery photos.
              </p>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold self-start sm:self-auto">
              <Building2 className="h-4 w-4" />
              <span>{isEdit ? `ID: ${id}` : "New Inventory Listing"}</span>
            </div>
          </div>

          {/* Main Form Formats */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Card 1: Core Listing Information */}
            <div className="bg-card rounded-3xl border border-border p-6 sm:p-8 shadow-sm space-y-5">
              <div className="flex items-center gap-2.5 pb-2 border-b border-border">
                <Home className="h-5 w-5 text-primary" />
                <h2 className="text-base font-bold text-foreground">Core Property Information</h2>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Property Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.title}
                  onChange={(e) => {
                    setForm({ ...form, title: e.target.value });
                    if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
                  }}
                  placeholder="e.g. Luxurious 3 BHK Furnished Apartment near Jain Derasar"
                  className={`h-11 ${errors.title ? "border-destructive" : ""}`}
                />
                {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Property Type</Label>
                  <Select
                    value={form.type}
                    onValueChange={(v) => {
                      const willBeCommercial = ["commercial", "shop", "office"].includes(v.toLowerCase().trim());
                      setForm((prev) => ({
                        ...prev,
                        type: v,
                        ...(willBeCommercial ? { bedrooms: 0, bathrooms: 0, bachelors_allowed: "-" } : {}),
                      }));
                    }}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["Flat", "Residential", "Commercial", "Plot", "Shop", "Office"].map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Listing Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="For Rent">For Rent</SelectItem>
                      <SelectItem value="For Sale">For Sale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Listed By</Label>
                  <Select
                    value={(form as any).listed_by}
                    onValueChange={(v) => setForm({ ...form, listed_by: v })}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ATOZ PROPERTIES">ATOZ PROPERTIES</SelectItem>
                      <SelectItem value="OWNER">OWNER</SelectItem>
                      <SelectItem value="BROKER">BROKER</SelectItem>
                      <SelectItem value="BUILDER">BUILDER</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    Monthly Rent / Total Price (₹) <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={form.price || ""}
                      onChange={(e) => {
                        setForm({ ...form, price: Number(e.target.value) });
                        if (errors.price) setErrors((prev) => ({ ...prev, price: undefined }));
                      }}
                      placeholder="e.g. 15000"
                      className={`pl-10 h-11 ${errors.price ? "border-destructive" : ""}`}
                    />
                  </div>
                  {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Super Built-up / Carpet Area (sq.ft)</Label>
                  <Input
                    type="number"
                    value={form.area || ""}
                    onChange={(e) => setForm({ ...form, area: Number(e.target.value) })}
                    placeholder="e.g. 1250"
                    className="h-11"
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Layout & Specifications */}
            <div className="bg-card rounded-3xl border border-border p-6 sm:p-8 shadow-sm space-y-5">
              <div className="flex items-center gap-2.5 pb-2 border-b border-border">
                <Layers className="h-5 w-5 text-primary" />
                <h2 className="text-base font-bold text-foreground">Layout, Furnishing & Specifications</h2>
              </div>

              {!isCommercial ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">Bedrooms (BHK)</Label>
                    <Input
                      type="number"
                      value={form.bedrooms || ""}
                      onChange={(e) => setForm({ ...form, bedrooms: Number(e.target.value) })}
                      placeholder="e.g. 3"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">Bathrooms</Label>
                    <Input
                      type="number"
                      value={form.bathrooms || ""}
                      onChange={(e) => setForm({ ...form, bathrooms: Number(e.target.value) })}
                      placeholder="e.g. 2"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">Furnishing</Label>
                    <Select
                      value={(form as any).furnishing}
                      onValueChange={(v) => setForm({ ...form, furnishing: v })}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="-">-</SelectItem>
                        <SelectItem value="Furnished">Furnished</SelectItem>
                        <SelectItem value="Semi-Furnished">Semi-Furnished</SelectItem>
                        <SelectItem value="Unfurnished">Unfurnished</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">Bachelors Allowed</Label>
                    <Select
                      value={(form as any).bachelors_allowed}
                      onValueChange={(v) => setForm({ ...form, bachelors_allowed: v })}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="-">-</SelectItem>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">Furnishing Status</Label>
                    <Select
                      value={(form as any).furnishing}
                      onValueChange={(v) => setForm({ ...form, furnishing: v })}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="-">-</SelectItem>
                        <SelectItem value="Furnished">Furnished</SelectItem>
                        <SelectItem value="Semi-Furnished">Semi-Furnished</SelectItem>
                        <SelectItem value="Unfurnished">Unfurnished</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center text-xs text-muted-foreground pt-1 sm:pt-6">
                    <span className="px-3 py-2 rounded-xl bg-muted/60 border border-border/60 text-muted-foreground">
                      🏢 Commercial / Shop / Office layout: Bedrooms, bathrooms, and bachelor fields are excluded.
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Floor Number</Label>
                  <Input
                    inputMode="numeric"
                    value={form.floor_no}
                    onChange={(e) => setForm({ ...form, floor_no: e.target.value })}
                    placeholder="e.g. 4"
                    className="h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Total Floors in Building</Label>
                  <Input
                    inputMode="numeric"
                    value={form.total_floors}
                    onChange={(e) => setForm({ ...form, total_floors: e.target.value })}
                    placeholder="e.g. 10"
                    className="h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Car Parking</Label>
                  <Input
                    value={form.car_parking}
                    onChange={(e) => setForm({ ...form, car_parking: e.target.value })}
                    placeholder="e.g. 1 Covered, 1 Open"
                    className="h-11"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Facing / Vastu</Label>
                  <Input
                    value={form.facing}
                    onChange={(e) => setForm({ ...form, facing: e.target.value })}
                    placeholder="e.g. East / North-East"
                    className="h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Project Status</Label>
                  <Input
                    value={form.project_status}
                    onChange={(e) => setForm({ ...form, project_status: e.target.value })}
                    placeholder="e.g. Ready to Move"
                    className="h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Monthly Maintenance (₹)</Label>
                  <Input
                    inputMode="numeric"
                    value={form.maintenance_monthly}
                    onChange={(e) => setForm({ ...form, maintenance_monthly: e.target.value })}
                    placeholder="e.g. 1500"
                    className="h-11"
                  />
                </div>
              </div>
            </div>

            {/* Card 3: Location & Details */}
            <div className="bg-card rounded-3xl border border-border p-6 sm:p-8 shadow-sm space-y-5">
              <div className="flex items-center gap-2.5 pb-2 border-b border-border">
                <MapPin className="h-5 w-5 text-primary" />
                <h2 className="text-base font-bold text-foreground">Location & Narrative Description</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    Locality / Area Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={form.location}
                    onChange={(e) => {
                      setForm({ ...form, location: e.target.value });
                      if (errors.location) setErrors((prev) => ({ ...prev, location: undefined }));
                    }}
                    placeholder="e.g. Station Road, Palitana"
                    className={`h-11 ${errors.location ? "border-destructive" : ""}`}
                  />
                  {errors.location && <p className="text-xs text-destructive">{errors.location}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Full Landmark / Street Address</Label>
                  <Input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="e.g. Opp. Shantinath Temple, Taleti Road"
                    className="h-11"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Detailed Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe ventilation, sunlight, water facility, proximity to schools or transport..."
                  rows={4}
                  className="rounded-2xl"
                />
              </div>

              {/* Features & Amenities tag builder */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">Features & Amenities Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    placeholder="Type amenity (e.g. 24x7 Water, Elevator, RO System) and press enter"
                    className="h-11"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addFeature();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={addFeature} className="h-11 px-5 font-semibold">
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {form.features.map((f, i) => (
                    <span
                      key={i}
                      className="bg-primary/10 text-primary border border-primary/20 text-xs font-medium px-3 py-1 rounded-full inline-flex items-center gap-1.5"
                    >
                      {f}
                      <button
                        type="button"
                        onClick={() => removeFeature(i)}
                        className="hover:text-destructive hover:scale-110 transition-transform"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                  {form.features.length === 0 && (
                    <span className="text-xs text-muted-foreground">No features added yet.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Card 4: Media Gallery & Uploads */}
            <div className="bg-card rounded-3xl border border-border p-6 sm:p-8 shadow-sm space-y-5">
              <div className="flex items-center gap-2.5 pb-2 border-b border-border">
                <UploadCloud className="h-5 w-5 text-primary" />
                <h2 className="text-base font-bold text-foreground">Property Gallery Photos</h2>
              </div>

              {/* Existing Images Thumbnails */}
              <div className="space-y-3">
                <div className="flex flex-wrap gap-3">
                  {(form.images || []).map((src, i) => (
                    <div
                      key={i}
                      className="relative w-36 h-24 rounded-2xl overflow-hidden border border-border group bg-muted shadow-sm"
                    >
                      <img src={src} alt={`Property image ${i + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setReplaceIndex(i);
                            replaceInputRef.current?.click();
                          }}
                          className="px-2 py-1 rounded-md bg-white text-black text-[11px] font-semibold hover:bg-white/90"
                        >
                          Replace
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              images: form.images.filter((_, idx) => idx !== i),
                              image_url: i === 0 ? form.images[1] || "" : form.image_url,
                            })
                          }
                          className="p-1 rounded-md bg-destructive text-white hover:bg-destructive/90"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {i === 0 && (
                        <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary text-white">
                          Cover
                        </span>
                      )}
                    </div>
                  ))}

                  {tempPreviews.map((src, i) => (
                    <div
                      key={`tmp-${i}`}
                      className="w-36 h-24 rounded-2xl overflow-hidden border-2 border-dashed border-primary/50 relative bg-muted"
                    >
                      <img src={src} alt="Uploading preview" className="w-full h-full object-cover opacity-60" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Upload Action */}
                <div className="border-2 border-dashed border-border rounded-2xl p-6 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    id="property-images-file"
                    onChange={(e) => handleFileChange(e.target.files)}
                    className="hidden"
                  />
                  <input
                    ref={(el) => {
                      replaceInputRef.current = el;
                    }}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (!e.target.files) return;
                      if (replaceIndex === null) return;
                      handleFileChange(e.target.files, replaceIndex);
                      setReplaceIndex(null);
                    }}
                    style={{ display: "none" }}
                  />

                  <label
                    htmlFor="property-images-file"
                    className="cursor-pointer flex flex-col items-center justify-center gap-2"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                      <UploadCloud className="h-6 w-6" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-primary underline">Click to upload photos</span>
                      <span className="text-sm text-muted-foreground"> or drag and drop</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG, WebP supported. High resolution 16:10 landscape photos recommended.
                    </p>
                  </label>
                </div>

                {uploading && uploadProgress !== null && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted p-2 rounded-xl">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
                    <span>Uploading photo assets... {uploadProgress}%</span>
                  </div>
                )}
              </div>
            </div>

            {/* Card 5: Video Walkthrough / Instagram Reel */}
            <div className="bg-card rounded-3xl border border-border p-6 sm:p-8 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 flex items-center justify-center text-white shadow-xs">
                      <Instagram className="h-4 w-4" />
                    </div>
                    <span className="text-base font-bold text-foreground">Instagram Reel / Video Walkthrough</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enable this toggle to attach an Instagram Reel tour. A "View Walkthrough" button will appear on the property card for buyers.
                  </p>
                </div>

                <Switch
                  checked={form.has_walkthrough}
                  onCheckedChange={(v) => setForm({ ...form, has_walkthrough: v })}
                  className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-pink-500 data-[state=checked]:to-purple-600"
                />
              </div>

              {form.has_walkthrough && (
                <div className="space-y-2 pt-3 border-t border-border animate-in fade-in-50 duration-200">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Instagram className="h-3.5 w-3.5 text-pink-500" />
                    Instagram Reel URL <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type="url"
                      value={form.video_url}
                      onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                      placeholder="e.g. https://www.instagram.com/reel/C8qXY123abc/ or https://www.instagram.com/p/..."
                      className="h-11 font-mono text-xs sm:text-sm pl-3.5 bg-background"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Paste the direct Instagram Reel URL. Visitors can click "View Walkthrough" on the property card to view this tour instantly.
                  </p>
                </div>
              )}
            </div>

            {/* Card 6: Promotion & Visibility */}
            <div className="bg-card rounded-3xl border border-border p-6 sm:p-8 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accent" />
                  <span className="text-sm font-bold text-foreground">Feature on Homepage Carousel</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Give this listing priority visibility with gold badges and spotlight carousel ranking.
                </p>
              </div>

              <Switch
                checked={form.is_featured}
                onCheckedChange={(v) => setForm({ ...form, is_featured: v })}
                className="data-[state=checked]:bg-primary"
              />
            </div>

            {/* Form Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                disabled={uploading}
                className="w-full h-12 bg-accent text-accent-foreground font-semibold text-base shadow-md hover:bg-accent/90"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    Uploading Assets ({uploadProgress ?? 0}%)...
                  </>
                ) : isEdit ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Update Property Listing
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Publish Property Listing
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AddEditProperty;
