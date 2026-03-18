import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { GenerationService } from '../../core/services/generation.service';
import { CreditsService } from '../../core/services/credits.service';
import { JobStatusComponent } from '../../shared/components/job-status/job-status.component';
import type { JobDto, PagedResult } from '../../core/models/models';

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [CommonModule, JobStatusComponent, RouterLink],
  template: `
<div class="p-6 max-w-5xl mx-auto space-y-5">
  <div class="flex items-center justify-between">
    <h1 class="text-xl font-semibold text-gray-900">My Jobs</h1>
    <button class="btn-secondary text-sm" (click)="loadPage(page())">↻ Refresh</button>
  </div>

  <!-- Submitted toast -->
  @if (showSubmittedBanner()) {
    <div class="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
      <span class="text-lg">✅</span>
      <span>Your job has been submitted! It will appear below and complete in <strong>1–3 minutes</strong>.</span>
      <button class="ml-auto text-green-600 hover:text-green-800" (click)="showSubmittedBanner.set(false)">✕</button>
    </div>
  }

  @if (loading()) {
    <div class="card p-10 text-center text-gray-400 text-sm">Loading...</div>
  } @else if ((result()?.items?.length ?? 0) === 0) {
    <div class="card p-10 text-center text-gray-400">
      <div class="text-4xl mb-3">📋</div>
      <p class="text-sm mb-4">No jobs yet. Start generating!</p>
      <a routerLink="/image-to-video" class="btn-primary text-sm">Create your first video</a>
    </div>
  } @else {
    <div class="card divide-y divide-gray-100">
      @for (job of result()?.items; track job.id) {
        <div class="flex items-center gap-4 px-5 py-4">
          <!-- Icon -->
          <span class="text-2xl flex-shrink-0">{{ productIcon(job.product) }}</span>

          <!-- Details -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900">
              {{ productLabel(job.product) }}
              <span class="ml-1.5 text-xs font-normal text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{{ job.tier }}</span>
            </p>
            <p class="text-xs text-gray-400 mt-0.5">{{ job.createdAt | date:'MMM d, y · h:mm a' }}</p>
            @if (job.status === 'Failed' && job.errorMessage) {
              <p class="text-xs text-red-500 mt-1 truncate max-w-xs" [title]="job.errorMessage">{{ job.errorMessage }}</p>
            }
          </div>

          <!-- Status -->
          <app-job-status [status]="job.status"/>

          <!-- Credits -->
          <span class="text-sm text-gray-500 w-20 text-right flex-shrink-0">
            {{ job.status === 'Completed' ? job.creditsCharged : job.creditsReserved }} cr
          </span>

          <!-- Actions -->
          <div class="flex gap-2 flex-shrink-0">
            @if (job.status === 'Completed' && job.outputUrl) {
              <a [href]="job.outputUrl" target="_blank"
                 class="text-xs px-3 py-1.5 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors">
                ▶ View
              </a>
              <a [href]="job.outputUrl" [download]="downloadName(job)"
                 class="text-xs px-3 py-1.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                ↓ Download
              </a>
            }
            @if (job.status === 'Failed') {
              <a [routerLink]="retryLink(job)"
                 class="text-xs px-3 py-1.5 border border-amber-300 text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors">
                ↺ Retry
              </a>
            }
            @if (job.status === 'Queued' || job.status === 'Processing') {
              <span class="text-xs px-3 py-1.5 text-gray-400 animate-pulse">Processing...</span>
            }
          </div>
        </div>
      }
    </div>

    <!-- Pagination -->
    @if ((result()?.totalPages ?? 0) > 1) {
      <div class="flex justify-center gap-2">
        <button class="btn-secondary" (click)="loadPage(page() - 1)" [disabled]="page() === 1">← Prev</button>
        <span class="flex items-center text-sm text-gray-600">Page {{ page() }} of {{ result()?.totalPages }}</span>
        <button class="btn-secondary" (click)="loadPage(page() + 1)" [disabled]="page() === result()?.totalPages">Next →</button>
      </div>
    }
  }
</div>
  `
})
export class JobsComponent implements OnInit, OnDestroy {
  private gen = inject(GenerationService);
  private credits = inject(CreditsService);
  private route = inject(ActivatedRoute);

  result = signal<PagedResult<JobDto> | null>(null);
  loading = signal(true);
  page = signal(1);
  showSubmittedBanner = signal(false);

  private pollTimer?: ReturnType<typeof setInterval>;

  productIcon(p: string) {
    const map: Record<string, string> = {
      ImageGen: '🖼️', ImageToVideo: '🎬', TextToVideo: '🎥',
      Voice: '🎙️', Transcription: '📝', BackgroundRemoval: '✂️'
    };
    return map[p] ?? '🎨';
  }

  productLabel(p: string) {
    const map: Record<string, string> = {
      ImageGen: 'Image Generation', ImageToVideo: 'Image to Video', TextToVideo: 'Text to Video',
      Voice: 'Text to Voice', Transcription: 'Transcription', BackgroundRemoval: 'Background Removal'
    };
    return map[p] ?? p;
  }

  retryLink(job: JobDto): string {
    const map: Record<string, string> = {
      ImageGen: '/image-generation', ImageToVideo: '/image-to-video',
      TextToVideo: '/text-to-video', Voice: '/text-to-voice',
      Transcription: '/transcription', BackgroundRemoval: '/background-removal'
    };
    return map[job.product] ?? '/';
  }

  downloadName(job: JobDto): string {
    const ext: Record<string, string> = {
      ImageGen: 'png', ImageToVideo: 'mp4', TextToVideo: 'mp4',
      Voice: 'mp3', Transcription: 'txt', BackgroundRemoval: 'png'
    };
    return `aimedia-${job.product.toLowerCase()}.${ext[job.product] ?? 'bin'}`;
  }

  ngOnInit() {
    // Show submitted banner if redirected from generation page
    this.route.queryParams.subscribe(p => {
      if (p['submitted'] === '1') this.showSubmittedBanner.set(true);
    });

    this.loadPage(1);

    // Auto-refresh every 10s while any job is in-progress
    this.pollTimer = setInterval(() => {
      const items = this.result()?.items ?? [];
      const hasActive = items.some(j => j.status === 'Queued' || j.status === 'Processing');
      if (hasActive) {
        this.loadPage(this.page(), false);
      }
    }, 10000);
  }

  ngOnDestroy() {
    clearInterval(this.pollTimer);
  }

  loadPage(p: number, showLoader = true) {
    if (showLoader) this.loading.set(true);
    this.page.set(p);
    this.gen.getJobs(p, 20).subscribe({
      next: r => {
        this.result.set(r);
        this.loading.set(false);
        // Refresh credits if any job just completed
        const hasCompleted = r.items.some(j => j.status === 'Completed');
        if (hasCompleted) this.credits.loadBalance().subscribe();
      },
      error: () => this.loading.set(false)
    });
  }
}
