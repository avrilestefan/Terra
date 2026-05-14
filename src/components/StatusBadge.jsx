import './StatusBadge.css'

export default function StatusBadge({ status }) {
  const labels = {
    available: 'DISPONIBLE',
    occupied: 'OCUPADO',
    reserved: 'RESERVADO'
  }

  return (
    <span className={`status-badge status-${status}`}>
      {labels[status]}
    </span>
  )
}
