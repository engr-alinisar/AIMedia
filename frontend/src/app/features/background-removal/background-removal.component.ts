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
import type { JobStatus } from '../../core/models/models';

interface LocalJob {
  id: string;
  status: JobStatus;
  outputUrl: string | null;
  errorMessage: string | null;
  modelName: string;
  creditsReserved: number;
}

type InputMode = 'single';

interface StudioModel {
  id: string;
  name: string;
  description: string;
  credits: number;
  tags: string[];
  inputMode: InputMode;
  hasPrompt?: boolean;
  hasNegativePrompt?: boolean;
  primaryLabel?: string;
  promptPlaceholder?: string;
  exampleBefore?: string;
  exampleAfter?: string;
  examplePrompt?: string;
}

interface StudioCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  models: StudioModel[];
}

const CATEGORIES: StudioCategory[] = [
  {
    id: 'background',
    name: 'Background',
    icon: 'B',
    color: 'bg-blue-100 text-blue-600',
    models: [
      {
        id: 'fal-ai/bria/background/remove',
        name: 'Remove BG - BRIA',
        description: 'Commercial-safe removal, licensed training data only',
        credits: 4,
        tags: ['Commercial', 'Licensed'],
        inputMode: 'single',
        exampleBefore: 'https://pub-4891498b804e4dad84f608251d64b64f.r2.dev/assets/examples/bria-remove-before.jpg',
        exampleAfter: 'https://pub-4891498b804e4dad84f608251d64b64f.r2.dev/assets/examples/bria-remove-after.png'
      },
      {
        id: 'fal-ai/bria/background/replace',
        name: 'Replace BG - BRIA',
        description: 'Swap background via text prompt or reference image',
        credits: 8,
        tags: ['Prompt', 'Reference'],
        inputMode: 'single',
        hasPrompt: true,
        hasNegativePrompt: true,
        promptPlaceholder: 'Describe the new background (e.g. "sunny beach at golden hour")...',
        exampleBefore: 'https://pub-4891498b804e4dad84f608251d64b64f.r2.dev/assets/examples/bria-replace-before.jpg',
        exampleAfter: 'https://pub-4891498b804e4dad84f608251d64b64f.r2.dev/assets/examples/bria-replace-after.jpg',
        examplePrompt: 'Bright sunny beach with waves'
      }
    ]
  }
];

