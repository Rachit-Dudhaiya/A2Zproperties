import React, { useState, useEffect } from 'react';
import Loader from './Loader';

export const WebsitePreloader: React.FC = () => {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    // Lock body scroll while loader is visible
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    let finishTimer: ReturnType<typeof setTimeout> | undefined;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;

    const finish = () => {
      setPercent(100);
      finishTimer = setTimeout(() => {
        setFading(true);
        hideTimer = setTimeout(() => {
          setVisible(false);
          document.body.style.overflow = originalOverflow;
        }, 220);
      }, 80);
    };

    // Keep the handoff short; the route and its own loading state handle real work.
    finishTimer = setTimeout(finish, 420);

    // Global helper so user can call window.showWebsiteLoader() in console or via button
    const handleReplay = () => {
      if (finishTimer) clearTimeout(finishTimer);
      if (hideTimer) clearTimeout(hideTimer);
      setVisible(true);
      setFading(false);
      setPercent(0);
      document.body.style.overflow = 'hidden';
      finishTimer = setTimeout(finish, 420);
    };

    (window as any).showWebsiteLoader = handleReplay;
    window.addEventListener('trigger-website-loader', handleReplay);

    return () => {
      if (finishTimer) clearTimeout(finishTimer);
      if (hideTimer) clearTimeout(hideTimer);
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('trigger-website-loader', handleReplay);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      id="website-preloader"
      role="status"
      aria-live="polite"
      aria-label="Loading A TO Z Properties"
      className={`fixed inset-0 z-[99999999] flex flex-col items-center justify-center bg-background select-none transition-all duration-700 ease-out ${
        fading ? 'opacity-0 pointer-events-none scale-105' : 'opacity-100 scale-100'
      }`}
    >
      {/* Subtle luxury ambient radial backdrop glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(15,61,46,0.06)_0%,transparent_70%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.06)_0%,transparent_70%)] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center justify-center max-w-sm px-6 py-10">
        {/* Brand Logo Header */}
        <div className="mb-7 h-14 w-14 rounded-2xl bg-card border border-border shadow-lg flex items-center justify-center overflow-hidden transition-transform duration-500 hover:scale-105">
          <img
            src="/az-logo-clean.png"
            alt="A TO Z Properties"
            className="h-9 w-9 object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>

        {/* Isometric Cube Wireframe Loader (Prominent Size) */}
        <div className="my-4 py-2">
          <Loader size="lg" />
        </div>

        {/* Brand Identity & Status */}
        <div className="mt-7 text-center">
          <h1 className="text-sm sm:text-base font-display font-bold tracking-[0.25em] text-foreground uppercase">
            A TO Z Properties
          </h1>
          <p className="text-[11px] font-medium tracking-widest text-muted-foreground uppercase mt-1.5 font-body">
            Rajkot's Trusted Rental Network
          </p>
        </div>

        {/* Loading Progress Percentage and Indicator Bar */}
        <div className="w-48 mt-6 flex flex-col items-center gap-2">
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden border border-border/40">
            <div
              className="h-full bg-primary transition-all duration-100 ease-out rounded-full shadow-[0_0_8px_rgba(15,61,46,0.4)] dark:shadow-[0_0_8px_rgba(56,189,248,0.4)]"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="flex items-center justify-between w-full text-[10px] font-semibold text-muted-foreground tracking-wider uppercase">
            <span>Loading Experience</span>
            <span className="font-mono text-foreground font-bold">{percent}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebsitePreloader;
