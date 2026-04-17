'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface FadeSliderProps {
  images: string[];
  autoplayDelay?: number;
  aspectClassName?: string;
  overlayClassName?: string;
}

export default function FadeSlider({
  images,
  autoplayDelay = 5000,
  aspectClassName = 'aspect-[4/5] sm:aspect-[16/9] md:aspect-[21/8] lg:aspect-[21/7]',
  overlayClassName = 'bg-black/75',
}: FadeSliderProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const goTo = useCallback((i: number) => {
    setIndex((i + images.length) % images.length);
  }, [images.length]);

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    if (paused || images.length < 2) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, autoplayDelay);
    return () => clearInterval(timer);
  }, [paused, images.length, autoplayDelay]);

  if (images.length === 0) return null;

  return (
    <div
      className={`relative w-full ${aspectClassName} group overflow-hidden`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {images.map((src, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
          style={{ opacity: i === index ? 1 : 0 }}
          aria-hidden={i !== index}
        >
          <Image
            src={src}
            alt={`Баннер ${i + 1}`}
            fill
            className="object-cover"
            sizes="100vw"
            priority={i === 0}
          />
          <div className={`absolute inset-0 ${overlayClassName}`} />
        </div>
      ))}

      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/90 backdrop-blur rounded-full shadow-md flex items-center justify-center hover:bg-white transition-all opacity-0 group-hover:opacity-100"
            aria-label="Назад"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/90 backdrop-blur rounded-full shadow-md flex items-center justify-center hover:bg-white transition-all opacity-0 group-hover:opacity-100"
            aria-label="Вперёд"
          >
            <ChevronRight size={20} />
          </button>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {images.map((_, i) => (
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
