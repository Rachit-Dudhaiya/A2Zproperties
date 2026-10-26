import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Prevent laggy 5000px scroll animations across routes while keeping in-page smooth scrolls
    const root = document.documentElement;
    const prevScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";

    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    root.scrollTop = 0;

    const timer = setTimeout(() => {
      root.style.scrollBehavior = prevScrollBehavior || "";
    }, 50);

    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}
