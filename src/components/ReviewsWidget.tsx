import React, { useEffect, useRef, useState } from "react";
import { Star, CheckCircle2, ExternalLink } from "lucide-react";

interface ReviewsWidgetProps {
  widgetId?: string;
  className?: string;
}

const VERIFIED_FALLBACK_REVIEWS = [
  {
    name: "Vishal Pujara",
    rating: 5,
    timeAgo: "2 weeks ago",
    text: "Thank you 😊",
    response:
      "Thank you so much for your valuable review! We're thrilled that our 1 BHK fully furnished tenement for rent near KKV Hall, Kalawad Road met your expectations.",
    avatar: "VP",
    avatarBg: "bg-emerald-600",
  },
  {
    name: "Naimish Gedia",
    rating: 5,
    timeAgo: "2 weeks ago",
    text: "A to Z properties gives best service in real estate. Dream place to find dream home :)",
    response:
      "We're delighted to hear that you've had a fantastic experience with us! Proud to be a top real estate agency in Rajkot providing premier residential and commercial options.",
    avatar: "NG",
    avatarBg: "bg-indigo-600",
  },
  {
    name: "Gautam Kumbhani",
    rating: 5,
    timeAgo: "1 month ago",
    text: "I got my rental Great flat with A To Z properties at Kruti Onella, Rajkot.",
    response:
      "Delighted to hear that you had a fantastic experience with us finding your new home at Kruti Onella! Our team is dedicated to providing transparent real estate services in Rajkot.",
    avatar: "GK",
    avatarBg: "bg-amber-600",
  },
  {
    name: "Meera Makwana",
    rating: 5,
    timeAgo: "1 month ago",
    text: "Very good behave and excellent brokerage deal.",
    response:
      "We're thrilled that you found our behavior to be very good and our brokerage deal to be excellent! Delighted to assist with prime office spaces and homes.",
    avatar: "MM",
    avatarBg: "bg-rose-600",
  },
  {
    name: "Nilu 1911",
    rating: 5,
    timeAgo: "2 months ago",
    text: "Great service, All types of properties available in all area of Rajkot like 150 feet ring road, Office for rent at shital park, House and flat for rent in mavdi area. Must get your property from A To Z properties Rajkot.",
    response:
      "Thank you for recommending us as the best property broker in Mavdi area and for your trust in our services! Committed to excellence across all Rajkot corridors.",
    avatar: "N1",
    avatarBg: "bg-blue-600",
  },
  {
    name: "Jiten Dattani",
    rating: 5,
    timeAgo: "2 months ago",
    text: "Outstanding experience with A to Z Property. They understand customer needs, provide genuine guidance, and offer the best property options. Thank you for your excellent support!",
    response:
      "We're thrilled that you found our team to be customer-centric, providing genuine guidance and offering the best property options in Rajkot.",
    avatar: "JD",
    avatarBg: "bg-purple-600",
  },
];

export const ReviewsWidget: React.FC<ReviewsWidgetProps> = ({
  widgetId = "3af6f16a-bc61-4b1a-8090-ee042c4eb512",
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [, setMounted] = useState(false);

  useEffect(() => {
    // 1. Ensure the reviewswidget script tag is appended to the document
    const SCRIPT_SRC = "https://reviewswidget.app/embed.js";
    let script = document.querySelector(
      `script[src="${SCRIPT_SRC}"]`
    ) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      document.head.appendChild(script);
    }

    // 2. React SPA Route Navigation handling:
    // If user navigates back to Home, reviewswidget.app's MutationObserver on document.documentElement
    // detects newly added [data-reviewgrid] elements. To guarantee execution even if the DOM node
    // was mounted synchronously before the observer re-evaluates, we trigger a lightweight DOM ping.
    const el = containerRef.current;
    if (el && !el.hasAttribute("data-reviewgrid-ready")) {
      const ping = document.createElement("span");
      ping.style.display = "none";
      el.appendChild(ping);
      setTimeout(() => {
        try {
          if (ping.parentNode === el) el.removeChild(ping);
        } catch {
          // ignore
        }
      }, 50);
    }

    setMounted(true);
  }, [widgetId]);

  return (
    <div className={`reviews-widget-container w-full ${className}`}>
      {/* 
        Official reviewswidget.app Embed Target:
        - data-reviewgrid: Unique widget ID
        - data-min-height: Prevents Cumulative Layout Shift (CLS) during script fetch
      */}
      <div
        ref={containerRef}
        data-reviewgrid={widgetId}
        data-min-height="360"
        className="w-full min-h-[360px]"
      >
        {/* 
          Official [data-rg-fallback]:
          reviewswidget.app preserves this for SEO web crawlers and automatically
          replaces it with the live interactive widget once fetched.
        */}
        <div data-rg-fallback className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {VERIFIED_FALLBACK_REVIEWS.map((r, i) => (
              <div
                key={i}
                className="bg-card rounded-2xl p-6 border border-border shadow-card flex flex-col justify-between hover:shadow-card-hover transition-all duration-300 text-left"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full ${r.avatarBg} text-white flex items-center justify-center font-bold text-sm shadow-xs`}
                      >
                        {r.avatar}
                      </div>
                      <div>
                        <div className="font-display font-bold text-sm text-foreground">
                          {r.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                          <span>Google Maps Review</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-1.5 rounded-md bg-muted/60" title="Posted on Google">
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                        />
                      </svg>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-0.5 text-amber-500">
                      {Array.from({ length: r.rating }).map((_, starIdx) => (
                        <Star
                          key={starIdx}
                          className="h-4 w-4 fill-amber-400 text-amber-400"
                        />
                      ))}
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {r.timeAgo}
                    </span>
                  </div>

                  <p className="text-card-foreground/90 font-body text-sm leading-relaxed">
                    "{r.text}"
                  </p>

                  {r.response && (
                    <div className="mt-4 p-3 rounded-xl bg-muted/50 border border-border/50">
                      <div className="text-[11px] font-semibold text-primary dark:text-accent mb-1">
                        Response from Team A to Z properties
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {r.response}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Rajkot, Gujarat</span>
                  <a
                    href="https://maps.google.com/?cid=13291349262997318503&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    View on Maps <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewsWidget;
