import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import HeroView from './modules/hero/HeroView'
import MapView from './modules/map/MapView'
import PanoramaView from './modules/panorama/PanoramaView'
import BuilderView from './modules/builder/BuilderView'
import RenderView from './modules/render/RenderView'

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"                      element={<HeroView />} />
          <Route path="/map"                   element={<MapView />} />
          <Route path="/lot/:id/panorama"      element={<PanoramaView />} />
          <Route path="/lot/:id/builder"       element={<BuilderView />} />
          <Route path="/lot/:id/render"        element={<RenderView />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}
