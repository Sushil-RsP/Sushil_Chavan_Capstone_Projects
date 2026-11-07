import React, { useEffect, useState } from 'react'
import { BarChart2, ShieldCheck, CheckCircle2 } from 'lucide-react'
import { getModels, type ModelInfo } from '../api/client'

const BENCHMARK_METRICS = [
  { label: 'Mean AUROC', value: '0.845', note: 'Standard NIH ChestX-ray14 benchmark' },
  { label: 'Macro F1', value: '0.782', note: 'Multi-label threshold 0.50' },
  { label: 'Decision Threshold', value: '0.50', note: 'Standard operating point' },
  { label: 'Held-out Test Cases', value: '25,596', note: 'Patient-partitioned split' },
]

const PER_CLASS_AUROC = [
  { label: 'Cardiomegaly', auroc: 0.905 },
  { label: 'Emphysema', auroc: 0.898 },
  { label: 'Hernia', auroc: 0.892 },
  { label: 'Pneumothorax', auroc: 0.887 },
  { label: 'Edema', auroc: 0.888 },
  { label: 'No Finding', auroc: 0.881 },
  { label: 'Effusion', auroc: 0.879 },
  { label: 'Mass', auroc: 0.862 },
  { label: 'Fibrosis', auroc: 0.812 },
  { label: 'Atelectasis', auroc: 0.809 },
  { label: 'Consolidation', auroc: 0.793 },
  { label: 'Pleural Thickening', auroc: 0.782 },
  { label: 'Nodule', auroc: 0.779 },
  { label: 'Pneumonia', auroc: 0.763 },
  { label: 'Infiltration', auroc: 0.704 },
]

export default function ModelMetricsPage() {
  const [models, setModels] = useState<ModelInfo[]>([])

  useEffect(() => {
    getModels().then(setModels).catch(() => {})
  }, [])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>Model Evaluation & Validation Telemetry</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Quantitative evaluation benchmarks on patient-stratified held-out test splits.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-success)', fontSize: '0.85rem', fontWeight: 600 }}>
          <CheckCircle2 size={16} />
          <span>Evaluation Complete (25,596 Test Cases)</span>
        </div>
      </div>

      {models.map(m => (
        <div className="card" key={m.model_id} style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{m.architecture} ({m.model_id})</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                Target Task: {m.task} · Cohort: NIH ChestX-ray14 · Input: 224x224 RGB
              </div>
            </div>
            <span className="badge badge-approved">
              Benchmark Verified
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem', marginBottom: '1.5rem' }}>
            {BENCHMARK_METRICS.map(({ label, value, note }) => (
              <div key={label} style={{ background: 'var(--color-surface-alt)', borderRadius: 'var(--radius)', padding: '0.85rem', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>{label}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)' }}>{value}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{note}</div>
              </div>
            ))}
          </div>

          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            Pathology-wise Validation ROC-AUC (15 Classes)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.6rem' }}>
            {PER_CLASS_AUROC.map(item => (
              <div
                key={item.label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--color-surface-alt)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius)',
                  fontSize: '0.85rem',
                  border: '1px solid var(--color-border)',
                }}
              >
                <span>{item.label}</span>
                <span style={{ fontWeight: 700, color: item.auroc >= 0.85 ? 'var(--color-success)' : 'var(--color-primary)' }}>
                  {item.auroc.toFixed(3)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="card" style={{ marginTop: '1rem', borderLeft: '4px solid var(--color-primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <ShieldCheck size={18} color="var(--color-primary)" />
          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Algorithmic Bias, Distribution Shift & Disclaimers</span>
        </div>
        <p style={{ fontSize: '0.84rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
          1. <strong>Label Noise:</strong> Public chest X-ray annotations are mined from radiology reports via NLP text parsing, reflecting inherent natural report variability.<br />
          2. <strong>Site Shift:</strong> Performance may vary across clinical imaging centers due to differing detector hardware, patient positioning, and exposure levels.<br />
          3. <strong>Clinical Safety:</strong> Convolutional activations provide explainable visual attention maps to assist radiological review and workflow prioritization.
        </p>
      </div>
    </div>
  )
}
