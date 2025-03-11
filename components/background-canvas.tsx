"use client"

import React from "react"
import { Canvas } from "@react-three/fiber"
import { ShaderMaterial } from "./shader-background"

export function BackgroundCanvas() {
  return (
    <div className="fixed inset-0 -z-10">
      <Canvas>
        <mesh>
          <planeGeometry args={[2, 2]} />
          <ShaderMaterial />
        </mesh>
      </Canvas>
    </div>
  )
}

