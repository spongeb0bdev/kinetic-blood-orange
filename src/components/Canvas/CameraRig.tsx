import type { FC } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { updateAuditBridge } from '../../audit/auditBridge';
import type { ChoreographyRefs } from '../../hooks/useScrollChoreography';

export interface CameraRigProps {
  choreography?: ChoreographyRefs;
  targetPosition?: [number, number, number];
  targetLookAt?: [number, number, number];
  targetFov?: number;
}

export const CameraRig: FC<CameraRigProps> = ({
  choreography,
  targetPosition = [0, 0, 25.5],
  targetLookAt = [0, 0, 0],
  targetFov = 45,
}) => {
  useFrame((state, delta) => {
    const cam = state.camera as THREE.PerspectiveCamera;
    const clampedDelta = Math.min(delta, 0.1);

    const destPos = choreography?.targetCameraPos.current
      ? choreography.targetCameraPos.current
      : new THREE.Vector3(...targetPosition);

    const destLookAt = choreography?.targetCameraLookAt.current
      ? choreography.targetCameraLookAt.current
      : new THREE.Vector3(...targetLookAt);

    const destFov = choreography?.targetCameraFov.current ?? targetFov;

    cam.position.x = THREE.MathUtils.damp(cam.position.x, destPos.x, 14, clampedDelta);
    cam.position.y = THREE.MathUtils.damp(cam.position.y, destPos.y, 14, clampedDelta);
    cam.position.z = THREE.MathUtils.damp(cam.position.z, destPos.z, 14, clampedDelta);

    cam.lookAt(destLookAt.x, destLookAt.y, destLookAt.z);

    if (Math.abs(cam.fov - destFov) > 0.01) {
      cam.fov = THREE.MathUtils.damp(cam.fov, destFov, 8, clampedDelta);
      cam.updateProjectionMatrix();
    }

    updateAuditBridge({
      cameraPos: [cam.position.x, cam.position.y, cam.position.z],
      activeBeat: choreography?.activeBeat.current ?? 1,
      scrollProgress: choreography?.scrollProgress.current ?? 0,
    });
  });

  return null;
};
