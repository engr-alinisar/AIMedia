import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GenerationService } from '../../core/services/generation.service';
import { CreditsService } from '../../core/services/credits.service';
import { SignalRService } from '../../core/services/signalr.service';
import { MediaPreviewComponent } from '../../shared/components/media-preview/media-preview.component';
import { JobStatusComponent } from '../../shared/components/job-status/job-status.component';
import { type JobStatus } from '../../core/models/models';

interface VoiceModel {
  id: string;
  name: string;
  description: string;
  creditsPerKChars: number;
  badge?: string;
  badgeColor?: string;
  tags: string[];
}

@Component({
  selector: 'app-voice',
  standalone: true,
  imports: [CommonModule, FormsModule, MediaPreviewComponent, JobStatusComponent],
  template: `
<div class="flex h-full">
  <div class="w-[420px] flex-shrink-0 border-r border-border bg-white flex flex-col overflow-y-auto">
    <div class="px-5 py-4 border-b border-border">
      <h1 class="text-base font-semibold text-gray-900">Text to Voice</h1>
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
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
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
                      <span class="px-2 py-0.5 text-[10px] bg-accent-light text-accent rounded-full font-medium">{{ m.creditsPerKChars }} cr/1K chars</span>
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

      <!-- Text -->
      <div>
        <label class="form-label">Text</label>
        <textarea class="form-textarea h-40" [(ngModel)]="text"
          placeholder="Enter the text to convert to speech..." maxlength="5000"></textarea>
        <p class="text-right text-xs text-gray-400 mt-1">{{ text.length }}/5000</p>
      </div>

      <!-- Voice -->
      <div>
        <label class="form-label">Voice</label>
        <select class="form-select" [(ngModel)]="voiceId">
          @for (v of voices; track v.id) {
            <option [value]="v.id">{{ v.name }}</option>
          }
        </select>
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
          <span class="text-accent">{{ costEstimate() }}</span> credits / 1K chars
        </span>
      </div>
      <button class="btn-primary w-full" (click)="generate()"
              [disabled]="!text.trim() || generating() || !selectedModel()">
        @if (generating()) { <span class="animate-spin mr-1">⟳</span> Generating... }
        @else { 🎙️ Generate Voice }
      </button>
    </div>
  </div>

  <!-- Right panel -->
  <div class="flex-1 p-6 flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-medium text-gray-600">Audio Output</h2>
      @if (jobStatus()) { <app-job-status [status]="jobStatus()!"/> }
    </div>
    <div class="flex-1 min-h-0"><app-media-preview [url]="outputUrl()" product="Voice"/></div>
  </div>
</div>
  `
})
export class VoiceComponent implements OnInit, OnDestroy {
  private gen = inject(GenerationService);
  private credits = inject(CreditsService);
  private signalR = inject(SignalRService);

  models: VoiceModel[] = [
    {
      id: 'fal-ai/kokoro',
      name: 'Kokoro',
      description: 'Fast open-source TTS with natural-sounding voices.',
      creditsPerKChars: 4,
      tags: ['Open Source', 'Fast']
    },
    {
      id: 'fal-ai/minimax/speech-02-hd',
      name: 'MiniMax Speech HD',
      description: 'High-definition voice with emotional expressiveness.',
      creditsPerKChars: 18,
      badge: 'HD',
      badgeColor: '#7C3AED',
      tags: ['HD Quality', 'Expressive']
    }
  ];

  voices = [
    { id: 'af_heart', name: 'Heart (Female)' },
    { id: 'af_sky', name: 'Sky (Female)' },
    { id: 'am_adam', name: 'Adam (Male)' },
    { id: 'am_michael', name: 'Michael (Male)' }
  ];

  selectedModel = signal<VoiceModel | null>(this.models[1]);
  dropdownOpen = signal(false);

  text = '';
  voiceId = 'af_heart';

  generating = signal(false);
  jobStatus = signal<JobStatus | null>(null);
  outputUrl = signal<string | undefined>(undefined);
  errorMsg = signal<string | undefined>(undefined);

  costEstimate = signal(this.models[1].creditsPerKChars);

  private currentJobId: string | null = null;
  private pollInterval?: ReturnType<typeof setInterval>;

  ngOnInit() {
    document.addEventListener('click', this.onDocumentClick);
  }

  private onDocumentClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.relative')) this.dropdownOpen.set(false);
  };

  selectModel(m: VoiceModel) {
    this.selectedModel.set(m);
    this.dropdownOpen.set(false);
    this.costEstimate.set(m.creditsPerKChars);
  }

  generate() {
    if (!this.text.trim() || this.generating() || !this.selectedModel()) return;
    this.generating.set(true);
    this.jobStatus.set('Queued');
    this.outputUrl.set(undefined);
    this.errorMsg.set(undefined);
    this.gen.generateVoice({
      text: this.text,
      modelId: this.selectedModel()!.id,
      voiceId: this.voiceId
    }).subscribe({
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
    if (status === 'Completed') { this.outputUrl.set(url); this.credits.loadBalance().subscribe(); }
    else { this.errorMsg.set(err ?? 'Failed.'); this.credits.loadBalance().subscribe(); }
  }

  ngOnDestroy() {
    document.removeEventListener('click', this.onDocumentClick);
    clearInterval(this.pollInterval);
  }
}
