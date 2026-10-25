import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  SlidersHorizontal,
  X,
  RotateCcw,
  Building,
  ArrowUpDown,
  Home,
  Check,
  Filter,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PropertyCard from "@/components/PropertyCard";
import { db } from "@/integrations/firebase/client";
import { collection, query as fsQuery, orderBy as fsOrderBy, onSnapshot } from "firebase/firestore";
import SkeletonCard from "@/components/SkeletonCard";
import WhatsAppButton from "@/components/WhatsAppButton";
import { motion, AnimatePresence } from "framer-motion";

const Properties = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [allProperties, setAllProperties] = useState<any[]>([]);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [typeFilter, setTypeFilter] = useState(searchParams.get("type") || "all");
  const [locationFilter, setLocationFilter] = useState(searchParams.get("location") || "all");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
  const [budgetFilter, setBudgetFilter] = useState(searchParams.get("budget") || "all");
  const [sortBy, setSortBy] = useState("featured");
  const [loading, setLoading] = useState(true);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  useEffect(() => {
    const col = collection(db, "properties");
    const q = fsQuery(col, fsOrderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const out: any[] = [];
        snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
        setAllProperties(out);
        setTimeout(() => {
          setLoading(false);
        }, 300);
      },
      (err) => {
        console.error("Properties listener error:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Sync URL search params if changed from outside
  useEffect(() => {
    const urlSearch = searchParams.get("search");
    const urlType = searchParams.get("type");
    const urlLocation = searchParams.get("location");
    const urlBudget = searchParams.get("budget");
    if (urlSearch !== null) setSearch(urlSearch);
    if (urlType !== null) setTypeFilter(urlType);
    if (urlLocation !== null) setLocationFilter(urlLocation);
    if (urlBudget !== null) setBudgetFilter(urlBudget);
  }, [searchParams]);

  const locationOptions = useMemo(() => {
    const uniq = new Set<string>();
    allProperties.forEach((p) => {
      const loc = (p?.location || "").toString().trim();
      if (loc) uniq.add(loc);
    });
    return Array.from(uniq).sort((a, b) => a.localeCompare(b));
  }, [allProperties]);

  const resetAllFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setLocationFilter("all");
    setStatusFilter("all");
    setBudgetFilter("all");
    setSortBy("featured");
    setSearchParams({});
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (typeFilter !== "all") count++;
    if (locationFilter !== "all") count++;
    if (statusFilter !== "all") count++;
    if (budgetFilter !== "all") count++;
    return count;
  }, [search, typeFilter, locationFilter, statusFilter, budgetFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    const parsePrice = (p: any) => {
      const raw = p?.price;
      if (typeof raw === "number") return raw;
      if (typeof raw === "string") {
        const cleaned = raw.replace(/[^0-9.]/g, "");
        const parsed = Number(cleaned);
        return Number.isFinite(parsed) ? parsed : NaN;
      }
      return NaN;
    };

    const matchSearch = (p: any) => {
      if (!q) return true;
      const title = (p.title || "").toString().toLowerCase();
      const loc = (p.location || "").toString().toLowerCase();
      return title.includes(q) || loc.includes(q);
    };

    const matchType = (p: any) => {
      if (typeFilter === "all") return true;
      const t = (p.type || "").toString().toLowerCase();
      const filterLower = typeFilter.toLowerCase();
      if (filterLower === "residential" || filterLower === "flat") return /flat|residential|apartment|house|bhk|studio/.test(t);
      if (filterLower === "commercial" || filterLower === "office") return /commercial|shop|office|retail/.test(t);
      if (filterLower === "land" || filterLower === "plot") return /land|plot|site/.test(t);
      if (filterLower === "bungalow") return /bungalow|villa|row house/.test(t);
      return t.includes(filterLower);
    };

    const matchLocation = (p: any) => {
      if (locationFilter === "all") return true;
      const loc = (p.location || "").toString().trim().toLowerCase();
      return loc === locationFilter.toLowerCase();
    };

    const matchStatus = (p: any) => {
      if (statusFilter === "all") return true;
      const s = (p.status || "").toString().toLowerCase();
      const isSell = /sold|sell|sale/.test(s);
      const isRent = /rent|rented|lease/.test(s);
      if (statusFilter === "sale") return isSell;
      if (statusFilter === "rent") return isRent;
      return true;
    };

    const matchBudget = (p: any) => {
      if (budgetFilter === "all") return true;
      const price = parsePrice(p);
      if (!Number.isFinite(price)) return false;

      if (budgetFilter === "under-15000") return price <= 15000;
      if (budgetFilter === "15000-30000") return price >= 15000 && price <= 30000;
      if (budgetFilter === "30000-60000") return price >= 30000 && price <= 60000;
      if (budgetFilter === "above-60000") return price >= 60000;

      if (budgetFilter.endsWith("+")) {
        const min = Number(budgetFilter.replace("+", ""));
        return Number.isFinite(min) ? price >= min : true;
      }

      if (budgetFilter.includes("-")) {
        const [minRaw, maxRaw] = budgetFilter.split("-");
        const min = Number(minRaw);
        const max = Number(maxRaw);
        return price >= min && price <= max;
      }

      const limit = Number(budgetFilter);
      return Number.isFinite(limit) ? price <= limit : true;
    };

    const matched = allProperties.filter(
      (p) => matchSearch(p) && matchType(p) && matchLocation(p) && matchStatus(p) && matchBudget(p)
    );

    // Sorting
    return [...matched].sort((a, b) => {
      if (sortBy === "price_asc") {
        return (parsePrice(a) || 0) - (parsePrice(b) || 0);
      }
      if (sortBy === "price_desc") {
        return (parsePrice(b) || 0) - (parsePrice(a) || 0);
      }
      if (sortBy === "newest") {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      }
      // Default: featured first
      const aFeatured = Boolean(a?.is_featured ?? a?.isFeatured);
      const bFeatured = Boolean(b?.is_featured ?? b?.isFeatured);
      return Number(bFeatured) - Number(aFeatured);
    });
  }, [allProperties, search, typeFilter, locationFilter, statusFilter, budgetFilter, sortBy]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      {/* Header Banner */}
      <section className="bg-primary/95 dark:bg-card border-b border-primary-foreground/10 text-primary-foreground py-10">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-3xl">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-white tracking-tight">
              Verified Properties in <span className="text-gradient-gold">Rajkot</span>
            </h1>
            <p className="mt-2 text-white/80 font-body text-sm sm:text-base">
              Browse thoroughly inspected flats, bungalows, and commercial units available for immediate lease and purchase.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Area: Sidebar + Grid */}
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-8 flex-1">
        {/* Top Control Bar (Mobile filter toggle + Result count + Sort dropdown) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            {/* Mobile Filter Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMobileFilterOpen(true)}
              className="lg:hidden h-10 border-border text-foreground font-medium"
            >
              <Filter className="h-4 w-4 mr-2 text-accent" />
              Filters
              {activeFiltersCount > 0 && (
                <span className="ml-2 w-5 h-5 rounded-full bg-accent text-accent-foreground text-xs flex items-center justify-center font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </Button>

            <div className="text-sm text-muted-foreground font-body">
              {loading ? (
                "Scanning catalog..."
              ) : (
                <span>
                  Showing <strong className="text-foreground">{filtered.length}</strong> of{" "}
                  {allProperties.length} properties
                </span>
              )}
            </div>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider hidden sm:inline">
              Sort by:
            </span>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px] h-10 font-body text-xs sm:text-sm">
                <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-accent" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="featured">Featured First</SelectItem>
                <SelectItem value="price_asc">Price: Low to High</SelectItem>
                <SelectItem value="price_desc">Price: High to Low</SelectItem>
                <SelectItem value="newest">Recently Listed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 2-Column Layout: Filter Sidebar (Desktop) + Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden lg:block lg:col-span-3 sticky top-24 space-y-6 bg-card rounded-2xl p-6 border border-border shadow-card">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2 font-display font-bold text-base text-foreground">
                <SlidersHorizontal className="h-4 w-4 text-accent" />
                <span>Refine Search</span>
              </div>
              {activeFiltersCount > 0 && (
                <button
                  onClick={resetAllFilters}
                  className="text-xs text-accent hover:underline flex items-center gap-1 font-medium"
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
              )}
            </div>

            {/* Keyword / Title search */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Keyword / Society
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="e.g. 3 BHK, Garden View..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-10 text-sm"
                />
              </div>
            </div>

            {/* Status Segment */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Listing Type
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted/60 rounded-xl">
                {[
                  { value: "all", label: "All" },
                  { value: "rent", label: "For Rent" },
                  { value: "sale", label: "For Sale" },
                ].map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setStatusFilter(tab.value)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                      statusFilter === tab.value
                        ? "bg-card text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Property Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Category
              </label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="residential">Residential Flats / Homes</SelectItem>
                  <SelectItem value="bungalow">Bungalows & Villas</SelectItem>
                  <SelectItem value="commercial">Commercial Shops</SelectItem>
                  <SelectItem value="office">Corporate Offices</SelectItem>
                  <SelectItem value="land">Plots & Land</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Location Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Zone / Area
              </label>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="All Neighborhoods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Neighborhoods</SelectItem>
                  {locationOptions.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Budget Range */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Budget Ceiling
              </label>
              <Select value={budgetFilter} onValueChange={setBudgetFilter}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Any Price" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Price</SelectItem>
                  <SelectItem value="under-15000">Under ₹15,000 / mo</SelectItem>
                  <SelectItem value="15000-30000">₹15,000 – ₹30,000 / mo</SelectItem>
                  <SelectItem value="30000-60000">₹30,000 – ₹60,000 / mo</SelectItem>
                  <SelectItem value="above-60000">₹60,000+ / mo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </aside>

          {/* Cards Grid (1/2/3 cols) */}
          <main className="lg:col-span-9">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              /* Elegant Empty State */
              <div className="bg-card rounded-2xl p-12 text-center border border-border shadow-card max-w-lg mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                  <Building className="h-8 w-8" />
                </div>
                <h3 className="font-display font-bold text-xl text-card-foreground">
                  No Properties Match Your Criteria
                </h3>
                <p className="mt-2 text-sm text-muted-foreground font-body leading-relaxed">
                  We couldn't find any listings matching these exact filters. Try broadening your location or budget ceiling, or post an inquiry and our team will find it off-market.
                </p>
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button variant="outline" onClick={resetAllFilters} className="w-full sm:w-auto">
                    <RotateCcw className="h-4 w-4 mr-2" /> Reset Filters
                  </Button>
                  <Button
                    onClick={() => (window.location.href = "/inquiry")}
                    className="w-full sm:w-auto bg-accent text-accent-foreground font-semibold"
                  >
                    Post Requirement
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((property, i) => (
                  <PropertyCard key={property.id} property={property} index={i} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Bottom-Sheet Filter Drawer */}
      <AnimatePresence>
        {mobileFilterOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setMobileFilterOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative z-10 bg-card rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto border-t border-border shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                  <SlidersHorizontal className="h-5 w-5 text-accent" />
                  <span>Filter Properties</span>
                </div>
                <button
                  onClick={() => setMobileFilterOpen(false)}
                  className="p-1 rounded-full text-muted-foreground hover:text-foreground"
                  aria-label="Close filters"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Status Segment */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Listing Type
                </label>
                <div className="grid grid-cols-3 gap-2 p-1 bg-muted/60 rounded-xl">
                  {[
                    { value: "all", label: "All" },
                    { value: "rent", label: "For Rent" },
                    { value: "sale", label: "For Sale" },
                  ].map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setStatusFilter(tab.value)}
                      className={`py-2 rounded-lg text-xs font-semibold ${
                        statusFilter === tab.value
                          ? "bg-card text-foreground shadow-xs"
                          : "text-muted-foreground"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Keyword search */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Search
                </label>
                <Input
                  placeholder="Keyword or location..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-11"
                />
              </div>

              {/* Property Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Category
                </label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="residential">Residential Flats / Homes</SelectItem>
                    <SelectItem value="bungalow">Bungalows & Villas</SelectItem>
                    <SelectItem value="commercial">Commercial Shops</SelectItem>
                    <SelectItem value="office">Corporate Offices</SelectItem>
                    <SelectItem value="land">Plots & Land</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Location Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Area
                </label>
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="All Neighborhoods" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Neighborhoods</SelectItem>
                    {locationOptions.map((loc) => (
                      <SelectItem key={loc} value={loc}>
                        {loc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Budget */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Budget
                </label>
                <Select value={budgetFilter} onValueChange={setBudgetFilter}>
                  <SelectTrigger className="h-11">
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

              <div className="pt-2 flex gap-3">
                <Button
                  variant="outline"
                  onClick={resetAllFilters}
                  className="flex-1 h-11"
                >
                  Reset
                </Button>
                <Button
                  onClick={() => setMobileFilterOpen(false)}
                  className="flex-1 h-11 bg-accent text-accent-foreground font-semibold"
                >
                  Show ({filtered.length}) Units
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default Properties;