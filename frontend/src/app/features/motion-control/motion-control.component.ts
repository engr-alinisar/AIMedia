import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { GenerationService } from '../../core/services/generation.service';
import { CreditsService } from '../../core/services/credits.service';
import { SignalRService } from '../../core/services/signalr.service';
import { AuthService } from '../../core/auth/auth.service';
import { LoginModalService } from '../../core/services/login-modal.service';
import { ModelCatalogService } from '../../core/services/model-catalog.service';
import { JobStatusComponent } from '../../shared/components/job-status/job-status.component';
import { ModelPickerComponent, type PickerGroup, type PickerModel } from '../../shared/components/model-picker/model-picker.component';
import { AdvancedOptionsPanelComponent } from '../../shared/components/advanced-options-panel/advanced-options-panel.component';
import { type JobStatus } from '../../core/models/models';

type CharacterOrientation = 'image' | 'video';

interface MotionControlModel {
  id: string;
  name: string;
  description: string;
  creditsPerSecond: number;
  badge?: string;
  badgeColor?: string;
  tags: string[];
  supportsElementBinding: boolean;
}

@Component({
  selector: 'app-motion-control',
  standalone: true,
  imports: [CommonModule, FormsModule, JobStatusComponent, ModelPickerComponent, AdvancedOptionsPanelComponent],
  template: `
<div class="flex flex-col lg:flex-row lg:h-full">
  <div class="w-full lg:w-[440px] lg:flex-shrink-0 border-b lg:border-b-0 lg:border-r border-border bg-white flex flex-col">
    <div class="px-5 py-4 border-b border-border">
      <h1 class="text-base font-semibold text-gray-900">Motion Control</h1>
    </div>

    <div class="flex-1 overflow-y-auto px-5 py-4 space-y-5">
      <app-model-picker
        [groups]="pickerGroups()"
        [selectedId]="selectedModel()?.id ?? null"
        (modelSelect)="onModelSelect($event)" />

      <div>
        <label class="form-label">Reference Image <span class="text-red-500">*</span></label>
        <div class="border-2 border-dashed border-border rounded-xl p-5 text-center cursor-pointer hover:border-accent hover:bg-accent-light/30 transition-colors"
             (click)="imageInput.click()"
             (dragover)="$event.preventDefault()"
             (drop)="onImageDrop($event)">
          @if (imagePreview()) {
            <img [src]="imagePreview()" class="mx-auto max-h-40 rounded-lg object-contain mb-2" />
            <p class="text-xs text-gray-400">Click to change</p>
          } @else {
            <div class="text-gray-400">
              <svg class="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              <p class="text-sm font-medium text-gray-600">Upload reference image</p>
              <p class="text-xs text-gray-400 mt-1">Character and visual appearance come from this image</p>
            </div>
          }
          <input #imageInput type="file" accept="image/*" class="hidden" (change)="onImageFile($event)" />
        </div>
      </div>

      <div>
        <label class="form-label">Reference Video <span class="text-red-500">*</span></label>
        <div class="border-2 border-dashed border-border rounded-xl p-5 text-center cursor-pointer hover:border-accent hover:bg-accent-light/30 transition-colors"
             (click)="videoInput.click()"
             (dragover)="$event.preventDefault()"
             (drop)="onVideoDrop($event)">
          @if (videoPreview()) {
            <video [src]="videoPreview()" class="mx-auto max-h-40 rounded-lg object-contain mb-2" controls muted preload="metadata"></video>
            <p class="text-xs text-gray-400">Click to change</p>
          } @else {
            <div class="text-gray-400">
              <div class="text-3xl mb-2">🎬</div>
              <p class="text-sm font-medium text-gray-600">Upload reference video</p>
              <p class="text-xs text-gray-400 mt-1">Motion and gestures are copied from this video</p>
            </div>
          }
          <input #videoInput type="file" accept="video/mp4,video/webm" class="hidden" (change)="onVideoFile($event)" />
        </div>
        @if (videoDurationLabel()) {
          <p class="text-xs text-gray-400 mt-1">Detected duration: {{ videoDurationLabel() }}</p>
        }
      </div>

      <div>
        <label class="form-label">Prompt <span class="text-red-500">*</span></label>
        <textarea class="form-textarea h-24" [ngModel]="prompt()" (ngModelChange)="prompt.set($event)"
                  maxlength="1500"
                  placeholder="Describe the motion transfer result you want, for example: A woman dancing on stage with cinematic lighting."></textarea>
        <p class="text-right text-xs text-gray-400 mt-1">{{ prompt().length }}/1500</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="p-3 bg-gray-50 rounded-xl border border-gray-200">
          <label class="form-label">Character Orientation</label>
          <div class="flex gap-2">
            @for (opt of orientationOptions; track opt.value) {
              <button type="button"
                      (click)="setOrientation(opt.value)"
                      class="flex-1 py-2 text-sm font-medium rounded-lg border transition-colors"
                      [class.border-accent]="characterOrientation() === opt.value"
                      [class.bg-accent-light]="characterOrientation() === opt.value"
                      [class.text-accent]="characterOrientation() === opt.value"
                      [class.border-border]="characterOrientation() !== opt.value"
                      [class.text-gray-600]="characterOrientation() !== opt.value">
                {{ opt.label }}
              </button>
            }
          </div>
          <p class="text-xs text-gray-400 mt-2">
            Max {{ maxAllowedDuration() }}s reference video in this mode.
          </p>
        </div>

        <div class="flex items-start justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
          <div>
            <p class="text-sm font-medium text-gray-700">Keep Original Sound</p>
            <p class="text-xs text-gray-400 mt-0.5">Preserve the source video's audio in the result</p>
          </div>
          <button type="button" (click)="keepOriginalSound.update(v => !v)"
                  class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 mt-0.5"
                  [class.bg-accent]="keepOriginalSound()"
                  [class.bg-gray-300]="!keepOriginalSound()">
            <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                  [class.translate-x-6]="keepOriginalSound()"
                  [class.translate-x-1]="!keepOriginalSound()"></span>
          </button>
        </div>
      </div>

      @if (selectedModel()?.supportsElementBinding) {
        <app-advanced-options-panel
          subtitle="V3 Pro motion-control settings"
          [open]="showAdvanced()"
          (openChange)="showAdvanced.set($event)">
              <div class="mb-3">
                <label class="form-label">Facial Consistency Element <span class="text-gray-400 font-normal">(optional)</span></label>
                @if (characterOrientation() !== 'video') {
                  <div class="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                    Element binding is only available when Character Orientation is set to <strong>Video</strong>.
                  </div>
                } @else {
                  <div class="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-accent hover:bg-accent-light/30 transition-colors"
                       (click)="elementInput.click()">
                    @if (elementPreview()) {
                      <img [src]="elementPreview()" class="mx-auto max-h-28 rounded-lg object-contain mb-2" />
                      <p class="text-xs text-gray-400">Click to change</p>
                    } @else {
                      <div class="text-gray-400">
                        <div class="text-2xl mb-2">🙂</div>
                        <p class="text-sm font-medium text-gray-600">Upload facial element</p>
                        <p class="text-xs text-gray-400 mt-1">Improves identity preservation across the video</p>
                      </div>
                    }
                    <input #elementInput type="file" accept="image/*" class="hidden" (change)="onElementFile($event)" />
                  </div>
                }
              </div>
        </app-advanced-options-panel>
      }

      @if (errorMsg()) {
        <div class="p-3 bg-red-50 border border-red-300 rounded-lg text-sm text-red-700">{{ errorMsg() }}</div>
      }
    </div>

    <div class="px-5 py-4 border-t border-border space-y-3">
      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-500">Cost estimate</span>
        <div class="text-right">
          <div class="font-semibold text-gray-900">
            <span class="text-accent">{{ estimatedCredits() }}</span>
            {{ videoDurationSeconds() ? 'credits total' : 'credits / sec' }}
          </div>
          <div class="text-xs text-gray-400">
            {{ selectedModel()?.creditsPerSecond ?? 0 }} credits / sec
            @if (videoDurationLabel()) { <span> • {{ videoDurationLabel() }}</span> }
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
        <div>
          <p class="text-sm font-medium text-gray-700">Public visibility</p>
          <p class="text-xs text-gray-400">Show on the Explore page</p>
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
        <select [(ngModel)]="zone"
                class="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent">
          <option value="">Zone (optional)</option>
          <option value="Cinematic">🎬 Cinematic</option>
          <option value="Character">🧑 Character</option>
          <option value="Viral">🔥 Viral</option>
          <option value="Dramatic">🎭 Dramatic</option>
          <option value="Cool">😎 Cool</option>
          <option value="Playful">🎮 Playful</option>
          <option value="Fantasy">🧙 Fantasy</option>
        </select>
      }

      <button class="btn-primary w-full" (click)="generate()"
              [disabled]="!canGenerate() || generating()">
        @if (generating()) { <span class="animate-spin mr-1">⟳</span> Generating... }
        @else { ✨ Generate }
      </button>
    </div>
  </div>

  <div class="flex-1 p-4 lg:p-6 flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-medium text-gray-600">Output</h2>
      @if (jobStatus()) { <app-job-status [status]="jobStatus()!"/> }
    </div>

    @if (generating() && !outputUrl()) {
      <div class="flex items-center gap-3 px-4 py-3 bg-accent-light border border-accent/20 rounded-xl">
        <svg class="w-5 h-5 text-accent animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <div>
          <p class="text-sm font-medium text-accent">Generating your motion-controlled video...</p>
          <p class="text-xs text-accent/70">You can leave this page and check the result later in <a href="/jobs" class="underline">My Jobs</a>.</p>
        </div>
      </div>
    }

    @if (outputUrl()) {
      <div class="card p-4">
        <video [src]="outputUrl()!" controls class="w-full rounded-xl bg-black max-h-[520px]"></video>
      </div>
    } @else if (!generating()) {
      <div class="flex-1 card flex items-center justify-center text-gray-400 min-h-[320px]">
        <div class="text-center">
          <div class="text-4xl mb-2">🎞️</div>
          <p class="text-sm">Your motion-controlled video will appear here</p>
        </div>
      </div>
    }
  </div>
</div>
  `
})
export class MotionControlComponent implements OnInit, OnDestroy {
  private gen = inject(GenerationService);
  private credits = inject(CreditsService);
  private signalR = inject(SignalRService);
  private auth = inject(AuthService);
  private loginModal = inject(LoginModalService);
  private modelCatalog = inject(ModelCatalogService);
  private route = inject(ActivatedRoute);

