import { Component, signal, computed, inject, OnInit, OnDestroy, ElementRef } from '@angular/core';
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
  styles: [`
    .page-btn {
      min-width: 2rem; height: 2rem;
      display: inline-flex; align-items: center; justify-content: center;
      border-radius: 0.5rem; font-size: 0.8125rem; font-weight: 500;
      border: 1px solid #e5e7eb; background: white; color: #374151;
      cursor: pointer; transition: all 0.15s;
      padding: 0 0.5rem;
    }
    .page-btn:hover:not(:disabled) { background: #f3f4f6; border-color: #d1d5db; }
    .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .page-btn.active {
      background: var(--color-accent, #7c3aed); border-color: var(--color-accent, #7c3aed);
      color: white;
    }
  `],
  template: `
<div class="p-4 sm:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-5">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-xl font-semibold text-gray-900">My Jobs</h1>
      @if (result()) {
        <p class="text-xs text-gray-400 mt-0.5">
          {{ result()!.totalCount }} total job{{ result()!.totalCount !== 1 ? 's' : '' }}
        </p>
      }
    </div>
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
        <div [attr.data-job-id]="job.id"
             class="px-4 py-3 sm:px-5 sm:py-4 transition-colors duration-300"
             [class.bg-accent-light]="highlightedJobId() === job.id"
             [class.ring-2]="highlightedJobId() === job.id"
             [class.ring-accent]="highlightedJobId() === job.id"
             [class.ring-inset]="highlightedJobId() === job.id">

          <!-- Top row: icon + name + status + credits -->
          <div class="flex items-center gap-3">
            <span class="text-xl flex-shrink-0">{{ productIcon(job.product) }}</span>

            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <p class="text-sm font-medium text-gray-900">{{ productLabel(job.product) }}</p>
                @if (highlightedJobId() === job.id) {
                  <span class="px-1.5 py-0.5 text-[10px] font-bold bg-accent text-white rounded animate-pulse">New</span>
                }
              </div>
              <p class="text-xs text-gray-400 mt-0.5">{{ job.createdAt | date:'MMM d, y · h:mm a' }}</p>
              @if (job.status === 'Failed' && job.errorMessage) {
                <p class="text-xs text-red-500 mt-0.5 truncate" [title]="job.errorMessage">{{ job.errorMessage }}</p>
              }
            </div>

            <!-- Status + credits (always visible on right) -->
            <div class="flex flex-col items-end gap-1 flex-shrink-0">
              <app-job-status [status]="job.status"/>
              <span class="text-xs text-gray-400">
                {{ job.status === 'Completed' ? job.creditsCharged : job.creditsReserved }} cr
              </span>
            </div>
          </div>

          <!-- Bottom row: action buttons -->
          @if (job.status === 'Completed' && job.outputUrl) {
            <div class="flex gap-2 mt-2.5 ml-8">
              <a [href]="job.outputUrl" target="_blank"
                 class="text-xs px-3 py-1.5 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors">
                ▶ View
              </a>
              <a [href]="job.outputUrl" [download]="downloadName(job)"
                 class="text-xs px-3 py-1.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                ↓ Download
              </a>
            </div>
          }
          @if (job.status === 'Failed') {
            <div class="mt-2.5 ml-8">
              <a [routerLink]="retryLink(job)"
                 class="text-xs px-3 py-1.5 border border-amber-300 text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors">
                ↺ Retry
              </a>
            </div>
          }
          @if (job.status === 'Queued' || job.status === 'Processing') {
            <div class="mt-2 ml-8">
              <span class="text-xs text-gray-400 animate-pulse">Processing...</span>
            </div>
          }
        </div>
      }
    </div>

    <!-- Pagination -->
    @if ((result()?.totalPages ?? 0) > 1) {
      <div class="flex flex-wrap items-center justify-center gap-1.5 pt-1">

        <!-- First + Prev -->
        <button class="page-btn" (click)="loadPage(1)" [disabled]="page() === 1" title="First page">«</button>
        <button class="page-btn" (click)="loadPage(page() - 1)" [disabled]="page() === 1" title="Previous page">‹</button>

        <!-- Page number buttons -->
        @for (p of pageNumbers(); track p) {
          @if (p === -1) {
            <span class="px-1 text-gray-400 select-none">…</span>
          } @else {
            <button class="page-btn" [class.active]="p === page()" (click)="loadPage(p)">{{ p }}</button>
          }
        }

        <!-- Next + Last -->
        <button class="page-btn" (click)="loadPage(page() + 1)" [disabled]="page() === result()?.totalPages" title="Next page">›</button>
        <button class="page-btn" (click)="loadPage(result()!.totalPages)" [disabled]="page() === result()?.totalPages" title="Last page">»</button>

        <!-- Go to page -->
        <div class="flex items-center gap-1.5 ml-3 pl-3 border-l border-gray-200">
          <span class="text-xs text-gray-500 whitespace-nowrap">Go to page</span>
          <input #gotoInput
                 type="number"
                 [min]="1"
                 [max]="result()?.totalPages"
                 class="w-14 text-center text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                 placeholder="{{ page() }}"
                 (keydown.enter)="goToPage(gotoInput)" />
          <button class="page-btn" (click)="goToPage(gotoInput)">Go</button>
        </div>

      </div>

      <!-- Summary line -->
      <p class="text-center text-xs text-gray-400 mt-1">
        Page {{ page() }} of {{ result()?.totalPages }}
        · showing {{ pageStart() }}–{{ pageEnd() }} of {{ result()?.totalCount }} jobs
      </p>
    }
  }
</div>
  `
})
export class JobsComponent implements OnInit, OnDestroy {
  private gen = inject(GenerationService);
  private credits = inject(CreditsService);
  private route = inject(ActivatedRoute);
  private el = inject(ElementRef);

