import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { auth, db } from "@/integrations/firebase/client";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  type User as FbUser,
  GoogleAuthProvider,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export interface AuthUser {
  id: string;
  email?: string | null;
  full_name?: string | null;
  phone?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  session: null;
  isAdmin: boolean;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any; user?: FbUser }>;
  setupRecaptcha: (containerId: string) => any;
  sendPhoneOtp: (phone: string, appVerifier: any) => Promise<{ confirmationResult: ConfirmationResult | null; error: any }>;
  refreshRole: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const cached = localStorage.getItem("a2z_auth_user");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const ensureRoleDoc = async (fbUser: FbUser) => {
    if (!db) return { role: "user" };
    const roleRef = doc(db, "roles", fbUser.uid);
    const roleSnap = await getDoc(roleRef);
    const email = fbUser.email ?? null;
    const fullName = fbUser.displayName ?? (fbUser.phoneNumber ? fbUser.phoneNumber : null);
    const phone = fbUser.phoneNumber ?? null;

    if (!roleSnap.exists()) {
      await setDoc(roleRef, {
        role: "user",
        email: email || null,
        full_name: fullName || null,
        phone: phone || null,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      });
      return { role: "user" };
    }

    const existing = roleSnap.data() || {};
    await setDoc(
      roleRef,
      {
        email: email || existing.email || null,
        full_name: fullName || existing.full_name || null,
        phone: phone || existing.phone || null,
        lastLogin: serverTimestamp(),
      },
      { merge: true }
    );

    return roleSnap.data();
  };

  const checkAdmin = async (uid: string) => {
    try {
      const roleDoc = await getDoc(doc(db, "roles", uid));
      if (roleDoc.exists()) {
        const data = roleDoc.data();
        setIsAdmin(data?.role === "admin");
      } else {
        setIsAdmin(false);
      }
    } catch (err) {
      setIsAdmin(false);
    }
  };

  const refreshRole = async () => {
    if (!auth || !auth.currentUser) return;
    try {
      await checkAdmin(auth.currentUser.uid);
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    if (!auth) {
      console.warn('Firebase auth not initialized. Skipping auth listener.');
      setLoading(false);
      return;
    }

    try {
      setPersistence(auth, browserLocalPersistence).catch((err) => {
        console.warn("setPersistence warning:", err);
      });
    } catch (e) {
      console.warn("Failed to set browserLocalPersistence:", e);
    }

    const unsub = onAuthStateChanged(auth, async (fbUser: FbUser | null) => {
      if (fbUser) {
        const authUserData: AuthUser = {
          id: fbUser.uid,
          email: fbUser.email ?? null,
          full_name: fbUser.displayName ?? (fbUser.phoneNumber ? fbUser.phoneNumber : null),
          phone: fbUser.phoneNumber ?? null,
        };
        setUser(authUserData);
        try {
          localStorage.setItem("a2z_auth_user", JSON.stringify(authUserData));
        } catch {}

        try {
          const roleData = await ensureRoleDoc(fbUser);
          setIsAdmin(roleData?.role === "admin");
        } catch (err) {
          await checkAdmin(fbUser.uid);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
        try {
          localStorage.removeItem("a2z_auth_user");
        } catch {}
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    if (!auth) return { error: new Error('Auth not initialized') };
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName: fullName });
        setUser({
          id: userCredential.user.uid,
          email: userCredential.user.email ?? null,
          full_name: fullName,
          phone: userCredential.user.phoneNumber ?? null,
        });
        try {
          // Create a roles document so new users default to role 'user'
          await setDoc(doc(db, "roles", userCredential.user.uid), {
            role: "user",
            email,
            full_name: fullName,
            phone: userCredential.user.phoneNumber ?? null,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
          });
        } catch (err) {
          // Non-fatal: role document creation failed
          console.warn("Failed to write role document:", err);
        }
      }
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!auth) return { error: new Error('Auth not initialized') };
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signInWithGoogle = async () => {
    if (!auth) return { error: new Error('Auth not initialized') };
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const userCredential = await signInWithPopup(auth, provider);
      if (userCredential.user) {
        await ensureRoleDoc(userCredential.user);
      }
      return { error: null, user: userCredential.user };
    } catch (error: any) {
      return { error };
    }
  };

  const setupRecaptcha = (containerId: string) => {
    if (!auth) return null;
    if (typeof window === "undefined") return null;
    try {
      if ((window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear();
        } catch (e) {
          // ignore
        }
      }
      const verifier = new RecaptchaVerifier(auth, containerId, {
        size: "invisible",
        callback: () => {
          // reCAPTCHA solved
        },
      });
      (window as any).recaptchaVerifier = verifier;
      return verifier;
    } catch (err) {
      console.error("RecaptchaVerifier setup error:", err);
      return null;
    }
  };

  const sendPhoneOtp = async (phoneNumber: string, appVerifier: any) => {
    if (!auth) return { confirmationResult: null, error: new Error('Auth not initialized') };
    try {
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      return { confirmationResult, error: null };
    } catch (error: any) {
      return { confirmationResult: null, error };
    }
  };

  const signOut = async () => {
    try {
      localStorage.removeItem("a2z_auth_user");
    } catch {}
    if (!auth) {
      console.warn('Auth not initialized; signOut skipped');
      setUser(null);
      setIsAdmin(false);
      return;
    }
    await fbSignOut(auth);
    setUser(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session: null,
        isAdmin,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        setupRecaptcha,
        sendPhoneOtp,
        refreshRole,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
