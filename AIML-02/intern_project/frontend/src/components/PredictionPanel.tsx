import React from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { ClassificationResponse } from '../api/client'

interface Props {
  result: ClassificationResponse
}

export default function PredictionPanel({ result }: Props) {
  const top10 = result.predictions.slice(0, 10)

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <span style={{ fontWeight: 600 }}>Classification Results</span>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span className={`badge ${result.mode === 'demo' ? 'badge-demo' : 'badge-inference'}`}>
            {result.mode === 'demo' ? '⚠️ Demo Mode' : '✅ Inference'}
          </span>
          <span className="badge badge-pending">{result.inference_time_ms.toFixed(0)} ms</span>
        </div>
      </div>

      <div style={{
        background: 'var(--color-surface-alt)',
        borderRadius: 'var(--radius)',
        padding: '0.75rem',
        marginBottom: '1rem',
        border: '1px solid var(--color-border)'
      }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Top Prediction</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{result.top_label}</span>
          <span style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '1.1rem' }}>
            {(result.top_score * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={top10} layout="vertical" margin={{ left: 10, right: 30, top: 4, bottom: 4 }}>
            <XAxis
              type="number"
              domain={[0, 1]}
              tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
              tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={120}
              tick={{ fontSize: 11, fill: 'var(--color-text)' }}
            />
            <Tooltip
              formatter={(v: any) => [`${(Number(v) * 100).toFixed(2)}%`, 'Score']}
              contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', fontSize: 12, borderRadius: 6 }}
            />
            <Bar dataKey="score" radius={[0, 4, 4, 0]}>
              {top10.map((entry, i) => (
                <Cell key={i} fill={entry.label === result.top_label ? '#38bdf8' : '#334155'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {result.warning && (
        <div style={{
          fontSize: '0.8rem',
          color: '#f59e0b',
          marginTop: '0.75rem',
          background: 'rgba(245, 158, 11, 0.1)',
          padding: '0.5rem 0.75rem',
          borderRadius: 'var(--radius)',
          border: '1px solid rgba(245, 158, 11, 0.3)'
        }}>
          {result.warning}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.75rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <span>Model: {result.model_version}</span>
      </div>
    </div>
  )
}
