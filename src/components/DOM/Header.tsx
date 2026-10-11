import type { FC } from 'react';
import { ArrowRight } from 'lucide-react';

export const Header: FC = () => {
  return (
    <header className="fixed top-[var(--return-banner-height)] left-0 right-0 z-50 flex items-center justify-between px-6 lg:px-12 py-4 backdrop-blur-md bg-[#FAF8F5]/85 border-b border-[#1A1817]/8 w-full transition-colors">
      <div className="flex items-center gap-3">
        <a
          href="#hero"
          className="text-xl font-black tracking-widest text-[#1A1817] uppercase hover:opacity-85 transition-opacity min-h-[44px] inline-flex items-center"
        >
          KINETIC<span className="text-[#E74202]">.</span>
        </a>
      </div>

      <nav className="flex items-center gap-4 sm:gap-8 text-sm font-medium">
        <div className="hidden md:flex items-center gap-6">
          <a
            href="#flavor-story"
            className="text-[#6E655F] hover:text-[#1A1817] transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center px-2"
          >
            Flavor
          </a>
          <a
            href="#ingredients"
            className="text-[#6E655F] hover:text-[#1A1817] transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center px-2"
          >
            Ingredients
          </a>
        </div>
        <a
          href="#final-cta"
          className="min-h-[44px] px-5 py-2 rounded-full bg-[#1A1817] text-[#FAF8F5] text-xs font-semibold tracking-wide hover:bg-[#E74202] hover:text-white transition-colors inline-flex items-center justify-center gap-1.5 shadow-sm"
        >
          <span>Reserve</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </nav>
    </header>
  );
};
