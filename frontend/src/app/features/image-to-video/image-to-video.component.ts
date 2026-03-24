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
import { AspectRatioPickerComponent, type AspectRatio,
         ASPECT_RATIOS_169_916_11, ASPECT_RATIOS_169_916,
         ASPECT_RATIOS_AUTO_169_916 } from '../../shared/components/aspect-ratio-picker/aspect-ratio-picker.component';
import { DurationPickerComponent } from '../../shared/components/duration-picker/duration-picker.component';
import { ModelPickerComponent, type PickerGroup, type PickerModel } from '../../shared/components/model-picker/model-picker.component';

interface VideoModel {
  id: string;
  name: string;
  description: string;
  creditsPerSec: number;
  badge?: string;
  badgeColor?: string;
  tags: string[];
  durations: number[];
  resolutions: string[];
  supportsMultiShot: boolean;
  supportsAudio: boolean;
  hasAudio: boolean;
  aspectRatios: AspectRatio[];
  endFrameRequired?: boolean;  // needs first_frame_url + last_frame_url (Veo 3.1 Fast)
}

interface ModelGroup {
  id: string;
  name: string;
  tagline: string;
  icon: string;       // letter shown in colored circle
  iconBg: string;     // background color of circle
  tags: string[];     // feature tags shown in group row
  badge?: string;
  badgeColor?: string;
  subModels: VideoModel[];
}

