import * as admin from "firebase-admin";

const initAdmin = () => {
  if (admin.apps.length) return;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    const serviceAccount = JSON.parse(raw);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    return;
  }
  admin.initializeApp();
};

const withCors = (res: any) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
};

const getBearerToken = (req: any) => {
  const authHeader = String(req.headers?.authorization || "");
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
};

// Notification types that unauthenticated public visitors (inquiry/booking
// forms) are allowed to trigger. Anything else requires a verified admin.
const PUBLIC_TYPES = new Set(["inquiry", "booking", "contact"]);

// Simple best-effort in-memory rate limiter per serverless instance.
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

const isRateLimited = (key: string): boolean => {
  const now = Date.now();
  if (rateBuckets.size > 500) {
    for (const [k, v] of rateBuckets) {
      if (v.resetAt < now) rateBuckets.delete(k);
    }
  }
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT;
};

export default async function handler(req: any, res: any) {
  withCors(res);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const body = req.body || {};
  const type = String(body.type || "").slice(0, 40);
  const refId = String(body.refId || "").slice(0, 64);
  const title = String(body.title || "").slice(0, 120);
  const message = String(body.message || body.body || "").slice(0, 400);
  const extraData = body.data && typeof body.data === "object" ? body.data : {};

  if (!type) {
    res.status(400).json({ ok: false, error: "Missing type" });
    return;
  }

  // Determine caller: verified admin (any type) or public visitor (whitelist only).
  let isAdmin = false;
  const token = getBearerToken(req);
  if (token) {
    try {
      initAdmin();
      const decoded = await admin.auth().verifyIdToken(token);
      const db = admin.firestore();
      const roleSnap = await db.collection("roles").doc(decoded.uid).get();
      const role = roleSnap.exists ? roleSnap.data()?.role : null;
      isAdmin = role === "admin";
    } catch (e) {
      // Invalid/expired token -> fall through and treat as public visitor.
      isAdmin = false;
    }
  }

  if (!isAdmin && !PUBLIC_TYPES.has(type)) {
    res.status(403).json({ ok: false, error: "Not authorized" });
    return;
  }

  // Rate limit anonymous callers only (admins are trusted).
  if (!isAdmin) {
    const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown")
      .split(",")[0]
      .trim();
    if (isRateLimited(`${ip}:${type}`)) {
      res.status(429).json({ ok: false, error: "Too many requests, please slow down" });
      return;
    }
  }

  try {
    initAdmin();
    const db = admin.firestore();
    const snap = await db.collection("fcm_tokens").where("role", "==", "admin").get();
    const tokens: string[] = [];
    snap.forEach((d) => {
      const t = d.data()?.token;
      if (t) tokens.push(t);
    });
    if (tokens.length === 0) {
      res.json({ ok: true, sent: 0, note: "No admin FCM tokens registered yet" });
      return;
    }

    const stringData: Record<string, string> = {
      type,
      refId,
      link: "/dashboard",
      ...Object.fromEntries(
        Object.entries(extraData).map(([k, v]) => [k, String(v)])
      ),
    };

    const payload: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title: title || (type === "booking" ? "New Booking" : type === "inquiry" ? "New Inquiry" : "Notification"),
        body: message,
      },
      data: stringData,
    };

    const result = await admin.messaging().sendMulticast(payload);

    // Cleanup invalid/expired tokens so they don't accumulate.
    const invalidTokens: string[] = [];
    result.responses.forEach((r, i) => {
      if (!r.success) {
        const err = r.error as any;
        if (
          err &&
          (err.code === "messaging/registration-token-not-registered" ||
            err.code === "messaging/invalid-registration-token")
        ) {
          invalidTokens.push(tokens[i]);
        }
      }
    });
    for (const t of invalidTokens) {
      try {
        await db.collection("fcm_tokens").doc(t).delete();
      } catch (e) {
        /* ignore */
      }
    }

    res.json({ ok: true, success: result.successCount, failure: result.failureCount });
  } catch (err: any) {
    console.error("sendNotification error", err);
    res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
}
