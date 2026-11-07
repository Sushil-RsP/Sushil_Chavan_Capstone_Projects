import React, { useEffect, useState } from 'react'
import { BookOpen, RefreshCw, Zap, ShieldCheck, CheckCircle, Eye } from 'lucide-react'
import {
  getStudies,
  syncStudiesAndInfer,
  getStudyInferences,
  formatDateTime,
  type StudySummary,
  type StudyInferenceResponse
} from '../api/client'

export default function StudiesPage() {
  const [studies, setStudies] = useState<StudySummary[]>([])
  const [inferences, setInferences] = useState<StudyInferenceResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedOverlay, setSelectedOverlay] = useState<StudyInferenceResponse | null>(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [studiesData, inferencesData] = await Promise.all([
        getStudies(),
        getStudyInferences()
      ])
      setStudies(studiesData)
      setInferences(inferencesData)
    } catch (e: any) {
      setError(e.message || 'Failed to retrieve DICOM studies')
    } finally {
      setLoading(false)
    }
  }

  const handleSyncAndInfer = async () => {
    setSyncing(true)
    setSyncMessage(null)
    setError(null)
    try {
      const res = await syncStudiesAndInfer()
      setSyncMessage(res.message)
      await loadData()
    } catch (e: any) {
      setError(e.response?.data?.detail || e.message || 'Failed to sync studies from Orthanc')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>DICOM Studies Repository & Orthanc Ingestion</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            PACS / Orthanc Server Integration: automated study polling, multi-label classification, and Grad-CAM generation.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-ghost" onClick={loadData} disabled={loading || syncing}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            Refresh Feed
          </button>
          <button className="btn btn-primary" onClick={handleSyncAndInfer} disabled={syncing || loading}>
            <Zap size={15} className={syncing ? 'spin' : ''} />
            {syncing ? 'Pulling & Ingesting…' : 'Pull Studies & Run AI Inference'}
          </button>
        </div>
      </div>

      {syncMessage && (
        <div style={{
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius)',
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          color: '#4ade80',
          fontSize: '0.85rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <CheckCircle size={16} />
          <span>{syncMessage}</span>
        </div>
      )}

      {error && <div className="error-box" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap size={18} color="var(--color-primary)" />
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Automated AI Inferences (Orthanc Ingestion Service)</h2>
          </div>
          <span className="badge badge-pending">{inferences.length} Inferred Studies</span>
        </div>

        {inferences.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            No automated inferences yet. Click "Pull Studies & Run AI Inference" above to ingest and analyze studies from Orthanc.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  {['Study UID', 'Top Pathology', 'AI Confidence', 'Status', 'Timestamp', 'Grad-CAM Overlay'].map(h => (
                    <th key={h} style={{ padding: '0.65rem 0.75rem', textAlign: 'left', color: 'var(--color-text-muted)', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inferences.map(inf => (
                  <tr key={inf.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.65rem 0.75rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>{inf.study_uid}</td>
                    <td style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>{inf.top_label}</td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      <span className="badge badge-inference">{(inf.top_score * 100).toFixed(1)}%</span>
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      <span className={`badge ${inf.status === 'approved' ? 'badge-inference' : 'badge-pending'}`}>
                        {inf.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                      {formatDateTime(inf.created_at)}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      {inf.overlay_base64 ? (
                        <button
                          className="btn btn-ghost"
                          style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                          onClick={() => setSelectedOverlay(inf)}
                        >
                          <Eye size={13} /> View Overlay
                        </button>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedOverlay && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: '480px', width: '100%', background: 'var(--color-surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontWeight: 600 }}>Grad-CAM Attribution: {selectedOverlay.top_label}</span>
              <button className="btn btn-ghost" onClick={() => setSelectedOverlay(null)}>✕</button>
            </div>
            {selectedOverlay.overlay_base64 && (
              <img
                src={`data:image/png;base64,${selectedOverlay.overlay_base64}`}
                alt="Study Grad-CAM Overlay"
                style={{ width: '100%', borderRadius: 'var(--radius)', display: 'block', marginBottom: '0.75rem' }}
              />
            )}
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
              Study UID: <code>{selectedOverlay.study_uid}</code>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              Heatmap indicates convolutional activation focus.
            </div>
          </div>
        </div>
      )}

      <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.75rem' }}>Orthanc PACS Studies Feed</h2>
      {loading ? (
        <div className="loading-overlay"><span className="spinner" /> Querying DICOM repository…</div>
      ) : studies.length === 0 ? (
        <div className="empty-state card">
          <BookOpen size={36} />
          <div style={{ fontWeight: 600 }}>No studies located</div>
          <div style={{ fontSize: '0.85rem' }}>Ensure Orthanc DICOM container is running or mock mode is enabled.</div>
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {['Study Instance UID', 'Modality', 'Study Date', 'Description', 'Series Count', 'Integration Source'].map(h => (
                  <th key={h} style={{ padding: '0.65rem 0.75rem', textAlign: 'left', color: 'var(--color-text-muted)', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {studies.map(s => (
                <tr key={s.study_uid} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '0.65rem 0.75rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>{s.study_uid}</td>
                  <td style={{ padding: '0.65rem 0.75rem' }}>
                    <span className="badge badge-pending">{s.modality || 'CR'}</span>
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem', color: 'var(--color-text-muted)' }}>{s.study_date || '—'}</td>
                  <td style={{ padding: '0.65rem 0.75rem' }}>{s.description || 'Routine chest study'}</td>
                  <td style={{ padding: '0.65rem 0.75rem' }}>{s.num_series}</td>
                  <td style={{ padding: '0.65rem 0.75rem' }}>
                    <span className={`badge ${s.source === 'mock' ? 'badge-demo' : 'badge-inference'}`}>
                      {s.source === 'mock' ? 'Simulated PACS' : 'Live Orthanc'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
