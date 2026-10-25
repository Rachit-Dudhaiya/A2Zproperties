import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Building2, Mail, Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck, ArrowLeft, PhoneCall } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isValidEmail } from "@/lib/validation";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; fullName?: string }>({});

  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: { email?: string; password?: string; fullName?: string } = {};

    if (!email.trim()) nextErrors.email = "Email address is required";
    else if (!isValidEmail(email)) nextErrors.email = "Please enter a valid email address";

    if (!password) nextErrors.password = "Password is required";
    else if (password.length < 6) nextErrors.password = "Password must be at least 6 characters";

    if (!isLogin && !fullName.trim()) nextErrors.fullName = "Full name is required";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const firstError = Object.values(nextErrors).find(Boolean);
      toast({
        title: "Please complete the required fields",
        description: firstError,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast({ title: "Welcome back to A TO Z Properties!" });
        navigate("/");
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) throw error;
        toast({
          title: "Account Created Successfully!",
          description: "You are now logged in.",
        });
        navigate("/");
      }
    } catch (error: any) {
      toast({
        title: "Authentication Failed",
        description: error.message || "Could not sign in with these credentials.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAlternateLogin = (provider: string) => {
    toast({
      title: `${provider} Login`,
      description: "Direct email and password login is currently active for this rental portal.",
    });
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-background">
      {/* Decorative Emerald Glow Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/30 via-background to-background pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-primary/20 blur-3xl pointer-events-none" />

      {/* Top back to home link */}
      <Link
        to="/"
        className="absolute top-6 left-6 z-20 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-full bg-card/60 backdrop-blur-md border border-border"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Home
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-card/95 backdrop-blur-xl rounded-3xl border border-border shadow-2xl p-6 sm:p-8">
          {/* Header & Logo */}
          <div className="text-center mb-6">
            <Link to="/" className="inline-flex items-center justify-center gap-2 mb-3 group">
              <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <Building2 className="h-6 w-6 text-accent" />
              </div>
            </Link>

            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight">
              A TO Z <span className="text-accent">Properties</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-body mt-1">
              {isLogin
                ? "Sign in to manage your site visits and saved properties"
                : "Register to unlock exclusive rental listings in Palitana"}
            </p>

            {/* Tab Pill Toggle */}
            <div className="mt-5 grid grid-cols-2 rounded-xl bg-muted p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(true);
                  setErrors({});
                }}
                className={`py-2 rounded-lg transition-all ${
                  isLogin
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLogin(false);
                  setErrors({});
                }}
                className={`py-2 rounded-lg transition-all ${
                  !isLogin
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Create Account
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  key="fullNameField"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1.5"
                >
                  <Label className="text-xs font-medium text-foreground">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
                      }}
                      placeholder="e.g. Ramesh Patel"
                      className={`pl-10 h-11 ${errors.fullName ? "border-destructive" : ""}`}
                    />
                  </div>
                  {errors.fullName && <p className="text-[11px] text-destructive">{errors.fullName}</p>}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  placeholder="name@example.com"
                  className={`pl-10 h-11 ${errors.email ? "border-destructive" : ""}`}
                />
              </div>
              {errors.email && <p className="text-[11px] text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-foreground">Password</Label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() =>
                      toast({
                        title: "Reset Password",
                        description: "Please contact our support team at +91 94285 24072 for credential reset assistance.",
                      })
                    }
                    className="text-[11px] font-semibold text-primary hover:underline"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  placeholder="••••••••"
                  className={`pl-10 pr-10 h-11 ${errors.password ? "border-destructive" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-[11px] text-destructive">{errors.password}</p>}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-accent text-accent-foreground font-semibold shadow-md mt-2"
            >
              {loading ? (
                "Authenticating..."
              ) : isLogin ? (
                <>
                  <span>Sign In to Account</span>
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Alternative Social / Phone Options */}
          <div className="mt-6 pt-6 border-t border-border">
            <div className="relative text-center mb-4">
              <span className="bg-card px-3 text-[11px] font-medium text-muted-foreground">
                Or continue with
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleAlternateLogin("Google")}
                className="h-10 rounded-xl border border-border bg-background hover:bg-muted/50 text-foreground text-xs font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Google</span>
              </button>

              <button
                type="button"
                onClick={() => handleAlternateLogin("Phone SMS")}
                className="h-10 rounded-xl border border-border bg-background hover:bg-muted/50 text-foreground text-xs font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <PhoneCall className="h-4 w-4 text-emerald-600" />
                <span>Phone OTP</span>
              </button>
            </div>
          </div>

          {/* Trust Footer */}
          <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Encrypted Authentication & Data Privacy</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
