import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PredictionPanel from '../components/PredictionPanel'
import type { ClassificationResponse } from '../api/client'

const mockPredictionData: ClassificationResponse = {
  request_id: 'req-test-999',
  mode: 'demo',
  model_version: 'densenet121-v0.1-demo',
  predictions: [
    { label: 'No Finding', score: 0.65 },
    { label: 'Atelectasis', score: 0.08 },
    { label: 'Effusion', score: 0.06 },
    { label: 'Infiltration', score: 0.05 },
    { label: 'Pneumothorax', score: 0.04 },
    { label: 'Edema', score: 0.03 },
    { label: 'Consolidation', score: 0.03 },
    { label: 'Emphysema', score: 0.02 },
    { label: 'Cardiomegaly', score: 0.02 },
    { label: 'Pleural_Thickening', score: 0.02 },
  ],
  top_label: 'No Finding',
  top_score: 0.65,
  inference_time_ms: 38.5,
  disclaimer: '',
  warning: '⚠️ DEMO MODE: Checkpoint not loaded',
}

describe('PredictionPanel Component', () => {
  it('renders top label prediction and score', () => {
    render(<PredictionPanel result={mockPredictionData} />)
    expect(screen.getByText('No Finding')).toBeInTheDocument()
    expect(screen.getByText('65.0%')).toBeInTheDocument()
  })

  it('displays demo mode badge and caution message', () => {
    render(<PredictionPanel result={mockPredictionData} />)
    const demoBadges = screen.getAllByText(/Demo Mode/i)
    expect(demoBadges.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/DEMO MODE: Checkpoint not loaded/i)).toBeInTheDocument()
  })

  it('displays latency metric and model version', () => {
    render(<PredictionPanel result={mockPredictionData} />)
    expect(screen.getByText(/39 ms/i)).toBeInTheDocument()
    expect(screen.getByText(/densenet121-v0.1-demo/i)).toBeInTheDocument()
  })
})
