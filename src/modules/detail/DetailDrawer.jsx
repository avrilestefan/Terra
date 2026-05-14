import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import { useAppContext } from '../../context/AppContext'
import StatusBadge from '../../components/StatusBadge'
import './DetailDrawer.css'

export default function DetailDrawer() {
  const { state, dispatch } = useAppContext()
  const navigate = useNavigate()
  const sidebarRef = useRef(null)

  const lot = state.lots.find(l => l.id === state.selectedLotId)

  useEffect(() => {
    if (sidebarRef.current) {
      gsap.fromTo(sidebarRef.current,
        { x: -20, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' }
      )
    }
  }, [state.selectedLotId])

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') dispatch({ type: 'SELECT_LOT', id: null })
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (!lot) return null

  const accentColor = {
    available: 'var(--accent)',
    occupied: 'var(--danger)',
    reserved: 'var(--warning)'
  }[lot.status]

  return (
    <div className="sidebar" ref={sidebarRef}>
      <div className="sidebar-accent" style={{ background: accentColor }} />

      <div className="sidebar-content">
        <div className="sidebar-header">
          <div className="sidebar-id">{lot.id}</div>
          <button
            className="sidebar-close"
            onClick={() => dispatch({ type: 'SELECT_LOT', id: null })}
            aria-label="Cerrar"
          >✕</button>
        </div>

        <StatusBadge status={lot.status} />

        <div className="sidebar-separator" />

        <div className="sidebar-grid">
          <span className="sidebar-label">Superficie</span>
          <span className="sidebar-value">{lot.area_m2} m²</span>
          <span className="sidebar-label">Precio</span>
          <span className="sidebar-value">U$S {lot.price_usd.toLocaleString()}</span>
          <span className="sidebar-label">Orientación</span>
          <span className="sidebar-value">{lot.orientation}</span>
          <span className="sidebar-label">Dimensiones</span>
          <span className="sidebar-value">{lot.dimensions}</span>
        </div>

        <div className="sidebar-separator" />

        <div className="sidebar-section-label">ENTORNO</div>
        <div className="sidebar-poi-list">
          <div className="sidebar-poi-row">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="4" width="12" height="9" stroke="currentColor" strokeWidth="1"/>
              <path d="M4 4V2.5C4 1.67 5.34 1 7 1C8.66 1 10 1.67 10 2.5V4" stroke="currentColor" strokeWidth="1"/>
            </svg>
            <span className="poi-label">Escuela Nº 42</span>
            <span className="poi-distance">320m</span>
          </div>
          <div className="sidebar-poi-row">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <polygon points="7,1 13,13 1,13" stroke="currentColor" strokeWidth="1"/>
            </svg>
            <span className="poi-label">Seccional 14ª</span>
            <span className="poi-distance">580m</span>
          </div>
          <div className="sidebar-poi-row">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1"/>
            </svg>
            <span className="poi-label">Supermercado</span>
            <span className="poi-distance">210m</span>
          </div>
        </div>

        <div className="sidebar-separator" />

        <button
          className="sidebar-action-btn"
          onClick={() => navigate(`/lot/${lot.id}/panorama`)}
        >
          <span>Ver entorno 360°</span>
          <span>→</span>
        </button>
        <button
          className="sidebar-action-btn"
          onClick={() => navigate(`/lot/${lot.id}/builder`)}
        >
          <span>Diseñar casa</span>
          <span>→</span>
        </button>

        <div className="sidebar-icon-row">
          <button className="sidebar-icon-btn" aria-label="Compartir">↗</button>
          <button className="sidebar-icon-btn" aria-label="Guardar">♡</button>
        </div>
      </div>
    </div>
  )
}