@Component({
  selector: 'app-image-to-video',
  standalone: true,
  imports: [CommonModule, FormsModule, MediaPreviewComponent, JobStatusComponent, AspectRatioPickerComponent, DurationPickerComponent, ModelPickerComponent],
  template: `
<div class="flex flex-col lg:flex-row lg:h-full">
  <!-- Left panel -->
  <div class="w-full lg:w-[420px] lg:flex-shrink-0 border-b lg:border-b-0 lg:border-r border-border bg-white flex flex-col">
    <div class="px-5 py-4 border-b border-border">
      <h1 class="text-base font-semibold text-gray-900">Image to Video</h1>
    </div>

    <div class="flex-1 px-5 py-4 space-y-5 overflow-y-auto">

      <!-- Model dropdown -->
      <app-model-picker
        [groups]="pickerGroups()"
        [selectedId]="selectedModel()?.id ?? null"
        (modelSelect)="onModelSelect($event)" />

      <!-- Image upload -->
      <div>
        <label class="form-label">Upload Image</label>
        <div class="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer
                    hover:border-accent hover:bg-accent-light/30 transition-colors"
             (click)="fileInput.click()"
             (dragover)="$event.preventDefault()"
             (drop)="onDrop($event)">
          @if (previewSrc()) {
            <img [src]="previewSrc()" class="mx-auto max-h-40 rounded object-contain mb-2"/>
            <p class="text-xs text-gray-400">Click to change</p>
          } @else {
            <div class="text-gray-400">
              <div class="text-3xl mb-2">📁</div>
              <p class="text-sm">Click or drag to upload</p>
              <p class="text-xs text-gray-400 mt-1">JPG, PNG, WEBP up to 20MB</p>
            </div>
          }
          <input #fileInput type="file" accept="image/*" class="hidden" (change)="onFile($event)"/>
        </div>
      </div>

      <!-- End Frame (Veo 3.1 Fast only) -->
      @if (selectedModel()?.endFrameRequired) {
        <div>
          <label class="form-label">End Frame <span class="text-red-500">*</span></label>
          <p class="text-xs text-gray-400 mb-2">Upload the last frame — the video will animate between start and end.</p>
          <div class="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer
                      hover:border-accent hover:bg-accent-light/30 transition-colors"
               (click)="endFileInput.click()"
               (dragover)="$event.preventDefault()"
               (drop)="onEndDrop($event)">
            @if (endPreviewSrc()) {
              <img [src]="endPreviewSrc()" class="mx-auto max-h-32 rounded object-contain mb-1"/>
              <p class="text-xs text-gray-400">Click to change</p>
            } @else {
              <div class="text-gray-400">
                <div class="text-2xl mb-1">🎬</div>
                <p class="text-sm">Upload end frame</p>
                <p class="text-xs text-gray-400 mt-0.5">JPG, PNG, WEBP</p>
              </div>
            }
            <input #endFileInput type="file" accept="image/*" class="hidden" (change)="onEndFile($event)"/>
          </div>
        </div>
      }

      <!-- Prompt -->
      <div>
        <label class="form-label">Prompt <span class="text-gray-400 font-normal">(optional)</span></label>
        <textarea class="form-textarea h-24" [(ngModel)]="prompt"
          [spellcheck]="true" lang="en" autocorrect="on" autocapitalize="sentences"
          placeholder="Describe the motion or scene...&#10;Longer, multi-shot prompts work best."
          maxlength="2500"></textarea>
        <p class="text-right text-xs text-gray-400 mt-1">{{ prompt.length }}/2500</p>
      </div>

      <!-- Aspect Ratio -->
      <app-aspect-ratio-picker
        [ratios]="selectedModel()?.aspectRatios ?? []"
        [value]="aspectRatio()"
        (valueChange)="aspectRatio.set($event)" />

      <!-- Duration -->
      <app-duration-picker
        [durations]="selectedModel()?.durations ?? []"
        [value]="duration()"
        (valueChange)="duration.set($event)" />

      <!-- Resolution -->
      @if ((selectedModel()?.resolutions?.length ?? 0) > 0) {
        <div>
          <label class="form-label">Resolution</label>
          <div class="flex gap-2">
            @for (r of selectedModel()!.resolutions; track r) {
              <button type="button"
                      class="flex-1 py-2 text-sm font-medium rounded-lg border transition-colors"
                      [class.border-accent]="resolution() === r"
                      [class.bg-accent-light]="resolution() === r"
                      [class.text-accent]="resolution() === r"
                      [class.border-border]="resolution() !== r"
                      [class.text-gray-600]="resolution() !== r"
                      (click)="resolution.set(r)">
                {{ r.toUpperCase() }}
                @if (r === '1080p' || r === '768P' || r === '4k') {
                  <span class="ml-1 text-[10px] text-gray-400">+credits</span>
                }
              </button>
            }
          </div>
        </div>
      }

      <!-- Multi-Shot toggle -->
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

      <!-- Generate Audio toggle -->
      @if (selectedModel()?.supportsAudio) {
        <div class="flex items-start justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
          <div>
            <p class="text-sm font-medium text-gray-700">Generate Audio</p>
            <p class="text-xs text-gray-400 mt-0.5">Native audio with voice & sound effects</p>
          </div>
          <button type="button" (click)="generateAudio.update(v => !v)"
                  class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 mt-0.5"
                  [class.bg-accent]="generateAudio()"
                  [class.bg-gray-300]="!generateAudio()">
            <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                  [class.translate-x-6]="generateAudio()"
                  [class.translate-x-1]="!generateAudio()"></span>
          </button>
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
              [disabled]="(!imageUrl() && !selectedFile()) || generating() || !selectedModel()">
        @if (generating()) { <span class="animate-spin mr-1">⟳</span> Generating... }
        @else { ✨ Generate }
      </button>
    </div>
  </div>

  <!-- Right panel — output area -->
  <div class="flex-1 p-4 lg:p-6 flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-medium text-gray-600">Video Output</h2>
      <div class="flex items-center gap-3">
        @if (jobStatus()) {
          <app-job-status [status]="jobStatus()!"/>
        }
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

    <!-- Processing status banner -->
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

    <div class="h-[55vw] sm:h-[420px] lg:h-auto lg:flex-1 lg:min-h-0 card overflow-hidden">
      <app-media-preview [url]="outputUrl()" product="ImageToVideo"/>
    </div>
  </div>
</div>
  `
})
export class ImageToVideoComponent implements OnInit, OnDestroy {
  private gen = inject(GenerationService);
  private credits = inject(CreditsService);
  private auth = inject(AuthService);
  private loginModal = inject(LoginModalService);
  private signalR = inject(SignalRService);
  private route = inject(ActivatedRoute);

