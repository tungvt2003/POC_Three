import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { selfCheckShapes } from './designer/catalog/shapes'
import { selfCheckWalls } from './designer/scene/buildWalls'
import { selfCheckCeilingLights } from './designer/scene/ceilingLightGrid'
import { selfCheckCameraPresets } from './designer/controls/cameraPresets'
import { selfCheckClearance } from './designer/controls/clearance'
import { selfCheckSnap } from './designer/controls/snapToWall'
import { selfCheckWallGeometry } from './designer/scene/wallGeometry'
import { useDesignStore } from './designer/store/designStore'
import { selfCheckPolygon } from './lib/polygon'
import { selfCheckUnits } from './lib/units'
import { useUiStore } from './ui/uiStore'
import './index.css'

if (import.meta.env.DEV) {
  selfCheckUnits()
  selfCheckPolygon()
  selfCheckShapes()
  selfCheckWalls()
  selfCheckCeilingLights()
  selfCheckWallGeometry()
  selfCheckSnap()
  selfCheckCameraPresets()
  selfCheckClearance()
  // Mở console gõ `__store.getState()` / `__ui.getState()` để soi state. Chỉ có khi DEV.
  Object.assign(window, { __store: useDesignStore, __ui: useUiStore })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
