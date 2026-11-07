import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import OverviewPage from './pages/OverviewPage'
import NewScanPage from './pages/NewScanPage'
import StudiesPage from './pages/StudiesPage'
import SegmentationPage from './pages/SegmentationPage'
import ReviewQueuePage from './pages/ReviewQueuePage'
import AuditLogPage from './pages/AuditLogPage'
import ModelMetricsPage from './pages/ModelMetricsPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/overview" replace />} />
          <Route path="overview"      element={<OverviewPage />} />
          <Route path="scan"          element={<NewScanPage />} />
          <Route path="new-scan"      element={<Navigate to="/scan" replace />} />
          <Route path="ai-analysis"   element={<Navigate to="/scan" replace />} />
          <Route path="studies"       element={<StudiesPage />} />
          <Route path="segmentation"  element={<SegmentationPage />} />
          <Route path="review-queue"  element={<ReviewQueuePage />} />
          <Route path="audit-log"     element={<AuditLogPage />} />
          <Route path="model-metrics" element={<ModelMetricsPage />} />
          <Route path="settings"      element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
