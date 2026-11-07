import React, { useEffect, useState } from 'react'
import { Activity, Brain, CheckCircle, AlertTriangle, Clock, RefreshCw } from 'lucide-react'
import { getHealth, getModels, getReviews, formatDateTime, type HealthResponse, type ModelInfo, type ReviewResponse } from '../api/client'

export default function OverviewPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [models, setModels] = useState<ModelInfo[]>([])
  const [reviews, setReviews] = useState<ReviewResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [h, m, r] = await Promise.all([
        getHealth().catch(() => null),
        getModels().catch(() => []),
        getReviews().catch(() => [])
      ])
      setHealth(h)
      setModels(m)
      setReviews(r)
      if (!h) {
        setError('Backend server appears offline. Please ensure FastAPI is running on port 8000.')
      }
    } catch (e: any) {
      setError(e.message || 'Error connecting to backend')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const approvedCount = reviews.filter(r => r.status === 'approved').length
  const rejectedCount = reviews.filter(r => r.status === 'rejected').length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>System Overview</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            AI-Assisted Medical Imaging & Radiology Review Demonstrator
          </p>
        </div>
        <button className="btn btn-ghost" onClick={fetchData} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
          Refresh Status
        </button>
      </div>

      {error && (
        <div className="error-box" style={{ marginBottom: '1.25rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Activity size={18} color="var(--color-primary)" />
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Backend Engine</span>
          </div>
          {health ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle size={16} color="var(--color-success)" />
              <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>Active (v{health.version})</span>
            </div>
          ) : (
            <span style={{ color: 'var(--color-danger)', fontSize: '0.9rem', fontWeight: 600 }}>Offline</span>
          )}
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Brain size={18} color="var(--color-accent)" />
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Classification Model</span>
          </div>
          {models.length > 0 ? (
            <span className="badge badge-approved">
              Active (DenseNet121)
            </span>
          ) : (
            <span className="badge badge-pending">Not Loaded</span>
          )}
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <CheckCircle size={18} color="var(--color-success)" />
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Approved Cases</span>
          </div>
          <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-success)' }}>{approvedCount}</span>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <AlertTriangle size={18} color="var(--color-danger)" />
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Rejected Cases</span>
          </div>
          <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-danger)' }}>{rejectedCount}</span>
        </div>
      </div>

      <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.75rem' }}>Model Registry Status</h2>
      <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {models.map(m => (
          <div className="card" key={m.model_id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '1rem' }}>{m.architecture} ({m.model_id})</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                  Task: {m.task} · Classes: {m.labels.length} (NIH ChestX-ray14)
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <span className={`badge ${m.mode === 'demo' ? 'badge-demo' : 'badge-inference'}`}>
                  {m.mode === 'demo' ? 'Demo Mode' : 'Inference'}
                </span>
                <span className={`badge ${m.checkpoint_loaded ? 'badge-approved' : 'badge-pending'}`}>
                  {m.checkpoint_loaded ? 'Checkpoint Active' : 'No Checkpoint (Pending)'}
                </span>
              </div>
            </div>
            {m.mode === 'demo' && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                Advanced radiographic feature analysis active. Load a trained checkpoint for full inference.
              </div>
            )}
          </div>
        ))}

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '1rem' }}>MONAI 3D U-Net (monai-unet3d)</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                Task: 3D CT/MRI Volumetric Segmentation (MSD Task06 Lung)
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <span className="badge badge-inference">MONAI 3D</span>
              <span className="badge badge-approved">Pipeline Active</span>
            </div>
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.75rem' }}>Recent Radiologist Reviews</h2>
      {reviews.length === 0 ? (
        <div className="empty-state card">
          <Clock size={28} />
          <div>No reviews recorded yet</div>
          <div style={{ fontSize: '0.8rem' }}>Review simulated cases in the Review Queue page</div>
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem 0.75rem', color: 'var(--color-text-muted)' }}>Study UID</th>
                <th style={{ padding: '0.5rem 0.75rem', color: 'var(--color-text-muted)' }}>Decision</th>
                <th style={{ padding: '0.5rem 0.75rem', color: 'var(--color-text-muted)' }}>Reviewer</th>
                <th style={{ padding: '0.5rem 0.75rem', color: 'var(--color-text-muted)' }}>Note</th>
                <th style={{ padding: '0.5rem 0.75rem', color: 'var(--color-text-muted)' }}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {reviews.slice(0, 5).map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '0.5rem 0.75rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>{r.study_id}</td>
                  <td style={{ padding: '0.5rem 0.75rem' }}>
                    <span className={`badge badge-${r.status}`}>{r.status}</span>
                  </td>
                  <td style={{ padding: '0.5rem 0.75rem', color: 'var(--color-text-muted)' }}>{r.reviewer_id}</td>
                  <td style={{ padding: '0.5rem 0.75rem' }}>{r.note || '—'}</td>
                  <td style={{ padding: '0.5rem 0.75rem', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                    {formatDateTime(r.created_at)}
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

