import { Component, signal, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GenerationService } from '../../core/services/generation.service';
import { CreditsService } from '../../core/services/credits.service';
import { SignalRService } from '../../core/services/signalr.service';
import { MediaPreviewComponent } from '../../shared/components/media-preview/media-preview.component';
import { JobStatusComponent } from '../../shared/components/job-status/job-status.component';
import type { JobStatus } from '../../core/models/models';

@Component({
  selector: 'app-background-removal',
  standalone: true,
  imports: [CommonModule, FormsModule, MediaPreviewComponent, JobStatusComponent],
  template: `
<div class="flex h-full">
  <div class="w-[380px] flex-shrink-0 border-r border-border bg-white flex flex-col overflow-y-auto">
    <div class="px-5 py-4 border-b border-border">
      <h1 class="text-base font-semibold text-gray-900">Background Removal</h1>
    </div>
    <div class="flex-1 px-5 py-4 space-y-5">
      <div>
        <label class="form-label">Upload Image</label>
        <div class="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-accent hover:bg-accent-light/30 transition-colors"
             (click)="fileInput.click()" (dragover)="$event.preventDefault()" (drop)="onDrop($event)">
          @if (previewSrc()) {
            <img [src]="previewSrc()" class="mx-auto max-h-40 rounded object-contain mb-2"/>
          } @else {
            <div class="text-gray-400">
              <div class="text-2xl mb-1">✂️</div>
              <p class="text-sm">Click or drag to upload</p>
              <p class="text-xs text-gray-400 mt-1">JPG, PNG, WEBP up to 20MB</p>
            </div>
          }
          <input #fileInput type="file" accept="image/*" class="hidden" (change)="onFile($event)"/>
        </div>
      </div>
      <div>
        <label class="form-label">Or Image URL</label>
        <input type="url" class="form-input" [(ngModel)]="imageUrl" placeholder="https://..."/>
      </div>
    </div>
    <div class="px-5 py-4 border-t border-border space-y-3">
      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-500">Cost</span>
        <span class="font-semibold"><span class="text-accent">3</span> credits per image</span>
      </div>
      <button class="btn-primary w-full" (click)="generate()" [disabled]="(!imageFile && !imageUrl) || generating()">
        @if (generating()) { <span class="animate-spin">⟳</span> Processing... }
        @else { ✂️ Remove Background }
      </button>
    </div>
  </div>
  <div class="flex-1 p-6 flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-medium text-gray-600">Result</h2>
      @if (jobStatus()) { <app-job-status [status]="jobStatus()!"/> }
    </div>
    <div class="flex-1 min-h-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Crect%20width%3D%2210%22%20height%3D%2210%22%20fill%3D%22%23e5e7eb%22/%3E%3Crect%20x%3D%2210%22%20y%3D%2210%22%20width%3D%2210%22%20height%3D%2210%22%20fill%3D%22%23e5e7eb%22/%3E%3C/svg%3E') rounded-xl overflow-hidden border border-border">
      <app-media-preview [url]="outputUrl()" product="BackgroundRemoval"/>
    </div>
    @if (errorMsg()) {
      <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{{ errorMsg() }}</div>
    }
  </div>
</div>
  `
})
export class BackgroundRemovalComponent implements OnDestroy {
  private gen = inject(GenerationService);
  private credits = inject(CreditsService);
  private signalR = inject(SignalRService);

  imageUrl = ''; imageFile: File | null = null;
  previewSrc = signal<string>('');
  generating = signal(false); jobStatus = signal<JobStatus | null>(null);
  outputUrl = signal<string | undefined>(undefined); errorMsg = signal<string | undefined>(undefined);
  private currentJobId: string | null = null; private pollInterval?: ReturnType<typeof setInterval>;

  onFile(e: Event) { const f = (e.target as HTMLInputElement).files?.[0]; if (f) this.loadFile(f); }
  onDrop(e: DragEvent) { e.preventDefault(); const f = e.dataTransfer?.files?.[0]; if (f) this.loadFile(f); }
  private loadFile(f: File) { const r = new FileReader(); r.onload = ev => { this.previewSrc.set(ev.target?.result as string); this.imageFile = f; }; r.readAsDataURL(f); }

  generate() {
    if ((!this.imageFile && !this.imageUrl) || this.generating()) return;
    this.generating.set(true); this.jobStatus.set('Queued'); this.outputUrl.set(undefined); this.errorMsg.set(undefined);
    const fd = new FormData();
    if (this.imageFile) fd.append('file', this.imageFile);
    else fd.append('imageUrl', this.imageUrl);
    this.gen.generateBackgroundRemoval(fd).subscribe({
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
