import React from 'react';
import './Loader.css';

export interface LoaderProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  color?: string;
  fullscreen?: boolean;
}

const Loader: React.FC<LoaderProps> = ({
  className = '',
  size = 'md',
  text,
  color,
  fullscreen = false,
}) => {
  const content = (
    <div
      className={`loader-container ${className}`}
      style={color ? ({ '--loader-color': color } as React.CSSProperties) : undefined}
    >
      <section className={`loader size-${size}`}>
        <div>
          <div>
            <span className="one h6" />
            <span className="two h3" />
          </div>
        </div>
        <div>
          <div>
            <span className="one h1" />
          </div>
        </div>
        <div>
          <div>
            <span className="two h2" />
          </div>
        </div>
        <div>
          <div>
            <span className="one h4" />
          </div>
        </div>
      </section>
      {text && (
        <p className="mt-4 text-xs font-semibold tracking-widest uppercase text-muted-foreground animate-pulse text-center">
          {text}
        </p>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background/90 backdrop-blur-xs p-6">
        {content}
      </div>
    );
  }

  return content;
};

export default Loader;
export { Loader };