  catalog = this.modelCatalog.catalog;
  pricingById = computed(() => new Map(this.catalog().map(item => [item.id, item.displayPrice])));

  readonly orientationOptions: { value: CharacterOrientation; label: string }[] = [
    { value: 'video', label: 'Video' },
    { value: 'image', label: 'Image' }
  ];

  models: MotionControlModel[] = [
    {
      id: 'fal-ai/kling-video/v2.6/standard/motion-control',
      name: 'Kling v2.6 Motion Control',
      description: 'Cost-effective motion transfer from a reference video onto a reference image.',
      creditsPerSecond: 11,
      tags: ['Reference Image', 'Reference Video', 'Up to 30s'],
      supportsElementBinding: false
    },
    {
      id: 'fal-ai/kling-video/v3/pro/motion-control',
      name: 'Kling v3 Pro Motion Control',
      description: 'Higher-quality motion transfer with optional facial consistency element binding.',
      creditsPerSecond: 25,
      badge: 'PRO',
      badgeColor: '#7C3AED',
      tags: ['Higher Quality', 'Element Binding', 'Up to 30s'],
      supportsElementBinding: true
    }
  ];

  pickerGroups = computed<PickerGroup[]>(() => [{
    id: 'kling-motion',
    name: 'Kling Motion Control',
    tagline: 'Reference-driven character motion',
    icon: 'K',
    iconBg: '#111827',
    iconUrl: '/assets/icons/kling.png',
    groupTags: ['Video AI', 'Reference-driven'],
    models: this.models.map(model => ({
      id: model.id,
      name: model.name,
      description: model.description,
      creditsDisplay: this.pricingById().get(model.id) ?? `${model.creditsPerSecond} cr/s`,
      badge: model.badge,
      badgeColor: model.badgeColor,
      tags: model.tags
    } satisfies PickerModel))
  }]);