@Component({
  selector: 'app-background-removal',
  standalone: true,
  imports: [CommonModule, FormsModule, MediaPreviewComponent, JobStatusComponent],
  template: `
<div class="flex flex-col lg:flex-row lg:h-full">
  <div class="w-full lg:w-[440px] lg:flex-shrink-0 border-b lg:border-b-0 lg:border-r border-border bg-white flex flex-col">
    <div class="px-5 py-4 border-b border-border">
      <h1 class="text-base font-semibold text-gray-900">Image Studio</h1>
      <p class="text-xs text-gray-400 mt-0.5">Background edits and clean commercial-safe transforms</p>
    </div>

    <div class="flex-1 overflow-y-auto px-5 py-4 space-y-6">
      <div>
        <label class="form-label">{{ selectedModel()?.primaryLabel ?? 'Upload Image' }}</label>
        <div
          class="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-accent hover:bg-accent-light/30 transition-colors"
          (click)="fileInput.click()"
          (dragover)="$event.preventDefault()"
          (drop)="onDrop($event)"
        >
          @if (previewSrc()) {
            <img [src]="previewSrc()!" class="mx-auto max-h-36 rounded object-contain mb-2" alt="Uploaded preview" />
            <p class="text-xs text-gray-500">{{ fileName() }}</p>
          } @else {
            <div class="flex flex-col items-center gap-2 py-3">
              <svg class="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              <div>
                <p class="text-sm font-medium text-gray-700">Click or drag to upload</p>
                <p class="text-xs text-gray-400">PNG, JPG, WebP - max 10 MB</p>
              </div>
            </div>
          }
        </div>
        <input
          #fileInput
          type="file"
          class="hidden"
          accept="image/png,image/jpeg,image/webp,image/jpg"
          (change)="onFileSelected($event)"
        />
      </div>

      @if (selectedCategory()) {
        <div class="space-y-2.5">
          @for (m of selectedCategory()!.models; track m.id) {
            <div
              (click)="selectModel(m)"
              class="border rounded-xl p-3 cursor-pointer transition-all"
              [class.border-accent]="selectedModel()?.id === m.id"
              [class.bg-accent-light]="selectedModel()?.id === m.id"
              [class.border-border]="selectedModel()?.id !== m.id"
              [class.hover:border-accent]="selectedModel()?.id !== m.id"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-gray-900">{{ m.name }}</p>
                  <p class="text-xs text-gray-500 mt-0.5 leading-snug">{{ m.description }}</p>
                  <div class="flex flex-wrap gap-1 mt-1.5">
                    @for (tag of m.tags; track tag) {
                      <span class="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">{{ tag }}</span>
                    }
                  </div>
                </div>
                <div class="text-right flex-shrink-0">
                  <p class="text-sm font-bold text-accent">{{ m.credits }}</p>
                  <p class="text-[10px] text-gray-400">credits</p>
                </div>
              </div>

              @if (selectedModel()?.id === m.id && (m.exampleBefore || m.exampleAfter)) {
                <div class="mt-3 pt-3 border-t border-border/60">
                  <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Example</p>
                  <div class="flex gap-2">
                    @if (m.exampleBefore) {
                      <div class="flex-1 min-w-0">
                        <p class="text-[10px] text-gray-400 mb-1">Before</p>
                        <img [src]="m.exampleBefore" alt="Before example" class="w-full h-24 object-cover rounded-lg" />
                      </div>
                    }
                    @if (m.exampleAfter) {
                      <div class="flex-1 min-w-0">
                        <p class="text-[10px] text-gray-400 mb-1">After</p>
                        <img [src]="m.exampleAfter" alt="After example" class="w-full h-24 object-cover rounded-lg" />
                      </div>
                    }
                  </div>
                  @if (m.examplePrompt) {
                    <p class="mt-1.5 text-[10px] text-gray-400 italic">"{{ m.examplePrompt }}"</p>
                  }
                </div>
              }
            </div>
          }
        </div>
      }

      @if (selectedModel()?.hasPrompt) {
        <div>
          <label class="form-label">Prompt</label>
          <textarea
            class="form-textarea h-24"
            [(ngModel)]="prompt"
            [placeholder]="selectedModel()!.promptPlaceholder ?? 'Describe what you want...'"
            maxlength="1000"
          ></textarea>
        </div>
      }

      @if (selectedModel()?.hasNegativePrompt) {
        <div>
          <label class="form-label">Negative Prompt <span class="text-gray-400">(optional)</span></label>
          <textarea
            class="form-textarea h-20"
            [(ngModel)]="negativePrompt"
            placeholder="What should be avoided in the result?"
            maxlength="1000"
          ></textarea>
        </div>
      }

      @if (errorMsg()) {
        <div class="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {{ errorMsg() }}
        </div>
      }
    </div>

    <div class="px-5 py-4 border-t border-border space-y-3">
      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-500">Cost estimate</span>
        <span class="font-semibold"><span class="text-accent">{{ effectiveCredits() }}</span> credits</span>
      </div>
      <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
        <div>
          <p class="text-sm font-medium text-gray-700">Public visibility</p>
          <p class="text-xs text-gray-400">Show this output on the Explore page</p>
        </div>
        <button
          type="button"
          (click)="isPublic.update(v => !v)"
          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
          [class.bg-accent]="isPublic()"
          [class.bg-gray-300]="!isPublic()"
        >
          <span
            class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
            [class.translate-x-6]="isPublic()"
            [class.translate-x-1]="!isPublic()"
          ></span>
        </button>
      </div>
      @if (isPublic()) {
        <select
          [(ngModel)]="zone"
          class="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
        >
          <option value="">Zone (optional)</option>
          <option value="Cinematic">Cinematic</option>
          <option value="Character">Character</option>
          <option value="Viral">Viral</option>
          <option value="Dramatic">Dramatic</option>
          <option value="Cool">Cool</option>
          <option value="Playful">Playful</option>
          <option value="Fantasy">Fantasy</option>
        </select>
      }
      <button class="btn-primary w-full" (click)="generate()" [disabled]="!canGenerate() || isGenerating()">
        @if (isGenerating()) { Generating... } @else { Generate }
      </button>
    </div>
  </div>

  <div class="flex-1 p-4 lg:p-6 flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-medium text-gray-600">Image Output</h2>
      <div class="flex items-center gap-3">
        @if (currentJob()) {
          <app-job-status [status]="currentJob()!.status" />
        }
        @if (currentJob()?.status === 'Completed' && currentJob()?.outputUrl) {
          <a
            [href]="currentJob()!.outputUrl!"
            download
            target="_blank"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white text-xs font-medium rounded-lg hover:bg-accent/90 transition-colors"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            Download
          </a>
        }
      </div>
    </div>

    @if (isGenerating() && !currentJob()?.outputUrl) {
      <div class="flex items-center gap-3 px-4 py-3 bg-accent-light border border-accent/20 rounded-xl">
        <svg class="w-5 h-5 text-accent animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <div>
          <p class="text-sm font-medium text-accent">Generating your Image Studio result...</p>
          <p class="text-xs text-accent/70">You can leave this page and check the result later in <a href="/jobs" class="underline">My Jobs</a>.</p>
        </div>
      </div>
    }

    @if (currentJob()?.status === 'Failed' && currentJob()?.errorMessage) {
      <div class="p-4 bg-red-50 border border-red-300 rounded-xl text-sm text-red-700">
        {{ currentJob()!.errorMessage }}
      </div>
    }

    <div class="h-[55vw] sm:h-[420px] lg:h-auto lg:flex-1 lg:min-h-0 card overflow-hidden">
      <app-media-preview
        [url]="currentJob()?.status === 'Completed' ? (currentJob()!.outputUrl ?? undefined) : undefined"
        product="BackgroundRemoval"
      />
    </div>
  </div>
</div>
`,
})
export class BackgroundRemovalComponent implements OnInit, OnDestroy {
  private gen = inject(GenerationService);
  private credits = inject(CreditsService);
  private signalR = inject(SignalRService);
  private auth = inject(AuthService);
  private loginModal = inject(LoginModalService);
  private route = inject(ActivatedRoute);