  modelGroups: ModelGroup[] = [
    {
      id: 'kling',
      name: 'Kling',
      tagline: 'Motion quality leader',
      icon: 'K', iconBg: '#F97316', tags: ['Multi-Shot', 'Audio', 'End Frame'],
      badge: 'HOT',
      badgeColor: '#EF4444',
      subModels: [
        {
          id: 'fal-ai/kling-video/v3/pro/image-to-video',
          name: 'Kling v3 Pro',
          description: 'Multi-shot, audio, end frame, up to 15s.',
          creditsPerSec: 18,
          badge: 'HOT',
          badgeColor: '#EF4444',
          tags: ['Multi-Shot', 'Audio', 'End Frame', 'Up to 15s'],
          durations: [5, 10, 15],
          resolutions: [],
          supportsMultiShot: true,
          supportsAudio: true,
          hasAudio: false,
          aspectRatios: ASPECT_RATIOS_169_916_11,
        },
        {
          id: 'fal-ai/kling-video/o3/standard/image-to-video',
          name: 'Kling o3',
          description: 'New architecture — multi-shot, audio, up to 15s.',
          creditsPerSec: 15,
          badge: 'NEW',
          badgeColor: '#7C3AED',
          tags: ['Multi-Shot', 'Audio', 'End Frame', 'Up to 15s'],
          durations: [5, 10, 15],
          resolutions: [],
          supportsMultiShot: true,
          supportsAudio: true,
          hasAudio: false,
          aspectRatios: ASPECT_RATIOS_169_916_11,
        },
        {
          id: 'fal-ai/kling-video/v2.6/pro/image-to-video',
          name: 'Kling v2.6 Pro',
          description: 'Improved realism with audio and end frame.',
          creditsPerSec: 14,
          tags: ['Audio', 'End Frame'],
          durations: [5, 10],
          resolutions: [],
          supportsMultiShot: false,
          supportsAudio: true,
          hasAudio: false,
          aspectRatios: ASPECT_RATIOS_169_916_11,
        },
        {
          id: 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video',
          name: 'Kling v2.5 Turbo',
          description: 'Fastest Kling with strong visual fidelity.',
          creditsPerSec: 10,
          badge: 'FAST',
          badgeColor: '#2563EB',
          tags: ['Fast', 'End Frame'],
          durations: [5, 10],
          resolutions: [],
          supportsMultiShot: false,
          supportsAudio: false,
          hasAudio: false,
          aspectRatios: ASPECT_RATIOS_169_916_11,
        },
      ],
    },
    {
      id: 'hailuo',
      name: 'Hailuo',
      tagline: 'Character consistency expert',
      icon: 'H', iconBg: '#10B981', tags: ['Character AI', 'Pro Quality'],
      badge: 'NEW',
      badgeColor: '#059669',
      subModels: [
        {
          id: 'fal-ai/minimax/hailuo-2.3/pro/image-to-video',
          name: 'Hailuo 2.3 Pro',
          description: 'Latest MiniMax Pro — highest quality character consistency.',
          creditsPerSec: 20,
          badge: 'NEW',
          badgeColor: '#059669',
          tags: ['Pro', 'Character Consistency'],
          durations: [],
          resolutions: [],
          supportsMultiShot: false,
          supportsAudio: false,
          hasAudio: false,
          aspectRatios: [],
        },
        {
          id: 'fal-ai/minimax/hailuo-02/standard/image-to-video',
          name: 'Hailuo 2.0',
          description: 'Dual-resolution image-to-video with end frame.',
          creditsPerSec: 9,
          tags: ['End Frame', '512P / 768P'],
          durations: [6, 10],
          resolutions: ['512P', '768P'],
          supportsMultiShot: false,
          supportsAudio: false,
          hasAudio: false,
          aspectRatios: [],
        },
      ],
    },
    {
      id: 'veo',
      name: 'Google Veo',
      tagline: 'Cinematic realism with audio',
      icon: 'G', iconBg: '#4285F4', tags: ['Audio', 'Ultra Quality', '4K'],
      subModels: [
        {
          id: 'fal-ai/veo3.1/image-to-video',
          name: 'Veo 3.1',
          description: 'Latest Google Veo — audio + up to 4K resolution.',
          creditsPerSec: 35,
          badge: 'NEW',
          badgeColor: '#1a73e8',
          tags: ['Audio', 'Up to 4K'],
          durations: [4, 6, 8],
          resolutions: ['720p', '1080p', '4k'],
          supportsMultiShot: false,
          supportsAudio: true,
          hasAudio: false,
          aspectRatios: ASPECT_RATIOS_AUTO_169_916,
        },
        {
          id: 'fal-ai/veo3.1/fast/first-last-frame-to-video',
          name: 'Veo 3.1 Fast',
          description: 'Animate between a first & last frame with audio.',
          creditsPerSec: 20,
          badge: 'FAST',
          badgeColor: '#2563EB',
          tags: ['First+Last Frame', 'Audio', 'Up to 4K'],
          durations: [4, 6, 8],
          resolutions: ['720p', '1080p', '4k'],
          supportsMultiShot: false,
          supportsAudio: true,
          hasAudio: false,
          aspectRatios: ASPECT_RATIOS_AUTO_169_916,
          endFrameRequired: true,
        },
        {
          id: 'fal-ai/veo3/fast',
          name: 'Veo 3 Fast',
          description: 'Speed-optimised Veo 3 with audio — lower cost.',
          creditsPerSec: 20,
          badge: 'FAST',
          badgeColor: '#2563EB',
          tags: ['Audio', 'Fast', '720p / 1080p'],
          durations: [4, 6, 8],
          resolutions: ['720p', '1080p'],
          supportsMultiShot: false,
          supportsAudio: true,
          hasAudio: false,
          aspectRatios: ASPECT_RATIOS_AUTO_169_916,
        },
        {
          id: 'fal-ai/veo3/image-to-video',
          name: 'Veo 3',
          description: 'Cinematic realism with synchronized audio.',
          creditsPerSec: 30,
          tags: ['Audio', '720p / 1080p'],
          durations: [4, 6, 8],
          resolutions: ['720p', '1080p'],
          supportsMultiShot: false,
          supportsAudio: true,
          hasAudio: false,
          aspectRatios: ASPECT_RATIOS_AUTO_169_916,
        },
      ],
    },
    {
      id: 'wan',
      name: 'WAN',
      tagline: 'Fast open-source generation',
      icon: 'W', iconBg: '#8B5CF6', tags: ['Open Source', 'Fast'],
      subModels: [
        {
          id: 'fal-ai/wan/v2.2-a14b/image-to-video',
          name: 'WAN 2.2',
          description: 'Fast open-source model, great for quick previews.',
          creditsPerSec: 5,
          tags: ['Open Source', 'Fast'],
          durations: [5],
          resolutions: [],
          supportsMultiShot: false,
          supportsAudio: false,
          hasAudio: false,
          aspectRatios: ASPECT_RATIOS_169_916_11,
        },
      ],
    },
  ];

