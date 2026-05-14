import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'
import { useAppContext } from '../../context/AppContext'
import TopBar from '../../components/TopBar'
import './PanoramaView.css'

const CAMERA_HEIGHT = 1.6
const MOVE_SPEED = 4

function buildDemoRoom(scene) {
  const floor   = new THREE.MeshStandardMaterial({ color: 0xc8b89a, roughness: 0.9 })
  const wall    = new THREE.MeshStandardMaterial({ color: 0xe8e0d4, roughness: 0.85 })
  const ceiling = new THREE.MeshStandardMaterial({ color: 0xf5f2ee, roughness: 0.9 })
  const wood    = new THREE.MeshStandardMaterial({ color: 0x7a5c3a, roughness: 0.7 })
  const glass   = new THREE.MeshStandardMaterial({ color: 0x88aacc, roughness: 0.05, transparent: true, opacity: 0.3 })

  const W = 12, D = 10, H = 3

  function box(w, h, d, mat, x, y, z, ry = 0) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
    mesh.position.set(x, y, z)
    mesh.rotation.y = ry
    mesh.castShadow = true
    mesh.receiveShadow = true
    scene.add(mesh)
    return mesh
  }

  // Piso
  box(W, 0.05, D, floor, 0, 0, 0)
  // Techo
  box(W, 0.05, D, ceiling, 0, H, 0)
  // Pared fondo
  box(W, H, 0.15, wall, 0, H / 2, -D / 2)
  // Pared frontal (con hueco para ventana — dos paneles)
  box(4, H, 0.15, wall, -4, H / 2, D / 2)
  box(4, H, 0.15, wall,  4, H / 2, D / 2)
  // Pared izquierda
  box(0.15, H, D, wall, -W / 2, H / 2, 0)
  // Pared derecha
  box(0.15, H, D, wall,  W / 2, H / 2, 0)

  // Ventana (vidrio + marco)
  box(4, 1.8, 0.08, glass, 0, 1.4, D / 2)
  box(4.2, 0.1, 0.15, wood, 0, 2.35, D / 2)  // marco superior
  box(4.2, 0.1, 0.15, wood, 0, 0.5,  D / 2)  // marco inferior
  box(0.1, 1.8, 0.15, wood, -2.05, 1.4, D / 2)  // lateral izq
  box(0.1, 1.8, 0.15, wood,  2.05, 1.4, D / 2)  // lateral der
  box(0.1, 1.8, 0.15, wood,  0,    1.4, D / 2)  // parteaguas

  // Puerta
  box(1.0, 0.1, 0.15, wood, -W / 2 + 0.08, 2.15, -1.5)   // dintel
  box(0.08, 2.1, 1.1, wood, -W / 2 + 0.12, 1.05, -1.5)   // puerta panel

  // Zócalos
  const zocalo = new THREE.MeshStandardMaterial({ color: 0xd0c8bc, roughness: 0.8 })
  box(W, 0.12, 0.04, zocalo,  0,    0.06, -D / 2 + 0.08)
  box(W, 0.12, 0.04, zocalo,  0,    0.06,  D / 2 - 0.08)
  box(0.04, 0.12, D, zocalo, -W / 2 + 0.08, 0.06, 0)
  box(0.04, 0.12, D, zocalo,  W / 2 - 0.08, 0.06, 0)

  // Mueble: mesada / estante (pared fondo)
  box(8, 0.06, 0.6, wood,  0, 0.9, -D / 2 + 0.35)   // tapa
  box(8, 0.9, 0.06, wood,  0, 0.45, -D / 2 + 0.05)  // frente
  box(0.04, 0.9, 0.6, wood, -4, 0.45, -D / 2 + 0.35) // lateral
  box(0.04, 0.9, 0.6, wood,  4, 0.45, -D / 2 + 0.35)

  // Luz de techo
  const light = new THREE.PointLight(0xfff5e0, 2, 12, 1.5)
  light.position.set(0, H - 0.2, 0)
  light.castShadow = true
  scene.add(light)

  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xffffee, emissive: 0xffffaa, emissiveIntensity: 2 })
  )
  bulb.position.set(0, H - 0.15, 0)
  scene.add(bulb)

  // Luz desde ventana
  const windowLight = new THREE.DirectionalLight(0xc8e8ff, 1.2)
  windowLight.position.set(0, 2, 8)
  windowLight.target.position.set(0, 1, 0)
  scene.add(windowLight)
  scene.add(windowLight.target)
}

