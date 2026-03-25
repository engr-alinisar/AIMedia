import { Component, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { GenerationService } from '../../core/services/generation.service';
import { CreditsService } from '../../core/services/credits.service';
import { SignalRService } from '../../core/services/signalr.service';
import { AuthService } from '../../core/auth/auth.service';
import { LoginModalService } from '../../core/services/login-modal.service';
import { MediaPreviewComponent } from '../../shared/components/media-preview/media-preview.component';
import { JobStatusComponent } from '../../shared/components/job-status/job-status.component';
import { type JobStatus } from '../../core/models/models';
import { ModelPickerComponent, type PickerModel } from '../../shared/components/model-picker/model-picker.component';

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
  imports: [CommonModule, FormsModule, RouterLink, MediaPreviewComponent, JobStatusComponent, ModelPickerComponent],
  template: `
<div class="flex flex-col lg:flex-row lg:h-full">
  <div class="w-full lg:w-[420px] lg:flex-shrink-0 border-b lg:border-b-0 lg:border-r border-border bg-white flex flex-col">
    <div class="px-5 py-4 border-b border-border">
      <h1 class="text-base font-semibold text-gray-900">Image Generation</h1>
    </div>

    <div class="flex-1 px-5 py-4 space-y-5">

      <!-- Model dropdown -->
      <app-model-picker
        [models]="pickerModels()"
        [selectedId]="selectedModel()?.id ?? null"
        (modelSelect)="onModelSelect($event)" />

      <!-- Prompt -->
      <div>
        <label class="form-label">Prompt</label>
        <textarea class="form-textarea h-28" [(ngModel)]="prompt"
          spellcheck="true" lang="en" autocorrect="on" autocapitalize="sentences"
          placeholder="Describe the image you want to generate..." maxlength="2000"></textarea>
        <p class="text-right text-xs text-gray-400 mt-1">{{ prompt.length }}/2000</p>
      </div>

      <!-- Negative Prompt -->
      <div>
        <label class="form-label">Negative Prompt <span class="text-gray-400 font-normal">(optional)</span></label>
        <textarea class="form-textarea h-16" [(ngModel)]="negativePrompt"
          spellcheck="true" lang="en" autocorrect="on" autocapitalize="sentences"
          placeholder="What to avoid in the image..."></textarea>
      </div>

      <!-- Image Size -->
      <div>
        <label class="form-label">Image Size</label>
        <div class="grid grid-cols-3 gap-2">
          @for (s of imageSizes; track s.value) {
            <button type="button"
                    (click)="imageSize = s.value"
                    class="flex flex-col items-center justify-center py-2.5 px-1 border rounded-lg text-center transition-colors"
                    [class.border-accent]="imageSize === s.value"
                    [class.bg-accent-light]="imageSize === s.value"
                    [class.border-border]="imageSize !== s.value"
                    [class.hover:border-accent]="imageSize !== s.value">
              <span class="text-base leading-none mb-1">{{ s.icon }}</span>
              <span class="text-[11px] font-medium text-gray-800">{{ s.label }}</span>
              <span class="text-[10px] text-gray-400">{{ s.dims }}</span>
            </button>
          }
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
              [disabled]="!prompt.trim() || generating() || !selectedModel()">
        @if (generating()) { <span class="animate-spin mr-1">⟳</span> Generating... }
        @else { ✨ Generate }
      </button>
    </div>
  </div>

  <!-- Right panel -->
  <div class="flex-1 p-4 lg:p-6 flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-medium text-gray-600">Image Output</h2>
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

      </div>
    </div>
    @if (generating() && !outputUrl()) {
      <div class="flex items-center gap-3 px-4 py-3 bg-accent-light border border-accent/20 rounded-xl">
        <svg class="w-5 h-5 text-accent animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <div>
          <p class="text-sm font-medium text-accent">Generating your image...</p>
          <p class="text-xs text-accent/70">Usually takes 15–45 seconds. You can navigate away — results will be in <a routerLink="/jobs" class="underline">My Jobs</a>.</p>
        </div>
      </div>
    }
    <div class="h-[55vw] sm:h-[420px] lg:h-auto lg:flex-1 lg:min-h-0 card overflow-hidden">
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
  private auth = inject(AuthService);
  private loginModal = inject(LoginModalService);
  private route = inject(ActivatedRoute);

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

  imageSizes = [
    { value: 'square_hd',      label: 'Square HD',   dims: '1024×1024', icon: '⬛' },
    { value: 'square',         label: 'Square',      dims: '512×512',   icon: '▪️' },
    { value: 'portrait_4_3',   label: 'Portrait 4:3',dims: '768×1024',  icon: '🖼️' },
    { value: 'portrait_16_9',  label: 'Portrait 9:16',dims: '576×1024', icon: '📱' },
    { value: 'landscape_4_3',  label: 'Landscape 4:3',dims:'1024×768',  icon: '🌄' },
    { value: 'landscape_16_9', label: 'Wide 16:9',   dims: '1024×576',  icon: '🖥️' },
  ];

  pickerModels = computed<PickerModel[]>(() =>
    this.models.map(m => ({
      id: m.id,
      name: m.name,
      description: m.description,
      creditsDisplay: `${m.credits} credits`,
      badge: m.badge,
      badgeColor: m.badgeColor,
      tags: m.tags,
    } satisfies PickerModel))
  );

  selectedModel = signal<ImageModel | null>(this.models[1]);

  prompt = '';
  negativePrompt = '';
  imageSize = 'square_hd';

  generating = signal(false);
  jobStatus = signal<JobStatus | null>(null);
  outputUrl = signal<string | undefined>(undefined);
  errorMsg = signal<string | undefined>(undefined);
  isPublic = signal(true);
  zone = '';

  costEstimate = signal(this.models[1].credits);

  private currentJobId: string | null = null;
  private pollInterval?: ReturnType<typeof setInterval>;

  ngOnInit() {
    const qp = this.route.snapshot.queryParams;
    if (qp['prompt']) this.prompt = qp['prompt'];
    if (qp['model']) {
      const m = this.models.find(x => x.id === qp['model']);
      if (m) this.selectModel(m);
    }
  }

  onModelSelect(id: string) {
    const m = this.models.find(x => x.id === id);
    if (m) this.selectModel(m);
  }

  selectModel(m: ImageModel) {
    this.selectedModel.set(m);
    this.costEstimate.set(m.credits);
  }

  generate() {
    if (!this.auth.isLoggedIn()) { this.loginModal.show(); return; }
    if (!this.prompt.trim() || this.generating() || !this.selectedModel()) return;
    this.generating.set(true);
    this.jobStatus.set('Queued');
    this.outputUrl.set(undefined);
    this.errorMsg.set(undefined);
    this.gen.generateImage({
      prompt: this.prompt,
      modelId: this.selectedModel()!.id,
      imageSize: this.imageSize,
      negativePrompt: this.negativePrompt || undefined,
      isPublic: this.isPublic(), zone: this.zone || undefined
    }).subscribe({
      next: res => { this.currentJobId = res.jobId; this.credits.reserveLocally(res.creditsReserved); this.signalR.trackJob(res.jobId, 'ImageGen'); this.startFallback(); },
      error: err => { this.generating.set(false); this.jobStatus.set('Failed'); this.errorMsg.set(err.error?.error ?? 'Failed.'); }
    });
  }

  private startFallback() {
    let polling = false;
    this.pollInterval = setInterval(() => {
      // SignalR fast path
      const u = this.signalR.latestUpdate();
      if (u?.jobId === this.currentJobId) {
        this.apply(u.status as JobStatus, u.outputUrl, u.errorMessage);
        clearInterval(this.pollInterval); return;
      }
      // API polling fallback — no concurrent calls
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
    clearInterval(this.pollInterval);
  }
}
