import { useEffect, useRef, useState } from 'react';
import type { FC } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { CanModel } from './CanModel';
import { LightingRig } from './LightingRig';
import { CameraRig } from './CameraRig';
import { initAuditBridge, updateAuditBridge } from '../../audit/auditBridge';
import type { ChoreographyRefs } from '../../hooks/useScrollChoreography';
import { Suspense } from 'react';

export interface CanCanvasProps {
  choreography?: ChoreographyRefs;
  className?: string;
  cameraPosition?: [number, number, number];
  cameraFov?: number;
  modelRotation?: [number, number, number];
  modelPosition?: [number, number, number];
}

function getClampedDpr(): [number, number] {
  if (typeof window === 'undefined') return [1, 1.5];
  const isMobile = window.innerWidth < 768;
  const pixelRatio = window.devicePixelRatio || 1;
  const maxDpr = isMobile ? Math.min(pixelRatio, 1.5) : Math.min(pixelRatio, 2);
  return [1, maxDpr];
}

export const CanCanvas: FC<CanCanvasProps> = ({
  choreography,
  className = '',
  cameraPosition = [0, 0, 25.5],
  cameraFov = 45,
  modelRotation = [0.05, -0.244, 0],
  modelPosition = [0.8, 0, 0],
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dpr, setDpr] = useState<[number, number]>(getClampedDpr);

  useEffect(() => {
    initAuditBridge({
      isMounted: true,
      webglVersion: 'webgl2',
      cameraPos: cameraPosition,
      activeBeat: 1,
      scrollProgress: 0.0,
      floorSuppressed: true,
      floorHidden: true,
      materialsPreserved: true,
    });

    const handleResize = () => {
      setDpr(getClampedDpr());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [cameraPosition]);

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 pointer-events-none z-0 w-full h-full overflow-hidden ${className}`}
      style={{ position: 'fixed' }}
    >
      <Canvas
        camera={{ position: cameraPosition, fov: cameraFov }}
        dpr={dpr}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
          preserveDrawingBuffer: true,
        }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.15;

          const domCanvas = gl.domElement;
          domCanvas.setAttribute('data-kinetic-ready', 'true');
          domCanvas.setAttribute('data-floor-hidden', 'true');

          updateAuditBridge({
            isMounted: true,
            webglVersion: 'webgl2',
          });
        }}
      >
        <Suspense fallback={null}>
          <LightingRig choreography={choreography} />
          <CanModel choreography={choreography} rotation={modelRotation} position={modelPosition} />
          <CameraRig choreography={choreography} targetPosition={cameraPosition} targetFov={cameraFov} />
        </Suspense>
      </Canvas>
    </div>
  );
};
