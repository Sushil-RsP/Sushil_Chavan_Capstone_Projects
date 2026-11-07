import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'

vi.mock('../api/client', () => ({
  getHealth: vi.fn().mockResolvedValue({
    status: 'ok',
    version: '0.1.0',
    environment: 'test',
    disclaimer: ''
  }),
  getModels: vi.fn().mockResolvedValue([]),
  getReviews: vi.fn().mockResolvedValue([]),
  getAuditLog: vi.fn().mockResolvedValue([]),
  getStudies: vi.fn().mockResolvedValue([]),
  classify: vi.fn(),
  gradcam: vi.fn(),
  segment: vi.fn(),
  createReview: vi.fn(),
}))

describe('Medical Imaging Application Shell', () => {
  it('renders application branding and header', async () => {
    render(<App />)
    const brand = await screen.findByText(/MedImaging/i)
    expect(brand).toBeInTheDocument()
  })

  it('renders standard navigation routing items', async () => {
    render(<App />)
    const overviewElements = screen.getAllByText(/Overview/i)
    expect(overviewElements.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Scan & Analyze/i)).toBeInTheDocument()
    const reviewQueueElements = screen.getAllByText(/Review Queue/i)
    expect(reviewQueueElements.length).toBeGreaterThanOrEqual(1)
  })
})
