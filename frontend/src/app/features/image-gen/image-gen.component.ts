import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GenerationService } from '../../core/services/generation.service';
import { CreditsService } from '../../core/services/credits.service';
import { SignalRService } from '../../core/services/signalr.service';
import { MediaPreviewComponent } from '../../shared/components/media-preview/media-preview.component';
import { JobStatusComponent } from '../../shared/components/job-status/job-status.component';
import { type JobStatus } from '../../core/models/models';

interface ImageModel {
  id: string;
  name: string;
  description: string;
  credits: number;
  badge?: string;
  badgeColor?: string;
  tags: string[];
}

@Component({
  selector: 'app-image-gen',
  standalone: true,
  imports: [CommonModule, FormsModule, MediaPreviewComponent, JobStatusComponent],
  template: `
<div class="flex h-full">
  <div class="w-[420px] flex-shrink-0 border-r border-border bg-white flex flex-col overflow-y-auto">
    <div class="px-5 py-4 border-b border-border">
      <h1 class="text-base font-semibold text-gray-900">Image Generation</h1>
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
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
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
                      <span class="px-2 py-0.5 text-[10px] bg-accent-light text-accent rounded-full font-medium">{{ m.credits }} credits</span>
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
        <textarea class="form-textarea h-28" [(ngModel)]="prompt"
          placeholder="Describe the image you want to generate..." maxlength="2000"></textarea>
        <p class="text-right text-xs text-gray-400 mt-1">{{ prompt.length }}/2000</p>
      </div>

      <!-- Negative Prompt -->
      <div>
        <label class="form-label">Negative Prompt <span class="text-gray-400 font-normal">(optional)</span></label>
        <textarea class="form-textarea h-16" [(ngModel)]="negativePrompt"
          placeholder="What to avoid in the image..."></textarea>
      </div>

      <!-- Dimensions -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="form-label">Width</label>
          <select class="form-select" [(ngModel)]="width">
            <option [value]="512">512px</option>
            <option [value]="768">768px</option>
            <option [value]="1024">1024px</option>
            <option [value]="1280">1280px</option>
          </select>
        </div>
        <div>
          <label class="form-label">Height</label>
          <select class="form-select" [(ngModel)]="height">
            <option [value]="512">512px</option>
            <option [value]="768">768px</option>
            <option [value]="1024">1024px</option>
            <option [value]="1280">1280px</option>
          </select>
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
    <div class="flex-1 min-h-0">
      <app-media-preview [url]="outputUrl()" product="ImageGen"/>
    </div>
  </div>
</div>
  `
})
export class ImageGenComponent implements OnInit, OnDestroy {
  private gen = inject(GenerationService);
  private credits = inject(CreditsService);
  private signalR = inject(SignalRService);

  models: ImageModel[] = [
    {
      id: 'fal-ai/flux/dev',
      name: 'FLUX Dev',
      description: 'Fast open-source model, great for quick experiments.',
      credits: 5,
      tags: ['Open Source', 'Fast']
    },
    {
      id: 'fal-ai/flux-pro/v1.1',
      name: 'FLUX Pro 1.1',
      description: 'High quality with improved photorealism and detail.',
      credits: 8,
      tags: ['High Quality', 'Photorealistic']
    },
    {
      id: 'fal-ai/flux-pro/v1.1-ultra',
      name: 'FLUX Pro 1.1 Ultra',
      description: 'Maximum detail and resolution up to 2K.',
      credits: 11,
      badge: 'BEST',
      badgeColor: '#7C3AED',
      tags: ['Ultra Quality', '2K Resolution']
    }
  ];

  selectedModel = signal<ImageModel | null>(this.models[1]);
  dropdownOpen = signal(false);

  prompt = '';
  negativePrompt = '';
  width = 1024;
  height = 1024;

  generating = signal(false);
  jobStatus = signal<JobStatus | null>(null);
  outputUrl = signal<string | undefined>(undefined);
  errorMsg = signal<string | undefined>(undefined);

  costEstimate = signal(this.models[1].credits);

  private currentJobId: string | null = null;
  private pollInterval?: ReturnType<typeof setInterval>;

  ngOnInit() {
    document.addEventListener('click', this.onDocumentClick);
  }

  private onDocumentClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.relative')) this.dropdownOpen.set(false);
  };

  selectModel(m: ImageModel) {
    this.selectedModel.set(m);
    this.dropdownOpen.set(false);
    this.costEstimate.set(m.credits);
  }

  generate() {
    if (!this.prompt.trim() || this.generating() || !this.selectedModel()) return;
    this.generating.set(true);
    this.jobStatus.set('Queued');
    this.outputUrl.set(undefined);
    this.errorMsg.set(undefined);
    this.gen.generateImage({
      prompt: this.prompt,
      modelId: this.selectedModel()!.id,
      width: this.width,
      height: this.height,
      negativePrompt: this.negativePrompt || undefined
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
