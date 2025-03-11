"use client"

import React from "react"
import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { useMouse } from "@/hooks/use-mouse"
import type * as THREE from "three"

// Fragment shader provided by the user
const fragmentShader = `
precision mediump float;

uniform float u_time;
uniform vec2 u_mouse;
uniform vec2 u_resolution;
varying vec2 v_uv;

float hash(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
        f.y
    );
}

float fbm(vec2 p) {
    float sum = 0.0;
    float amp = 0.5;
    float freq = 1.0;
    for(int i = 0; i < 6; i++) {
        sum += noise(p * freq) * amp;
        amp *= 0.5;
        freq *= 2.0;
    }
    return sum;
}

void main() {
    vec2 uv = v_uv;
    vec2 aspect = vec2(u_resolution.x/u_resolution.y, 1.0);
    uv *= aspect;
    
    float mouseInfluence = length(u_mouse * aspect - uv) * 2.0;
    mouseInfluence = 1.0 - smoothstep(0.0, 1.0, mouseInfluence);
    
    vec2 motion = vec2(u_time * 0.1, u_time * 0.05);
    float n1 = fbm(uv * 2.0 + motion);
    float n2 = fbm(uv * 3.0 - motion * 1.2);
    float n3 = fbm(uv * 1.5 + motion * 0.8);
    
    vec3 color1 = vec3(0.8, 0.2, 0.8);  // Purple
    vec3 color2 = vec3(0.0, 0.8, 0.8);  // Cyan
    vec3 color3 = vec3(1.0, 0.4, 0.4);  // Pink
    
    float blend1 = sin(n1 * 3.14159 + u_time) * 0.5 + 0.5;
    float blend2 = cos(n2 * 3.14159 - u_time * 0.5) * 0.5 + 0.5;
    float blend3 = sin(n3 * 3.14159 + u_time * 0.7) * 0.5 + 0.5;
    
    vec3 finalColor = mix(color1, color2, blend1);
    finalColor = mix(finalColor, color3, blend2 * 0.5);
    
    float distortion = (n1 + n2 + n3) * 0.3;
    distortion += mouseInfluence * 0.2;
    
    finalColor += vec3(distortion) * 0.2;
    finalColor = mix(finalColor, vec3(1.0), distortion * 0.1);
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`

// Vertex shader
const vertexShader = `
varying vec2 v_uv;

void main() {
  v_uv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export function ShaderMaterial() {
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const mousePosition = useMouse()

  useFrame(({ clock, size }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.u_time.value = clock.getElapsedTime()
      materialRef.current.uniforms.u_mouse.value.x = mousePosition.x
      materialRef.current.uniforms.u_mouse.value.y = mousePosition.y
      materialRef.current.uniforms.u_resolution.value.x = size.width
      materialRef.current.uniforms.u_resolution.value.y = size.height
    }
  })

  return (
    <shaderMaterial
      ref={materialRef}
      fragmentShader={fragmentShader}
      vertexShader={vertexShader}
      uniforms={{
        u_time: { value: 0 },
        u_mouse: { value: { x: 0.5, y: 0.5 } },
        u_resolution: { value: { x: window.innerWidth, y: window.innerHeight } },
      }}
      data-fragment-shader={fragmentShader}
      data-vertex-shader={vertexShader}
      data-uniforms={JSON.stringify({
        u_time: { value: 0 },
        u_mouse: { value: { x: 0.5, y: 0.5 } },
        u_resolution: { value: { x: window.innerWidth, y: window.innerHeight } },
      })}
    />
  )
}