  get allModels(): VideoModel[] {
    return this.modelGroups.flatMap(g => g.subModels);
  }

  pickerGroups = computed<PickerGroup[]>(() =>
    this.modelGroups.map(g => ({
      id: g.id,
      name: g.name,
      tagline: g.tagline,
      icon: g.icon,
      iconBg: g.iconBg,
      groupTags: g.tags,
      badge: g.badge,
      badgeColor: g.badgeColor,
      models: g.subModels.map(m => ({
        id: m.id,
        name: m.name,
        description: m.description,
        creditsDisplay: `${m.creditsPerSec} cr/s`,
        badge: m.badge,
        badgeColor: m.badgeColor,
        tags: m.tags,
        audioBadge: m.supportsAudio || m.hasAudio,
      } satisfies PickerModel)),
    } satisfies PickerGroup))
  );

  selectedModel = signal<VideoModel | null>(this.modelGroups[0].subModels[0]);

  imageUrl = signal<string>('');
  previewSrc = signal<string>('');
  // End frame (for Veo 3.1 Fast)
  endImageUrl = signal<string>('');
  endPreviewSrc = signal<string>('');
  selectedEndFile = signal<File | null>(null);

  prompt = '';
  duration = signal(5);
  resolution = signal<string>('720p');
  multiShot = signal(false);
  generateAudio = signal(true);
  aspectRatio = signal('16:9');

  generating = signal(false);
  jobStatus = signal<JobStatus | null>(null);
  outputUrl = signal<string | undefined>(undefined);
  errorMsg = signal<string | undefined>(undefined);
  selectedFile = signal<File | null>(null);
  isPublic = signal(true);
  zone = '';

  costEstimate = computed(() => {
    const m = this.selectedModel();
    if (!m) return 0;
    const dur = m.durations.length > 0 ? this.duration() : 6;
    const res = this.resolution();
    const resMultiplier = m.resolutions.length > 0
      ? (res === '4k' ? 2 : (res === '1080p' || res === '768P') ? 1.5 : 1)
      : 1;
    return Math.ceil(m.creditsPerSec * dur * resMultiplier);
  });

  private currentJobId: string | null = null;
  private pollInterval?: ReturnType<typeof setInterval>;

  ngOnInit() {
    const qp = this.route.snapshot.queryParams;
    if (qp['prompt']) this.prompt = qp['prompt'];
    if (qp['model']) {
      const m = this.allModels.find(x => x.id === qp['model']);
      if (m) this.selectModel(m);
    }
  }

  onModelSelect(id: string) {
    const m = this.allModels.find(x => x.id === id);
    if (m) this.selectModel(m);
  }

