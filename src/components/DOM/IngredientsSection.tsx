import type { FC } from 'react';
import { Sparkles, Zap, ShieldCheck, Droplet } from 'lucide-react';

export interface IngredientsSectionProps {
  id?: string;
  isActive?: boolean;
}

export const IngredientsSection: FC<IngredientsSectionProps> = ({ id = 'ingredients', isActive = true }) => {
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
            Ingredients & Benefits
          </span>
        </div>

        {/* Headline */}
        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#1A1817] leading-[1.12] mb-3 sm:mb-4">
          Pure Fuel. Zero Compromise.
        </h2>

        {/* Subhead */}
        <p className="text-xs sm:text-lg text-[#5A524C] leading-relaxed mb-4 sm:mb-8 font-normal">
          Formulated with purposeful botanical ingredients that sustain your natural daily rhythm without spikes or crashes.
        </p>

        {/* 4 Clean Value Points */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3.5 w-full">
          <div className="p-2.5 sm:p-4 rounded-xl bg-white/70 border border-[#1A1817]/6 backdrop-blur-xs flex flex-col">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 text-[#E74202]">
              <Zap className="w-3.5 h-3.5" />
              <span className="text-xs font-medium tracking-wide text-[#6E655F]">
                Natural Caffeine
              </span>
            </div>
            <h3 className="text-xs sm:text-base font-bold text-[#1A1817] mb-0.5">
              100mg Green Tea
            </h3>
            <p className="text-[10px] sm:text-xs text-[#6E655F] leading-snug">
              Clean botanical energy for smooth, jitter-free focus.
            </p>
          </div>

          <div className="p-2.5 sm:p-4 rounded-xl bg-white/70 border border-[#1A1817]/6 backdrop-blur-xs flex flex-col">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 text-[#E74202]">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="text-xs font-medium tracking-wide text-[#6E655F]">
                Zero Sugar
              </span>
            </div>
            <h3 className="text-xs sm:text-base font-bold text-[#1A1817] mb-0.5">
              0 Calories
            </h3>
            <p className="text-[10px] sm:text-xs text-[#6E655F] leading-snug">
              Pure fruit essence with zero artificial sweeteners.
            </p>
          </div>

          <div className="p-2.5 sm:p-4 rounded-xl bg-white/70 border border-[#1A1817]/6 backdrop-blur-xs flex flex-col">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 text-[#E74202]">
              <Droplet className="w-3.5 h-3.5" />
              <span className="text-xs font-medium tracking-wide text-[#6E655F]">
                Electrolytes
              </span>
            </div>
            <h3 className="text-xs sm:text-base font-bold text-[#1A1817] mb-0.5">
              Balanced Minerals
            </h3>
            <p className="text-[10px] sm:text-xs text-[#6E655F] leading-snug">
              30mg sodium and 20mg potassium for hydration.
            </p>
          </div>

          <div className="p-2.5 sm:p-4 rounded-xl bg-white/70 border border-[#1A1817]/6 backdrop-blur-xs flex flex-col">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 text-[#E74202]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="text-xs font-medium tracking-wide text-[#6E655F]">
                Purity
              </span>
            </div>
            <h3 className="text-xs sm:text-base font-bold text-[#1A1817] mb-0.5">
              100% Plant-Based
            </h3>
            <p className="text-[10px] sm:text-xs text-[#6E655F] leading-snug">
              Vegan, gluten-free without artificial colorants.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
