'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface FadeSlide {
  image: string;
  imageMobile?: string | null;
}

interface FadeSliderProps {
  slides: FadeSlide[];
  autoplayDelay?: number;
}

export default function FadeSlider({ slides, autoplayDelay = 5000 }: FadeSliderProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const goTo = useCallback(
    (i: number) => {
      setIndex((i + slides.length) % slides.length);
    },
    [slides.length]
  );

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, autoplayDelay);
    return () => clearInterval(timer);
  }, [paused, slides.length, autoplayDelay]);

  if (slides.length === 0) return null;

  return (
    <div
      className="relative w-full h-[100svh] sm:aspect-[16/9] sm:h-auto md:aspect-[21/8] lg:aspect-[21/7] group overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((slide, i) => {
        const mobileSrc = slide.imageMobile || slide.image;
        return (
          <div
            key={i}
            className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
            style={{ opacity: i === index ? 1 : 0 }}
            aria-hidden={i !== index}
          >
            {/* Mobile image */}
            <div className="sm:hidden absolute inset-0">
              <Image
                src={mobileSrc}
                alt={`Баннер ${i + 1}`}
                fill
                className="object-cover"
                sizes="100vw"
                priority={i === 0}
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
              />
            </div>
            {/* Light overall darkening */}
            <div className="absolute inset-0 bg-black/30" />
            {/* Bottom-up gradient for text readability on mobile */}
            <div className="sm:hidden absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />
            {/* Left-to-right gradient on desktop */}
            <div className="hidden sm:block absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
          </div>
        );
      })}

      {slides.length > 1 && (
        <>
          <button
            onClick={prev}
            className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/90 backdrop-blur rounded-full shadow-md items-center justify-center hover:bg-white transition-all opacity-0 group-hover:opacity-100"
            aria-label="Назад"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={next}
            className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/90 backdrop-blur rounded-full shadow-md items-center justify-center hover:bg-white transition-all opacity-0 group-hover:opacity-100"
            aria-label="Вперёд"
          >
            <ChevronRight size={20} />
          </button>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Баннер ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'w-8 bg-white' : 'w-4 bg-white/50 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
