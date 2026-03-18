import { Component, signal, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GenerationService } from '../../core/services/generation.service';
import { CreditsService } from '../../core/services/credits.service';
import { SignalRService } from '../../core/services/signalr.service';
import { JobStatusComponent } from '../../shared/components/job-status/job-status.component';
import { estimateCredits, type ModelTier, type JobStatus } from '../../core/models/models';

@Component({
  selector: 'app-transcription',
  standalone: true,
  imports: [CommonModule, FormsModule, JobStatusComponent],
  template: `
<div class="flex h-full">
  <div class="w-[380px] flex-shrink-0 border-r border-border bg-white flex flex-col overflow-y-auto">
    <div class="px-5 py-4 border-b border-border">
      <h1 class="text-base font-semibold text-gray-900">Transcription</h1>
    </div>
    <div class="flex-1 px-5 py-4 space-y-5">
      <div>
        <label class="form-label">Model</label>
        <div class="flex gap-2">
          @for (t of tiers; track t.value) {
            <button class="tier-btn" [class.active]="tier() === t.value" (click)="tier.set(t.value)">{{ t.label }}</button>
          }
        </div>
      </div>
      <div>
        <label class="form-label">Audio / Video File</label>
        <div class="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-accent hover:bg-accent-light/30 transition-colors"
             (click)="fileInput.click()">
          @if (fileName()) {
            <div class="text-sm text-gray-700 font-medium">📎 {{ fileName() }}</div>
          } @else {
            <div class="text-gray-400">
              <div class="text-2xl mb-1">🎵</div>
              <p class="text-sm">Click to upload audio/video</p>
              <p class="text-xs text-gray-400 mt-1">MP3, MP4, WAV, M4A, WebM</p>
            </div>
          }
          <input #fileInput type="file" accept="audio/*,video/*" class="hidden" (change)="onFile($event)"/>
        </div>
      </div>
      <div>
        <label class="form-label">Or URL</label>
        <input type="url" class="form-input" [(ngModel)]="audioUrl" placeholder="https://..."/>
      </div>
    </div>
    <div class="px-5 py-4 border-t border-border space-y-3">
      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-500">Cost estimate</span>
        <span class="font-semibold"><span class="text-accent">{{ costEstimate() }}</span> credits / 30min</span>
      </div>
      <button class="btn-primary w-full" (click)="generate()" [disabled]="(!audioFile && !audioUrl) || generating()">
        @if (generating()) { <span class="animate-spin">⟳</span> Transcribing... }
        @else { 📝 Transcribe }
      </button>
    </div>
  </div>
  <div class="flex-1 p-6 flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-medium text-gray-600">Transcript</h2>
      @if (jobStatus()) { <app-job-status [status]="jobStatus()!"/> }
    </div>
    @if (transcript()) {
      <div class="flex-1 card p-5 overflow-y-auto">
        <pre class="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">{{ transcript() }}</pre>
      </div>
    } @else {
      <div class="flex-1 card flex items-center justify-center text-gray-400">
        <div class="text-center">
          <div class="text-4xl mb-2">📝</div>
          <p class="text-sm">Transcript will appear here</p>
        </div>
      </div>
    }
    @if (errorMsg()) {
      <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{{ errorMsg() }}</div>
    }
  </div>
</div>
  `
})
export class TranscriptionComponent implements OnDestroy {
  private gen = inject(GenerationService);
  private credits = inject(CreditsService);
  private signalR = inject(SignalRService);

  tiers = [{ value: 'Free' as ModelTier, label: 'Whisper' }, { value: 'Premium' as ModelTier, label: 'ElevenLabs' }];
  tier = signal<ModelTier>('Free');
  audioUrl = ''; audioFile: File | null = null;
  fileName = signal<string>('');
  generating = signal(false); jobStatus = signal<JobStatus | null>(null);
  transcript = signal<string | undefined>(undefined); errorMsg = signal<string | undefined>(undefined);
  private currentJobId: string | null = null; private pollInterval?: ReturnType<typeof setInterval>;

  costEstimate = () => estimateCredits('Transcription', this.tier());

  onFile(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) { this.audioFile = f; this.fileName.set(f.name); }
  }

  generate() {
    if ((!this.audioFile && !this.audioUrl) || this.generating()) return;
    this.generating.set(true); this.jobStatus.set('Queued'); this.transcript.set(undefined); this.errorMsg.set(undefined);
    const fd = new FormData();
    if (this.audioFile) fd.append('file', this.audioFile);
    else fd.append('audioUrl', this.audioUrl);
    fd.append('tier', this.tier());
    this.gen.generateTranscription(fd).subscribe({
      next: res => { this.currentJobId = res.jobId; this.credits.reserveLocally(res.creditsReserved); this.startFallback(); },
      error: err => { this.generating.set(false); this.jobStatus.set('Failed'); this.errorMsg.set(err.error?.error ?? 'Failed.'); }
    });
  }

  private startFallback() {
    const start = Date.now();
    this.pollInterval = setInterval(() => {
      const u = this.signalR.latestUpdate();
      if (u?.jobId === this.currentJobId) { this.apply(u.status as JobStatus, u.outputUrl, u.errorMessage); clearInterval(this.pollInterval); return; }
      if (Date.now() - start > 30000 && this.currentJobId) {
        this.gen.getJob(this.currentJobId).subscribe(j => { if (j.status === 'Completed' || j.status === 'Failed') { this.apply(j.status, j.outputUrl, j.errorMessage); clearInterval(this.pollInterval); } });
      }
    }, 1000);
  }

  private apply(status: JobStatus, url?: string, err?: string) {
    this.jobStatus.set(status); this.generating.set(false);
    if (status === 'Completed') { this.transcript.set(url ?? '(no transcript returned)'); this.credits.loadBalance().subscribe(); }
    else { this.errorMsg.set(err ?? 'Failed.'); this.credits.loadBalance().subscribe(); }
  }

  ngOnDestroy() { clearInterval(this.pollInterval); }
}
