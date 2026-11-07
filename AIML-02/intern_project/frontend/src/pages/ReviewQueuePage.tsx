import React, { useState, useEffect } from 'react'
import { ClipboardList, CheckCircle, XCircle } from 'lucide-react'
import { getReviews, createReview, formatDateTime, type ReviewResponse } from '../api/client'

export default function ReviewQueuePage() {
  const [reviews, setReviews] = useState<ReviewResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [studyId, setStudyId] = useState('')
  const [modelVersion, setModelVersion] = useState('densenet121-v0.1-demo')
  const [status, setStatus] = useState<'approved' | 'rejected'>('approved')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const loadReviews = async () => {
    setLoading(true)
    try {
      const data = await getReviews()
      setReviews(data)
    } catch (e: any) {
      setError(e.message || 'Failed to load reviews')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReviews()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!studyId.trim()) {
      setSubmitError('Study Instance UID or ID is mandatory.')
      return
    }
    if (status === 'rejected' && !note.trim()) {
      setSubmitError('Radiologist clinical rationale / note is strictly required for rejection.')
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      await createReview({
        study_id: studyId.trim(),
        model_version: modelVersion,
        status,
        note: note.trim() || undefined
      })
      setStudyId('')
      setNote('')
      loadReviews()
    } catch (e: any) {
      setSubmitError(e.response?.data?.detail || e.message || 'Failed to persist review')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>Radiology Review Queue</h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Human-in-the-loop review workflow: approve or reject model findings with immutable audit tracing.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        <div className="card">
          <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1rem' }}>Adjudicate AI Finding</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <label htmlFor="study-id-input">Study Instance Identifier</label>
              <input
                id="study-id-input"
                value={studyId}
                onChange={e => setStudyId(e.target.value)}
                placeholder="e.g. 1.2.840.113619.2.55.3.MOCK"
                required
              />
            </div>

            <div>
              <label htmlFor="model-version-input">Model Version</label>
              <input
                id="model-version-input"
                value={modelVersion}
                onChange={e => setModelVersion(e.target.value)}
                required
              />
            </div>

            <div>
              <label>Adjudication Decision</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem' }}>
                <button
                  type="button"
                  className={`btn ${status === 'approved' ? 'btn-success' : 'btn-ghost'}`}
                  onClick={() => setStatus('approved')}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  <CheckCircle size={15} /> Approve
                </button>
                <button
                  type="button"
                  className={`btn ${status === 'rejected' ? 'btn-danger' : 'btn-ghost'}`}
                  onClick={() => setStatus('rejected')}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  <XCircle size={15} /> Reject
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="review-note">
                Clinical Annotation / Rationale {status === 'rejected' ? '(Mandatory)' : '(Optional)'}
              </label>
              <textarea
                id="review-note"
                rows={3}
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder={status === 'rejected' ? 'Provide diagnostic discordance rationale…' : 'Enter review comments…'}
                required={status === 'rejected'}
              />
            </div>

            {submitError && <div className="error-box">{submitError}</div>}

            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? <><span className="spinner" /> Recording Review…</> : 'Commit Review'}
            </button>
          </form>
        </div>

        <div>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.85rem' }}>Historical Adjudications</h2>
          {loading && <div className="loading-overlay"><span className="spinner" /> Loading…</div>}
          {error && <div className="error-box">{error}</div>}
          {reviews.length === 0 && !loading && (
            <div className="empty-state card">
              <ClipboardList size={34} />
              <div>No cases adjudicated yet</div>
              <div style={{ fontSize: '0.82rem' }}>Submissions recorded above will appear here</div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {reviews.map(r => (
              <div className="card" key={r.id} style={{ padding: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{r.study_id}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                      Auditor: {r.reviewer_id} · {formatDateTime(r.created_at)}
                    </div>
                  </div>
                  <span className={`badge badge-${r.status}`}>{r.status.toUpperCase()}</span>
                </div>
                {r.note && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: 'var(--color-text-muted)', fontStyle: 'italic', background: 'var(--color-surface-alt)', padding: '0.4rem 0.6rem', borderRadius: 4 }}>
                    "{r.note}"
                  </div>
                )}
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.4rem' }}>
                  Model Version: {r.model_version}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