  readonly categories = CATEGORIES;

  selectedModel = signal<StudioModel | null>(CATEGORIES[0].models[0]);
  previewSrc = signal<string | null>(null);
  fileName = signal<string>('');
  isPublic = signal(true);
  isGenerating = signal(false);
  errorMsg = signal<string | null>(null);
  jobs = signal<LocalJob[]>([]);

  prompt = '';
  negativePrompt = '';
  zone = '';

  selectedFile = signal<File | null>(null);
  private pollInterval: any;
  private activeJobIds = new Set<string>();
  private currentJobId = '';

  selectedCategory = computed(() => this.categories[0] ?? null);
  effectiveCredits = computed(() => this.selectedModel()?.credits ?? 0);
  canGenerate = computed(() => !!this.selectedModel() && !!this.selectedFile());
  currentJob = computed(() => this.jobs()[0] ?? null);

  ngOnInit() {
    this.startPolling();
    this.route.queryParams.subscribe(p => {
      if (p['model']) this.selectModelById(p['model']);
      if (p['prompt']) this.prompt = p['prompt'];
      if (p['imageUrl']) {
        this.previewSrc.set(p['imageUrl']);
        this.fileName.set('Explore reference');
      }
      if (p['outputUrl']) {
        const model = this.selectedModel();
        this.jobs.set([{
          id: 'explore-preview',
          status: 'Completed',
          outputUrl: p['outputUrl'],
          errorMessage: null,
          modelName: model?.name ?? 'Image Studio',
          creditsReserved: model?.credits ?? 0
        }]);
      }
    });
  }

