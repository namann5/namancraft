import { useMemo } from 'react'
import * as THREE from 'three'

const vert = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const frag = /* glsl */ `
varying vec3 vDir;
uniform vec3 uTop;
uniform vec3 uHorizon;
void main() {
  float h = clamp(vDir.y, 0.0, 1.0);
  float t = pow(h, 0.5);
  gl_FragColor = vec4(mix(uHorizon, uTop, t), 1.0);
}
`

const SUN_DIR = new THREE.Vector3(70, 45, -40).normalize()

export default function SunsetSky() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        uniforms: {
          uTop: { value: new THREE.Color('#2c3a66') },
          uHorizon: { value: new THREE.Color('#ffb36b') },
        },
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    [],
  )

  const sunPos = SUN_DIR.clone().multiplyScalar(380)

  return (
    <group>
      <mesh material={material} renderOrder={-100} frustumCulled={false}>
        <sphereGeometry args={[420, 32, 16]} />
      </mesh>
      <mesh position={sunPos}>
        <sphereGeometry args={[20, 16, 16]} />
        <meshBasicMaterial color="#fff3d6" fog={false} />
      </mesh>
      <mesh position={sunPos}>
        <sphereGeometry args={[52, 16, 16]} />
        <meshBasicMaterial color="#ffce8f" transparent opacity={0.28} depthWrite={false} fog={false} />
      </mesh>
    </group>
  )
}
