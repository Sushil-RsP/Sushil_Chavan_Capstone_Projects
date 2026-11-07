import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 120_000,
})

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const trimmed = dateStr.trim()
  const hasTimezone = trimmed.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(trimmed)
  const isoStr = trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T')
  const normalizedStr = hasTimezone ? isoStr : `${isoStr}Z`
  const d = new Date(normalizedStr)
  return isNaN(d.getTime()) ? dateStr : d.toLocaleString()
}

export function formatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const trimmed = dateStr.trim()
  const hasTimezone = trimmed.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(trimmed)
  const isoStr = trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T')
  const normalizedStr = hasTimezone ? isoStr : `${isoStr}Z`
  const d = new Date(normalizedStr)
  return isNaN(d.getTime()) ? dateStr : d.toLocaleTimeString()
}

export interface HealthResponse {
  status: string
  version: string
  environment: string
  disclaimer: string
}

export interface ModelInfo {
  model_id: string
  architecture: string
  task: string
  labels: string[]
  checkpoint_loaded: boolean
  mode: 'demo' | 'inference'
  disclaimer: string
}

export interface LabelPrediction {
  label: string
  score: number
}

export interface ClassificationResponse {
  request_id: string
  mode: 'demo' | 'inference'
  model_version: string
  predictions: LabelPrediction[]
  top_label: string
  top_score: number
  inference_time_ms: number
  disclaimer: string
  warning?: string
}

export interface GradCAMResponse {
  request_id: string
  mode: 'demo' | 'inference'
  model_version: string
  heatmap_base64: string
  overlay_base64: string
  target_label: string
  inference_time_ms: number
  disclaimer: string
  explanation: string
}

export interface SegmentationResponse {
  request_id: string
  mode: 'demo' | 'inference'
  model_version: string
  mask_slice_base64: string
  num_slices: number
  dice_score: number | null
  inference_time_ms: number
  disclaimer: string
}

export interface StudySummary {
  study_uid: string
  patient_id: string
  study_date: string | null
  modality: string | null
  description: string | null
  num_series: number
  source: 'orthanc' | 'mock'
}

export interface StudyInferenceResponse {
  id: string
  study_uid: string
  patient_id: string
  modality: string
  description: string | null
  top_label: string
  top_score: number
  predictions_json: string
  heatmap_base64?: string
  overlay_base64?: string
  status: string
  model_version: string
  created_at: string
}

export interface SyncStudiesResponse {
  processed_count: number
  study_uids: string[]
  message: string
}

export interface ReviewCreate {
  study_id: string
  model_version: string
  status: 'approved' | 'rejected'
  note?: string
}

export interface ReviewResponse {
  id: string
  study_id: string
  model_version: string
  status: string
  note: string | null
  reviewer_id: string
  created_at: string
  updated_at: string
}

export interface AuditLogEntry {
  id: string
  event_type: string
  entity_id: string | null
  reviewer_id: string
  detail: string | null
  created_at: string
}

export async function getHealth(): Promise<HealthResponse> {
  const res = await api.get<HealthResponse>('/health')
  return res.data
}

export async function getModels(): Promise<ModelInfo[]> {
  const res = await api.get<ModelInfo[]>('/models')
  return res.data
}

export async function classify(file: File): Promise<ClassificationResponse> {
  const form = new FormData()
  form.append('file', file)
  const res = await api.post<ClassificationResponse>('/api/v1/classify', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export async function gradcam(file: File, targetLabel?: string): Promise<GradCAMResponse> {
  const form = new FormData()
  form.append('file', file)
  if (targetLabel) form.append('target_label', targetLabel)
  const res = await api.post<GradCAMResponse>('/api/v1/gradcam', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export async function segment(file: File): Promise<SegmentationResponse> {
  const form = new FormData()
  form.append('file', file)
  const res = await api.post<SegmentationResponse>('/api/v1/segment', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export async function getStudies(): Promise<StudySummary[]> {
  const res = await api.get<StudySummary[]>('/api/v1/studies')
  return res.data
}

export async function syncStudiesAndInfer(): Promise<SyncStudiesResponse> {
  const res = await api.post<SyncStudiesResponse>('/api/v1/studies/sync-and-infer')
  return res.data
}

export async function getStudyInferences(): Promise<StudyInferenceResponse[]> {
  const res = await api.get<StudyInferenceResponse[]>('/api/v1/studies/inferences')
  return res.data
}

export async function getStudyInference(studyUid: string): Promise<StudyInferenceResponse> {
  const res = await api.get<StudyInferenceResponse>(`/api/v1/studies/inferences/${encodeURIComponent(studyUid)}`)
  return res.data
}

export async function createReview(data: ReviewCreate): Promise<ReviewResponse> {
  const res = await api.post<ReviewResponse>('/api/v1/reviews', data)
  return res.data
}

export async function getReviews(): Promise<ReviewResponse[]> {
  const res = await api.get<ReviewResponse[]>('/api/v1/reviews')
  return res.data
}

export async function getAuditLog(): Promise<AuditLogEntry[]> {
  const res = await api.get<AuditLogEntry[]>('/api/v1/audit')
  return res.data
}

export async function resetDatabase(): Promise<{ message: string }> {
  const res = await api.post<{ message: string }>('/api/v1/reset')
  return res.data
}

