import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useAppContext } from '../../context/AppContext'
import { MAP_CENTER, DRONE_IMAGE_URL, DRONE_IMAGE_CORNERS } from '../../data/droneImageConfig'
import TopBar from '../../components/TopBar'
import DetailDrawer from '../detail/DetailDrawer'
import './MapView.css'

export default function MapView() {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const marker = useRef(null)
  const { state, dispatch } = useAppContext()
  const lots = state.lots
  const [pitch, setPitch] = useState(55)
  const [coords, setCoords] = useState({ lng: MAP_CENTER[0], lat: MAP_CENTER[1] })

  useEffect(() => {
    if (map.current) return

    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-v9',
      center: MAP_CENTER,
      zoom: 17,
      pitch: 55,
      bearing: -20,
    })

    map.current.on('load', () => {
      // Foto del dron como capa raster
      map.current.addSource('drone-photo', {
        type: 'image',
        url: DRONE_IMAGE_URL,
        coordinates: DRONE_IMAGE_CORNERS
      })
      map.current.addLayer({
        id: 'drone-layer',
        type: 'raster',
        source: 'drone-photo',
        paint: { 'raster-opacity': 0.85 }
      })

      // GeoJSON de los lotes
      map.current.addSource('lots', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: lots.map(lot => ({
            type: 'Feature',
            properties: { id: lot.id, status: lot.status },
            geometry: { type: 'Polygon', coordinates: lot.coordinates }
          }))
        }
      })

      // Fill por estado
      map.current.addLayer({
        id: 'lots-fill',
        type: 'fill',
        source: 'lots',
        paint: {
          'fill-color': [
            'match', ['get', 'status'],
            'available', '#0D2E14',
            'occupied',  '#1C1500',
            'reserved',  '#2D0A0A',
            '#112124'
          ],
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false], 0.9,
            0.6
          ]
        }
      })

      // Borde por estado
      map.current.addLayer({
        id: 'lots-line',
        type: 'line',
        source: 'lots',
        paint: {
          'line-color': [
            'match', ['get', 'status'],
            'available', '#4ade80',
            'occupied',  '#F59E0B',
            'reserved',  '#EF4444',
            '#2d4e53'
          ],
          'line-width': 1.5
        }
      })

      // Hover
      let hoveredId = null
      map.current.on('mousemove', 'lots-fill', e => {
        if (e.features.length > 0) {
          if (hoveredId !== null) {
            map.current.setFeatureState({ source: 'lots', id: hoveredId }, { hover: false })
          }
          hoveredId = e.features[0].id
          map.current.setFeatureState({ source: 'lots', id: hoveredId }, { hover: true })
          map.current.getCanvas().style.cursor = 'pointer'
        }
      })
      map.current.on('mouseleave', 'lots-fill', () => {
        if (hoveredId !== null) {
          map.current.setFeatureState({ source: 'lots', id: hoveredId }, { hover: false })
        }
        hoveredId = null
        map.current.getCanvas().style.cursor = ''
      })

      // Click en lote
      map.current.on('click', 'lots-fill', e => {
        const lotId = e.features[0].properties.id
        const lot = lots.find(l => l.id === lotId)
        dispatch({ type: 'SELECT_LOT', id: lotId })
        map.current.easeTo({
          center: lot.centroid,
          zoom: 19,
          pitch: 62,
          duration: 500
        })
      })

      // Click fuera de lotes
      map.current.on('click', e => {
        const features = map.current.queryRenderedFeatures(e.point, { layers: ['lots-fill'] })
        if (features.length === 0) {
          dispatch({ type: 'SELECT_LOT', id: null })
        }
      })
    })

    // Coordenadas en tiempo real
    map.current.on('mousemove', e => {
      setCoords({
        lng: e.lngLat.lng.toFixed(4),
        lat: e.lngLat.lat.toFixed(4)
      })
    })

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

  // Marker en lote seleccionado + resize del mapa al abrir/cerrar sidebar
  // Actualizar GeoJSON cuando llegan los lotes de la API
  useEffect(() => {
    if (!map.current || lots.length === 0) return
    const geojson = {
      type: 'FeatureCollection',
      features: lots.map(lot => ({
        type: 'Feature',
        properties: { id: lot.id, status: lot.status },
        geometry: { type: 'Polygon', coordinates: lot.coordinates }
      }))
    }
    const applyData = () => {
      const src = map.current.getSource('lots')
      if (src) src.setData(geojson)
    }
    if (map.current.isStyleLoaded()) applyData()
    else map.current.once('load', applyData)
  }, [lots])

  useEffect(() => {
    if (marker.current) {
      marker.current.remove()
      marker.current = null
    }
    if (state.selectedLotId) {
      const lot = lots.find(l => l.id === state.selectedLotId)
      if (lot) {
        const el = document.createElement('div')
        el.className = 'lot-marker'
        marker.current = new mapboxgl.Marker({ element: el })
          .setLngLat(lot.centroid)
          .addTo(map.current)
      }
    }
    // Espera al siguiente frame para que el DOM actualice el ancho antes de resize
    requestAnimationFrame(() => map.current?.resize())
  }, [state.selectedLotId])

  // Aplicar filtro de estados en las capas del mapa
  useEffect(() => {
    if (!map.current) return
    const filter = ['in', ['get', 'status'], ['literal', state.activeFilters]]
    const applyFilter = () => {
      if (map.current.getLayer('lots-fill')) map.current.setFilter('lots-fill', filter)
      if (map.current.getLayer('lots-line')) map.current.setFilter('lots-line', filter)
    }
    if (map.current.isStyleLoaded()) {
      applyFilter()
    } else {
      map.current.once('load', applyFilter)
    }
  }, [state.activeFilters])

  function handlePitchChange(p) {
    setPitch(p)
    dispatch({ type: 'SET_PITCH', pitch: p })
    map.current?.easeTo({ pitch: p, duration: 400 })
  }

  function handleResetView() {
    map.current?.easeTo({ center: MAP_CENTER, zoom: 17, pitch: 55, bearing: -20, duration: 800 })
    setPitch(55)
  }

  return (
    <div className="map-wrap">
      {state.selectedLotId && <DetailDrawer />}
      <div className="map-main">
        <div ref={mapContainer} className="map-container" />
        <TopBar currentPitch={pitch} onPitchChange={handlePitchChange} onResetView={handleResetView} />
        <div className="map-coords">
          {coords.lng}, {coords.lat}
        </div>
      </div>
    </div>
  )
}