export default function PanoramaView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state } = useAppContext()
  const mountRef = useRef(null)
  const controlsRef = useRef(null)
  const [isLocked, setIsLocked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(false)

  const lot = state.lots.find(l => l.id === id)

  useEffect(() => {
    if (!lot || !mountRef.current) return

    const container = mountRef.current
    let cancelled = false

    setLoading(true)
    setIsDemo(false)

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xc8dff5)   // cielo diurno claro
    scene.fog = new THREE.Fog(0xc8dff5, 40, 120)

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      150
    )
    camera.position.set(0, CAMERA_HEIGHT, 3)

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    container.appendChild(renderer.domElement)

    // Lights
    scene.add(new THREE.AmbientLight(0xfff5e0, 0.8))
    const sunLight = new THREE.DirectionalLight(0xfff5c0, 1.2)
    sunLight.position.set(5, 10, 8)
    scene.add(sunLight)

    // Controls
    const controls = new PointerLockControls(camera, renderer.domElement)
    controlsRef.current = controls
    controls.addEventListener('lock', () => setIsLocked(true))
    controls.addEventListener('unlock', () => setIsLocked(false))

    // WASD
    const keys = {}
    const onKeyDown = e => { keys[e.code] = true }
    const onKeyUp = e => { keys[e.code] = false }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    // Intentar cargar GLB, si falla usar habitación demo
    const loader = new GLTFLoader()
    loader.load(
      lot.modelPath,
      gltf => {
        if (cancelled) return
        gltf.scene.traverse(node => {
          if (node.isMesh) { node.castShadow = true; node.receiveShadow = true }
        })
        scene.add(gltf.scene)
        setLoading(false)
      },
      undefined,
      () => {
        if (cancelled) return
        scene.fog = new THREE.Fog(0xc8dff5, 15, 30)
        buildDemoRoom(scene)
        setIsDemo(true)
        setLoading(false)
      }
    )

    // Render loop
    const clock = new THREE.Clock()
    let animId

    function animate() {
      animId = requestAnimationFrame(animate)
      const delta = clock.getDelta()
      if (controls.isLocked) {
        if (keys['KeyW']) controls.moveForward(MOVE_SPEED * delta)
        if (keys['KeyS']) controls.moveForward(-MOVE_SPEED * delta)
        if (keys['KeyA']) controls.moveRight(-MOVE_SPEED * delta)
        if (keys['KeyD']) controls.moveRight(MOVE_SPEED * delta)
        camera.position.y = CAMERA_HEIGHT
      }
      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelled = true
      cancelAnimationFrame(animId)
      controls.dispose()
      renderer.dispose()
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('resize', onResize)
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
      controlsRef.current = null
    }
  }, [lot])

  if (!lot) {
    return (
      <div className="panorama-error">
        <span>Lote no encontrado</span>
        <button onClick={() => navigate('/map')}>← Volver</button>
      </div>
    )
  }

  return (
    <div className="panorama-wrap">
      <div ref={mountRef} className="panorama-canvas" />

      <TopBar
        breadcrumb={['TERRA', id, 'PANORAMA']}
        onBack={() => navigate('/map')}
      />

      {isDemo && (
        <div className="panorama-badge">Modelo demo — reemplazá con {id}-model.glb</div>
      )}

      {loading && (
        <div className="panorama-overlay">
          <div className="panorama-status">Cargando modelo…</div>
        </div>
      )}

      {!loading && !isLocked && (
        <div className="panorama-overlay" onClick={() => controlsRef.current?.lock()}>
          <div className="panorama-hint-box">
            <div className="panorama-status">Hacé click para explorar</div>
            <div className="panorama-controls">
              <div className="panorama-key-row">
                <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>
                <span>mover</span>
              </div>
              <div className="panorama-key-row">
                <kbd>Mouse</kbd><span>mirar</span>
              </div>
              <div className="panorama-key-row">
                <kbd>Esc</kbd><span>pausar</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
