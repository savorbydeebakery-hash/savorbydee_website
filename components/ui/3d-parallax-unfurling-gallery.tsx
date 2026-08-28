"use client";

import React, { useRef, useEffect, useMemo, useState, useCallback } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

interface ParallaxImage {
  src: string;
  alt?: string;
}

interface ImageCardProps {
  src: string;
  alt?: string;
  onLoad?: () => void;
}

const ImageCard = ({ src, alt, onLoad }: ImageCardProps) => {
  return (
    <div className="w-full h-[200px] sm:h-[300px] md:h-[400px] flex-shrink-0 bg-pink-soft transition-transform duration-300 hover:scale-[1.02] cursor-pointer relative will-change-transform backface-hidden preserve-3d rounded-2xl overflow-hidden">
      <Image
        src={src}
        alt={alt ?? "Gallery asset"}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 320px"
        onLoad={onLoad}
        className="object-cover opacity-80 transition-opacity duration-300 hover:opacity-100"
      />
    </div>
  );
};

interface ParallaxGalleryProps {
  images: ParallaxImage[];
  className?: string;
  children?: React.ReactNode;
  force3D?: boolean;
  showToggle?: boolean;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function ParallaxGallery({
  images,
  className,
  children,
  force3D = false,
  showToggle = false,
}: ParallaxGalleryProps) {
  const scrollWrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const loadedCountRef = useRef(0);
  const [user3D, setUser3D] = useState<boolean | null>(null);

  const handleItemLoad = useCallback(() => {
    loadedCountRef.current += 1;
    if (!isReady && loadedCountRef.current >= 1) setIsReady(true);
  }, [isReady]);

  useEffect(() => {
    const t = setTimeout(() => setIsReady(true), 1200);
    return () => clearTimeout(t);
  }, []);

  const shuffledImages = useMemo(() => shuffleArray(images), [images]);

  const colMedia = useMemo(() => {
    const col1Base = shuffledImages.filter((_, i) => i % 4 === 0);
    const col2Base = shuffledImages.filter((_, i) => i % 4 === 1);
    const col3Base = shuffledImages.filter((_, i) => i % 4 === 2);
    const col4Base = shuffledImages.filter((_, i) => i % 4 === 3);

    return {
      col1: [...col1Base, ...col1Base],
      col2: [...col2Base, ...col2Base],
      col3: [...col3Base, ...col3Base],
      col4: [...col4Base, ...col4Base],
    };
  }, [shuffledImages]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    container: scrollWrapperRef,
    offset: ["start start", "end end"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 20,
    mass: 0.5,
  });

  const bannerWidth = useTransform(smoothProgress, [0, 0.15], ["90vw", "100vw"]);
  const bannerHeight = useTransform(smoothProgress, [0, 0.15], ["80vh", "100vh"]);
  const bannerRadius = useTransform(smoothProgress, [0, 0.15], ["48px", "0px"]);
  const bannerBorderWidth = useTransform(smoothProgress, [0, 0.15], ["4px", "0px"]);

  const rotateY = useTransform(smoothProgress, [0.15, 1], [-45, -8]);
  const rotateX = useTransform(smoothProgress, [0.15, 1], [25, 4]);
  const rotateZ = useTransform(smoothProgress, [0.15, 1], [15, 2]);
  const translateZ = useTransform(smoothProgress, [0.15, 1], [-800, 0]);

  const yCol1 = useTransform(smoothProgress, [0.15, 1], ["0%", "-40%"]);
  const yCol2 = useTransform(smoothProgress, [0.15, 1], ["-40%", "10%"]);
  const yCol3 = useTransform(smoothProgress, [0.15, 1], ["0%", "-40%"]);
  const yCol4 = useTransform(smoothProgress, [0.15, 1], ["-30%", "20%"]);

  const show3D = force3D || user3D === true;

  const renderStaticGrid = () => (
    <section className={`relative w-full ${className ?? ""}`}>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {shuffledImages.map((img, i) => (
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-pink-soft" key={i}>
              <Image
                src={img.src}
                alt={img.alt ?? "Gallery"}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 276px"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </div>
      {showToggle && (
        <button
          onClick={() => setUser3D(true)}
          className="fixed bottom-6 right-6 z-50 rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-ink-soft"
          aria-label="Enable 3D parallax view"
        >
          ✦ View in 3D
        </button>
      )}
    </section>
  );

  if (!show3D && children) {
    return renderStaticGrid();
  }

  return (
    <>
      <div
        ref={scrollWrapperRef}
        className={`w-full h-screen overflow-y-auto overflow-x-hidden bg-background ${className ?? ""}`}
      >
        <section
          ref={containerRef}
          className="relative w-full h-[600vh] bg-background text-ink font-sans selection:bg-pink selection:text-ink"
        >
          <div className="sticky top-0 h-screen w-full flex justify-center items-center overflow-hidden">
            <motion.div
              style={{
                width: bannerWidth,
                height: bannerHeight,
                borderRadius: bannerRadius,
                borderWidth: bannerBorderWidth,
                borderColor: "var(--ink)",
              }}
              className="relative bg-white overflow-hidden flex items-center justify-center max-w-[1920px] mx-auto will-change-transform backface-hidden preserve-3d shadow-lg"
            >
              <div
                className="absolute inset-0 flex justify-center items-center pointer-events-none"
                style={{ perspective: "1000px" }}
              >
                <div className="absolute inset-0 z-20 shadow-[inset_0_100px_150px_-50px_rgba(250,246,241,1),inset_0_-100px_150px_-50px_rgba(250,246,241,1)]" />
                <div className="absolute inset-0 z-20 shadow-[inset_150px_0_150px_-50px_rgba(250,246,241,1),inset_-150px_0_150px_-50px_rgba(250,246,241,1)]" />

                <motion.div
                  style={{
                    rotateX,
                    rotateY,
                    rotateZ,
                    z: translateZ,
                    transformStyle: "preserve-3d",
                  }}
                  className="flex gap-4 md:gap-6 justify-center items-center w-[120vw] h-[150vh] origin-center opacity-100 will-change-transform backface-hidden"
                >
                  <motion.div style={{ y: yCol1 }} className="flex flex-col gap-4 md:gap-6 w-[22vw] min-w-[200px] pointer-events-auto">
                    {colMedia.col1.map((img, index) => (
                      <ImageCard key={`col1-${index}`} src={img.src} alt={img.alt} onLoad={handleItemLoad} />
                    ))}
                  </motion.div>

                  <motion.div style={{ y: yCol2 }} className="flex flex-col gap-4 md:gap-6 w-[22vw] min-w-[200px] pointer-events-auto">
                    {colMedia.col2.map((img, index) => (
                      <ImageCard key={`col2-${index}`} src={img.src} alt={img.alt} onLoad={handleItemLoad} />
                    ))}
                  </motion.div>

                  <motion.div style={{ y: yCol3 }} className="flex flex-col gap-4 md:gap-6 w-[22vw] min-w-[200px] pointer-events-auto">
                    {colMedia.col3.map((img, index) => (
                      <ImageCard key={`col3-${index}`} src={img.src} alt={img.alt} onLoad={handleItemLoad} />
                    ))}
                  </motion.div>

                  <motion.div style={{ y: yCol4 }} className="flex flex-col gap-4 md:gap-6 w-[22vw] min-w-[200px] pointer-events-auto">
                    {colMedia.col4.map((img, index) => (
                      <ImageCard key={`col4-${index}`} src={img.src} alt={img.alt} onLoad={handleItemLoad} />
                    ))}
                  </motion.div>
                </motion.div>
              </div>

              {children && (
                <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                  <div className="text-center pointer-events-auto px-6">
                    {children}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </section>
      </div>
      {showToggle && (
        <button
          onClick={() => setUser3D(false)}
          className="fixed bottom-6 right-6 z-50 rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-ink-soft"
          aria-label="Disable 3D parallax view"
        >
          ◁ Back to grid
        </button>
      )}
    </>
  );
}

export default ParallaxGallery;