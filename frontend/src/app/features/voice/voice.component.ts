import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { GenerationService } from '../../core/services/generation.service';
import { CreditsService } from '../../core/services/credits.service';
import { SignalRService } from '../../core/services/signalr.service';
import { VoiceCloneService, VoiceCloneDto } from '../../core/services/voice-clone.service';
import { CloneVoiceModalComponent } from '../../shared/components/clone-voice-modal/clone-voice-modal.component';
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
  requiresAudioSample?: boolean;
}

@Component({
  selector: 'app-voice',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MediaPreviewComponent, JobStatusComponent, CloneVoiceModalComponent],
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
              <!-- Standard TTS section -->
              <div class="px-3 py-1.5 bg-gray-50 border-b border-border">
                <span class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Standard Voices</span>
              </div>
              @for (m of standardModels; track m.id) {
                <div (click)="selectModel(m)"
                     class="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
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
              <!-- Voice Cloning section -->
              <div class="px-3 py-1.5 bg-green-50 border-t border-b border-green-100">
                <span class="text-[10px] font-semibold text-green-700 uppercase tracking-wider">🎤 Voice Cloning</span>
              </div>
              @for (m of cloneModels; track m.id) {
                <div (click)="selectModel(m)"
                     class="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-green-50 transition-colors"
                     [class.bg-green-50]="selectedModel()?.id === m.id">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="text-sm font-semibold text-gray-900">{{ m.name }}</span>
                      @if (m.badge) {
                        <span class="px-1.5 py-0.5 text-[10px] font-bold rounded"
                              [style.background]="m.badgeColor ?? '#059669'"
                              style="color:white">{{ m.badge }}</span>
                      }
                    </div>
                    <p class="text-xs text-gray-500 mt-0.5">{{ m.description }}</p>
                    <div class="flex gap-1.5 flex-wrap mt-1.5">
                      @for (tag of m.tags; track tag) {
                        <span class="px-2 py-0.5 text-[10px] bg-green-100 text-green-700 rounded-full">{{ tag }}</span>
                      }
                      <span class="px-2 py-0.5 text-[10px] bg-accent-light text-accent rounded-full font-medium">{{ m.creditsPerKChars }} cr/1K chars</span>
                    </div>
                  </div>
                  @if (selectedModel()?.id === m.id) {
                    <svg class="w-4 h-4 text-green-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                    </svg>
                  }
                </div>
              }
            </div>
          }
        </div>
      </div>

      <!-- Voice clone hint when standard model selected -->
      @if (!selectedModel()?.requiresAudioSample) {
        <div class="flex items-center gap-2.5 px-3 py-2.5 bg-green-50 border border-green-200 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
             (click)="selectModel(cloneModels[0])">
          <span class="text-lg flex-shrink-0">🎤</span>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold text-green-800">Want to clone your own voice?</p>
            <p class="text-xs text-green-600">Select <strong>F5-TTS</strong> to upload a voice sample and generate speech in that voice.</p>
          </div>
          <svg class="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
        </div>
      }

      <!-- Text -->
      <div>
        <label class="form-label">Text</label>
        <textarea class="form-textarea h-40" [(ngModel)]="text"
          spellcheck="true"
          placeholder="Enter the text to convert to speech..." maxlength="5000"></textarea>
        <p class="text-right text-xs text-gray-400 mt-1">{{ text.length }}/5000</p>
      </div>

      <!-- Voice selector (only for non-F5-TTS models) -->
      @if (!selectedModel()?.requiresAudioSample) {
        <div>
          <label class="form-label">Voice</label>
          <select class="form-select" [(ngModel)]="voiceId">
            @for (v of voices; track v.id) {
              <option [value]="v.id">{{ v.name }}</option>
            }
          </select>
        </div>
      }

      <!-- Saved voice clones (F5-TTS only) -->
      @if (selectedModel()?.requiresAudioSample) {
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="form-label mb-0">Your Voice Clones</label>
            <button type="button" (click)="showCloneModal.set(true)"
                    class="flex items-center gap-1.5 px-2.5 py-1 bg-accent text-white text-xs font-medium rounded-lg hover:bg-accent/90 transition-colors">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              Clone a Voice
            </button>
          </div>

          @if (loadingClones()) {
            <div class="flex items-center gap-2 py-4 text-gray-400 text-sm">
              <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Loading your voices...
            </div>
          } @else if (voiceClones().length === 0) {
            <div class="flex flex-col items-center py-6 border-2 border-dashed border-border rounded-xl text-center">
              <span class="text-2xl mb-1">🎤</span>
              <p class="text-sm font-medium text-gray-600">No voice clones yet</p>
              <p class="text-xs text-gray-400 mt-0.5 mb-3">Click "Clone a Voice" to create your first one</p>
              <button type="button" (click)="showCloneModal.set(true)"
                      class="px-3 py-1.5 bg-accent text-white text-xs font-medium rounded-lg hover:bg-accent/90 transition-colors">
                + Clone a Voice
              </button>
            </div>
          } @else {
            <div class="space-y-2">
              @for (clone of voiceClones(); track clone.id) {
                <div (click)="selectClone(clone)"
                     class="flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors"
                     [class.border-accent]="selectedCloneId() === clone.id"
                     [class.bg-accent-light]="selectedCloneId() === clone.id"
                     [class.border-border]="selectedCloneId() !== clone.id"
                     [class.hover:border-accent]="selectedCloneId() !== clone.id">
                  <div class="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <span class="text-white text-sm font-bold">{{ clone.name[0].toUpperCase() }}</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-gray-900 truncate">{{ clone.name }}</p>
                    @if (clone.description) {
                      <p class="text-xs text-gray-500 truncate">{{ clone.description }}</p>
                    } @else {
                      <p class="text-xs text-gray-400">{{ clone.referenceText.slice(0, 40) }}...</p>
                    }
                  </div>
                  @if (selectedCloneId() === clone.id) {
                    <svg class="w-4 h-4 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                    </svg>
                  }
                  <button type="button" (click)="deleteClone(clone.id, $event)"
                          class="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>
              }
            </div>
          }
        </div>
      }

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
              [disabled]="!canGenerate()">
        @if (generating()) { <span class="animate-spin mr-1">⟳</span> Generating... }
        @else { 🎙️ Generate Voice }
      </button>
    </div>
  </div>

  <!-- Right panel -->
  <div class="flex-1 p-6 flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-medium text-gray-600">Audio Output</h2>
      <div class="flex items-center gap-3">
        @if (jobStatus()) { <app-job-status [status]="jobStatus()!"/> }
        @if (outputUrl()) {
          <a [href]="outputUrl()" download target="_blank"
             class="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white text-xs font-medium rounded-lg hover:bg-accent/90 transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            Download
          </a>
        }
        <a routerLink="/jobs" class="text-xs text-accent hover:underline">My Jobs →</a>
      </div>
    </div>
    @if (generating() && !outputUrl()) {
      <div class="flex items-center gap-3 px-4 py-3 bg-accent-light border border-accent/20 rounded-xl">
        <svg class="w-5 h-5 text-accent animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <div>
          <p class="text-sm font-medium text-accent">Generating your audio...</p>
          <p class="text-xs text-accent/70">Usually takes 10–30 seconds. You can navigate away — results will be in <a routerLink="/jobs" class="underline">My Jobs</a>.</p>
        </div>
      </div>
    }
    <div class="flex-1 min-h-0"><app-media-preview [url]="outputUrl()" product="Voice"/></div>
  </div>
</div>

@if (showCloneModal()) {
  <app-clone-voice-modal
    (cancel)="showCloneModal.set(false)"
    (created)="onCloneCreated($event)"/>
}
  `
})
export class VoiceComponent implements OnInit, OnDestroy {
  private gen = inject(GenerationService);
  private credits = inject(CreditsService);
  private signalR = inject(SignalRService);
  private voiceCloneSvc = inject(VoiceCloneService);

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
    },
    {
      id: 'fal-ai/f5-tts',
      name: 'F5-TTS (Voice Clone)',
      description: 'Clone any voice from a 15–30s audio sample. Upload your own voice or any speaker.',
      creditsPerKChars: 12,
      badge: 'CLONE',
      badgeColor: '#059669',
      tags: ['Voice Cloning', 'Custom Voice'],
      requiresAudioSample: true
    }
  ];

  voices = [
    { id: 'af_heart', name: 'Heart (Female)' },
    { id: 'af_sky', name: 'Sky (Female)' },
    { id: 'am_adam', name: 'Adam (Male)' },
    { id: 'am_michael', name: 'Michael (Male)' }
  ];

  get standardModels() { return this.models.filter(m => !m.requiresAudioSample); }
  get cloneModels() { return this.models.filter(m => m.requiresAudioSample); }

  selectedModel = signal<VoiceModel | null>(this.models[0]);
  dropdownOpen = signal(false);

  text = '';
  voiceId = 'af_heart';

  generating = signal(false);
  jobStatus = signal<JobStatus | null>(null);
  outputUrl = signal<string | undefined>(undefined);
  errorMsg = signal<string | undefined>(undefined);

  // Voice clones (F5-TTS)
  showCloneModal = signal(false);
  voiceClones = signal<VoiceCloneDto[]>([]);
  loadingClones = signal(false);
  selectedCloneId = signal<string | null>(null);

  costEstimate = signal(this.models[0].creditsPerKChars);

  private currentJobId: string | null = null;
  private pollInterval?: ReturnType<typeof setInterval>;

  canGenerate() {
    if (!this.text.trim() || this.generating() || !this.selectedModel()) return false;
    if (this.selectedModel()?.requiresAudioSample && !this.selectedCloneId()) return false;
    return true;
  }

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
    if (m.requiresAudioSample) this.loadClones();
  }

  loadClones() {
    this.loadingClones.set(true);
    this.voiceCloneSvc.list().subscribe({
      next: clones => { this.voiceClones.set(clones); this.loadingClones.set(false); },
      error: () => this.loadingClones.set(false)
    });
  }

  selectClone(clone: VoiceCloneDto) {
    this.selectedCloneId.set(clone.id);
  }

  onCloneCreated(clone: VoiceCloneDto) {
    this.voiceClones.update(list => [clone, ...list]);
    this.selectedCloneId.set(clone.id);
    this.showCloneModal.set(false);
  }

  deleteClone(id: string, e: MouseEvent) {
    e.stopPropagation();
    if (!confirm('Delete this voice clone?')) return;
    this.voiceCloneSvc.delete(id).subscribe({
      next: () => {
        this.voiceClones.update(list => list.filter(c => c.id !== id));
        if (this.selectedCloneId() === id) this.selectedCloneId.set(null);
      }
    });
  }

  generate() {
    if (!this.canGenerate()) return;
    this.generating.set(true);
    this.jobStatus.set('Queued');
    this.outputUrl.set(undefined);
    this.errorMsg.set(undefined);
    this.gen.generateVoice({
      text: this.text,
      modelId: this.selectedModel()!.id,
      voiceId: this.selectedModel()?.requiresAudioSample ? undefined : this.voiceId,
      voiceCloneId: this.selectedCloneId() ?? undefined
    }).subscribe({
      next: res => { this.currentJobId = res.jobId; this.credits.reserveLocally(res.creditsReserved); this.signalR.trackJob(res.jobId, 'Voice'); this.startFallback(); },
      error: err => { this.generating.set(false); this.jobStatus.set('Failed'); this.errorMsg.set(err.error?.error ?? 'Failed.'); }
    });
  }

  private startFallback() {
    let polling = false;
    this.pollInterval = setInterval(() => {
      const u = this.signalR.latestUpdate();
      if (u?.jobId === this.currentJobId) {
        this.apply(u.status as JobStatus, u.outputUrl, u.errorMessage);
        clearInterval(this.pollInterval); return;
      }
      if (polling || !this.currentJobId) return;
      polling = true;
      this.gen.getJob(this.currentJobId).subscribe({
        next: j => {
          polling = false;
          if (j.status === 'Completed' || j.status === 'Failed') {
            this.signalR.publishUpdate({ jobId: j.id, status: j.status, outputUrl: j.outputUrl, creditsCharged: j.creditsCharged, errorMessage: j.errorMessage });
            this.apply(j.status, j.outputUrl, j.errorMessage);
            clearInterval(this.pollInterval);
          }
        },
        error: () => { polling = false; }
      });
    }, 5000);
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
