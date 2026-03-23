import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { GenerationService } from '../../core/services/generation.service';
import { CreditsService } from '../../core/services/credits.service';
import { SignalRService } from '../../core/services/signalr.service';
import { AuthService } from '../../core/auth/auth.service';
import { LoginModalService } from '../../core/services/login-modal.service';
import { JobStatusComponent } from '../../shared/components/job-status/job-status.component';
import { type JobStatus } from '../../core/models/models';

interface TranscriptionModel {
  id: string;
  name: string;
  description: string;
  creditsPerMin: number;
  badge?: string;
  badgeColor?: string;
  tags: string[];
}

@Component({
  selector: 'app-transcription',
  standalone: true,
  imports: [CommonModule, FormsModule, JobStatusComponent],
  template: `
<div class="flex flex-col lg:flex-row lg:h-full">
  <div class="w-full lg:w-[420px] lg:flex-shrink-0 border-b lg:border-b-0 lg:border-r border-border bg-white flex flex-col">
    <div class="px-5 py-4 border-b border-border">
      <h1 class="text-base font-semibold text-gray-900">Transcription</h1>
    </div>

    <div class="flex-1 px-5 py-4 space-y-5">

      <!-- Model dropdown -->
      <div>
        <label class="form-label">Model</label>
        <div class="relative">
          <button type="button"
                  class="w-full flex items-center justify-between px-3 py-2.5 bg-white border border-border rounded-lg hover:border-accent transition-colors text-left"
                  (click)="dropdownOpen.set(!dropdownOpen())">
            <div class="flex items-center gap-2 min-w-0">
              <svg class="w-4 h-4 text-accent flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
              </svg>
              <span class="text-sm font-medium text-gray-900 truncate">{{ selectedModel()?.name ?? 'Select a model' }}</span>
              @if (selectedModel()?.badge) {
                <span class="px-1.5 py-0.5 text-[10px] font-bold rounded flex-shrink-0"
                      [style.background]="selectedModel()!.badgeColor ?? '#7C3AED'"
                      style="color:white">{{ selectedModel()!.badge }}</span>
              }
            </div>
            <svg class="w-4 h-4 text-gray-400 flex-shrink-0 transition-transform" [class.rotate-180]="dropdownOpen()"
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>

          @if (dropdownOpen()) {
            <div class="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-xl shadow-xl z-50 overflow-hidden">
              @for (m of models; track m.id) {
                <div (click)="selectModel(m)"
                     class="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                     [class.bg-accent-light]="selectedModel()?.id === m.id">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="text-sm font-semibold text-gray-900">{{ m.name }}</span>
                      @if (m.badge) {
                        <span class="px-1.5 py-0.5 text-[10px] font-bold rounded"
                              [style.background]="m.badgeColor ?? '#7C3AED'"
                              style="color:white">{{ m.badge }}</span>
                      }
                    </div>
                    <p class="text-xs text-gray-500 mt-0.5">{{ m.description }}</p>
                    <div class="flex gap-1.5 flex-wrap mt-1.5">
                      @for (tag of m.tags; track tag) {
                        <span class="px-2 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded-full">{{ tag }}</span>
                      }
                      <span class="px-2 py-0.5 text-[10px] bg-accent-light text-accent rounded-full font-medium">{{ m.creditsPerMin }} cr/min</span>
                    </div>
                  </div>
                  @if (selectedModel()?.id === m.id) {
                    <svg class="w-4 h-4 text-accent flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                    </svg>
                  }
                </div>
              }
            </div>
          }
        </div>
      </div>

      <!-- File upload -->
      <div>
        <label class="form-label">Audio / Video File</label>
        <div class="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-accent hover:bg-accent-light/30 transition-colors"
             (click)="fileInput.click()">
          @if (fileName()) {
            <div class="text-sm text-gray-700 font-medium">📎 {{ fileName() }}</div>
            <p class="text-xs text-gray-400 mt-1">Click to change</p>
          } @else {
            <div class="text-gray-400">
              <div class="text-3xl mb-2">🎵</div>
              <p class="text-sm">Click to upload audio/video</p>
              <p class="text-xs text-gray-400 mt-1">MP3, MP4, WAV, M4A, WebM</p>
            </div>
          }
          <input #fileInput type="file" accept="audio/*,video/*" class="hidden" (change)="onFile($event)"/>
        </div>
      </div>

      <!-- Or URL -->
      <div>
        <label class="form-label">Or Audio URL</label>
        <input type="url" class="form-input" [(ngModel)]="audioUrl" placeholder="https://..."/>
      </div>

      @if (errorMsg()) {
        <div class="p-3 bg-red-50 border border-red-300 rounded-lg text-sm text-red-700">{{ errorMsg() }}</div>
      }
    </div>

    <!-- Footer -->
    <div class="px-5 py-4 border-t border-border space-y-3">
      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-500">Cost estimate</span>
        <span class="font-semibold text-gray-900">
          <span class="text-accent">{{ costEstimate() }}</span> credits / 30 min
        </span>
      </div>
      <!-- Public visibility toggle -->
      <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
        <div>
          <p class="text-sm font-medium text-gray-700">Public visibility</p>
          <p class="text-xs text-gray-400">Show this output on the Explore page</p>
        </div>
        <button type="button" (click)="isPublic.update(v => !v)"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                [class.bg-accent]="isPublic()"
                [class.bg-gray-300]="!isPublic()">
          <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                [class.translate-x-6]="isPublic()"
                [class.translate-x-1]="!isPublic()"></span>
        </button>
      </div>
      <button class="btn-primary w-full" (click)="generate()"
              [disabled]="(!audioFile && !audioUrl.trim()) || generating() || !selectedModel()">
        @if (generating()) { <span class="animate-spin mr-1">⟳</span> Transcribing... }
        @else { 📝 Transcribe }
      </button>
    </div>
  </div>

  <!-- Right panel -->
  <div class="flex-1 p-4 lg:p-6 flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-medium text-gray-600">Transcript</h2>
      @if (jobStatus()) { <app-job-status [status]="jobStatus()!"/> }
    </div>
    @if (transcript()) {
      <div class="h-[300px] sm:h-[400px] lg:h-auto lg:flex-1 card p-5 overflow-y-auto">
        <pre class="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">{{ transcript() }}</pre>
      </div>
    } @else {
      <div class="h-[300px] sm:h-[400px] lg:h-auto lg:flex-1 card flex items-center justify-center text-gray-400">
        <div class="text-center">
          <div class="text-4xl mb-2">📝</div>
          <p class="text-sm">Transcript will appear here</p>
        </div>
      </div>
    }
  </div>
</div>
  `
})
export class TranscriptionComponent implements OnInit, OnDestroy {
  private gen = inject(GenerationService);
  private credits = inject(CreditsService);
  private auth = inject(AuthService);
  private loginModal = inject(LoginModalService);
  private signalR = inject(SignalRService);
  private route = inject(ActivatedRoute);

