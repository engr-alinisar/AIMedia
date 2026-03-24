import { Component, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { GenerationService } from '../../core/services/generation.service';
import { CreditsService } from '../../core/services/credits.service';
import { SignalRService } from '../../core/services/signalr.service';
import { AuthService } from '../../core/auth/auth.service';
import { LoginModalService } from '../../core/services/login-modal.service';
import { MediaPreviewComponent } from '../../shared/components/media-preview/media-preview.component';
import { JobStatusComponent } from '../../shared/components/job-status/job-status.component';
import { type JobStatus } from '../../core/models/models';

interface AspectRatio { value: string; w: number; h: number; }

interface VideoModel {
  id: string;
  name: string;
  description: string;
  creditsPerSec: number;
  badge?: string;
  badgeColor?: string;
  tags: string[];
  durations: number[];
  aspectRatios: AspectRatio[];
  supportsResolution: boolean;
  supportsMultiShot: boolean;
  hasAudio: boolean;
}

@Component({
  selector: 'app-text-to-video',
  standalone: true,
  imports: [CommonModule, FormsModule, MediaPreviewComponent, JobStatusComponent],
  template: `
<div class="flex flex-col lg:flex-row lg:h-full">
  <div class="w-full lg:w-[420px] lg:flex-shrink-0 border-b lg:border-b-0 lg:border-r border-border bg-white flex flex-col">
    <div class="px-5 py-4 border-b border-border">
      <h1 class="text-base font-semibold text-gray-900">Text to Video</h1>
    </div>

    <div class="flex-1 px-5 py-4 space-y-5 overflow-y-auto">

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
              @if (selectedModel()?.hasAudio) {
                <span class="px-1.5 py-0.5 text-[10px] font-bold rounded flex-shrink-0 bg-green-100 text-green-700">🔊 Audio</span>
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
                      @if (m.hasAudio) {
                        <span class="px-1.5 py-0.5 text-[10px] font-bold rounded bg-green-100 text-green-700">🔊 Audio</span>
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
          spellcheck="true"
          placeholder="Describe your video scene in detail..." maxlength="2500"></textarea>
        <p class="text-right text-xs text-gray-400 mt-1">{{ prompt.length }}/2500</p>
      </div>

      <!-- Aspect Ratio -->
      <div>
        <label class="form-label">Aspect Ratio</label>
        <div class="flex gap-2">
          @for (ar of selectedModel()?.aspectRatios ?? []; track ar.value) {
            <button type="button"
                    class="flex-1 flex flex-col items-center gap-1 py-2 px-1.5 rounded-lg border transition-colors"
                    [class.border-accent]="aspectRatio === ar.value"
                    [class.bg-accent-light]="aspectRatio === ar.value"
                    [class.border-border]="aspectRatio !== ar.value"
                    [class.bg-white]="aspectRatio !== ar.value"
                    (click)="aspectRatio = ar.value">
              <!-- Proportional rectangle preview -->
              <div class="flex items-center justify-center" style="width:24px;height:24px">
                <div class="rounded border transition-colors"
                     [class.border-accent]="aspectRatio === ar.value"
                     [class.border-gray-400]="aspectRatio !== ar.value"
                     [style.width.px]="ar.w"
                     [style.height.px]="ar.h"></div>
              </div>
              <span class="text-[10px] font-medium leading-none"
                    [class.text-accent]="aspectRatio === ar.value"
                    [class.text-gray-500]="aspectRatio !== ar.value">{{ ar.value }}</span>
            </button>
          }
        </div>
      </div>

      <!-- Duration -->
      <div>
        <label class="form-label">Duration</label>
        <div class="flex gap-2">
          @for (d of selectedModel()?.durations ?? [5, 10]; track d) {
            <button type="button"
                    class="flex-1 py-2 text-sm font-medium rounded-lg border transition-colors"
                    [class.border-accent]="duration() === d"
                    [class.bg-accent-light]="duration() === d"
                    [class.text-accent]="duration() === d"
                    [class.border-border]="duration() !== d"
                    [class.text-gray-600]="duration() !== d"
                    (click)="duration.set(d)">
              {{ d }}s
            </button>
          }
        </div>
      </div>

      <!-- Resolution (Kling only) -->
      @if (selectedModel()?.supportsResolution) {
        <div>
          <label class="form-label">Resolution</label>
          <div class="flex gap-2">
            @for (r of ['720p', '1080p']; track r) {
              <button type="button"
                      class="flex-1 py-2 text-sm font-medium rounded-lg border transition-colors"
                      [class.border-accent]="resolution() === r"
                      [class.bg-accent-light]="resolution() === r"
                      [class.text-accent]="resolution() === r"
                      [class.border-border]="resolution() !== r"
                      [class.text-gray-600]="resolution() !== r"
                      (click)="resolution.set(r)">
                {{ r.toUpperCase() }}
                @if (r === '1080p') { <span class="ml-1 text-[10px] text-gray-400">+credits</span> }
              </button>
            }
          </div>
        </div>
      }

      <!-- Multi-Shot toggle (Kling v3 only) -->
      @if (selectedModel()?.supportsMultiShot) {
        <div class="flex items-start justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
          <div>
            <p class="text-sm font-medium text-gray-700">Multi-Shot</p>
            <p class="text-xs text-gray-400 mt-0.5">Generate cinematic multi-scene video sequences</p>
          </div>
          <button type="button" (click)="multiShot.update(v => !v)"
                  class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 mt-0.5"
                  [class.bg-accent]="multiShot()"
                  [class.bg-gray-300]="!multiShot()">
            <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                  [class.translate-x-6]="multiShot()"
                  [class.translate-x-1]="!multiShot()"></span>
          </button>
        </div>
      }

      <!-- Audio included badge (Veo 3 only) -->
      @if (selectedModel()?.hasAudio) {
        <div class="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
          <span class="text-xl">🔊</span>
          <div>
            <p class="text-sm font-medium text-green-800">Audio included</p>
            <p class="text-xs text-green-600">Veo 3 automatically generates synchronized music & sound effects</p>
          </div>
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
      <h2 class="text-sm font-medium text-gray-600">Video Output</h2>
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
          <p class="text-sm font-medium text-accent">Processing your video...</p>
          <p class="text-xs text-accent/70">This usually takes 1–3 minutes. You can navigate away — results will be in My Jobs.</p>
        </div>
      </div>
    }
    <div class="h-[55vw] sm:h-[420px] lg:h-auto lg:flex-1 lg:min-h-0 card overflow-hidden"><app-media-preview [url]="outputUrl()" product="TextToVideo"/></div>
  </div>
</div>
  `
})
export class TextToVideoComponent implements OnInit, OnDestroy {
  private gen = inject(GenerationService);
  private credits = inject(CreditsService);
  private auth = inject(AuthService);
  private loginModal = inject(LoginModalService);
  private signalR = inject(SignalRService);
  private route = inject(ActivatedRoute);

  models: VideoModel[] = [
    {
      id: 'fal-ai/kling-video/v3/pro/text-to-video',
      name: 'Kling v3 Pro',
      description: 'Longer, consistent, cinematic AI video generation.',
      creditsPerSec: 18,
      badge: 'HOT',
      badgeColor: '#EF4444',
      tags: ['Multi-Shot', 'Cinematic'],
      durations: [5, 10],
      aspectRatios: [
        { value: '16:9', w: 22, h: 13 },
        { value: '9:16', w: 13, h: 22 },
        { value: '1:1',  w: 18, h: 18 },
      ],
      supportsResolution: false,
      supportsMultiShot: true,
      hasAudio: false,
    },
    {
      id: 'fal-ai/veo3',
      name: 'Google Veo 3',
      description: 'Cinematic realism with synchronized audio generation.',
      creditsPerSec: 30,
      tags: ['Ultra Quality'],
      durations: [4, 6, 8],
      aspectRatios: [
        { value: '16:9', w: 22, h: 13 },
        { value: '9:16', w: 13, h: 22 },
      ],
      supportsResolution: true,
      supportsMultiShot: false,
      hasAudio: true,
    },
    {
      id: 'fal-ai/wan/v2.2-a14b/text-to-video',
      name: 'WAN 2.2',
      description: 'Fast open-source model, great for quick previews.',
      creditsPerSec: 5,
      tags: ['Open Source', 'Fast'],
      durations: [5],
      aspectRatios: [
        { value: '16:9', w: 22, h: 13 },
        { value: '9:16', w: 13, h: 22 },
        { value: '1:1',  w: 18, h: 18 },
        { value: '4:3',  w: 20, h: 15 },
      ],
      supportsResolution: false,
      supportsMultiShot: false,
      hasAudio: false,
    },
  ];

  selectedModel = signal<VideoModel | null>(this.models[0]);
  dropdownOpen = signal(false);

  prompt = '';
  aspectRatio = '16:9';
  duration = signal(5);
  resolution = signal<string>('720p');
  multiShot = signal(false);

  generating = signal(false);
  jobStatus = signal<JobStatus | null>(null);
  outputUrl = signal<string | undefined>(undefined);
  errorMsg = signal<string | undefined>(undefined);
  isPublic = signal(true);
  zone = '';

  costEstimate = computed(() => {
    const m = this.selectedModel();
    if (!m) return 0;
    const resMultiplier = m.supportsResolution && this.resolution() === '1080p' ? 1.5 : 1;
    return Math.ceil(m.creditsPerSec * this.duration() * resMultiplier);
  });

  private currentJobId: string | null = null;
  private pollInterval?: ReturnType<typeof setInterval>;

  ngOnInit() {
    document.addEventListener('click', this.onDocumentClick);
    const qp = this.route.snapshot.queryParams;
    if (qp['prompt']) this.prompt = qp['prompt'];
    if (qp['model']) {
      const m = this.models.find(x => x.id === qp['model']);
      if (m) this.selectModel(m);
    }
  }

  private onDocumentClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.relative')) this.dropdownOpen.set(false);
  };

  selectModel(m: VideoModel) {
    this.selectedModel.set(m);
    this.dropdownOpen.set(false);
    this.duration.set(m.durations[0]);
    // Reset aspect ratio to first valid option for this model
    this.aspectRatio = m.aspectRatios[0]?.value ?? '16:9';
    if (!m.supportsResolution) this.resolution.set('720p');
    if (!m.supportsMultiShot) this.multiShot.set(false);
  }

  setDuration(d: number) { this.duration.set(d); }

  generate() {
    if (!this.auth.isLoggedIn()) { this.loginModal.show(); return; }
    if (!this.prompt.trim() || this.generating() || !this.selectedModel()) return;
    this.generating.set(true);
    this.jobStatus.set('Queued');
    this.outputUrl.set(undefined);
    this.errorMsg.set(undefined);
    const m = this.selectedModel()!;
    this.gen.generateTextToVideo({
      prompt: this.prompt,
      modelId: m.id,
      durationSeconds: this.duration(),
      aspectRatio: this.aspectRatio,
      resolution: m.supportsResolution ? this.resolution() : undefined,
      multiShot: m.supportsMultiShot ? this.multiShot() : undefined,
      isPublic: this.isPublic(), zone: this.zone || undefined
    }).subscribe({
      next: res => { this.currentJobId = res.jobId; this.credits.reserveLocally(res.creditsReserved); this.signalR.trackJob(res.jobId, 'TextToVideo'); this.startFallback(); },
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