  selectedModel = signal<MotionControlModel | null>(this.models[0]);
  prompt = signal('');
  keepOriginalSound = signal(true);
  characterOrientation = signal<CharacterOrientation>('video');
  showAdvanced = signal(false);

  imageFile = signal<File | null>(null);
  imagePreview = signal('');
  videoFile = signal<File | null>(null);
  videoPreview = signal('');
  elementFile = signal<File | null>(null);
  elementPreview = signal('');

  videoDurationSeconds = signal<number | null>(null);

  isPublic = signal(true);
  zone = '';

  generating = signal(false);
  jobStatus = signal<JobStatus | null>(null);
  outputUrl = signal<string | undefined>(undefined);
  errorMsg = signal<string | undefined>(undefined);

  estimatedCredits = computed(() => {
    const model = this.selectedModel();
    const duration = this.videoDurationSeconds();
    if (!model) return 0;
    return duration ? model.creditsPerSecond * duration : model.creditsPerSecond;
  });

  maxAllowedDuration = computed(() => this.characterOrientation() === 'image' ? 10 : 30);
  videoDurationLabel = computed(() => {
    const duration = this.videoDurationSeconds();
    if (!duration) return '';
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  });

  canGenerate = computed(() =>
    !!this.selectedModel() &&
    !!this.imageFile() &&
    !!this.videoFile() &&
    !!this.prompt().trim() &&
    !!this.videoDurationSeconds() &&
    this.videoDurationSeconds()! <= this.maxAllowedDuration() &&
    (!this.selectedModel()?.supportsElementBinding || this.characterOrientation() === 'video' || !this.elementFile())
  );

