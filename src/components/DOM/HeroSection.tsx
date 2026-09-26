import type { FC } from 'react';
import { ArrowRight } from 'lucide-react';

export interface HeroSectionProps {
  id?: string;
  isActive?: boolean;
}

export const HeroSection: FC<HeroSectionProps> = ({ id = 'hero', isActive = true }) => {
  return (
    <section
      id={id}
      className="section-mobile-clearance relative min-h-[100dvh] w-full flex flex-col justify-start lg:justify-center px-6 md:px-8 xl:px-20 pb-16 lg:py-24 overflow-hidden"
    >
      <div
        className={`w-full max-w-[340px] xl:max-w-[460px] flex flex-col items-start z-10 text-left transition-opacity duration-300 ${
          isActive ? 'mobile-narrative-stage lg:block opacity-100' : 'hidden lg:block lg:opacity-100'
        }`}
      >
        {/* Eyebrow */}
        <div className="mb-3 sm:mb-4 inline-flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#E74202]" />
          <span className="text-xs font-medium tracking-wider uppercase text-[#8C827A]">
            Blood Orange Energy
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#1A1817] leading-[1.08] mb-4 sm:mb-6">
          Pure Sparkling Energy.
        </h1>

        {/* Editorial Body */}
        <p className="text-sm sm:text-lg text-[#5A524C] leading-relaxed mb-6 sm:mb-8 font-normal">
          Crisp Italian blood orange meets clean, sustained plant energy. Crafted in brushed silver aluminum with zero sugar and zero compromise.
        </p>

        {/* Primary CTA */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
          <a
            href="#final-cta"
            className="min-h-[44px] sm:min-h-[48px] px-6 sm:px-8 py-3 sm:py-3.5 rounded-full bg-[#1A1817] text-[#FAF8F5] text-xs sm:text-sm font-semibold tracking-wide hover:bg-[#E74202] hover:text-white transition-colors duration-200 inline-flex items-center justify-center gap-2 shadow-sm"
          >
            <span>Reserve Your 12-Pack</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* Secondary Spec Line */}
        <p className="mt-6 sm:mt-8 text-xs sm:text-sm text-[#7A726B] font-normal tracking-normal">
          12 fl oz · 100mg plant caffeine · zero sugar
        </p>
      </div>
    </section>
  );
};
