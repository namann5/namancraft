import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { skyReg } from './dayCycle'

const vert = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const frag = /* glsl */ `
varying vec3 vDir;
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uHaze;   // golden-hour glow strength
uniform float uStar;   // star visibility
uniform float uNight;  // 1 when the "sun" is really a moon

float hash(vec3 p) {
  return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
}

void main() {
  vec3 d = normalize(vDir);
  float h = d.y;

  // vertical gradient
  float t = pow(clamp(h, 0.0, 1.0), 0.5);
  vec3 col = mix(uHorizon, uZenith, t);

  // below-horizon: keep horizon color darkened so terrain edge never flashes
  col = mix(col * 0.55, col, smoothstep(-0.25, 0.02, h));

  // sun / moon disc + halo
  float sd = dot(d, normalize(uSunDir));
  float disc = smoothstep(0.9993, 0.9996, sd);
  float halo = pow(max(sd, 0.0), 30.0);
  col += uSunColor * disc * mix(1.0, 0.85, uNight);
  col += uSunColor * halo * (0.22 + uHaze * 0.55);

  // blocky voxel stars (night only, above horizon)
  if (uStar > 0.001 && h > 0.03) {
    vec3 cell = floor(d * 140.0);
    float r = hash(cell);
    float star = step(0.9975, r) * uStar * smoothstep(0.03, 0.25, h);
    col += vec3(star) * (0.5 + 0.5 * fract(r * 91.7));
  }

  gl_FragColor = vec4(col, 1.0);
}
`

// Sky dome driven entirely by dayCycle state.
export default function SunsetSky() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        uniforms: {
          uZenith: { value: new THREE.Color('#2c3a66') },
          uHorizon: { value: new THREE.Color('#ffb36b') },
          uSunDir: { value: new THREE.Vector3(70, 24, -40).normalize() },
          uSunColor: { value: new THREE.Color('#ffce8f') },
          uHaze: { value: 1 },
          uStar: { value: 0 },
          uNight: { value: 0 },
        },
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    [],
  )

  useEffect(() => {
    skyReg.uniforms = material.uniforms
    return () => {
      skyReg.uniforms = null
    }
  }, [material])

  return (
    <mesh material={material} renderOrder={-100} frustumCulled={false}>
      <sphereGeometry args={[420, 32, 16]} />
    </mesh>
  )
}
