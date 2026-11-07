import React, { useState } from 'react'
import type { GradCAMResponse } from '../api/client'

interface Props {
  result: GradCAMResponse
  originalSrc: string
}

export default function GradCAMViewer({ result, originalSrc }: Props) {
  const [opacity, setOpacity] = useState(0.6)
  const [view, setView] = useState<'overlay' | 'heatmap' | 'original'>('overlay')

  const imgSrc = view === 'overlay'
    ? `data:image/png;base64,${result.overlay_base64}`
    : view === 'heatmap'
      ? `data:image/png;base64,${result.heatmap_base64}`
      : originalSrc

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <span style={{ fontWeight: 600 }}>Grad-CAM Sensitivity Map</span>
        <span className={`badge ${result.mode === 'demo' ? 'badge-demo' : 'badge-inference'}`}>
          Target: {result.target_label}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' }}>
        {(['overlay', 'heatmap', 'original'] as const).map(v => (
          <button
            key={v}
            type="button"
            className={`btn ${view === v ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
            onClick={() => setView(v)}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ position: 'relative', borderRadius: 'var(--radius)', overflow: 'hidden', background: '#000', textAlign: 'center' }}>
        {view === 'overlay' ? (
          <div style={{ position: 'relative', width: '100%', height: 'auto' }}>
            <img
              src={originalSrc}
              alt="Original scan"
              style={{ width: '100%', display: 'block', borderRadius: 'var(--radius)' }}
            />
            <img
              src={`data:image/png;base64,${result.heatmap_base64}`}
              alt={`Grad-CAM heatmap for ${result.target_label}`}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: opacity,
                mixBlendMode: 'screen',
                pointerEvents: 'none'
              }}
            />
          </div>
        ) : (
          <img
            src={imgSrc}
            alt={`Grad-CAM ${view} view for ${result.target_label}`}
            style={{ width: '100%', display: 'block', borderRadius: 'var(--radius)' }}
          />
        )}
      </div>

      {view === 'overlay' && (
        <div style={{ marginTop: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
            <label htmlFor="cam-opacity-slider">Overlay Opacity</label>
            <span>{Math.round(opacity * 100)}%</span>
          </div>
          <input
            id="cam-opacity-slider"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={opacity}
            onChange={e => setOpacity(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--color-primary)' }}
            aria-label="Grad-CAM overlay opacity"
          />
        </div>
      )}

      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.75rem' }}>
        Latency: {result.inference_time_ms.toFixed(0)} ms · Architecture: {result.model_version}
      </div>
    </div>
  )
}
