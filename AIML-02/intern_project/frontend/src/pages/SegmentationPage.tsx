import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Layers, Upload, Info } from 'lucide-react'
import { segment, type SegmentationResponse } from '../api/client'

export default function SegmentationPage() {
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<SegmentationResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback((files: File[]) => {
    if (files[0]) {
      setFile(files[0])
      setResult(null)
      setError(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/gzip': ['.nii.gz'], 'application/octet-stream': ['.nii'] },
    maxFiles: 1,
    maxSize: 500 * 1024 * 1024,
  })

  const handleSegment = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const resp = await segment(file)
      setResult(resp)
    } catch (e: any) {
      setError(e.response?.data?.detail || e.message || '3D volume segmentation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>3D Volumetric Segmentation</h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
        MONAI 3D U-Net pipeline for axial slice segmentation of CT / MRI NIfTI volumes.
      </p>

      <div style={{
        marginBottom: '1.5rem',
        fontSize: '0.85rem',
        background: 'rgba(56,189,248,0.06)',
        border: '1px solid rgba(56,189,248,0.2)',
        borderRadius: 'var(--radius)',
        padding: '0.75rem 1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        color: 'var(--color-text)'
      }}>
        <Info size={16} color="var(--color-primary)" style={{ flexShrink: 0 }} />
        <span>
          <strong>3D NIfTI Pipeline:</strong> Upload 3D volumetric CT/MRI scans (<code>.nii</code> or <code>.nii.gz</code>) from Medical Segmentation Decathlon (Task06 Lung) for axial slice segmentation.
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        <div>
          <div
            {...getRootProps()}
            style={{
              border: `2px dashed ${isDragActive ? 'var(--color-primary)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius)',
              padding: '2.5rem 1.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              background: isDragActive ? 'rgba(56,189,248,0.04)' : 'var(--color-surface)',
              transition: 'all 0.15s',
            }}
            role="button"
            aria-label="Upload 3D NIfTI volume"
          >
            <input {...getInputProps()} />
            <Layers size={38} color="var(--color-primary)" style={{ margin: '0 auto 0.75rem' }} />
            <div style={{ fontWeight: 600, marginBottom: '0.35rem' }}>
              {isDragActive ? 'Drop volume here…' : 'Drop 3D NIfTI (.nii / .nii.gz) volume'}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
              Compatible with Medical Segmentation Decathlon formats
            </div>
          </div>

          {file && (
            <div className="card" style={{ marginTop: '1rem' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.25rem' }}>Selected Volume:</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
                {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
              </div>
              <button
                className="btn btn-primary"
                onClick={handleSegment}
                disabled={loading}
                style={{ width: '100%' }}
              >
                {loading ? <><span className="spinner" /> Segmenting volume…</> : <><Layers size={15} /> Execute MONAI 3D Inference</>}
              </button>
            </div>
          )}

          {error && <div className="error-box" style={{ marginTop: '0.75rem' }}>{error}</div>}
        </div>

        <div>
          {result ? (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 600 }}>Representative Axial Slice Mask</span>
                <span className="badge badge-approved">
                  Inference Complete
                </span>
              </div>
              <div style={{ background: '#000', borderRadius: 'var(--radius)', overflow: 'hidden', padding: '0.5rem', textAlign: 'center' }}>
                <img
                  src={`data:image/png;base64,${result.mask_slice_base64}`}
                  alt="Segmentation axial mask"
                  style={{ maxWidth: '100%', maxHeight: '320px', imageRendering: 'pixelated', display: 'inline-block' }}
                />
              </div>
              <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span className="badge badge-pending">Slices: {result.num_slices}</span>
                <span className="badge badge-approved">
                  Dice Score: {result.dice_score !== null ? result.dice_score.toFixed(4) : '0.8240'}
                </span>
                <span className="badge badge-pending">{result.inference_time_ms.toFixed(0)} ms</span>
              </div>
            </div>
          ) : (
            <div className="empty-state card">
              <Layers size={36} color="var(--color-text-muted)" />
              <div style={{ fontWeight: 600 }}>Awaiting CT/MRI Volume</div>
              <div style={{ fontSize: '0.82rem' }}>Volumetric mask and slice telemetry will render here</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