  selectModel(m: VideoModel) {
    this.selectedModel.set(m);
    this.duration.set(m.durations[0] ?? 6);
    this.resolution.set(m.resolutions[0] ?? '720p');
    if (!m.supportsMultiShot) this.multiShot.set(false);
    if (!m.supportsAudio) this.generateAudio.set(true);
    this.aspectRatio.set(m.aspectRatios[0]?.value ?? '16:9');
    if (!m.endFrameRequired) {
      this.endImageUrl.set('');
      this.endPreviewSrc.set('');
      this.selectedEndFile.set(null);
    }
  }

  setDuration(d: number) {
    this.duration.set(d);
  }

  onFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.loadFile(file);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) this.loadFile(file);
  }

  private loadFile(file: File) {
    this.selectedFile.set(file);
    const reader = new FileReader();
    reader.onload = e => this.previewSrc.set(e.target?.result as string);
    reader.readAsDataURL(file);
    this.imageUrl.set('');
  }

  onEndFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.loadEndFile(file);
  }

  onEndDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) this.loadEndFile(file);
  }

  private loadEndFile(file: File) {
    this.selectedEndFile.set(file);
    const reader = new FileReader();
    reader.onload = e => this.endPreviewSrc.set(e.target?.result as string);
    reader.readAsDataURL(file);
    this.endImageUrl.set('');
  }

  generate() {
    if (!this.auth.isLoggedIn()) { this.loginModal.show(); return; }
    if ((!this.imageUrl() && !this.selectedFile()) || this.generating() || !this.selectedModel()) return;
    const m = this.selectedModel()!;
    if (m.endFrameRequired && !this.endImageUrl() && !this.selectedEndFile()) {
      this.errorMsg.set('Please upload an end frame image for this model.');
      return;
    }

    this.generating.set(true);
    this.jobStatus.set('Queued');
    this.outputUrl.set(undefined);
    this.errorMsg.set(undefined);

    const submitWithUrls = (imageUrl: string, endImageUrl?: string) => {
      this.gen.generateImageToVideo({
        imageUrl,
        endImageUrl: m.endFrameRequired ? endImageUrl : undefined,
        modelId: m.id,
        prompt: this.prompt || undefined,
        durationSeconds: m.durations.length > 0 ? this.duration() : 6,
        resolution: m.resolutions.length > 0 ? this.resolution() : undefined,
        multiShot: m.supportsMultiShot ? this.multiShot() : undefined,
        generateAudio: m.supportsAudio ? this.generateAudio() : undefined,
        aspectRatio: m.aspectRatios.length ? this.aspectRatio() : undefined,
        isPublic: this.isPublic(),
        zone: this.zone || undefined,
      }).subscribe({
        next: res => {
          this.currentJobId = res.jobId;
          this.credits.reserveLocally(res.creditsReserved);
          this.signalR.trackJob(res.jobId, 'ImageToVideo');
          this.startFallback();
        },
        error: err => {
          this.generating.set(false);
          this.jobStatus.set('Failed');
          this.errorMsg.set(err.error?.error ?? err.error?.detail ?? 'Generation failed.');
        }
      });
    };

    const submitWithMainImage = (imageUrl: string) => {
      if (m.endFrameRequired && this.selectedEndFile()) {
        this.gen.uploadFile(this.selectedEndFile()!).subscribe({
          next: res => submitWithUrls(imageUrl, res.url),
          error: err => {
            this.generating.set(false);
            this.jobStatus.set('Failed');
            this.errorMsg.set(err.error?.error ?? 'End frame upload failed.');
          }
        });
      } else {
        submitWithUrls(imageUrl, this.endImageUrl() || undefined);
      }
    };

    if (this.selectedFile()) {
      this.gen.uploadFile(this.selectedFile()!).subscribe({
        next: res => { this.imageUrl.set(res.url); submitWithMainImage(res.url); },
        error: err => {
          this.generating.set(false);
          this.jobStatus.set('Failed');
          this.errorMsg.set(err.error?.error ?? 'Upload failed.');
        }
      });
    } else {
      submitWithMainImage(this.imageUrl());
    }
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
    this.jobStatus.set(status);
    this.generating.set(false);
    if (status === 'Completed') {
      this.outputUrl.set(url);
      this.credits.loadBalance().subscribe();
    } else {
      this.errorMsg.set(err ?? 'Generation failed.');
      this.credits.loadBalance().subscribe();
    }
  }

  ngOnDestroy() {
    clearInterval(this.pollInterval);
  }
}
