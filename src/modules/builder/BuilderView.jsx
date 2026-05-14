import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import * as THREE from 'three'
import { OrbitControls }      from 'three/addons/controls/OrbitControls.js'
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { Sky } from 'three/addons/objects/Sky.js'
import { useAppContext } from '../../context/AppContext'
import TopBar from '../../components/TopBar'
import BuilderPanel from './BuilderPanel'
import './BuilderView.css'

// Con assetsInclude en vite.config.js, estos imports devuelven la URL resuelta
import bathroomUrl      from '../../assets/models/bathroom.glb'
import garageUrl        from '../../assets/models/garage.glb'
import kidsBedUrl       from '../../assets/models/kids-bedroom.glb'
import kitchenUrl       from '../../assets/models/kitchen.glb'
import livingUrl        from '../../assets/models/living.glb'
import masterBedUrl     from '../../assets/models/master-bedroom.glb'

const MODEL_URL_MAP = {
  bathroom:         bathroomUrl,
  garage:           garageUrl,
  'kids-bedroom':   kidsBedUrl,
  kitchen:          kitchenUrl,
  living:           livingUrl,
  'master-bedroom': masterBedUrl,
}

export const ROOM_CONFIGS = {
  living:           { w: 5,   h: 2.8, d: 4,   color: 0x4ade80, label: 'Living',               dims: '5 × 4m'   },
  kitchen:          { w: 3,   h: 2.8, d: 3,   color: 0xfbbf24, label: 'Cocina',               dims: '3 × 3m'   },
  'master-bedroom': { w: 4,   h: 2.8, d: 3,   color: 0xa78bfa, label: 'Dormitorio principal', dims: '4 × 3m'   },
  'kids-bedroom':   { w: 3.5, h: 2.8, d: 3,   color: 0x60a5fa, label: 'Dormitorio niños',     dims: '3.5 × 3m' },
  bathroom:         { w: 2,   h: 2.8, d: 2,   color: 0x34d399, label: 'Baño',                 dims: '2 × 2m'   },
  garage:           { w: 5,   h: 3,   d: 5,   color: 0x94a3b8, label: 'Garage',               dims: '5 × 5m'   },
}

// ── Cache de modelos ────────────────────────────────────────────────────────
const loader     = new GLTFLoader()
const glbCache   = {}

function loadRoomModel(type) {
  return new Promise(resolve => {
    if (glbCache[type]) { resolve(glbCache[type].clone()); return }
    const url = MODEL_URL_MAP[type]
    if (!url) { resolve(null); return }
    loader.load(url, gltf => {
      glbCache[type] = gltf.scene
      resolve(gltf.scene.clone())
    }, undefined, () => resolve(null))
  })
}

function normalizeAndPlace(model, config, position) {
  const bbox = new THREE.Box3().setFromObject(model)
  const size = new THREE.Vector3()
  bbox.getSize(size)
  const scale = Math.min(config.w / size.x, config.h / size.y, config.d / size.z)
  model.scale.setScalar(scale)
  // Apoyar en la superficie
  bbox.setFromObject(model)
  model.position.set(position.x, position.y - bbox.min.y, position.z)
  model.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true } })
}

// ── Física del modo caminar ────────────────────────────────────────────────
const PLAYER_H      = 1.6   // altura de cámara (ojos)
const PLAYER_RADIUS = 0.32  // radio de colisión del jugador (m)

// Devuelve true si la posición XZ está dentro de al menos un ambiente
function isInsideHouse(x, z, rooms) {
  if (!rooms.length) return true          // sin ambientes → libre
  for (const room of rooms) {
    const cfg = ROOM_CONFIGS[room.type]
    if (!cfg) continue
    const hw = cfg.w / 2 - PLAYER_RADIUS  // margen de colisión con paredes
    const hd = cfg.d / 2 - PLAYER_RADIUS
    if (hw <= 0 || hd <= 0) continue
    if (
      x >= room.position.x - hw && x <= room.position.x + hw &&
      z >= room.position.z - hd && z <= room.position.z + hd
    ) return true
  }
  return false
}

// Ángulos polares (desde el cénit) para cada preset de elevación
const PITCH_POLAR = {
  20: THREE.MathUtils.degToRad(70),   // 20° sobre horizonte
  45: THREE.MathUtils.degToRad(45),   // 45°
  60: THREE.MathUtils.degToRad(30),   // 60°
}

