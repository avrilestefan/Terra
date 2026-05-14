import { useState, useRef, useEffect } from 'react'
import { useAppContext } from '../context/AppContext'
import './TopBar.css'

const STATUS_LABELS = {
  available: 'Disponibles',
  occupied:  'Ocupados',
  reserved:  'Reservados',
}

const STATUS_COLORS = {
  available: 'var(--success)',
  occupied:  'var(--warning)',
  reserved:  'var(--danger)',
}

export default function TopBar({ currentPitch, onPitchChange, breadcrumb, onBack, onResetView }) {
  const { state, dispatch } = useAppContext()
  const [showFilters, setShowFilters] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const filterRef = useRef(null)
  const settingsRef = useRef(null)

  // Cierra paneles al hacer click fuera
  useEffect(() => {
    function handleClick(e) {
      if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilters(false)
      if (settingsRef.current && !settingsRef.current.contains(e.target)) setShowSettings(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function toggleFilter(status) {
    dispatch({ type: 'TOGGLE_FILTER', status })
  }

  return (
    <div className="topbar">
      <div className="topbar-left">
        {breadcrumb ? (
          <div className="topbar-breadcrumb">
            <button className="topbar-back" onClick={onBack}>←</button>
            {breadcrumb.map((segment, i) => (
              <span key={i}>
                <span className={i === breadcrumb.length - 1 ? 'bc-active' : 'bc-inactive'}>
                  {segment}
                </span>
                {i < breadcrumb.length - 1 && (
                  <span className="bc-separator"> › </span>
                )}
              </span>
            ))}
          </div>
        ) : (
          <div className="topbar-brand">
          <img src="/favicon.png" alt="Terra" className="topbar-logo-img" />
          <span className="topbar-wordmark">TERRA</span>
        </div>
        )}
      </div>

      <div className="topbar-right">
        {onPitchChange && (
          <div className="pitch-control">
            {[20, 45, 60].map(p => (
              <button
                key={p}
                className={`pitch-btn ${currentPitch === p ? 'active' : ''}`}
                onClick={() => onPitchChange(p)}
              >
                {p}°
              </button>
            ))}
          </div>
        )}

        {/* Filtros */}
        <div className="topbar-dropdown-wrap" ref={filterRef}>
          <button
            className={`icon-btn ${showFilters ? 'active' : ''}`}
            aria-label="Filtros"
            onClick={() => { setShowFilters(v => !v); setShowSettings(false) }}
          >≡</button>

          {showFilters && (
            <div className="topbar-panel">
              <div className="panel-title">Filtrar por estado</div>
              {Object.entries(STATUS_LABELS).map(([status, label]) => {
                const on = state.activeFilters.includes(status)
                return (
                  <button
                    key={status}
                    className={`filter-row ${on ? 'on' : 'off'}`}
                    onClick={() => toggleFilter(status)}
                  >
                    <span
                      className="filter-dot"
                      style={{ background: on ? STATUS_COLORS[status] : 'var(--border-strong)' }}
                    />
                    <span className="filter-label">{label}</span>
                    <span className="filter-check">{on ? '✓' : ''}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Ajustes */}
        <div className="topbar-dropdown-wrap" ref={settingsRef}>
          <button
            className={`icon-btn ${showSettings ? 'active' : ''}`}
            aria-label="Ajustes"
            onClick={() => { setShowSettings(v => !v); setShowFilters(false) }}
          >⚙</button>

          {showSettings && (
            <div className="topbar-panel">
              <div className="panel-title">Ajustes</div>
              {onResetView && (
                <button
                  className="settings-row"
                  onClick={() => { onResetView(); setShowSettings(false) }}
                >
                  <span>↺</span>
                  <span>Restablecer vista</span>
                </button>
              )}
              <button
                className="settings-row"
                onClick={() => {
                  dispatch({ type: 'SELECT_LOT', id: null })
                  setShowSettings(false)
                }}
              >
                <span>✕</span>
                <span>Cerrar selección</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