  readonly PAGE_SIZE = 8;

  result = signal<PagedResult<JobDto> | null>(null);
  loading = signal(true);
  page = signal(1);
  showSubmittedBanner = signal(false);
  highlightedJobId = signal<string | null>(null);

  private pollTimer?: ReturnType<typeof setInterval>;
  private highlightTimer?: ReturnType<typeof setTimeout>;

  /** Builds the list of page buttons: numbers and -1 for ellipsis */
  pageNumbers = computed<number[]>(() => {
    const total = this.result()?.totalPages ?? 0;
    const cur = this.page();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const pages: number[] = [1];

    // Left ellipsis
    if (cur > 3) pages.push(-1);

    // Window around current (up to 3 pages)
    const start = Math.max(2, cur - 1);
    const end = Math.min(total - 1, cur + 1);
    for (let i = start; i <= end; i++) pages.push(i);

    // Right ellipsis
    if (cur < total - 2) pages.push(-1);

    pages.push(total);
    return pages;
  });

  pageStart = computed(() => {
    const r = this.result();
    if (!r) return 0;
    return (this.page() - 1) * this.PAGE_SIZE + 1;
  });

  pageEnd = computed(() => {
    const r = this.result();
    if (!r) return 0;
    return Math.min(this.page() * this.PAGE_SIZE, r.totalCount);
  });

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
      ImageGen: '/image-gen', ImageToVideo: '/image-to-video',
      TextToVideo: '/text-to-video', Voice: '/voice',
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

  goToPage(input: HTMLInputElement) {
    const p = parseInt(input.value, 10);
    const total = this.result()?.totalPages ?? 1;
    if (!isNaN(p) && p >= 1 && p <= total) {
      this.loadPage(p);
    }
    input.value = '';
    input.blur();
  }

  ngOnInit() {
    this.route.queryParams.subscribe(p => {
      if (p['submitted'] === '1') this.showSubmittedBanner.set(true);

      const highlightId = p['highlight'] as string | undefined;
      if (highlightId) {
        this.highlightedJobId.set(highlightId);
        clearTimeout(this.highlightTimer);
        this.highlightTimer = setTimeout(() => this.highlightedJobId.set(null), 8000);
      }
    });

    this.loadPage(1);

    // Auto-refresh every 10s while any job is in-progress
    this.pollTimer = setInterval(() => {
      const items = this.result()?.items ?? [];
      const hasActive = items.some(j => j.status === 'Queued' || j.status === 'Processing');
      if (hasActive) this.loadPage(this.page(), false);
    }, 10000);
  }

  ngOnDestroy() {
    clearInterval(this.pollTimer);
    clearTimeout(this.highlightTimer);
  }

  loadPage(p: number, showLoader = true) {
    const total = this.result()?.totalPages ?? Infinity;
    if (p < 1 || p > total) return;
    if (showLoader) this.loading.set(true);
    this.page.set(p);
    this.gen.getJobs(p, this.PAGE_SIZE).subscribe({
      next: r => {
        this.result.set(r);
        this.loading.set(false);
        if (r.items.some(j => j.status === 'Completed')) this.credits.loadBalance().subscribe();

        // Scroll to highlighted job after render
        const highlightId = this.highlightedJobId();
        if (highlightId) {
          setTimeout(() => this.scrollToJob(highlightId), 100);
        }

        // Scroll to top of page list on page change
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: () => this.loading.set(false)
    });
  }

  private scrollToJob(jobId: string) {
    const row = this.el.nativeElement.querySelector(`[data-job-id="${jobId}"]`);
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}
