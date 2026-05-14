import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import { useAppContext } from '../../context/AppContext'
import TopBar from '../../components/TopBar'
import { renderWithAI } from '../../lib/replicateClient'
import './RenderView.css'

const STYLES = ['MINIMAL', 'INDUSTRIAL', 'NORDIC', 'MEDITERRANEAN', 'BRUTALIST']

export default function RenderView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state } = useAppContext()

  const [status, setStatus] = useState('idle')
  const [resultUrl, setResultUrl] = useState(null)
  const [selectedStyle, setSelectedStyle] = useState('MINIMAL')
  const [specs, setSpecs] = useState('')

  const scanRef = useRef(null)
  const scanAnimRef = useRef(null)
  const resultImgRef = useRef(null)

  useEffect(() => {
    if (status === 'loading' && scanRef.current) {
      scanAnimRef.current = gsap.fromTo(
        scanRef.current,
        { top: '0%' },
        { top: '100%', duration: 1.2, repeat: -1, ease: 'none' }
      )
    }
    return () => scanAnimRef.current?.kill()
  }, [status])

  useEffect(() => {
    if (status === 'done' && resultImgRef.current) {
      gsap.fromTo(resultImgRef.current, { opacity: 0 }, { opacity: 1, duration: 0.6 })
    }
  }, [status])

  async function handleRender() {
    if (!state.capturedFrame) return
    setStatus('loading')
    setResultUrl(null)
    try {
      const url = await renderWithAI({
        base64Image: state.capturedFrame,
        style: selectedStyle,
        specs
      })
      setResultUrl(url)
      setStatus('done')
    } catch (err) {
      console.error(err)
      setStatus('error')
    }
  }

  function handleDownload() {
    const a = document.createElement('a')
    a.href = resultUrl
    a.download = `render-${id}-${selectedStyle.toLowerCase()}.png`
    a.click()
  }

  return (
    <div className="render-wrap">
      <TopBar
        breadcrumb={['TERRA', id, 'RENDER']}
        onBack={() => navigate(`/lot/${id}/builder`)}
      />

      <div className="render-main">
        {/* Panel izquierdo — captura base */}
        <div className="render-panel render-left">
          <span className="render-panel-label">BASE</span>
          {state.capturedFrame ? (
            <img src={state.capturedFrame} className="render-img" alt="Captura base" />
          ) : (
            <div className="render-empty">
              <span>Sin captura.</span>
              <button onClick={() => navigate(`/lot/${id}/builder`)}>
                ← Volver al constructor
              </button>
            </div>
          )}
        </div>

        <div className="render-divider" />

        {/* Panel derecho — resultado IA */}
        <div className="render-panel render-right">
          {status === 'idle' && (
            <div className="render-empty">
              <span>Configurá el estilo y presioná Render</span>
            </div>
          )}

          {status === 'loading' && (
            <div className="render-loading">
              <div className="scan-line" ref={scanRef} />
              <span className="render-loading-label">RENDERING</span>
            </div>
          )}

          {status === 'done' && resultUrl && (
            <>
              <img
                ref={resultImgRef}
                src={resultUrl}
                className="render-img"
                alt="Resultado IA"
              />
              <button className="download-btn" onClick={handleDownload}>⬇</button>
            </>
          )}

          {status === 'error' && (
            <div className="render-empty">
              <span className="render-error">Error al renderizar. Intentá de nuevo.</span>
            </div>
          )}
        </div>
      </div>

      {/* Barra inferior */}
      <div className="render-bar">
        <div className="style-tabs">
          {STYLES.map(s => (
            <button
              key={s}
              className={`style-tab ${selectedStyle === s ? 'active' : ''}`}
              onClick={() => setSelectedStyle(s)}
            >
              {s}
            </button>
          ))}
        </div>

        <input
          className="specs-input"
          placeholder="Especificaciones adicionales"
          value={specs}
          onChange={e => setSpecs(e.target.value)}
        />

        <button className="render-btn" onClick={handleRender}>
          Render
        </button>
      </div>
    </div>
  )
}