import type { FC } from 'react';

export interface FlavorStorySectionProps {
  id?: string;
  isActive?: boolean;
}

export const FlavorStorySection: FC<FlavorStorySectionProps> = ({ id = 'flavor-story', isActive = true }) => {
  return (
    <section
      id={id}
      className="section-mobile-clearance relative min-h-[100dvh] w-full flex flex-col justify-start lg:justify-center px-6 md:px-8 xl:px-20 pb-16 lg:py-24 overflow-hidden"
    >
      <div
        className={`w-full max-w-[340px] xl:max-w-[460px] lg:ml-auto flex flex-col items-start z-10 text-left relative transition-opacity duration-300 ${
          isActive ? 'mobile-narrative-stage lg:block opacity-100' : 'hidden lg:block lg:opacity-100'
        }`}
      >

        {/* Eyebrow */}
        <div className="mb-3 sm:mb-4 inline-flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#E74202]" />
          <span className="text-xs font-medium tracking-wider uppercase text-[#8C827A]">
            Sensory Profile
          </span>
        </div>

        {/* Headline */}
        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#1A1817] leading-[1.12] mb-3 sm:mb-6">
          Bittersweet Ruby Citrus. Crisp Effervescence.
        </h2>

        {/* Editorial Body */}
        <p className="text-xs sm:text-lg text-[#5A524C] leading-relaxed mb-4 sm:mb-8 font-normal">
          Cold-pressed Moro blood oranges deliver a vibrant rush of bittersweet citrus, balanced by fine sparkling bubbles that leave a crisp, revitalizing finish on the palate.
        </p>

        {/* 3 Sensory Tasting Notes */}
        <div className="flex flex-col gap-2 sm:gap-4 w-full">
          <div className="p-2.5 sm:p-4 rounded-xl bg-white/70 border border-[#1A1817]/6 backdrop-blur-xs">
            <h3 className="text-xs sm:text-sm font-semibold text-[#1A1817] mb-0.5">
              Moro Blood Orange
            </h3>
            <p className="text-[11px] sm:text-sm text-[#6E655F] leading-normal">
              Sun-ripened Mediterranean citrus with rich ruby depth and refreshing acidity.
            </p>
          </div>

          <div className="p-2.5 sm:p-4 rounded-xl bg-white/70 border border-[#1A1817]/6 backdrop-blur-xs">
            <h3 className="text-xs sm:text-sm font-semibold text-[#1A1817] mb-0.5">
              Fine Champagne Sparkle
            </h3>
            <p className="text-[11px] sm:text-sm text-[#6E655F] leading-normal">
              Micro-carbonation engineered for a smooth, refreshing mouthfeel without harsh bite.
            </p>
          </div>

          <div className="p-2.5 sm:p-4 rounded-xl bg-white/70 border border-[#1A1817]/6 backdrop-blur-xs">
            <h3 className="text-xs sm:text-sm font-semibold text-[#1A1817] mb-0.5">
              Botanical Finish
            </h3>
            <p className="text-[11px] sm:text-sm text-[#6E655F] leading-normal">
              Clean, crisp aftertaste with zero lingering syrup or synthetic coating.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
