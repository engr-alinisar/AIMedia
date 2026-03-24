import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
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
import type { JobStatus } from '../../core/models/models';

interface BgModel {
  id: string;
  name: string;
  description: string;
  credits: number;
  badge?: string;
  badgeColor?: string;
  tags: string[];
}

@Component({
  selector: 'app-background-removal',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MediaPreviewComponent, JobStatusComponent],
  template: `
<div class="flex flex-col lg:flex-row lg:h-full">
  <div class="w-full lg:w-[420px] lg:flex-shrink-0 border-b lg:border-b-0 lg:border-r border-border bg-white flex flex-col">
    <div class="px-5 py-4 border-b border-border">
      <h1 class="text-base font-semibold text-gray-900">Background Removal</h1>
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

      <!-- Image upload -->
      <div>
        <label class="form-label">Upload Image</label>
        <div class="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-accent hover:bg-accent-light/30 transition-colors"
             (click)="fileInput.click()" (dragover)="$event.preventDefault()" (drop)="onDrop($event)">
          @if (previewSrc()) {
            <img [src]="previewSrc()" class="mx-auto max-h-40 rounded object-contain mb-2"/>
            <p class="text-xs text-gray-400">Click to change</p>
          } @else {
            <div class="text-gray-400">
              <div class="text-3xl mb-2">✂️</div>
              <p class="text-sm font-medium text-gray-600">Click or drag to upload</p>
              <p class="text-xs text-gray-400 mt-1">JPG, PNG, WEBP up to 20MB</p>
            </div>
          }
          <input #fileInput type="file" accept="image/*" class="hidden" (change)="onFile($event)"/>
        </div>
      </div>

      <!-- Or URL -->
      <div>
        <label class="form-label">Or Image URL</label>
        <input type="url" class="form-input" [(ngModel)]="imageUrl" placeholder="https://..."/>
      </div>

      @if (errorMsg()) {
        <div class="p-3 bg-red-50 border border-red-300 rounded-lg text-sm text-red-700">{{ errorMsg() }}</div>
      }
    </div>

    <!-- Footer -->
    <div class="px-5 py-4 border-t border-border space-y-3">
      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-500">Cost</span>
        <span class="font-semibold"><span class="text-accent">{{ selectedModel()?.credits ?? 3 }}</span> credits per image</span>
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
      <button class="btn-primary w-full" (click)="generate()"
              [disabled]="(!imageFile && !imageUrl.trim()) || generating() || !selectedModel()">
        @if (generating()) { <span class="animate-spin mr-1">⟳</span> Processing... }
        @else { ✂️ Remove Background }
      </button>
    </div>
  </div>

  <!-- Right panel -->
  <div class="flex-1 p-4 lg:p-6 flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-medium text-gray-600">Result</h2>
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
          <p class="text-sm font-medium text-accent">Removing background...</p>
          <p class="text-xs text-accent/70">Usually takes 5–15 seconds. You can navigate away — results will be in <a routerLink="/jobs" class="underline">My Jobs</a>.</p>
        </div>
      </div>
    }

    <!-- Checkerboard background to show transparency -->
    <div class="h-[55vw] sm:h-[420px] lg:h-auto lg:flex-1 lg:min-h-0 rounded-xl overflow-hidden border border-border"
         style="background-image: url('data:image/svg+xml,%3Csvg width%3D%2220%22 height%3D%2220%22 xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Crect width%3D%2210%22 height%3D%2210%22 fill%3D%22%23f3f4f6%22/%3E%3Crect x%3D%2210%22 y%3D%2210%22 width%3D%2210%22 height%3D%2210%22 fill%3D%22%23f3f4f6%22/%3E%3Crect x%3D%2210%22 width%3D%2210%22 height%3D%2210%22 fill%3D%22%23e5e7eb%22/%3E%3Crect y%3D%2210%22 width%3D%2210%22 height%3D%2210%22 fill%3D%22%23e5e7eb%22/%3E%3C/svg%3E')">
      <app-media-preview [url]="outputUrl()" product="BackgroundRemoval"/>
    </div>
  </div>
</div>
  `
})
export class BackgroundRemovalComponent implements OnInit, OnDestroy {
  private gen = inject(GenerationService);
  private credits = inject(CreditsService);
  private auth = inject(AuthService);
  private loginModal = inject(LoginModalService);
  private signalR = inject(SignalRService);
  private route = inject(ActivatedRoute);

  models: BgModel[] = [
    {
      id: 'fal-ai/birefnet',
      name: 'BiRefNet',
      description: 'High accuracy model, great for complex edges like hair and fur.',
      credits: 3,
      badge: 'ACCURATE',
      badgeColor: '#2563EB',
      tags: ['High Accuracy', 'Complex Edges', 'Open Source']
    },
    {
      id: 'fal-ai/pixelcut/remove-background',
      name: 'Pixelcut',
      description: 'Fast background removal optimised for product and e-commerce photos.',
      credits: 3,
      badge: 'FAST',
      badgeColor: '#059669',
      tags: ['E-Commerce', 'Products', 'Fast']
    }
  ];

  selectedModel = signal<BgModel | null>(this.models[0]);
  dropdownOpen = signal(false);

  imageUrl = '';
  imageFile: File | null = null;
  previewSrc = signal<string>('');

  generating = signal(false);
  jobStatus = signal<JobStatus | null>(null);
  outputUrl = signal<string | undefined>(undefined);
  errorMsg = signal<string | undefined>(undefined);
  isPublic = signal(true);

  private currentJobId: string | null = null;
  private pollInterval?: ReturnType<typeof setInterval>;

  ngOnInit() {
    document.addEventListener('click', this.onDocumentClick);
    const qp = this.route.snapshot.queryParams;
    if (qp['model']) {
      const m = this.models.find(x => x.id === qp['model']);
      if (m) this.selectModel(m);
    }
  }

  private onDocumentClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.relative')) this.dropdownOpen.set(false);
  };

  selectModel(m: BgModel) {
    this.selectedModel.set(m);
    this.dropdownOpen.set(false);
  }

  onFile(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) this.loadFile(f);
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0];
    if (f) this.loadFile(f);
  }

  private loadFile(f: File) {
    const r = new FileReader();
    r.onload = ev => { this.previewSrc.set(ev.target?.result as string); this.imageFile = f; };
    r.readAsDataURL(f);
  }

  generate() {
    if (!this.auth.isLoggedIn()) { this.loginModal.show(); return; }
    if ((!this.imageFile && !this.imageUrl.trim()) || this.generating() || !this.selectedModel()) return;
    this.generating.set(true);
    this.jobStatus.set('Queued');
    this.outputUrl.set(undefined);
    this.errorMsg.set(undefined);

    const fd = new FormData();
    if (this.imageFile) fd.append('file', this.imageFile);
    else fd.append('imageUrl', this.imageUrl);
    fd.append('modelId', this.selectedModel()!.id);
    fd.append('isPublic', String(this.isPublic()));

    this.gen.generateBackgroundRemoval(fd).subscribe({
      next: res => { this.currentJobId = res.jobId; this.credits.reserveLocally(res.creditsReserved); this.signalR.trackJob(res.jobId, 'BackgroundRemoval'); this.startFallback(); },
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
