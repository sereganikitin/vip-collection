'use client';

import { ReactNode, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CarouselProps {
  children: ReactNode[];
  autoplay?: boolean;
  loop?: boolean;
  slidesPerView?: number;
}

export default function Carousel({ children, autoplay = false, loop = true, slidesPerView = 1 }: CarouselProps) {
  const plugins = autoplay ? [Autoplay({ delay: 5000, stopOnInteraction: false })] : [];
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop, align: 'start', slidesToScroll: 1 }, plugins);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const slideWidth = slidesPerView === 1 ? '100%' : `${100 / slidesPerView}%`;

  return (
    <div className="relative group">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {children.map((child, i) => (
            <div
              key={i}
              className="flex-shrink-0 px-2"
              style={{ flexBasis: slideWidth, minWidth: 0 }}
            >
              {child}
            </div>
          ))}
        </div>
      </div>
      <button
        onClick={scrollPrev}
        className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur rounded-full shadow-md flex items-center justify-center hover:bg-white transition-all opacity-0 group-hover:opacity-100"
        aria-label="Назад"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        onClick={scrollNext}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur rounded-full shadow-md flex items-center justify-center hover:bg-white transition-all opacity-0 group-hover:opacity-100"
        aria-label="Вперёд"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
