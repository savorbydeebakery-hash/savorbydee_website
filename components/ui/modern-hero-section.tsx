"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface HeroCollageProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode;
  subtitle: string;
  stats: { value: string; label: string }[];
  images: string[];
  backgroundImage?: string;
}

const animationStyle = `
  @keyframes float-up {
    0% { transform: translateY(0px); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); }
    50% { transform: translateY(-15px); box-shadow: 0 35px 60px -15px rgba(0, 0, 0, 0.3); }
    100% { transform: translateY(0px); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); }
  }
  .animate-float-up {
    animation: float-up 6s ease-in-out infinite;
  }
`;

const HeroCollage = React.forwardRef<HTMLDivElement, HeroCollageProps>(
  ({ className, title, subtitle, stats, images, backgroundImage, ...props }, ref) => {
    const displayImages = images.slice(0, 7);

    return (
      <>
        <style>{animationStyle}</style>
        <section
          ref={ref}
          className={cn(
            "relative w-full font-sans py-20 sm:py-32 overflow-hidden",
            className
          )}
          {...props}
        >
          {/* Background image with blur + warm overlay */}
          {backgroundImage && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={backgroundImage}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover blur-sm scale-105 opacity-30"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background/90" />
            </>
          )}

          {/* Main Content */}
          <div className="container relative z-10 mx-auto px-4 text-center">
            <h1 className="font-round8 text-5xl md:text-6xl lg:text-8xl font-bold tracking-tight text-ink">
              {title}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base md:text-lg text-ink-soft">
              {subtitle}
            </p>
          </div>

          {/* Image Collage */}
          <div className="relative z-0 mt-20 h-[400px] sm:h-[500px] md:h-[600px] flex items-center justify-center">
            <div className="relative h-full w-full max-w-6xl">
              {/* Central Image */}
              {displayImages[0] && (
                <img
                  src={displayImages[0]}
                  alt="Main feature"
                  className="absolute left-1/2 top-1/2 h-auto w-[200px] sm:w-[250px] md:w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-2xl shadow-2xl z-20 animate-float-up object-cover aspect-[3/4]"
                  style={{ animationDelay: "0s" }}
                />
              )}
              {/* Top-Left */}
              {displayImages[1] && (
                <img
                  src={displayImages[1]}
                  alt="Feature 2"
                  className="absolute left-[10%] sm:left-[22%] top-[10%] sm:top-[15%] h-auto w-32 sm:w-44 md:w-52 rounded-xl shadow-lg z-10 animate-float-up object-cover aspect-square"
                  style={{ animationDelay: "-1.2s" }}
                />
              )}
              {/* Top-Right */}
              {displayImages[2] && (
                <img
                  src={displayImages[2]}
                  alt="Feature 3"
                  className="absolute right-[10%] sm:right-[24%] top-[5%] sm:top-[10%] h-auto w-28 sm:w-40 md:w-48 rounded-xl shadow-lg z-10 animate-float-up object-cover aspect-square"
                  style={{ animationDelay: "-2.5s" }}
                />
              )}
              {/* Bottom-Right */}
              {displayImages[3] && (
                <img
                  src={displayImages[3]}
                  alt="Feature 4"
                  className="absolute right-[8%] sm:right-[20%] bottom-[8%] sm:bottom-[12%] h-auto w-36 sm:w-48 md:w-60 rounded-xl shadow-lg z-30 animate-float-up object-cover aspect-[4/3]"
                  style={{ animationDelay: "-3.5s" }}
                />
              )}
              {/* Far-Right */}
              {displayImages[4] && (
                <img
                  src={displayImages[4]}
                  alt="Feature 5"
                  className="absolute right-[0%] sm:right-[5%] top-1/2 -translate-y-[60%] h-auto w-32 sm:w-44 md:w-52 rounded-xl shadow-lg z-10 animate-float-up object-cover aspect-square"
                  style={{ animationDelay: "-4.8s" }}
                />
              )}
              {/* Bottom-Left */}
              {displayImages[5] && (
                <img
                  src={displayImages[5]}
                  alt="Feature 6"
                  className="absolute left-[8%] sm:left-[18%] bottom-[5%] sm:bottom-[8%] h-auto w-32 sm:w-44 md:w-56 rounded-xl shadow-lg z-30 animate-float-up object-cover aspect-[4/3]"
                  style={{ animationDelay: "-5.2s" }}
                />
              )}
              {/* Far-Left */}
              {displayImages[6] && (
                <img
                  src={displayImages[6]}
                  alt="Feature 7"
                  className="absolute left-[0%] sm:left-[5%] top-[20%] sm:top-[25%] h-auto w-28 sm:w-40 md:w-48 rounded-xl shadow-lg z-10 animate-float-up object-cover aspect-square"
                  style={{ animationDelay: "-6s" }}
                />
              )}
            </div>
          </div>

          {/* Stats Section */}
          <div className="container relative z-10 mx-auto mt-16 px-4">
            <div className="flex flex-col items-center justify-center gap-8 sm:flex-row sm:gap-16">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <p className="text-4xl font-bold tracking-tight text-pink">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-sm font-medium text-ink-soft">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </>
    );
  }
);

HeroCollage.displayName = "HeroCollage";

export { HeroCollage };
