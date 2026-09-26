import { useState } from 'react';
import type { FC, FormEvent } from 'react';
import { ArrowRight, Check } from 'lucide-react';

export interface FinalCtaSectionProps {
  id?: string;
  isActive?: boolean;
}

export const FinalCtaSection: FC<FinalCtaSectionProps> = ({ id = 'final-cta', isActive = true }) => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (email.trim().includes('@')) {
      setSubmitted(true);
    }
  };

  return (
    <section
      id={id}
      className="section-mobile-clearance relative min-h-[100dvh] w-full flex flex-col justify-start lg:justify-center px-6 md:px-8 xl:px-20 pb-24 lg:py-24 overflow-hidden"
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
            Inaugural Release
          </span>
        </div>

        {/* Headline */}
        <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-[#1A1817] leading-[1.08] mb-3 sm:mb-4">
          Elevate Your Daily Ritual.
        </h2>

        {/* Subhead */}
        <p className="text-xs sm:text-lg text-[#5A524C] leading-relaxed mb-6 sm:mb-8 font-normal">
          Join the private reserve list for the inaugural release of KINETIC Blood Orange. Delivered directly to your door in cases of 12.
        </p>

        {/* Reservation Form */}
        {submitted ? (
          <div className="p-4 sm:p-5 rounded-2xl bg-white/80 border border-[#E74202]/30 w-full flex items-start gap-3.5 backdrop-blur-xs">
            <div className="h-6 w-6 rounded-full bg-[#E74202] text-white flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-[#1A1817] mb-1">
                Reservation Confirmed
              </h3>
              <p className="text-[11px] sm:text-xs text-[#5A524C] leading-relaxed">
                Thank you for joining. We will notify you the moment the first release ships to your region.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 w-full">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
              className="flex-1 min-h-[44px] sm:min-h-[48px] px-5 rounded-full bg-white/80 border border-[#1A1817]/15 text-xs sm:text-sm text-[#1A1817] placeholder:text-[#8C827A] focus:outline-none focus:border-[#E74202] focus:ring-2 focus:ring-[#E74202]/20 transition-all backdrop-blur-xs"
            />
            <button
              type="submit"
              className="min-h-[44px] sm:min-h-[48px] px-6 sm:px-7 rounded-full bg-[#1A1817] text-[#FAF8F5] text-xs sm:text-sm font-semibold tracking-wide hover:bg-[#E74202] hover:text-white transition-colors duration-200 inline-flex items-center justify-center gap-2 shadow-sm shrink-0"
            >
              <span>Reserve Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Trust Subtext */}
        <p className="mt-4 sm:mt-6 text-xs text-[#7A726B] font-normal">
          Complimentary domestic shipping on initial cases · No commitments
        </p>
      </div>
    </section>
  );
};
