import React, { useState } from 'react'
import { Info, Shield, Trash2, CheckCircle } from 'lucide-react'
import { resetDatabase } from '../api/client'

export default function SettingsPage() {
  const [clearing, setClearing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to delete all historical reviews, audit log entries, and auto-inferred studies? This resets the application to an initial clean state.')) {
      return
    }
    setClearing(true)
    setMessage(null)
    setError(null)
    try {
      const res = await resetDatabase()
      setMessage(res.message || 'Database cleared successfully. Ready for fresh test runs!')
    } catch (e: any) {
      setError(e.response?.data?.detail || e.message || 'Failed to clear database.')
    } finally {
      setClearing(false)
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>System & Environment Settings</h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Configuration overview for backend inference pipelines, persistence, and external PACS connectivity.
      </p>

      <div className="card" style={{ marginBottom: '1.25rem', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '1rem', color: '#fca5a5', marginBottom: '0.25rem' }}>
              Database Clean Start / Reset
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              Wipe all review records, audit entries, and cached inferences to start fresh demonstrations from scratch.
            </div>
          </div>
          <button
            className="btn btn-ghost"
            onClick={handleReset}
            disabled={clearing}
            style={{
              color: '#f87171',
              borderColor: 'rgba(239, 68, 68, 0.4)',
              fontSize: '0.85rem'
            }}
          >
            <Trash2 size={15} />
            {clearing ? 'Resetting Database…' : 'Reset All Database Records'}
          </button>
        </div>

        {message && (
          <div style={{
            marginTop: '0.75rem',
            padding: '0.6rem 0.85rem',
            borderRadius: 'var(--radius)',
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            color: '#4ade80',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <CheckCircle size={16} />
            <span>{message}</span>
          </div>
        )}

        {error && <div className="error-box" style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>{error}</div>}
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.85rem' }}>
          <Info size={17} color="var(--color-primary)" />
          <span style={{ fontWeight: 600 }}>Active Environment Configuration</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                <th style={{ padding: '0.55rem 0.75rem', color: 'var(--color-text-muted)' }}>Parameter</th>
                <th style={{ padding: '0.55rem 0.75rem', color: 'var(--color-text-muted)' }}>Default / Runtime</th>
                <th style={{ padding: '0.55rem 0.75rem', color: 'var(--color-text-muted)' }}>Specification</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['DEVICE', 'cpu', 'PyTorch execution target (cpu or cuda with NVidia GPU)'],
                ['CLASSIFICATION_CHECKPOINT', '(Unset)', 'Filesystem path to trained DenseNet121 weights (.pth)'],
                ['SEGMENTATION_CHECKPOINT', '(Unset)', 'Path to MONAI 3D U-Net checkpoint volume'],
                ['ORTHANC_URL', 'http://localhost:8042', 'Orthanc REST API endpoint for DICOM queries'],
                ['ORTHANC_MOCK_MODE', 'true', 'Simulates PACS feed when Orthanc daemon is unreachable'],
                ['REVIEWER_ID', 'demo-reviewer', 'Audit identity stamped onto adjudication events'],
                ['DB_URL', 'sqlite+aiosqlite:///./data/app.db', 'Async database for review state and audit trails'],
                ['MAX_UPLOAD_BYTES', '52428800', 'Maximum permissible payload limit (50 MB)'],
              ].map(([param, val, desc]) => (
                <tr key={param} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '0.55rem 0.75rem', fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--color-primary)' }}>{param}</td>
                  <td style={{ padding: '0.55rem 0.75rem', fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>{val}</td>
                  <td style={{ padding: '0.55rem 0.75rem', color: 'var(--color-text)' }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', borderLeft: '4px solid var(--color-warning)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--color-text)' }}>
          <Shield size={17} color="var(--color-warning)" />
          <strong style={{ fontSize: '0.95rem' }}>Security, Compliance & Privacy Checklist</strong>
        </div>
        <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.8 }}>
          <li><strong>Zero Secret Leakage:</strong> Secrets must reside strictly in local <code>.env</code> files excluded by <code>.gitignore</code>.</li>
          <li><strong>Production Credentials:</strong> Change default Orthanc credentials (<code>changeme_in_production</code>) prior to container network deployment.</li>
          <li><strong>Safe Deserialization:</strong> PyTorch checkpoints are parsed using safe <code>weights_only=True</code> parameters.</li>
          <li><strong>PHI Scrubbing:</strong> In accordance with HIPAA Safe Harbor, incoming studies are de-identified before processing.</li>
        </ul>
      </div>
    </div>
  )
}
