import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Link } from 'react-router-dom'
import { Upload, X, Image as ImageIcon, Zap, Eye, CheckCircle, XCircle, ShieldCheck } from 'lucide-react'
import {
  classify,
  gradcam,
  createReview,
  formatTime,
  type ClassificationResponse,
  type GradCAMResponse,
  type ReviewResponse
} from '../api/client'
import GradCAMViewer from '../components/GradCAMViewer'
import PredictionPanel from '../components/PredictionPanel'

type Status = 'idle' | 'classifying' | 'gradcam' | 'done' | 'error'

export default function NewScanPage() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [classResult, setClassResult] = useState<ClassificationResponse | null>(null)
  const [camResult, setCamResult] = useState<GradCAMResponse | null>(null)
  const [targetLabel, setTargetLabel] = useState<string>('')

  const [decision, setDecision] = useState<'approved' | 'rejected'>('approved')
  const [reviewNote, setReviewNote] = useState<string>('')
  const [submittingReview, setSubmittingReview] = useState<boolean>(false)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [savedReview, setSavedReview] = useState<ReviewResponse | null>(null)

  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setStatus('idle')
    setClassResult(null)
    setCamResult(null)
    setError(null)
    setSavedReview(null)
    setReviewError(null)
    setReviewNote('')
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/bmp': ['.bmp'] },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
  })

  const runClassify = async () => {
    if (!file) return
    setStatus('classifying')
    setError(null)
    setSavedReview(null)
    try {
      const result = await classify(file)
      setClassResult(result)
      setTargetLabel(result.top_label)
      setStatus('done')
    } catch (e: any) {
      setError(e.response?.data?.detail || e.message || 'Classification request failed')
      setStatus('error')
    }
  }

  const runGradCAM = async () => {
    if (!file) return
    setStatus('gradcam')
    setError(null)
    try {
      const result = await gradcam(file, targetLabel || undefined)
      setCamResult(result)
      setStatus('done')
    } catch (e: any) {
      setError(e.response?.data?.detail || e.message || 'Grad-CAM generation failed')
      setStatus('error')
    }
  }

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!classResult) return
    if (decision === 'rejected' && !reviewNote.trim()) {
      setReviewError('Clinical rationale note is mandatory when rejecting AI prediction.')
      return
    }

    setSubmittingReview(true)
    setReviewError(null)
    try {
      const studyIdentifier = file?.name ? `SCAN-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}` : classResult.request_id
      const res = await createReview({
        study_id: studyIdentifier,
        model_version: classResult.model_version,
        status: decision,
        note: reviewNote.trim() || undefined,
      })
      setSavedReview(res)
    } catch (e: any) {
      setReviewError(e.response?.data?.detail || e.message || 'Failed to submit review')
    } finally {
      setSubmittingReview(false)
    }
  }

  const reset = () => {
    setFile(null)
    setPreview(null)
    setStatus('idle')
    setError(null)
    setClassResult(null)
    setCamResult(null)
    setSavedReview(null)
    setReviewError(null)
    setReviewNote('')
  }

  const isLoading = status === 'classifying' || status === 'gradcam'

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>Scan & Analyze</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        Upload a chest X-ray for DenseNet121 multi-label classification, Grad-CAM heatmap explainability, and radiologist review.
      </p>

      {!file ? (
        <div
          {...getRootProps()}
          style={{
            border: `2px dashed ${isDragActive ? 'var(--color-primary)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius)',
            padding: '3rem 2rem',
            textAlign: 'center',
            cursor: 'pointer',
            background: isDragActive ? 'rgba(56,189,248,0.04)' : 'var(--color-surface)',
            transition: 'all 0.15s',
          }}
          role="button"
          aria-label="Upload chest X-ray image"
        >
          <input {...getInputProps()} />
          <Upload size={42} color="var(--color-primary)" style={{ margin: '0 auto 1rem' }} />
          <div style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.4rem' }}>
            {isDragActive ? 'Release to upload scan…' : 'Drag & drop a Chest X-ray scan'}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            Supports JPEG, PNG · Maximum file size: 50 MB
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          <div>
            <div className="card" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ImageIcon size={16} color="var(--color-primary)" />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{file.name}</span>
                </div>
                <button className="btn btn-ghost" onClick={reset} aria-label="Remove uploaded scan">
                  <X size={15} />
                </button>
              </div>

              {preview && (
                <div style={{ background: '#000', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                  <img
                    src={preview}
                    alt="Uploaded chest X-ray"
                    style={{ width: '100%', maxHeight: '420px', objectFit: 'contain', display: 'block' }}
                  />
                </div>
              )}

              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.6rem' }}>
                Size: {(file.size / 1024).toFixed(1)} KB · Type: {file.type || 'image'}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <button
                className="btn btn-primary"
                onClick={runClassify}
                disabled={isLoading}
                aria-busy={status === 'classifying'}
              >
                {status === 'classifying' ? <span className="spinner" /> : <Zap size={16} />}
                {status === 'classifying' ? 'Analyzing Scan…' : 'Run Classification'}
              </button>

              {classResult && (
                <div className="card" style={{ padding: '0.75rem' }}>
                  <label htmlFor="target-cam-select" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>
                    Select Class for Grad-CAM Localization:
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <select
                      id="target-cam-select"
                      value={targetLabel}
                      onChange={e => setTargetLabel(e.target.value)}
                      style={{ flex: 1 }}
                    >
                      {classResult.predictions.map(p => (
                        <option key={p.label} value={p.label}>
                          {p.label} ({(p.score * 100).toFixed(1)}%)
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn btn-ghost"
                      onClick={runGradCAM}
                      disabled={isLoading}
                      aria-busy={status === 'gradcam'}
                    >
                      {status === 'gradcam' ? <span className="spinner" /> : <Eye size={15} />}
                      {status === 'gradcam' ? 'Calculating…' : 'Generate Map'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {error && <div className="error-box" style={{ marginTop: '0.75rem' }}>{error}</div>}
          </div>

          <div>
            {classResult ? (
              <PredictionPanel result={classResult} />
            ) : (
              <div className="empty-state card">
                <Zap size={32} color="var(--color-text-muted)" />
                <div style={{ fontWeight: 600 }}>Classification output pending</div>
                <div style={{ fontSize: '0.82rem' }}>Click "Run Classification" to inspect model predictions</div>
              </div>
            )}

            {camResult && preview && (
              <div style={{ marginTop: '1.25rem' }}>
                <GradCAMViewer result={camResult} originalSrc={preview} />
              </div>
            )}

            {classResult && (
              <div className="card" style={{ marginTop: '1.25rem', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <ShieldCheck size={18} color="var(--color-primary)" />
                  <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Radiologist Decision & Audit Log</span>
                </div>

                {savedReview ? (
                  <div style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius)',
                    background: savedReview.status === 'approved' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${savedReview.status === 'approved' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: savedReview.status === 'approved' ? '#4ade80' : '#f87171' }}>
                      {savedReview.status === 'approved' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                      <span>Finding {savedReview.status.toUpperCase()}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>
                      Recorded in immutable audit ledger by <code>{savedReview.reviewer_id}</code> at {formatTime(savedReview.created_at)}
                    </div>
                    {savedReview.note && (
                      <div style={{ fontSize: '0.85rem', marginTop: '0.35rem', fontStyle: 'italic' }}>
                        "{savedReview.note}"
                      </div>
                    )}
                    <div style={{ marginTop: '0.6rem' }}>
                      <Link to="/audit-log" className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '0.25rem 0.6rem' }}>
                        View Audit Log Entry →
                      </Link>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleReviewSubmit}>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <button
                        type="button"
                        onClick={() => setDecision('approved')}
                        className={`btn ${decision === 'approved' ? 'btn-primary' : 'btn-ghost'}`}
                        style={{
                          flex: 1,
                          fontSize: '0.85rem',
                          background: decision === 'approved' ? '#15803d' : undefined,
                          borderColor: decision === 'approved' ? '#22c55e' : undefined
                        }}
                      >
                        <CheckCircle size={15} />
                        Approve Finding
                      </button>
                      <button
                        type="button"
                        onClick={() => setDecision('rejected')}
                        className={`btn ${decision === 'rejected' ? 'btn-primary' : 'btn-ghost'}`}
                        style={{
                          flex: 1,
                          fontSize: '0.85rem',
                          background: decision === 'rejected' ? '#b91c1c' : undefined,
                          borderColor: decision === 'rejected' ? '#ef4444' : undefined
                        }}
                      >
                        <XCircle size={15} />
                        Reject Finding
                      </button>
                    </div>

                    <div style={{ marginBottom: '0.75rem' }}>
                      <label htmlFor="radiologist-notes" style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem', color: 'var(--color-text-muted)' }}>
                        Clinical Notes / Rationale {decision === 'rejected' && <span style={{ color: '#ef4444' }}>* (Required on Rejection)</span>}:
                      </label>
                      <textarea
                        id="radiologist-notes"
                        rows={2}
                        value={reviewNote}
                        onChange={e => setReviewNote(e.target.value)}
                        placeholder={decision === 'rejected' ? 'Explain reason for rejecting AI output...' : 'Optional radiologist impression notes...'}
                        style={{ width: '100%', fontSize: '0.85rem' }}
                      />
                    </div>

                    {reviewError && (
                      <div className="error-box" style={{ marginBottom: '0.75rem', fontSize: '0.8rem' }}>
                        {reviewError}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={submittingReview}
                      style={{ width: '100%', fontSize: '0.85rem' }}
                    >
                      {submittingReview ? <span className="spinner" /> : <ShieldCheck size={16} />}
                      {submittingReview ? 'Recording Decision…' : 'Record Radiologist Decision in Audit Log'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