  ngOnDestroy() {
    clearInterval(this.pollInterval);
  }

  private startPolling() {
    const inFlight = new Set<string>();
    this.pollInterval = setInterval(() => {
      const update = this.signalR.latestUpdate();
      if (update && this.activeJobIds.has(update.jobId) && (update.status === 'Completed' || update.status === 'Failed')) {
        this.applyUpdate(update.jobId, update.status as JobStatus, update.outputUrl ?? null, update.errorMessage ?? null);
      }

      for (const jobId of [...this.activeJobIds]) {
        if (inFlight.has(jobId)) continue;
        inFlight.add(jobId);
        this.gen.getJob(jobId).subscribe({
          next: job => {
            inFlight.delete(jobId);
            if (job.status === 'Completed' || job.status === 'Failed') {
              this.applyUpdate(job.id, job.status, job.outputUrl ?? null, job.errorMessage ?? null);
              this.signalR.publishUpdate({
                jobId: job.id,
                status: job.status,
                outputUrl: job.outputUrl,
                creditsCharged: job.creditsCharged,
                errorMessage: job.errorMessage
              });
            }
          },
          error: () => inFlight.delete(jobId)
        });
      }
    }, 5000);
  }

  private applyUpdate(jobId: string, status: JobStatus, outputUrl: string | null, errorMessage: string | null) {
    this.jobs.update(list => list.map(job => (
      job.id === jobId ? { ...job, status, outputUrl, errorMessage } : job
    )));

    if (status === 'Completed' || status === 'Failed') {
      this.activeJobIds.delete(jobId);
      this.credits.loadBalance().subscribe();
      if (jobId === this.currentJobId) {
        this.isGenerating.set(false);
        this.currentJobId = '';
      }
    }
  }

  selectModel(model: StudioModel) {
    this.selectedModel.set(model);
    this.prompt = '';
    this.negativePrompt = '';
    this.errorMsg.set(null);
  }

  selectModelById(id: string) {
    for (const category of this.categories) {
      const match = category.models.find(model => model.id === id);
      if (match) {
        this.selectModel(match);
        return;
      }
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.setFile(file);
    input.value = '';
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) this.setFile(file);
  }

  private setFile(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      this.errorMsg.set('File must be under 10 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = loadEvent => {
      this.selectedFile.set(file);
      this.previewSrc.set(loadEvent.target?.result as string);
      this.fileName.set(file.name);
      this.errorMsg.set(null);
    };
    reader.readAsDataURL(file);
  }

  generate() {
    if (!this.auth.isLoggedIn()) {
      this.loginModal.show();
      return;
    }
    if (!this.canGenerate()) return;

    const model = this.selectedModel()!;
    this.isGenerating.set(true);
    this.errorMsg.set(null);
    this.jobs.set([]);

    const formData = new FormData();
    formData.append('modelId', model.id);
    formData.append('isPublic', String(this.isPublic()));
    if (this.zone) formData.append('zone', this.zone);
    if (this.selectedFile()) formData.append('file', this.selectedFile()!);
    if (this.prompt) formData.append('prompt', this.prompt);
    if (this.negativePrompt) formData.append('negativePrompt', this.negativePrompt);

    this.gen.generateBackgroundRemoval(formData).subscribe({
      next: response => {
        this.jobs.set([{
          id: response.jobId,
          status: 'Queued',
          outputUrl: null,
          errorMessage: null,
          modelName: model.name,
          creditsReserved: response.creditsReserved
        }]);
        this.currentJobId = response.jobId;
        this.activeJobIds.add(response.jobId);
        this.signalR.trackJob(response.jobId, 'Image Studio');
        this.credits.reserveLocally(response.creditsReserved);
      },
      error: err => {
        this.isGenerating.set(false);
        this.errorMsg.set(err.error?.message ?? err.error?.error ?? 'Generation failed.');
      }
    });
  }
}
