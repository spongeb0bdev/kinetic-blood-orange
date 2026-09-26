import { useEffect, useRef } from 'react';
import type { RefObject, MutableRefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE from 'three';
import { updateAuditBridge } from '../audit/auditBridge';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export interface LightingTargets {
  key: number;
  rim: number;
  orange: number;
  env: number;
}

export interface ChoreographyRefs {
  scrollProgress: MutableRefObject<number>;
  activeBeat: MutableRefObject<number>;
  targetCameraPos: MutableRefObject<THREE.Vector3>;
  targetCameraLookAt: MutableRefObject<THREE.Vector3>;
  targetCameraFov: MutableRefObject<number>;
  targetModelRot: MutableRefObject<THREE.Euler>;
  targetModelPos: MutableRefObject<THREE.Vector3>;
  targetModelScale: MutableRefObject<number>;
  lightingIntensities: MutableRefObject<LightingTargets>;
  computeTargets: (progress: number) => void;
  subscribe: (callback: (progress: number, beat: number) => void) => () => void;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function useScrollChoreography(
  triggerRef?: RefObject<HTMLElement | null>
): ChoreographyRefs {
  const scrollProgress = useRef<number>(0.0);
  const activeBeat = useRef<number>(1);
  const targetCameraPos = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 25.0));
  const targetCameraLookAt = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const targetCameraFov = useRef<number>(44);
  const targetModelRot = useRef<THREE.Euler>(new THREE.Euler(0.04, -0.22, 0.0));
  const targetModelPos = useRef<THREE.Vector3>(new THREE.Vector3(2.4, 0, 0));
  const targetModelScale = useRef<number>(1.0);
  const lightingIntensities = useRef<LightingTargets>({
    key: 2.5,
    rim: 3.0,
    orange: 1.0,
    env: 0.8,
  });

  const listeners = useRef<Set<(p: number, beat: number) => void>>(new Set());

  const computeTargets = (progress: number) => {
    const p = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
    scrollProgress.current = p;

    const width = typeof window !== 'undefined' ? window.innerWidth : 1440;
    const height = typeof window !== 'undefined' ? window.innerHeight : 900;
    const aspect = width / Math.max(1, height);
    const isMobile = width < 768 || aspect < 1.0;
    const isLaptop = !isMobile && width < 1280;

    const modelScale = isMobile ? 0.50 : (isLaptop ? 0.75 : 1.00);

    let beat = 1;
    let rotX = isMobile ? 0.20 : 0.04;
    let rotY = -0.22;
    let rotZ = 0.0;

    let posX = isMobile ? 0 : (isLaptop ? 3.0 : 2.4);
    let posY = isMobile ? 7.5 : 0;
    let posZ = 0;

    let camX = 0;
    let camY = 0;
    let camZ = isMobile ? 34.0 : (isLaptop ? 28.0 : 25.0);

    let lookX = 0;
    let lookY = 0;
    let lookZ = 0;

    let fov = 44;
    let key = 2.5;
    let rim = 3.0;
    let orange = 1.0;
    const env = 0.8;

    if (p <= 0.33) {
      // Transition 1 -> 2 (Hero to Flavor Story)
      beat = p <= 0.20 ? 1 : 2;
      const t = Math.min(1, Math.max(0, p / 0.33));
      // Power curve 0.60 for horizontal crossover to clear p=0.10 transition
      const tx = Math.pow(t, 0.60);

      rotX = isMobile ? 0.20 : lerp(0.04, 0.08, t);
      rotY = lerp(-0.22, 0.35, t);
      rotZ = lerp(0.0, -0.05, t);

      posX = isMobile ? 0 : lerp(isLaptop ? 3.0 : 2.4, isLaptop ? -3.0 : -2.2, tx);
      posY = isMobile ? 7.5 : lerp(0.0, 0.2, t);
      posZ = 0;

      camX = 0;
      camY = isMobile ? 0 : lerp(0.0, 0.5, t);
      camZ = isMobile ? 34.0 : lerp(isLaptop ? 28.0 : 25.0, 21.0, t);

      lookX = isMobile ? 0 : lerp(0.0, -0.2, t);
      lookY = isMobile ? 0 : lerp(0.0, 0.2, t);
      lookZ = 0;

      fov = isMobile ? 44 : lerp(44, 40, t);
      key = lerp(2.5, 2.2, t);
      rim = lerp(3.0, 3.8, t);
      orange = lerp(1.0, 1.8, t);
    } else if (p <= 0.66) {
      // Transition 2 -> 3 (Flavor Story to Ingredients & Benefits)
      beat = p <= 0.50 ? 2 : 3;
      const t = Math.min(1, Math.max(0, (p - 0.33) / 0.33));
      // Symmetric progression tx = t keeps can centered at p=0.50
      const tx = t;

      rotX = isMobile ? 0.20 : lerp(0.08, 0.02, t);
      rotY = lerp(0.35, 3.14, t);
      rotZ = lerp(-0.05, 0.0, t);

      posX = isMobile ? 0 : lerp(isLaptop ? -3.0 : -2.2, isLaptop ? 3.0 : 2.4, tx);
      posY = isMobile ? 7.5 : lerp(0.2, 0.0, t);
      posZ = 0;

      camX = 0;
      camY = isMobile ? 0 : lerp(0.5, 0.0, t);
      camZ = isMobile ? 34.0 : lerp(21.0, isLaptop ? 28.0 : 23.5, t);

      lookX = isMobile ? 0 : lerp(-0.2, 0.0, t);
      lookY = isMobile ? 0 : lerp(0.2, 0.0, t);
      lookZ = 0;

      fov = isMobile ? 44 : lerp(40, 42, t);
      key = lerp(2.2, 2.6, t);
      rim = lerp(3.8, 2.8, t);
      orange = lerp(1.8, 1.0, t);
    } else {
      // Transition 3 -> 4 (Ingredients & Benefits to Final CTA)
      beat = p <= 0.80 ? 3 : 4;
      const t = Math.min(1, Math.max(0, (p - 0.66) / 0.34));

      rotX = isMobile ? 0.20 : lerp(0.02, 0.04, t);
      rotY = lerp(3.14, 6.28, t);
      rotZ = 0.0;

      posX = isMobile ? 0 : lerp(isLaptop ? 3.0 : 2.4, isLaptop ? 1.5 : 1.2, t);
      posY = isMobile ? 7.5 : lerp(0.0, 0.1, t);
      posZ = 0;

      camX = 0;
      camY = 0;
      camZ = isMobile ? 34.0 : lerp(isLaptop ? 28.0 : 23.5, 24.5, t);

      lookX = 0;
      lookY = 0;
      lookZ = 0;

      fov = isMobile ? 44 : lerp(42, 44, t);
      key = lerp(2.6, 2.5, t);
      rim = lerp(2.8, 3.2, t);
      orange = lerp(1.0, 1.2, t);
    }

    activeBeat.current = beat;
    targetModelRot.current.set(rotX, rotY, rotZ);
    targetModelPos.current.set(posX, posY, posZ);
    targetModelScale.current = modelScale;
    targetCameraPos.current.set(camX, camY, camZ);
    targetCameraLookAt.current.set(lookX, lookY, lookZ);
    targetCameraFov.current = fov;
    lightingIntensities.current = { key, rim, orange, env };

    updateAuditBridge({
      activeBeat: beat,
      scrollProgress: p,
      lighting: { key, rim, orange, env },
      cameraPos: [camX, camY, camZ],
    });

    listeners.current.forEach((fn) => fn(p, beat));
  };

  const subscribe = (callback: (p: number, beat: number) => void) => {
    listeners.current.add(callback);
    callback(scrollProgress.current, activeBeat.current);
    return () => {
      listeners.current.delete(callback);
    };
  };

  useEffect(() => {
    computeTargets(0.0);

    const targetEl = triggerRef?.current || document.body;

    const st = ScrollTrigger.create({
      trigger: targetEl,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.1,
      onUpdate: (self) => {
        computeTargets(self.progress);
      },
    });

    const handleScroll = () => {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const p = Math.max(0, Math.min(1, window.scrollY / maxScroll));
      computeTargets(p);
    };

    const handleResize = () => {
      computeTargets(scrollProgress.current);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      st.kill();
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [triggerRef]);

  return {
    scrollProgress,
    activeBeat,
    targetCameraPos,
    targetCameraLookAt,
    targetCameraFov,
    targetModelRot,
    targetModelPos,
    targetModelScale,
    lightingIntensities,
    computeTargets,
    subscribe,
  };
}
