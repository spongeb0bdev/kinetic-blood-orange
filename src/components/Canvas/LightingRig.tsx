import { useRef } from 'react';
import type { FC } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { updateAuditBridge } from '../../audit/auditBridge';
import type { ChoreographyRefs } from '../../hooks/useScrollChoreography';

export interface LightingRigProps {
  choreography?: ChoreographyRefs;
  keyIntensity?: number;
  rimIntensity?: number;
  orangeIntensity?: number;
  envIntensity?: number;
}

export const LightingRig: FC<LightingRigProps> = ({
  choreography,
  keyIntensity = 2.5,
  rimIntensity = 3.0,
  orangeIntensity = 1.0,
  envIntensity = 0.8,
}) => {
  const keyLightRef = useRef<THREE.DirectionalLight>(null);
  const rimLightRef = useRef<THREE.DirectionalLight>(null);
  const orangeLightRef = useRef<THREE.DirectionalLight>(null);

  useFrame((_state, delta) => {
    const clampedDelta = Math.min(delta, 0.1);
    const targets = choreography?.lightingIntensities.current ?? {
      key: keyIntensity,
      rim: rimIntensity,
      orange: orangeIntensity,
      env: envIntensity,
    };

    if (keyLightRef.current) {
      keyLightRef.current.intensity = THREE.MathUtils.damp(
        keyLightRef.current.intensity,
        targets.key,
        8,
        clampedDelta
      );
    }
    if (rimLightRef.current) {
      rimLightRef.current.intensity = THREE.MathUtils.damp(
        rimLightRef.current.intensity,
        targets.rim,
        8,
        clampedDelta
      );
    }
    if (orangeLightRef.current) {
      orangeLightRef.current.intensity = THREE.MathUtils.damp(
        orangeLightRef.current.intensity,
        targets.orange,
        8,
        clampedDelta
      );
    }

    updateAuditBridge({
      lighting: {
        key: keyLightRef.current ? keyLightRef.current.intensity : targets.key,
        rim: rimLightRef.current ? rimLightRef.current.intensity : targets.rim,
        orange: orangeLightRef.current ? orangeLightRef.current.intensity : targets.orange,
        env: targets.env,
      },
      activeBeat: choreography?.activeBeat.current ?? 1,
    });
  });

  return (
    <>
      <Environment environmentIntensity={envIntensity}>
        {/* Softbox lightformers for luxury metallic studio illumination */}
        <Lightformer
          form="rect"
          intensity={3.0}
          color="#FFFFFF"
          position={[0, 9, -4]}
          scale={[16, 6, 1]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="rect"
          intensity={2.8}
          color="#EAF0F8"
          position={[-7, 4, 3]}
          scale={[12, 12, 1]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="rect"
          intensity={2.2}
          color="#FFE2C8"
          position={[7, 2, 4]}
          scale={[10, 8, 1]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="ring"
          intensity={1.2}
          color="#FF7824"
          position={[3, -4, 4]}
          scale={8}
          target={[0, 0, 0]}
        />
      </Environment>

      {/* Primary Key Light: crisp studio spotlight */}
      <directionalLight
        ref={keyLightRef}
        position={[6, 9, 6]}
        intensity={keyIntensity}
        color="#FFFDF8"
        castShadow
      />

      {/* Rim Light: crisp silver edge definition & specular bead highlights */}
      <directionalLight
        ref={rimLightRef}
        position={[-7, 5, -5]}
        intensity={rimIntensity}
        color="#EAF0F8"
      />

      {/* Citrus Bounce Light: warm table radiance */}
      <directionalLight
        ref={orangeLightRef}
        position={[3, -4, 5]}
        intensity={orangeIntensity}
        color="#FF8A3D"
      />

      {/* Warm porcelain ambient fill for luminance baseline L > 0.40 */}
      <ambientLight intensity={1.1} color="#F5F2EB" />
    </>
  );
};
