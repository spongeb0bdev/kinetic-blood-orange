import { useRef, useState, useEffect } from 'react';
import { CanCanvas } from './components/Canvas/CanCanvas';
import { Header } from './components/DOM/Header';
import { HeroSection } from './components/DOM/HeroSection';
import { FlavorStorySection } from './components/DOM/FlavorStorySection';
import { IngredientsSection } from './components/DOM/IngredientsSection';
import { FinalCtaSection } from './components/DOM/FinalCtaSection';
import { useScrollChoreography } from './hooks/useScrollChoreography';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const choreography = useScrollChoreography(containerRef);
  const [activeBeat, setActiveBeat] = useState<number>(1);

  useEffect(() => {
    return choreography.subscribe((_p, beat) => {
      setActiveBeat(beat);
    });
  }, [choreography]);

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen bg-[#FAF8F5] text-[#1A1817] overflow-x-hidden selection:bg-[#E74202] selection:text-white w-full"
    >
      {/* 3D WebGL Canvas Layer (Fixed Background) */}
      <CanCanvas choreography={choreography} />

      {/* Persistent Navigation Header */}
      <Header />

      {/* 4 Clean Narrative Editorial Sections */}
      <main className="relative z-10 w-full overflow-x-hidden">
        <HeroSection id="hero" isActive={activeBeat === 1} />
        <FlavorStorySection id="flavor-story" isActive={activeBeat === 2} />
        <IngredientsSection id="ingredients" isActive={activeBeat === 3} />
        <FinalCtaSection id="final-cta" isActive={activeBeat === 4} />
      </main>

      {/* Clean Editorial Footer */}
      <footer className="relative z-10 pt-12 pb-24 sm:pb-12 px-6 border-t border-[#1A1817]/8 text-center text-xs text-[#7A726B] bg-[#FAF8F5]/90 backdrop-blur-xs w-full overflow-x-hidden">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 w-full font-normal">
          <span>© 2026 Kinetic Beverages. All rights reserved.</span>
          <span>Crafted in brushed silver aluminum · Clean sparkling energy</span>
        </div>
      </footer>
    </div>
  );
}
