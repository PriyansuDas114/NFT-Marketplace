// RotatingNFT.jsx
import React, { useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';

const RotatingNFT = ({ imageUrl }) => {
  const meshRef = useRef();
  const texture = useLoader(THREE.TextureLoader, imageUrl);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[3.5, 3.5, 0.1]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  );
};

export default RotatingNFT;
