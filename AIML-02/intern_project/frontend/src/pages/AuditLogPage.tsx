import React, { useEffect, useState } from 'react'
import { FileText, RefreshCw, Trash2, CheckCircle } from 'lucide-react'
import { getAuditLog, resetDatabase, formatDateTime, type AuditLogEntry } from '../api/client'

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [clearing, setClearing] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchLog = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAuditLog()
      setEntries(data)
    } catch (e: any) {
      setError(e.message || 'Failed to retrieve audit log')
    } finally {
      setLoading(false)
    }
  }

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to remove all entries and start completely fresh? This will clear all historical reviews and audit logs.')) {
      return
    }
    setClearing(true)
    setError(null)
    setSuccessMessage(null)
    try {
      const res = await resetDatabase()
      setEntries([])
      setSuccessMessage(res.message || 'All records successfully cleared. Starting fresh!')
    } catch (e: any) {
      setError(e.response?.data?.detail || e.message || 'Failed to clear records')
    } finally {
      setClearing(false)
    }
  }

  useEffect(() => {
    fetchLog()
  }, [])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>System Audit Ledger</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Append-only security log tracking model provenance, reviews, and operator actions.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-ghost" onClick={fetchLog} disabled={loading || clearing}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            Refresh Log
          </button>
          <button
            className="btn btn-ghost"
            onClick={handleClearAll}
            disabled={loading || clearing || entries.length === 0}
            style={{
              color: entries.length > 0 ? '#f87171' : 'var(--color-text-muted)',
              borderColor: entries.length > 0 ? 'rgba(239,68,68,0.3)' : undefined
            }}
          >
            <Trash2 size={15} />
            {clearing ? 'Clearing Entries…' : 'Clear All Entries'}
          </button>
        </div>
      </div>

      {successMessage && (
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
          <span>{successMessage}</span>
        </div>
      )}

      {error && <div className="error-box" style={{ marginBottom: '1rem' }}>{error}</div>}

      {loading ? (
        <div className="loading-overlay"><span className="spinner" /> Loading audit trail…</div>
      ) : entries.length === 0 ? (
        <div className="empty-state card">
          <FileText size={36} />
          <div style={{ fontWeight: 600 }}>Audit ledger is empty</div>
          <div style={{ fontSize: '0.82rem' }}>All previous records cleared. New adjudication and scan events will appear here.</div>
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                {['Timestamp', 'Action Event', 'Entity Reference', 'Operator / Reviewer', 'Audit Metadata'].map(h => (
                  <th key={h} style={{ padding: '0.65rem 0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '0.65rem 0.75rem', color: 'var(--color-text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                    {formatDateTime(e.created_at)}
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem' }}>
                    <span className="badge badge-inference" style={{ fontSize: '0.75rem' }}>{e.event_type}</span>
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem', fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--color-primary)' }}>
                    {e.entity_id ? e.entity_id.slice(0, 8) + '…' : '—'}
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem', color: 'var(--color-text)' }}>{e.reviewer_id}</td>
                  <td style={{ padding: '0.65rem 0.75rem', color: 'var(--color-text-muted)' }}>{e.detail || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
