import { Component, signal, inject, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval, switchMap } from 'rxjs';
import { GenerationService } from '../../core/services/generation.service';
import { CreditsService } from '../../core/services/credits.service';
import { SignalRService } from '../../core/services/signalr.service';
import { MediaPreviewComponent } from '../../shared/components/media-preview/media-preview.component';
import { JobStatusComponent } from '../../shared/components/job-status/job-status.component';
import { estimateCredits, type ModelTier, type JobStatus } from '../../core/models/models';

@Component({
  selector: 'app-image-to-video',
  standalone: true,
  imports: [CommonModule, FormsModule, MediaPreviewComponent, JobStatusComponent],
  template: `
<div class="flex h-full">
  <!-- Left panel -->
  <div class="w-[380px] flex-shrink-0 border-r border-border bg-white flex flex-col overflow-y-auto">
    <div class="px-5 py-4 border-b border-border">
      <h1 class="text-base font-semibold text-gray-900">Image to Video</h1>
    </div>

    <div class="flex-1 px-5 py-4 space-y-5">
      <!-- Model tier -->
      <div>
        <label class="form-label">Model</label>
        <div class="flex gap-2">
          @for (t of tiers; track t.value) {
            <button class="tier-btn" [class.active]="tier() === t.value" (click)="tier.set(t.value)">
              {{ t.label }}
            </button>
          }
        </div>
      </div>

      <!-- Image upload -->
      <div>
        <label class="form-label">Upload Image</label>
        <div class="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer
                    hover:border-accent hover:bg-accent-light/30 transition-colors"
             (click)="fileInput.click()"
             (dragover)="$event.preventDefault()"
             (drop)="onDrop($event)">
          @if (previewSrc()) {
            <img [src]="previewSrc()" class="mx-auto max-h-32 rounded object-contain mb-2"/>
          } @else {
            <div class="text-gray-400">
              <div class="text-2xl mb-1">📁</div>
              <p class="text-sm">Click or drag to upload</p>
              <p class="text-xs text-gray-400 mt-1">JPG, PNG, WEBP up to 20MB</p>
            </div>
          }
          <input #fileInput type="file" accept="image/*" class="hidden" (change)="onFile($event)"/>
        </div>
      </div>

      <!-- Prompt -->
      <div>
        <label class="form-label">Prompt <span class="text-gray-400 font-normal">(optional)</span></label>
        <textarea class="form-textarea h-24" [(ngModel)]="prompt"
          placeholder="Describe the motion or scene...&#10;Longer prompts work best."
          maxlength="2500"></textarea>
        <p class="text-right text-xs text-gray-400 mt-1">{{ prompt.length }}/2500</p>
      </div>

      <!-- Duration -->
      <div>
        <label class="form-label">Duration: <span class="text-accent font-semibold">{{ duration }}s</span></label>
        <input type="range" [(ngModel)]="duration" min="3" max="10" step="1"
               class="w-full accent-accent"/>
        <div class="flex justify-between text-xs text-gray-400 mt-0.5">
          <span>3s</span><span>10s</span>
        </div>
      </div>
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
              [disabled]="!imageUrl() || generating()">
        @if (generating()) { <span class="animate-spin">⟳</span> Generating... }
        @else { ✨ Generate }
      </button>
    </div>
  </div>

  <!-- Right panel -->
  <div class="flex-1 p-6 flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-medium text-gray-600">Preview</h2>
      @if (jobStatus()) {
        <app-job-status [status]="jobStatus()!"/>
      }
    </div>

    <div class="flex-1 min-h-0">
      <app-media-preview [url]="outputUrl()" product="ImageToVideo"/>
    </div>

    @if (errorMsg()) {
      <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
        {{ errorMsg() }}
      </div>
    }
  </div>
</div>
  `
})
export class ImageToVideoComponent implements OnInit, OnDestroy {
  private gen = inject(GenerationService);
  private credits = inject(CreditsService);
  private signalR = inject(SignalRService);

  tiers = [
    { value: 'Free' as ModelTier,     label: 'Free' },
    { value: 'Standard' as ModelTier, label: 'Standard' },
    { value: 'Premium' as ModelTier,  label: 'Premium' }
  ];

  tier = signal<ModelTier>('Standard');
  imageUrl = signal<string>('');
  previewSrc = signal<string>('');
  prompt = '';
  duration = 5;

  generating = signal(false);
  jobStatus = signal<JobStatus | null>(null);
  outputUrl = signal<string | undefined>(undefined);
  errorMsg = signal<string | undefined>(undefined);

  private currentJobId: string | null = null;
  private pollInterval?: ReturnType<typeof setInterval>;

  costEstimate = () => estimateCredits('ImageToVideo', this.tier(), this.duration);

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
    const reader = new FileReader();
    reader.onload = e => {
      this.previewSrc.set(e.target?.result as string);
      this.imageUrl.set(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  generate() {
    if (!this.imageUrl() || this.generating()) return;
    this.generating.set(true);
    this.jobStatus.set('Queued');
    this.outputUrl.set(undefined);
    this.errorMsg.set(undefined);

    this.gen.generateImageToVideo({
      imageUrl: this.imageUrl(),
      tier: this.tier(),
      prompt: this.prompt || undefined,
      durationSeconds: this.duration
    }).subscribe({
      next: res => {
        this.currentJobId = res.jobId;
        this.credits.reserveLocally(res.creditsReserved);
        this.startPollingFallback();
      },
      error: err => {
        this.generating.set(false);
        this.jobStatus.set('Failed');
        this.errorMsg.set(err.error?.error ?? 'Generation failed.');
      }
    });
  }

  private startPollingFallback() {
    // SignalR check — fallback to polling if no update in 30s
    let signalRReceived = false;
    const startTime = Date.now();

    this.pollInterval = setInterval(() => {
      const update = this.signalR.latestUpdate();
      if (update && update.jobId === this.currentJobId) {
        signalRReceived = true;
        this.applyUpdate(update.status as JobStatus, update.outputUrl, update.errorMessage);
        clearInterval(this.pollInterval);
        return;
      }
      // After 30s fallback to polling
      if (!signalRReceived && Date.now() - startTime > 30000) {
        this.pollJob();
      }
    }, 1000);
  }

  private pollJob() {
    if (!this.currentJobId) return;
    this.gen.getJob(this.currentJobId).subscribe(job => {
      if (job.status === 'Completed' || job.status === 'Failed') {
        this.applyUpdate(job.status, job.outputUrl, job.errorMessage);
        clearInterval(this.pollInterval);
      }
    });
  }

  private applyUpdate(status: JobStatus, outputUrl?: string, errorMsg?: string) {
    this.jobStatus.set(status);
    this.generating.set(false);
    if (status === 'Completed') {
      this.outputUrl.set(outputUrl);
      this.credits.loadBalance().subscribe();
    } else if (status === 'Failed') {
      this.errorMsg.set(errorMsg ?? 'Generation failed.');
      this.credits.loadBalance().subscribe();
    }
  }

  ngOnInit() {}
  ngOnDestroy() { clearInterval(this.pollInterval); }
}