// ── Componente ──────────────────────────────────────────────────────────────
export default function BuilderView() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const { state, dispatch } = useAppContext()

  const mountRef       = useRef(null)
  const rendererRef    = useRef(null)
  const sceneRef       = useRef(null)
  const cameraRef      = useRef(null)
  const controlsRef    = useRef(null)   // OrbitControls
  const walkCtrlRef    = useRef(null)   // PointerLockControls
  const walkKeysRef    = useRef({})
  const designCamRef   = useRef(null)
  const placedRoomsRef = useRef([])     // espejo de state.placedRooms para el loop
  const frameRef       = useRef(null)
  const meshMapRef     = useRef({})
  const terrainRef     = useRef(null)
  const groundRef      = useRef(null)

  const [selectedId, setSelectedId]       = useState(null)
  const [terrainLoaded, setTerrainLoaded] = useState(false)
  const [activePitch, setActivePitch]     = useState(45)
  const [isRotating, setIsRotating]       = useState(false)
  const [walkMode, setWalkMode]           = useState(false)
  const [walkLocked, setWalkLocked]       = useState(false)

  const lot = state.lots.find(l => l.id === id)

  // ── Inicializar Three.js ──────────────────────────────────────────────────
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Escena
    const scene = new THREE.Scene()
    sceneRef.current = scene

    // Cámara
    const camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.1, 300)
    camera.position.set(0, 18, 22)
    cameraRef.current = camera

    // OrbitControls (diseño)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.06
    controls.maxPolarAngle = Math.PI / 2.05
    controls.minDistance = 3
    controls.maxDistance = 80
    controlsRef.current = controls

    // PointerLockControls (caminar)
    const walkCtrl = new PointerLockControls(camera, renderer.domElement)
    walkCtrl.addEventListener('lock',   () => setWalkLocked(true))
    walkCtrl.addEventListener('unlock', () => {
      setWalkLocked(false)
      setWalkMode(false)
      controls.enabled = true
      // Restaurar cámara de diseño
      const saved = designCamRef.current
      if (saved) {
        camera.position.copy(saved.pos)
        controls.target.copy(saved.target)
        controls.update()
      }
    })
    walkCtrlRef.current = walkCtrl

    // Teclas WASD
    const onKeyDown = e => { walkKeysRef.current[e.code] = true }
    const onKeyUp   = e => { delete walkKeysRef.current[e.code] }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup',   onKeyUp)

    const clock = new THREE.Clock()

    // ── Sky ──────────────────────────────────────────────────────────────────
    const sky = new Sky()
    sky.scale.setScalar(20000)
    scene.add(sky)
    const skyUni = sky.material.uniforms
    skyUni['turbidity'].value        = 6
    skyUni['rayleigh'].value         = 1.2
    skyUni['mieCoefficient'].value   = 0.004
    skyUni['mieDirectionalG'].value  = 0.82
    const sunDir = new THREE.Vector3()
    const phi   = THREE.MathUtils.degToRad(82)   // sol ~8° sobre horizonte
    const theta = THREE.MathUtils.degToRad(225)  // SO → luz diagonal
    sunDir.setFromSphericalCoords(1, phi, theta)
    skyUni['sunPosition'].value.copy(sunDir)

    // Niebla suave que coincide con el cielo en el horizonte
    scene.fog = new THREE.FogExp2(0x8ec8f0, 0.004)

    // ── Luces ────────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xfff5e0, 0.5))
    const sun = new THREE.DirectionalLight(0xfff5c0, 2.0)
    sun.position.copy(sunDir).multiplyScalar(60)
    sun.castShadow = true
    sun.shadow.mapSize.setScalar(2048)
    sun.shadow.camera.left = -40; sun.shadow.camera.right  = 40
    sun.shadow.camera.top  =  40; sun.shadow.camera.bottom = -40
    scene.add(sun)
    scene.add(new THREE.HemisphereLight(0xbfd4f2, 0x4a6020, 0.6))

    // Grid + plano de fallback
    scene.add(new THREE.GridHelper(80, 40, 0x2a3a1a, 0x1e2e12))
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshStandardMaterial({ color: 0x3a5e28, roughness: 0.9 })
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.01
    ground.receiveShadow = true
    scene.add(ground)
    groundRef.current = ground

    // Render loop
    function animate() {
      frameRef.current = requestAnimationFrame(animate)
      const delta = clock.getDelta()

      if (walkCtrl.isLocked) {
        const keys  = walkKeysRef.current
        const step  = 5 * delta

        // Dirección de movimiento en espacio mundo (proyectada al plano XZ)
        const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
        fwd.y = 0; fwd.normalize()
        const rgt = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
        rgt.y = 0; rgt.normalize()

        let dx = 0, dz = 0
        if (keys['KeyW'] || keys['ArrowUp'])    { dx += fwd.x * step; dz += fwd.z * step }
        if (keys['KeyS'] || keys['ArrowDown'])  { dx -= fwd.x * step; dz -= fwd.z * step }
        if (keys['KeyA'] || keys['ArrowLeft'])  { dx -= rgt.x * step; dz -= rgt.z * step }
        if (keys['KeyD'] || keys['ArrowRight']) { dx += rgt.x * step; dz += rgt.z * step }

        if (dx !== 0 || dz !== 0) {
          camera.position.x += dx
          camera.position.z += dz
        }

        camera.position.y = PLAYER_H
      } else {
        controls.update()
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
      cancelAnimationFrame(frameRef.current)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup',   onKeyUp)
      controls.dispose()
      walkCtrl.dispose()
      renderer.dispose()
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
      meshMapRef.current = {}
      terrainRef.current = null
    }
  }, [])

  // ── Cargar terreno del lote ───────────────────────────────────────────────
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene || !lot?.modelPath) return

    loader.load(
      lot.modelPath,
      gltf => {
        // Centrar y escalar el terreno
        const terrain = gltf.scene
        const bbox    = new THREE.Box3().setFromObject(terrain)
        const center  = new THREE.Vector3()
        bbox.getCenter(center)
        const size   = new THREE.Vector3()
        bbox.getSize(size)
        const maxDim = Math.max(size.x, size.z)
        const scale  = 30 / maxDim   // ~30 unidades de ancho
        terrain.scale.setScalar(scale)
        terrain.position.set(-center.x * scale, -bbox.min.y * scale, -center.z * scale)
        terrain.traverse(n => { if (n.isMesh) { n.receiveShadow = true; n.castShadow = true } })
        scene.add(terrain)
        terrainRef.current = terrain
        setTerrainLoaded(true)

        // Ajustar cámara al terreno
        const scaledSize = size.multiplyScalar(scale)
        const camDist    = Math.max(scaledSize.x, scaledSize.z) * 1.2
        cameraRef.current.position.set(0, camDist * 0.7, camDist)
        controlsRef.current.update()
      },
      undefined,
      () => setTerrainLoaded(false) // fallback: usar plano
    )
  }, [lot])

  // ── Sincronizar habitaciones del context ──────────────────────────────────
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return

    // Raycast hacia abajo para encontrar la altura del terreno en (x,z)
    function getTerrainYAt(x, z) {
      const targets = [terrainRef.current, groundRef.current].filter(Boolean)
      if (!targets.length) return 0
      const ray = new THREE.Raycaster(
        new THREE.Vector3(x, 200, z),
        new THREE.Vector3(0, -1, 0)
      )
      const hits = ray.intersectObjects(targets, true)
      return hits.length ? hits[0].point.y : 0
    }

    state.placedRooms.forEach(room => {
      const yOffset = room.position.y ?? 0

      if (meshMapRef.current[room.id]) {
        // ── Actualizar mesh existente ──────────────────────────────────────
        const obj = meshMapRef.current[room.id]
        obj.position.x = room.position.x
        obj.position.z = room.position.z
        obj.rotation.y = room.rotationY ?? 0

        // Recalcular Y si cambió el offset del usuario
        const terrainY = obj.userData.terrainY ?? getTerrainYAt(room.position.x, room.position.z)
        const newTarget = terrainY + yOffset
        if (!obj.userData.terrainY) obj.userData.terrainY = terrainY
        if (Math.abs(newTarget - (obj.userData.targetFloor ?? newTarget)) > 0.0001) {
          obj.position.y += newTarget - obj.userData.targetFloor
          obj.userData.targetFloor = newTarget
        }
        return
      }

      // ── Nuevo ambiente ─────────────────────────────────────────────────
      const config    = ROOM_CONFIGS[room.type] ?? ROOM_CONFIGS.living
      const terrainY  = getTerrainYAt(room.position.x, room.position.z)
      const floorY    = terrainY + yOffset

      // Placeholder semitransparente mientras carga el GLB
      const ph = new THREE.Mesh(
        new THREE.BoxGeometry(config.w, config.h, config.d),
        new THREE.MeshStandardMaterial({ color: config.color, roughness: 0.6, transparent: true, opacity: 0.4 })
      )
      ph.position.set(room.position.x, floorY + config.h / 2, room.position.z)
      ph.rotation.y          = room.rotationY ?? 0
      ph.userData.roomId     = room.id
      ph.userData.terrainY   = terrainY
      ph.userData.targetFloor = floorY
      ph.castShadow = true
      scene.add(ph)
      meshMapRef.current[room.id] = ph

      // Cargar GLB y reemplazar placeholder
      loadRoomModel(room.type).then(model => {
        if (!model || !meshMapRef.current[room.id]) return
        normalizeAndPlace(model, config, { x: room.position.x, y: floorY, z: room.position.z })
        model.rotation.y           = room.rotationY ?? 0
        model.userData.roomId      = room.id
        model.userData.terrainY    = terrainY
        model.userData.targetFloor = floorY
        scene.remove(meshMapRef.current[room.id])
        scene.add(model)
        meshMapRef.current[room.id] = model
      })
    })

    // Eliminar ambientes borrados del estado
    for (const meshId of Object.keys(meshMapRef.current)) {
      if (!state.placedRooms.find(r => r.id === meshId)) {
        scene.remove(meshMapRef.current[meshId])
        delete meshMapRef.current[meshId]
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.placedRooms, terrainLoaded])

  // Mantener ref sincronizada para el loop de física
  useEffect(() => { placedRoomsRef.current = state.placedRooms }, [state.placedRooms])

  // ── Walk mode toggle ─────────────────────────────────────────────────────
  function toggleWalkMode() {
    if (!walkMode) {
      designCamRef.current = {
        pos:    cameraRef.current.position.clone(),
        target: controlsRef.current.target.clone(),
      }
      // Colocar cámara en el centroide de la casa para asegurar que empiece adentro
      const rooms = state.placedRooms
      let cx = 0, cz = 0
      if (rooms.length > 0) {
        cx = rooms.reduce((s, r) => s + r.position.x, 0) / rooms.length
        cz = rooms.reduce((s, r) => s + r.position.z, 0) / rooms.length
      }
      cameraRef.current.position.set(cx, PLAYER_H, cz)
      controlsRef.current.enabled = false
      setWalkMode(true)
      walkCtrlRef.current?.lock()
    } else {
      walkCtrlRef.current?.unlock()
    }
  }

  // ── Click para seleccionar ambiente ─────────────────────────────────────
  const handleClick = useCallback(e => {
    if (walkMode) return
    const renderer = rendererRef.current
    const camera   = cameraRef.current
    const scene    = sceneRef.current
    if (!renderer || !camera || !scene) return

    const rect  = renderer.domElement.getBoundingClientRect()
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width)  *  2 - 1,
      -((e.clientY - rect.top)  / rect.height) *  2 + 1
    )
    const ray = new THREE.Raycaster()
    ray.setFromCamera(mouse, camera)

    const placed = Object.values(meshMapRef.current)
    const hits   = ray.intersectObjects(placed, true)
    if (hits.length) {
      let obj = hits[0].object
      while (obj && !obj.userData.roomId && obj.parent !== scene) obj = obj.parent
      if (obj?.userData.roomId) {
        setSelectedId(prev => prev === obj.userData.roomId ? null : obj.userData.roomId)
        return
      }
    }
    setSelectedId(null)
  }, [walkMode])

  // ── Drag (mover) y giro manual (click derecho + arrastrar) ──────────────
  const dragRef      = useRef(null)   // roomId en modo movimiento
  const rotateRef    = useRef(null)   // roomId en modo rotación

  function getRoomUnderCursor(e) {
    const renderer = rendererRef.current; const camera = cameraRef.current
    if (!renderer || !camera) return null
    const rect  = renderer.domElement.getBoundingClientRect()
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width)  *  2 - 1,
      -((e.clientY - rect.top)  / rect.height) *  2 + 1
    )
    const ray = new THREE.Raycaster()
    ray.setFromCamera(mouse, camera)
    const hits = ray.intersectObjects(Object.values(meshMapRef.current), true)
    if (!hits.length) return null
    let obj = hits[0].object
    while (obj && !obj.userData.roomId && obj.parent !== sceneRef.current) obj = obj.parent
    return obj?.userData.roomId ? meshMapRef.current[obj.userData.roomId] : null
  }

  function onPointerDown(e) {
    if (walkMode) return

    if (e.button === 2) {
      // ── Click derecho: iniciar rotación si hay ambiente bajo cursor ──────
      const mesh = getRoomUnderCursor(e)
      if (mesh) {
        rotateRef.current = mesh.userData.roomId
        setIsRotating(true)
        controlsRef.current.enabled = false
        e.stopPropagation()
      }
      return
    }

    // ── Click izquierdo: mover ambiente ──────────────────────────────────
    const mesh = getRoomUnderCursor(e)
    if (mesh) {
      dragRef.current = mesh
      controlsRef.current.enabled = false
      e.stopPropagation()
    }
  }

  function onPointerMove(e) {
    // Rotación: movimiento horizontal → delta de ángulo
    if (rotateRef.current) {
      const delta = e.movementX * 0.015   // ~1.5 rad / 100 px
      dispatch({ type: 'ROTATE_ROOM', id: rotateRef.current, delta })
      return
    }

    if (!dragRef.current) return
    const renderer = rendererRef.current; const camera = cameraRef.current
    const rect  = renderer.domElement.getBoundingClientRect()
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width)  *  2 - 1,
      -((e.clientY - rect.top)  / rect.height) *  2 + 1
    )
    const ray = new THREE.Raycaster()
    ray.setFromCamera(mouse, camera)
    const targets = terrainRef.current
      ? [terrainRef.current, groundRef.current]
      : [groundRef.current]
    const hits = ray.intersectObjects(targets, true)
    if (hits.length) {
      const pt = hits[0].point
      dragRef.current.position.x = pt.x
      dragRef.current.position.z = pt.z
    }
  }

  function onPointerUp(e) {
    if (rotateRef.current) {
      rotateRef.current = null
      setIsRotating(false)
      controlsRef.current.enabled = true
      return
    }
    if (dragRef.current) {
      dispatch({
        type: 'UPDATE_ROOM_POSITION',
        id: dragRef.current.userData.roomId,
        position: { x: dragRef.current.position.x, z: dragRef.current.position.z }
      })
      dragRef.current = null
      controlsRef.current.enabled = true
    }
  }

  // ── Pitch presets ────────────────────────────────────────────────────────
  function applyPitch(degrees) {
    const controls = controlsRef.current
    const camera   = cameraRef.current
    if (!controls || !camera) return
    const target  = controls.target.clone()
    const offset  = camera.position.clone().sub(target)
    const radius  = offset.length()
    const azimuth = Math.atan2(offset.x, offset.z)
    const polar   = PITCH_POLAR[degrees] ?? THREE.MathUtils.degToRad(45)
    camera.position.set(
      target.x + radius * Math.sin(polar) * Math.sin(azimuth),
      target.y + radius * Math.cos(polar),
      target.z + radius * Math.sin(polar) * Math.cos(azimuth)
    )
    controls.update()
    setActivePitch(degrees)
  }

  // ── Ajuste vertical de ambientes ────────────────────────────────────────
  function handleAdjustY(delta) {
    if (!selectedId) return
    const room = state.placedRooms.find(r => r.id === selectedId)
    if (!room) return
    dispatch({
      type: 'UPDATE_ROOM_POSITION',
      id:   selectedId,
      position: { x: room.position.x, y: (room.position.y ?? 0) + delta, z: room.position.z }
    })
  }

  // ── Generar distribución automática ──────────────────────────────────────
  // queue: [{ id, type }, ...] — orden tal como el usuario los agregó
  function handleGenerate(queue) {
    dispatch({ type: 'CLEAR_ROOMS' })
    setSelectedId(null)

    const roomList = queue.map(r => r.type)
    if (roomList.length === 0) return

    // Empaquetar en filas (ancho máx. 14 m, sin separación entre ambientes)
    const GAP = 0
    const MAX_W = 14
    const rows = []
    let row = [], rowW = 0

    for (const type of roomList) {
      const cfg = ROOM_CONFIGS[type]
      if (rowW > 0 && rowW + cfg.w > MAX_W) {
        rows.push(row); row = []; rowW = 0
      }
      row.push(type)
      rowW += cfg.w + GAP
    }
    if (row.length) rows.push(row)

    // Calcular posiciones (X centrado por fila, Z acumulado)
    const placed = []
    let z = 0
    for (const r of rows) {
      const totalW = r.reduce((s, t) => s + ROOM_CONFIGS[t].w, 0) + GAP * (r.length - 1)
      const maxD   = Math.max(...r.map(t => ROOM_CONFIGS[t].d))
      let x = -totalW / 2
      for (const type of r) {
        const cfg = ROOM_CONFIGS[type]
        placed.push({ type, x: x + cfg.w / 2, z: z + cfg.d / 2 })
        x += cfg.w + GAP
      }
      z += maxD + GAP
    }

    // Centrar en Z
    const totalZ = z - GAP
    placed.forEach(({ type, x, z: pz }, i) => {
      dispatch({
        type: 'ADD_ROOM',
        room: {
          id:        `${type}-gen-${i}`,
          type,
          position:  { x, y: 0, z: pz - totalZ / 2 },
          rotationY: 0,
        }
      })
    })
  }

  if (!lot) return (
    <div className="builder-error">
      <span>Lote no encontrado</span>
      <button onClick={() => navigate('/map')}>← Volver</button>
    </div>
  )

  return (
    <div className="builder-wrap">
      <TopBar breadcrumb={['TERRA', id, 'DISEÑAR']} onBack={() => navigate('/map')} />
      <div className="builder-main">
        <div
          className="builder-canvas"
          ref={mountRef}
          style={{ cursor: isRotating ? 'ew-resize' : 'default' }}
          onClick={handleClick}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onContextMenu={e => e.preventDefault()}
        >
          {/* Pitch presets — ocultos en walk mode */}
          {!walkMode && (
            <div className="builder-pitch-buttons">
              {[20, 45, 60].map(deg => (
                <button
                  key={deg}
                  className={`builder-pitch-btn ${activePitch === deg ? 'active' : ''}`}
                  onClick={e => { e.stopPropagation(); applyPitch(deg) }}
                >{deg}°</button>
              ))}
            </div>
          )}

          {/* Botón caminar */}
          {!walkMode && (
            <button
              className="builder-walk-btn"
              onClick={e => { e.stopPropagation(); toggleWalkMode() }}
            >
              👤 Caminar
            </button>
          )}

          {lot.modelPath && !terrainLoaded && !walkMode && (
            <div className="builder-terrain-badge">Sin modelo de terreno — usando plano base</div>
          )}

          {/* Walk mode — overlay si no está bloqueado */}
          {walkMode && !walkLocked && (
            <div className="builder-walk-overlay"
              onClick={() => walkCtrlRef.current?.lock()}>
              <div className="builder-walk-hint">
                <p>Hacé click para caminar</p>
                <div className="bwh-keys">
                  <div className="bwh-row">
                    <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>
                    <span>mover</span>
                  </div>
                  <div className="bwh-row"><kbd>Mouse</kbd><span>mirar</span></div>
                  <div className="bwh-row"><kbd>Esc</kbd><span>salir</span></div>
                </div>
              </div>
            </div>
          )}

          {/* Walk mode — badge cuando está bloqueado */}
          {walkMode && walkLocked && (
            <div className="builder-walk-badge">
              ESC para salir · WASD para mover
            </div>
          )}

          {/* Control de nivel vertical — aparece al seleccionar un ambiente */}
          {selectedId && !walkMode && (() => {
            const selRoom = state.placedRooms.find(r => r.id === selectedId)
            const yOff = selRoom ? (selRoom.position.y ?? 0) : 0
            return (
              <div className="builder-y-control">
                <span className="byc-label">Nivel</span>
                <button className="byc-btn" onClick={e => { e.stopPropagation(); handleAdjustY(-0.05) }}>↓</button>
                <span className="byc-val">{yOff >= 0 ? '+' : ''}{yOff.toFixed(2)} m</span>
                <button className="byc-btn" onClick={e => { e.stopPropagation(); handleAdjustY( 0.05) }}>↑</button>
              </div>
            )
          })()}

          {/* Modal controles — oculto en walk mode */}
          {!walkMode && (
            <div className="builder-controls-modal">
              <div className="bcm-row"><kbd>🖱 Arrastar</kbd><span>Rotar vista</span></div>
              <div className="bcm-row"><kbd>Scroll</kbd><span>Zoom</span></div>
              <div className="bcm-row"><kbd>⇧ + Arrastar</kbd><span>Mover vista</span></div>
              <div className="bcm-sep" />
              <div className="bcm-row"><kbd>Click</kbd><span>Seleccionar ambiente</span></div>
              <div className="bcm-row"><kbd>Arrastar</kbd><span>Mover ambiente</span></div>
              <div className="bcm-row bcm-highlight"><kbd>Click der + arrastar</kbd><span>Girar ambiente ↔</span></div>
            </div>
          )}
        </div>

        {/* Panel lateral — se oculta en walk mode */}
        {!walkMode && (
          <BuilderPanel onGenerate={handleGenerate} />
        )}
      </div>
    </div>
  )
}
