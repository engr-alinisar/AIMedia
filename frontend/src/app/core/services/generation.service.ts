import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import type { GenerationResponse, JobDto, JobStatusUpdate, PagedResult } from '../models/models';

export interface PendingJob {
  jobId: string;
  product: string;
  creditsReserved: number;
  status: string;
  outputUrl?: string;
  errorMessage?: string;
  startedAt: Date;
}

@Injectable({ providedIn: 'root' })
export class GenerationService {
  private _pendingJobs = signal<PendingJob[]>([]);
  readonly pendingJobs = this._pendingJobs.asReadonly();

  constructor(private http: HttpClient) {}

  uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string }>(`${environment.apiUrl}/api/upload`, formData);
  }

  uploadAudio(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string }>(`${environment.apiUrl}/api/upload/audio`, formData);
  }

  generateImage(payload: { prompt: string; modelId: string; imageSize?: string; negativePrompt?: string; isPublic?: boolean; zone?: string; aspectRatio?: string; style?: string; quality?: string; background?: string; resolution?: string }) {
    return this.http.post<GenerationResponse>(`${environment.apiUrl}/api/generate/image`, payload);
  }

  generateImageToVideo(payload: { imageUrl: string; endImageUrl?: string; modelId: string; prompt?: string; durationSeconds?: number; resolution?: string; multiShot?: boolean; generateAudio?: boolean; aspectRatio?: string; isPublic?: boolean; zone?: string }) {
    return this.http.post<GenerationResponse>(`${environment.apiUrl}/api/generate/image-to-video`, payload);
  }

  generateTextToVideo(payload: { prompt: string; modelId: string; durationSeconds?: number; aspectRatio?: string; resolution?: string; multiShot?: boolean; generateAudio?: boolean; isPublic?: boolean; zone?: string }) {
    return this.http.post<GenerationResponse>(`${environment.apiUrl}/api/generate/text-to-video`, payload);
  }

  generateVoice(payload: { text: string; modelId: string; voiceId?: string; voiceCloneId?: string; refAudioUrl?: string; isPublic?: boolean; zone?: string }) {
    return this.http.post<GenerationResponse>(`${environment.apiUrl}/api/generate/voice`, payload);
  }

  generateTranscription(formData: FormData) {
    return this.http.post<GenerationResponse>(`${environment.apiUrl}/api/generate/transcription`, formData);
  }

  generateBackgroundRemoval(formData: FormData) {
    return this.http.post<GenerationResponse>(`${environment.apiUrl}/api/generate/background-removal`, formData);
  }

  getJob(id: string) {
    return this.http.get<JobDto>(`${environment.apiUrl}/api/jobs/${id}`);
  }

  getJobs(page = 1, pageSize = 20, filters?: { product?: string; status?: string; from?: string; to?: string }) {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (filters?.product) params.set('product', filters.product);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.from) params.set('from', filters.from);
    if (filters?.to) params.set('to', filters.to);
    return this.http.get<PagedResult<JobDto>>(`${environment.apiUrl}/api/jobs?${params}`);
  }

  addPendingJob(job: PendingJob) {
    this._pendingJobs.update(jobs => [job, ...jobs]);
  }

  applyUpdate(update: JobStatusUpdate) {
    this._pendingJobs.update(jobs =>
      jobs.map(j => j.jobId === update.jobId
        ? { ...j, status: update.status, outputUrl: update.outputUrl, errorMessage: update.errorMessage }
        : j)
    );
  }
}
