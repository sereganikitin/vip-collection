'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export interface FadeSlide {
  image: string;
  imageMobile?: string | null;
}

interface FadeSliderProps {
  slides: FadeSlide[];
  autoplayDelay?: number;
}

export default function FadeSlider({ slides, autoplayDelay = 3000 }: FadeSliderProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, autoplayDelay);
    return () => clearInterval(timer);
  }, [slides.length, autoplayDelay]);

  if (slides.length === 0) return null;

  return (
    <div className="relative w-full h-[100svh] sm:aspect-[16/9] sm:h-auto md:aspect-[2/1] lg:aspect-[21/9] overflow-hidden bg-black">
      {slides.map((slide, i) => {
        const mobileSrc = slide.imageMobile || slide.image;
        return (
          <div
            key={i}
            className="absolute inset-0 transition-opacity duration-[1800ms] ease-in-out"
            style={{ opacity: i === index ? 1 : 0 }}
            aria-hidden={i !== index}
          >
            {/* Mobile image — show full image (object-contain) with blurred background fill */}
            <div className="sm:hidden absolute inset-0">
              {/* Blurred background fill so there are no black bars */}
              <Image
                src={mobileSrc}
                alt=""
                fill
                aria-hidden
                className="object-cover scale-110 blur-2xl opacity-60"
                sizes="100vw"
                priority={i === 0}
                unoptimized={mobileSrc.startsWith('/uploads/')}
              />
              {/* Main image — fully visible */}
              <Image
                src={mobileSrc}
                alt={`Баннер ${i + 1}`}
                fill
                className="object-contain"
                sizes="100vw"
                priority={i === 0}
                unoptimized={mobileSrc.startsWith('/uploads/')}
              />
            </div>
            {/* Desktop image */}
            <div className="hidden sm:block absolute inset-0">
              <Image
                src={slide.image}
                alt={`Баннер ${i + 1}`}
                fill
                className="object-cover"
                sizes="100vw"
                priority={i === 0}
                unoptimized={slide.image.startsWith('/uploads/')}
              />
            </div>
            {/* Light overall darkening */}
            <div className="absolute inset-0 bg-black/30" />
            {/* Bottom gradient for text readability on mobile */}
            <div className="sm:hidden absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/50 to-transparent" />
            {/* Left gradient on desktop */}
            <div className="hidden sm:block absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
          </div>
        );
      })}
    </div>
  );
}
