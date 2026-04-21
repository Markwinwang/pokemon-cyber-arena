"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Billboard,
  Float,
  OrbitControls,
  PerspectiveCamera,
  Sparkles,
  useTexture,
} from "@react-three/drei";
import * as THREE from "three";
import { PokemonRecord, typeMeta } from "@/lib/pokemon";

function HologramAvatar({ pokemon }: { pokemon: PokemonRecord }) {
  const texture = useTexture(pokemon.artwork);
  const group = useRef<THREE.Group>(null);
  const primary = typeMeta[pokemon.typeKeys[0]]?.color ?? "#68f0ff";
  const secondary = typeMeta[pokemon.typeKeys[1]]?.ring ?? "#5b83ff";
  const satelliteCount = Math.max(3, Math.min(7, Math.round(pokemon.stats["攻击"] / 20)));
  const scale = 1 + pokemon.statTotal / 900;

  const satellites = useMemo(
    () =>
      Array.from({ length: satelliteCount }, (_, index) => {
        const angle = (index / satelliteCount) * Math.PI * 2;
        const radius = 1.8 + (index % 2) * 0.34;
        return {
          position: [Math.cos(angle) * radius, ((index % 3) - 1) * 0.22, Math.sin(angle) * radius] as const,
          size: 0.06 + (index % 3) * 0.03,
        };
      }),
    [satelliteCount]
  );

  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.28;
    group.current.children.forEach((child, index) => {
      child.rotation.x += delta * (0.08 + index * 0.01);
      child.rotation.z -= delta * (0.03 + index * 0.004);
    });
  });

  return (
    <group ref={group} scale={scale}>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -1.6, 0]}>
        <torusGeometry args={[1.85, 0.05, 22, 100]} />
        <meshStandardMaterial color={primary} emissive={primary} emissiveIntensity={0.8} />
      </mesh>

      <Float speed={2.4} rotationIntensity={0.8} floatIntensity={1.2}>
        <mesh>
          <icosahedronGeometry args={[1.25, 0]} />
          <meshStandardMaterial
            color={primary}
            emissive={primary}
            emissiveIntensity={0.58}
            roughness={0.18}
            metalness={0.3}
            transparent
            opacity={0.64}
          />
        </mesh>
        <mesh scale={1.25}>
          <icosahedronGeometry args={[1.08, 1]} />
          <meshStandardMaterial
            color={secondary}
            emissive={secondary}
            emissiveIntensity={0.42}
            wireframe
            transparent
            opacity={0.54}
          />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.6, 0.08, 14, 100]} />
          <meshStandardMaterial color={secondary} emissive={secondary} emissiveIntensity={0.4} />
        </mesh>
        <Billboard position={[0, 0.08, 1.52]}>
          <mesh>
            <planeGeometry args={[2.25, 2.25]} />
            <meshBasicMaterial map={texture} transparent opacity={0.94} />
          </mesh>
        </Billboard>
      </Float>

      {satellites.map((satellite, index) => (
        <mesh key={index} position={satellite.position}>
          <sphereGeometry args={[satellite.size, 18, 18]} />
          <meshStandardMaterial color={secondary} emissive={secondary} emissiveIntensity={1.1} />
        </mesh>
      ))}
    </group>
  );
}

export default function PokemonScene({ pokemon }: { pokemon: PokemonRecord }) {
  const primary = typeMeta[pokemon.typeKeys[0]]?.glow ?? "rgba(104, 240, 255, 0.35)";

  return (
    <div
      className="h-[420px] w-full overflow-hidden rounded-[28px] border border-cyan-400/15"
      style={{
        background: `radial-gradient(circle at 50% 28%, ${primary}, transparent 22%), linear-gradient(180deg, rgba(12,20,46,0.92), rgba(8,12,28,0.92))`,
      }}
    >
      <Canvas dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 0.15, 6.8]} fov={42} />
        <color attach="background" args={["#070d20"]} />
        <ambientLight intensity={1.2} />
        <directionalLight intensity={1.8} position={[4, 6, 5]} color={primary.replace("rgba", "rgb").replace(/, [^)]+\)/, ")")} />
        <pointLight intensity={12} position={[0, 0, 3]} color="#68f0ff" />
        <pointLight intensity={8} position={[-3, -2, -2]} color="#ff4edb" />
        <Sparkles count={80} scale={[7, 5, 7]} size={3} speed={0.6} color="#89f5ff" />
        <HologramAvatar pokemon={pokemon} />
        <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={0.6} />
      </Canvas>
    </div>
  );
}