  private currentJobId: string | null = null;
  private pollInterval?: ReturnType<typeof setInterval>;

  ngOnInit() {
    this.modelCatalog.loadAll();
    const qp = this.route.snapshot.queryParams;
    if (qp['model']) {
      const match = this.models.find(m => m.id === qp['model']);
      if (match) this.selectModel(match);
    }
  }

  onModelSelect(id: string) {
    const match = this.models.find(model => model.id === id);
    if (match) this.selectModel(match);
  }

  selectModel(model: MotionControlModel) {
    this.selectedModel.set(model);
    this.showAdvanced.set(false);
    if (!model.supportsElementBinding) {
      this.elementFile.set(null);
      this.elementPreview.set('');
    }
  }

  setOrientation(value: CharacterOrientation) {
    this.characterOrientation.set(value);
    if (value !== 'video') {
      this.elementFile.set(null);
      this.elementPreview.set('');
    }

    const duration = this.videoDurationSeconds();
    if (duration && duration > this.maxAllowedDuration()) {
      this.errorMsg.set(`This orientation supports a maximum ${this.maxAllowedDuration()}s reference video.`);
    } else if (this.errorMsg()?.includes('maximum')) {
      this.errorMsg.set(undefined);
    }
  }

  onImageFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.loadImageFile(file);
  }

  onImageDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) this.loadImageFile(file);
  }

  onVideoFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) void this.loadVideoFile(file);
  }

  onVideoDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) void this.loadVideoFile(file);
  }

  onElementFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.elementFile.set(file);
    this.loadPreview(file, this.elementPreview);
  }

  generate() {
    if (!this.auth.isLoggedIn()) { this.loginModal.show(); return; }
    if (!this.canGenerate() || this.generating()) return;

    const durationSeconds = this.videoDurationSeconds()!;
    if (durationSeconds > this.maxAllowedDuration()) {
      this.errorMsg.set(`This orientation supports a maximum ${this.maxAllowedDuration()}s reference video.`);
      return;
    }

    this.generating.set(true);
    this.jobStatus.set('Queued');
    this.outputUrl.set(undefined);
    this.errorMsg.set(undefined);

    this.gen.uploadFile(this.imageFile()!).subscribe({
      next: imageRes => {
        this.gen.uploadVideo(this.videoFile()!).subscribe({
          next: videoRes => {
            this.submitJob(imageRes.url, videoRes.url);
          },
          error: err => this.handleSubmitError(err, 'Reference video upload failed.')
        });
      },
      error: err => this.handleSubmitError(err, 'Reference image upload failed.')
    });
  }

  private submitJob(imageUrl: string, videoUrl: string) {
    const submit = (elementImageUrl?: string) => {
      const model = this.selectedModel()!;
      this.gen.generateMotionControl({
        imageUrl,
        videoUrl,
        prompt: this.prompt().trim(),
        modelId: model.id,
        durationSeconds: this.videoDurationSeconds()!,
        isPublic: this.isPublic(),
        zone: this.zone || undefined,
        keepOriginalSound: this.keepOriginalSound(),
        characterOrientation: this.characterOrientation(),
        elementImageUrl
      }).subscribe({
        next: res => {
          this.currentJobId = res.jobId;
          this.credits.reserveLocally(res.creditsReserved);
          this.signalR.trackJob(res.jobId, 'MotionControl');
          this.startFallback();
        },
        error: err => this.handleSubmitError(err, 'Generation failed.')
      });
    };

    if (this.selectedModel()?.supportsElementBinding && this.characterOrientation() === 'video' && this.elementFile()) {
      this.gen.uploadFile(this.elementFile()!).subscribe({
        next: elementRes => submit(elementRes.url),
        error: err => this.handleSubmitError(err, 'Element upload failed.')
      });
      return;
    }

    submit(undefined);
  }

  private startFallback() {
    this.pollInterval = setInterval(() => {
      const update = this.signalR.latestUpdate();
      if (update?.jobId === this.currentJobId && (update.status === 'Completed' || update.status === 'Failed')) {
        this.apply(update.status as JobStatus, update.outputUrl, update.errorMessage);
        clearInterval(this.pollInterval);
        return;
      }

      if (!this.currentJobId) return;
      this.gen.getJob(this.currentJobId).subscribe({
        next: job => {
          if (job.status === 'Completed' || job.status === 'Failed') {
            this.apply(job.status, job.outputUrl, job.errorMessage);
            clearInterval(this.pollInterval);
          }
        },
        error: () => {}
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

  private handleSubmitError(err: any, fallback: string) {
    this.generating.set(false);
    this.jobStatus.set('Failed');
    this.errorMsg.set(err?.error?.error ?? err?.error?.detail ?? fallback);
  }

  private loadImageFile(file: File) {
    this.imageFile.set(file);
    this.loadPreview(file, this.imagePreview);
  }

  private async loadVideoFile(file: File) {
    this.videoFile.set(file);
    this.videoPreview.set(URL.createObjectURL(file));

    try {
      const duration = await this.readVideoDuration(file);
      const rounded = Math.max(1, Math.round(duration));
      this.videoDurationSeconds.set(rounded);
      if (rounded > this.maxAllowedDuration()) {
        this.errorMsg.set(`This orientation supports a maximum ${this.maxAllowedDuration()}s reference video.`);
      } else if (this.errorMsg()?.includes('maximum')) {
        this.errorMsg.set(undefined);
      }
    } catch {
      this.videoDurationSeconds.set(null);
      this.errorMsg.set('Could not read the reference video duration.');
    }
  }

  private loadPreview(file: File, target: { set(value: string): void }) {
    const reader = new FileReader();
    reader.onload = event => target.set(event.target?.result as string);
    reader.readAsDataURL(file);
  }

  private readVideoDuration(file: File): Promise<number> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const objectUrl = URL.createObjectURL(file);
      video.preload = 'metadata';
      video.src = objectUrl;
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(video.duration);
      };
      video.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to read video duration.'));
      };
    });
  }

  ngOnDestroy() {
    clearInterval(this.pollInterval);
    const preview = this.videoPreview();
    if (preview.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }
  }
}

