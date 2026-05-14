import { useState } from 'react'
import { useAppContext } from '../../context/AppContext'
import './BuilderPanel.css'

const ROOM_TYPES = [
  { type: 'living',           label: 'Living',                dims: '5 × 4 m'   },
  { type: 'kitchen',          label: 'Cocina',                dims: '3 × 3 m'   },
  { type: 'master-bedroom',   label: 'Dormitorio principal',  dims: '4 × 3 m'   },
  { type: 'kids-bedroom',     label: 'Habitación individual', dims: '3.5 × 3 m' },
  { type: 'bathroom',         label: 'Baño',                  dims: '2 × 2 m'   },
  { type: 'garage',           label: 'Garage',                dims: '5 × 5 m'   },
]

let nextId = 1

export default function BuilderPanel({ onGenerate }) {
  const { state, dispatch } = useAppContext()
  const [queue, setQueue] = useState([])

  function addToQueue(type) {
    setQueue(q => [...q, { id: nextId++, type }])
  }

  function removeFromQueue(id) {
    setQueue(q => q.filter(r => r.id !== id))
  }

  function clearQueue() {
    setQueue([])
  }

  return (
    <div className="builder-panel">
      <div className="panel-header">
        <span className="panel-title">DISTRIBUCIÓN</span>
        <span className="panel-count">{state.placedRooms.length} ambientes</span>
      </div>

      <div className="panel-separator" />
      <div className="panel-section-label">AGREGAR AMBIENTES</div>

      <div className="room-type-list">
        {ROOM_TYPES.map(({ type, label, dims }) => (
          <div key={type} className="rtr">
            <div className="rtr-info">
              <span className="rtr-label">{label}</span>
              <span className="rtr-dims">{dims}</span>
            </div>
            <button
              className="rtr-add-btn"
              onClick={() => addToQueue(type)}
              title={`Agregar ${label}`}
            >+</button>
          </div>
        ))}
      </div>

      {queue.length > 0 && (
        <>
          <div className="panel-separator" />
          <div className="panel-section-label">
            COLA ({queue.length})
            <button className="queue-clear-btn" onClick={clearQueue}>Limpiar</button>
          </div>
          <div className="queue-list">
            {queue.map(item => {
              const rt = ROOM_TYPES.find(r => r.type === item.type)
              return (
                <div key={item.id} className="queue-item">
                  <span className="queue-item-label">{rt?.label ?? item.type}</span>
                  <button
                    className="queue-item-remove"
                    onClick={() => removeFromQueue(item.id)}
                    title="Quitar"
                  >×</button>
                </div>
              )
            })}
          </div>
        </>
      )}

      <div className="panel-separator" />

      {state.placedRooms.length > 0 && (
        <button
          className="clear-rooms-btn"
          onClick={() => dispatch({ type: 'CLEAR_ROOMS' })}
        >
          ✕ Eliminar distribución actual
        </button>
      )}

      <div className="panel-cta">
        <button
          className="generate-btn"
          disabled={queue.length === 0}
          onClick={() => { onGenerate(queue); clearQueue() }}
        >
          Generar casa →
        </button>
      </div>
    </div>
  )
}
