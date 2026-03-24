import { Component, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
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
import { ModelPickerComponent, type PickerModel } from '../../shared/components/model-picker/model-picker.component';

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
  imports: [CommonModule, FormsModule, JobStatusComponent, ModelPickerComponent],
  template: `
<div class="flex flex-col lg:flex-row lg:h-full">
  <div class="w-full lg:w-[420px] lg:flex-shrink-0 border-b lg:border-b-0 lg:border-r border-border bg-white flex flex-col">
    <div class="px-5 py-4 border-b border-border">
      <h1 class="text-base font-semibold text-gray-900">Transcription</h1>
    </div>

    <div class="flex-1 px-5 py-4 space-y-5">

      <!-- Model dropdown -->
      <app-model-picker
        [models]="pickerModels()"
        [selectedId]="selectedModel()?.id ?? null"
        (modelSelect)="onModelSelect($event)" />

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
      @if (isPublic()) {
        <div>
          <select [(ngModel)]="zone"
                  class="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent">
            <option value="">Zone (optional)</option>
            <option value="Cinematic">🎬 Cinematic</option>
            <option value="Character">🧑 Character</option>
            <option value="Viral">🔥 Viral</option>
            <option value="Pet">🐾 Pet</option>
            <option value="Dramatic">🎭 Dramatic</option>
            <option value="Cool">😎 Cool</option>
            <option value="Playful">🎮 Playful</option>
            <option value="Fantasy">🧙 Fantasy</option>
            <option value="Dark">🌑 Dark</option>
            <option value="Anime">🌸 Anime</option>
          </select>
        </div>
      }
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

  pickerModels = computed<PickerModel[]>(() =>
    this.models.map(m => ({
      id: m.id,
      name: m.name,
      description: m.description,
      creditsDisplay: `${m.creditsPerMin} cr/min`,
      badge: m.badge,
      badgeColor: m.badgeColor,
      tags: m.tags,
    } satisfies PickerModel))
  );

  selectedModel = signal<TranscriptionModel | null>(this.models[0]);

  audioUrl = '';
  audioFile: File | null = null;
  fileName = signal<string>('');

  generating = signal(false);
  jobStatus = signal<JobStatus | null>(null);
  transcript = signal<string | undefined>(undefined);
  errorMsg = signal<string | undefined>(undefined);
  isPublic = signal(true);
  zone = '';

  costEstimate = signal(this.models[0].creditsPerMin);

  private currentJobId: string | null = null;
  private pollInterval?: ReturnType<typeof setInterval>;

  ngOnInit() {
    const qp = this.route.snapshot.queryParams;
    if (qp['model']) {
      const m = this.models.find(x => x.id === qp['model']);
      if (m) this.selectModel(m);
    }
  }

  onModelSelect(id: string) {
    const m = this.models.find(x => x.id === id);
    if (m) this.selectModel(m);
  }

  selectModel(m: TranscriptionModel) {
    this.selectedModel.set(m);
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
    if (this.zone) fd.append('zone', this.zone);

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
    clearInterval(this.pollInterval);
  }
}
