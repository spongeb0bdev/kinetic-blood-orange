import type { FC } from 'react';

const RETURN_HREF = 'https://www.raymondadvisory.com/';

export const PortfolioReturnBanner: FC = () => {
  return (
    <a
      href={RETURN_HREF}
      className="fixed top-0 left-0 right-0 z-[60] flex h-[var(--return-banner-height)] items-center gap-2 whitespace-nowrap px-6 lg:px-12 bg-[#1A1817] text-[#FAF8F5] text-[11px] sm:text-xs font-medium tracking-wide border-b border-[#E74202]/45 hover:bg-[#241F1C] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#E74202]"
    >
      <span aria-hidden="true" className="text-[#E74202] leading-none">
        ←
      </span>
      <span>Back to raymondadvisory.com</span>
    </a>
  );
};
