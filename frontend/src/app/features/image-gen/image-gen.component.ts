import { Component, signal, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GenerationService } from '../../core/services/generation.service';
import { CreditsService } from '../../core/services/credits.service';
import { SignalRService } from '../../core/services/signalr.service';
import { MediaPreviewComponent } from '../../shared/components/media-preview/media-preview.component';
import { JobStatusComponent } from '../../shared/components/job-status/job-status.component';
import { estimateCredits, type ModelTier, type JobStatus } from '../../core/models/models';

@Component({
  selector: 'app-image-gen',
  standalone: true,
  imports: [CommonModule, FormsModule, MediaPreviewComponent, JobStatusComponent],
  template: `
<div class="flex h-full">
  <div class="w-[380px] flex-shrink-0 border-r border-border bg-white flex flex-col overflow-y-auto">
    <div class="px-5 py-4 border-b border-border">
      <h1 class="text-base font-semibold text-gray-900">Image Generation</h1>
    </div>
    <div class="flex-1 px-5 py-4 space-y-5">
      <div>
        <label class="form-label">Model</label>
        <div class="flex gap-2">
          @for (t of tiers; track t.value) {
            <button class="tier-btn" [class.active]="tier() === t.value" (click)="tier.set(t.value)">{{ t.label }}</button>
          }
        </div>
      </div>
      <div>
        <label class="form-label">Prompt</label>
        <textarea class="form-textarea h-28" [(ngModel)]="prompt"
          placeholder="Describe the image you want to generate..." maxlength="2000"></textarea>
        <p class="text-right text-xs text-gray-400 mt-1">{{ prompt.length }}/2000</p>
      </div>
      <div>
        <label class="form-label">Negative Prompt <span class="text-gray-400 font-normal">(optional)</span></label>
        <textarea class="form-textarea h-16" [(ngModel)]="negativePrompt"
          placeholder="What to avoid in the image..."></textarea>
      </div>
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
    </div>
    <div class="px-5 py-4 border-t border-border space-y-3">
      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-500">Cost estimate</span>
        <span class="font-semibold"><span class="text-accent">{{ costEstimate() }}</span> credits</span>
      </div>
      <button class="btn-primary w-full" (click)="generate()" [disabled]="!prompt.trim() || generating()">
        @if (generating()) { <span class="animate-spin">⟳</span> Generating... }
        @else { ✨ Generate }
      </button>
    </div>
  </div>
  <div class="flex-1 p-6 flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-medium text-gray-600">Preview</h2>
      @if (jobStatus()) { <app-job-status [status]="jobStatus()!"/> }
    </div>
    <div class="flex-1 min-h-0">
      <app-media-preview [url]="outputUrl()" product="ImageGen"/>
    </div>
    @if (errorMsg()) {
      <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{{ errorMsg() }}</div>
    }
  </div>
</div>
  `
})
export class ImageGenComponent implements OnDestroy {
  private gen = inject(GenerationService);
  private credits = inject(CreditsService);
  private signalR = inject(SignalRService);

  tiers = [
    { value: 'Free' as ModelTier, label: 'Free' },
    { value: 'Standard' as ModelTier, label: 'Standard' },
    { value: 'Premium' as ModelTier, label: 'Premium' }
  ];

  tier = signal<ModelTier>('Standard');
  prompt = ''; negativePrompt = '';
  width = 1024; height = 1024;
  generating = signal(false);
  jobStatus = signal<JobStatus | null>(null);
  outputUrl = signal<string | undefined>(undefined);
  errorMsg = signal<string | undefined>(undefined);
  private currentJobId: string | null = null;
  private pollInterval?: ReturnType<typeof setInterval>;

  costEstimate = () => estimateCredits('ImageGen', this.tier());

  generate() {
    if (!this.prompt.trim() || this.generating()) return;
    this.generating.set(true); this.jobStatus.set('Queued');
    this.outputUrl.set(undefined); this.errorMsg.set(undefined);
    this.gen.generateImage({ prompt: this.prompt, tier: this.tier(), width: this.width, height: this.height, negativePrompt: this.negativePrompt || undefined })
      .subscribe({
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

  ngOnDestroy() { clearInterval(this.pollInterval); }
}
