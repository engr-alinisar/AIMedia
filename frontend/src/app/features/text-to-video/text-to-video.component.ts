import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GenerationService } from '../../core/services/generation.service';
import { CreditsService } from '../../core/services/credits.service';
import { SignalRService } from '../../core/services/signalr.service';
import { MediaPreviewComponent } from '../../shared/components/media-preview/media-preview.component';
import { JobStatusComponent } from '../../shared/components/job-status/job-status.component';
import { type JobStatus } from '../../core/models/models';

interface VideoModel {
  id: string;
  name: string;
  description: string;
  creditsPerSec: number;
  badge?: string;
  badgeColor?: string;
  tags: string[];
}

@Component({
  selector: 'app-text-to-video',
  standalone: true,
  imports: [CommonModule, FormsModule, MediaPreviewComponent, JobStatusComponent],
  template: `
<div class="flex h-full">
  <div class="w-[420px] flex-shrink-0 border-r border-border bg-white flex flex-col overflow-y-auto">
    <div class="px-5 py-4 border-b border-border">
      <h1 class="text-base font-semibold text-gray-900">Text to Video</h1>
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
                <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
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
            <div class="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-xl shadow-xl z-50 overflow-hidden max-h-80 overflow-y-auto">
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
                      <span class="px-2 py-0.5 text-[10px] bg-accent-light text-accent rounded-full font-medium">{{ m.creditsPerSec }} cr/s</span>
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

      <!-- Prompt -->
      <div>
        <label class="form-label">Prompt</label>
        <textarea class="form-textarea h-32" [(ngModel)]="prompt"
          placeholder="Describe your video scene in detail..." maxlength="2500"></textarea>
        <p class="text-right text-xs text-gray-400 mt-1">{{ prompt.length }}/2500</p>
      </div>

      <!-- Aspect Ratio -->
      <div>
        <label class="form-label">Aspect Ratio</label>
        <div class="flex gap-2 flex-wrap">
          @for (ar of aspectRatios; track ar) {
            <button class="tier-btn" [class.active]="aspectRatio === ar" (click)="aspectRatio = ar">{{ ar }}</button>
          }
        </div>
      </div>

      <!-- Duration -->
      <div>
        <label class="form-label">Duration: <span class="text-accent font-semibold">{{ duration }}s</span></label>
        <input type="range" [(ngModel)]="duration" min="3" max="10" step="1"
               class="w-full accent-accent" (ngModelChange)="onDurationChange()"/>
        <div class="flex justify-between text-xs text-gray-400 mt-0.5">
          <span>3s</span><span>10s</span>
        </div>
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
          <span class="text-accent">{{ costEstimate() }}</span> credits
        </span>
      </div>
      <button class="btn-primary w-full" (click)="generate()"
              [disabled]="!prompt.trim() || generating() || !selectedModel()">
        @if (generating()) { <span class="animate-spin mr-1">⟳</span> Generating... }
        @else { ✨ Generate }
      </button>
    </div>
  </div>

  <!-- Right panel -->
  <div class="flex-1 p-6 flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-medium text-gray-600">Preview</h2>
      @if (jobStatus()) { <app-job-status [status]="jobStatus()!"/> }
    </div>
    <div class="flex-1 min-h-0"><app-media-preview [url]="outputUrl()" product="TextToVideo"/></div>
  </div>
</div>
  `
})
export class TextToVideoComponent implements OnInit, OnDestroy {
  private gen = inject(GenerationService);
  private credits = inject(CreditsService);
  private signalR = inject(SignalRService);

  models: VideoModel[] = [
    {
      id: 'fal-ai/wan/v2.2-a14b/text-to-video',
      name: 'WAN 2.2',
      description: 'Fast open-source model, great for quick previews.',
      creditsPerSec: 5,
      tags: ['Open Source', 'Fast']
    },
    {
      id: 'fal-ai/kling-video/v3/pro/text-to-video',
      name: 'Kling v3 Pro',
      description: 'Longer, consistent, cinematic AI video generation.',
      creditsPerSec: 18,
      badge: 'HOT',
      badgeColor: '#EF4444',
      tags: ['Multi-Shot', 'Cinematic']
    },
    {
      id: 'fal-ai/veo3/text-to-video',
      name: 'Google Veo 3',
      description: 'Cinematic realism with synchronized audio generation.',
      creditsPerSec: 30,
      tags: ['Audio Support', 'Ultra Quality']
    }
  ];

  aspectRatios = ['16:9', '9:16', '1:1', '4:3'];

  selectedModel = signal<VideoModel | null>(this.models[1]);
  dropdownOpen = signal(false);

  prompt = '';
  aspectRatio = '16:9';
  duration = 5;

  generating = signal(false);
  jobStatus = signal<JobStatus | null>(null);
  outputUrl = signal<string | undefined>(undefined);
  errorMsg = signal<string | undefined>(undefined);

  costEstimate = signal(this.models[1].creditsPerSec * 5);

  private currentJobId: string | null = null;
  private pollInterval?: ReturnType<typeof setInterval>;

  ngOnInit() {
    document.addEventListener('click', this.onDocumentClick);
  }

  private onDocumentClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.relative')) this.dropdownOpen.set(false);
  };

  selectModel(m: VideoModel) {
    this.selectedModel.set(m);
    this.dropdownOpen.set(false);
    this.updateCost();
  }

  onDurationChange() { this.updateCost(); }

  private updateCost() {
    const m = this.selectedModel();
    this.costEstimate.set(m ? m.creditsPerSec * this.duration : 0);
  }

  generate() {
    if (!this.prompt.trim() || this.generating() || !this.selectedModel()) return;
    this.generating.set(true);
    this.jobStatus.set('Queued');
    this.outputUrl.set(undefined);
    this.errorMsg.set(undefined);
    this.gen.generateTextToVideo({
      prompt: this.prompt,
      modelId: this.selectedModel()!.id,
      durationSeconds: this.duration,
      aspectRatio: this.aspectRatio
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
