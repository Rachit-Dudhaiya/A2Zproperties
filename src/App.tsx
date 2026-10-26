import React, { useEffect, Suspense, lazy } from "react";
import { Toaster as Sonner, toast } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import ScrollToTop from "@/components/ScrollToTop";
import "react-loading-skeleton/dist/skeleton.css";
import { SkeletonTheme } from "react-loading-skeleton";
import { generateFirebaseToken } from "./integrations/firebase/client";
import { onForegroundMessage } from "./integrations/firebase/fcm";
import WhatsAppButton from "@/components/WhatsAppButton";

// Code-split pages for instant initial load and smooth navigation
const Index = lazy(() => import("./pages/Index"));
const Properties = lazy(() => import("./pages/Properties"));
const PropertyDetail = lazy(() => import("./pages/PropertyDetail"));
const AddEditProperty = lazy(() => import("./pages/AddEditProperty"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Auth = lazy(() => import("./pages/Auth"));
const MyBookings = lazy(() => import("./pages/MyBookings"));
const Inquiry = lazy(() => import("./pages/Inquiry"));
const NotFound = lazy(() => import("./pages/NotFound"));
const BookSlot = lazy(() => import("./pages/BookSlot"));
const About = lazy(() => import("./pages/About"));

const queryClient = new QueryClient();

const PageLoadingFallback = () => (
  <div className="min-h-[70vh] flex flex-col items-center justify-center">
    <div className="w-9 h-9 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
    <span className="mt-3 text-[11px] font-semibold tracking-widest uppercase text-muted-foreground font-body">
      Loading...
    </span>
  </div>
);

const ProtectedAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAdmin, loading, refreshRole } = useAuth();
  const [checking, setChecking] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    const ensure = async () => {
      if (loading) return;
      if (!user) {
        if (mounted) setChecking(false);
        return;
      }
      try {
        await refreshRole();
      } catch {
        // ignore
      } finally {
        if (mounted) setChecking(false);
      }
    };
    ensure();
    return () => {
      mounted = false;
    };
  }, [user, loading, refreshRole]);

  if (loading || checking) return <PageLoadingFallback />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoadingFallback />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <div key={location.pathname} className="page-smooth-enter min-h-screen">
        <Routes location={location}>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/properties" element={<Properties />} />
          <Route path="/property/:id" element={<PropertyDetail />} />
          <Route path="/inquiry" element={<Inquiry />} />
          <Route path="/about" element={<About />} />
          <Route path="/book" element={<BookSlot />} />
          <Route
            path="/my-bookings"
            element={
              <ProtectedRoute>
                <MyBookings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/add-property"
            element={
              <ProtectedAdminRoute>
                <AddEditProperty />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/edit-property/:id"
            element={
              <ProtectedAdminRoute>
                <AddEditProperty />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedAdminRoute>
                <Dashboard />
              </ProtectedAdminRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </Suspense>
  );
};

const App = () => {
  useEffect(() => {
    generateFirebaseToken();
    const unsubscribe = onForegroundMessage((payload) => {
      if (payload?.notification?.body) {
        toast(payload.notification.body);
      }
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <AuthProvider>
            <SkeletonTheme baseColor="#fdfdfd" highlightColor="#667ea0">
              <AnimatedRoutes />
            </SkeletonTheme>
          </AuthProvider>
          <WhatsAppButton />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
