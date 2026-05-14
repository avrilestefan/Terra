import { useNavigate } from 'react-router-dom'
import './HeroView.css'

/* ── Features data ── */
const FEATURES = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M3 6L8 3.5L16 7L21 4.5V17.5L16 20L8 16.5L3 19V6Z"
          stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        <circle cx="12" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
      </svg>
    ),
    tag:   'MAPA INTERACTIVO',
    title: 'Explorá cada lote',
    desc:  'Visualizá todos los terrenos sobre imagen satelital real. Filtrá por estado, precio y superficie.',
    cta:   'Abrir mapa',
    path:  '/map',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="10" width="18" height="11" rx="1" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M8 10V8C8 5.79 9.79 4 12 4C14.21 4 16 5.79 16 8V10"
          stroke="currentColor" strokeWidth="1.5"/>
        <path d="M8 15H16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
    tag:   'DISEÑO EN 3D',
    title: 'Proyectá tu casa',
    desc:  'Configurá la cantidad de ambientes y generá tu casa sobre el terreno. Recorrela antes de construirla.',
    cta:   null,
    path:  null,
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M3 12C3 12 6.5 7 12 7C17.5 7 21 12 21 12C21 12 17.5 17 12 17C6.5 17 3 12 3 12Z"
          stroke="currentColor" strokeWidth="1.4"/>
        <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
      </svg>
    ),
    tag:   'RECORRIDO 360°',
    title: 'Viví el espacio',
    desc:  'Tour panorámico de alta resolución desde cada lote. Sentí el entorno como si ya estuvieras ahí.',
    cta:   null,
    path:  null,
  },
]

/* ── Component ── */
export default function HeroView() {
  const navigate = useNavigate()

  return (
    <div className="hero-wrap">

      {/* ═══ NAV ═══ */}
      <header className="hero-nav">
        <div className="hero-nav-logo" onClick={() => window.scrollTo(0,0)}>
          <img src="/favicon.png" alt="Terra" className="hero-nav-icon" />
          <span className="hero-nav-wordmark">TERRA</span>
        </div>

        <nav className="hero-nav-links">
          <a href="#features">Características</a>
          <a href="#features">Nosotros</a>
        </nav>

        <button className="hero-nav-cta" onClick={() => navigate('/map')}>
          Ver lotes <span aria-hidden>→</span>
        </button>
      </header>

      {/* ═══ HERO SCREEN (full-height photo) ═══ */}
      <section className="hero-screen">
        {/* Background photo */}
        <div className="hero-bg" aria-hidden="true">
          <img src="/hero-bg.png" alt="" className="hero-bg-img" />
          <div className="hero-bg-overlay" />
        </div>

        {/* Content overlay */}
        <div className="hero-text">
          <p className="hero-pre">San José · Uruguay · Fraccionamiento residencial</p>
          <h1 className="hero-title">TERRA</h1>
          <p className="hero-subtitle">Real Estate</p>
          <p className="hero-desc">
            Explorá cada terreno en&nbsp;3D, recorrelo en&nbsp;360°<br/>
            y proyectá tu hogar antes de decidir.
          </p>
          <div className="hero-actions">
            <button className="hero-btn-primary" onClick={() => navigate('/map')}>
              Explorar lotes <span aria-hidden>→</span>
            </button>
            <a href="#features" className="hero-btn-ghost">
              Cómo funciona <span aria-hidden>↓</span>
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="hero-scroll-hint" aria-hidden="true">
          <div className="hero-scroll-line" />
        </div>
      </section>

      {/* ═══ STATS ═══ */}
      <div className="hero-stats">
        {[
          { num: '24',   label: 'Lotes en venta'   },
          { num: '500+', label: 'm² promedio'       },
          { num: '3D',   label: 'Diseño de casa'    },
          { num: '360°', label: 'Recorrido virtual' },
        ].map((s, i, arr) => (
          <div key={s.label} className="hero-stats-item">
            <div className="hero-stat">
              <span className="hero-stat-n">{s.num}</span>
              <span className="hero-stat-l">{s.label}</span>
            </div>
            {i < arr.length - 1 && <div className="hero-stat-div" aria-hidden />}
          </div>
        ))}
      </div>

      {/* ═══ FEATURES ═══ */}
      <section id="features" className="hero-features">
        <div className="hf-head">
          <span className="hf-eyebrow">HERRAMIENTAS</span>
          <h2 className="hf-title">Todo para decidir con confianza</h2>
          <p className="hf-sub">
            Antes de firmar, tenés acceso completo al terreno desde cualquier dispositivo.
          </p>
        </div>

        <div className="hf-cards">
          {FEATURES.map(f => (
            <div
              key={f.tag}
              className={`hf-card${f.path ? ' hf-card--cta' : ''}`}
              onClick={f.path ? () => navigate(f.path) : undefined}
            >
              <div className="hf-card-icon">{f.icon}</div>
              <span className="hf-card-tag">{f.tag}</span>
              <h3 className="hf-card-title">{f.title}</h3>
              <p className="hf-card-desc">{f.desc}</p>
              {f.cta && <span className="hf-card-link">{f.cta} →</span>}
            </div>
          ))}
        </div>
      </section>

      {/* ═══ CTA BAND ═══ */}
      <section className="hero-band">
        <div className="hero-band-inner">
          <div>
            <h3 className="hero-band-title">¿Listo para encontrar tu lote?</h3>
            <p className="hero-band-sub">Explorá los lotes disponibles y diseñá tu futuro hogar hoy.</p>
          </div>
          <button className="hero-btn-primary" onClick={() => navigate('/map')}>
            Ir al mapa <span aria-hidden>→</span>
          </button>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="hero-footer">
        <div className="hf-logo">
          <img src="/favicon.png" alt="Terra" width="20" height="20" />
          <span>TERRA</span>
        </div>
        <span>© 2025 Terra · San José, Uruguay</span>
        <span>Diseño interactivo</span>
      </footer>

    </div>
  )
}