  models: TranscriptionModel[] = [
    {
      id: 'fal-ai/whisper',
      name: 'Whisper',
      description: 'OpenAI Whisper — fast and accurate speech recognition.',
      creditsPerMin: 3,
      tags: ['Open Source', 'Fast', 'Multi-language']
    },
    {
      id: 'fal-ai/elevenlabs/speech-to-text',
      name: 'ElevenLabs Scribe',
      description: 'High-accuracy transcription with speaker diarization.',
      creditsPerMin: 8,
      badge: 'PRO',
      badgeColor: '#7C3AED',
      tags: ['Speaker ID', 'High Accuracy']
    }
  ];

  selectedModel = signal<TranscriptionModel | null>(this.models[0]);
  dropdownOpen = signal(false);

  audioUrl = '';
  audioFile: File | null = null;
  fileName = signal<string>('');

  generating = signal(false);
  jobStatus = signal<JobStatus | null>(null);
  transcript = signal<string | undefined>(undefined);
  errorMsg = signal<string | undefined>(undefined);
  isPublic = signal(true);

  costEstimate = signal(this.models[0].creditsPerMin);

  private currentJobId: string | null = null;
  private pollInterval?: ReturnType<typeof setInterval>;

  ngOnInit() {
    document.addEventListener('click', this.onDocumentClick);
    const qp = this.route.snapshot.queryParams;
    if (qp['model']) {
      const m = this.models.find(x => x.id === qp['model']);
      if (m) this.selectModel(m);
    }
  }

  private onDocumentClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.relative')) this.dropdownOpen.set(false);
  };

  selectModel(m: TranscriptionModel) {
    this.selectedModel.set(m);
    this.dropdownOpen.set(false);
    this.costEstimate.set(m.creditsPerMin);
  }

  onFile(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) { this.audioFile = f; this.fileName.set(f.name); }
  }

  generate() {
    if (!this.auth.isLoggedIn()) { this.loginModal.show(); return; }
    if ((!this.audioFile && !this.audioUrl.trim()) || this.generating() || !this.selectedModel()) return;
    this.generating.set(true);
    this.jobStatus.set('Queued');
    this.transcript.set(undefined);
    this.errorMsg.set(undefined);

    const fd = new FormData();
    if (this.audioFile) fd.append('file', this.audioFile);
    else fd.append('audioUrl', this.audioUrl);
    fd.append('modelId', this.selectedModel()!.id);
    fd.append('isPublic', String(this.isPublic()));

    this.gen.generateTranscription(fd).subscribe({
      next: res => { this.currentJobId = res.jobId; this.credits.reserveLocally(res.creditsReserved); this.signalR.trackJob(res.jobId, 'Transcription'); this.startFallback(); },
      error: err => { this.generating.set(false); this.jobStatus.set('Failed'); this.errorMsg.set(err.error?.error ?? 'Failed.'); }
    });
  }

  private startFallback() {
    const start = Date.now();
    this.pollInterval = setInterval(() => {
      const u = this.signalR.latestUpdate();
      if (u?.jobId === this.currentJobId) { this.apply(u.status as JobStatus, u.outputUrl, u.errorMessage); clearInterval(this.pollInterval); return; }
      if (Date.now() - start > 30000 && this.currentJobId) {
        this.gen.getJob(this.currentJobId).subscribe(j => { if (j.status === 'Completed' || j.status === 'Failed') { this.signalR.publishUpdate({ jobId: j.id, status: j.status, outputUrl: j.outputUrl, creditsCharged: j.creditsCharged, errorMessage: j.errorMessage }); this.apply(j.status, j.outputUrl, j.errorMessage); clearInterval(this.pollInterval); } });
      }
    }, 1000);
  }

  private apply(status: JobStatus, url?: string, err?: string) {
    this.jobStatus.set(status); this.generating.set(false);
    if (status === 'Completed') {
      if (url) {
        // Fetch transcript text from R2 public URL
        fetch(url)
          .then(r => r.text())
          .then(text => { this.transcript.set(text); })
          .catch(() => { this.transcript.set('(could not load transcript)'); });
      } else {
        this.transcript.set('(no transcript returned)');
      }
      this.credits.loadBalance().subscribe();
    } else {
      this.errorMsg.set(err ?? 'Failed.');
      this.credits.loadBalance().subscribe();
    }
  }

  ngOnDestroy() {
    document.removeEventListener('click', this.onDocumentClick);
    clearInterval(this.pollInterval);
  }
}
