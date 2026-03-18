import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GenerationService } from '../../core/services/generation.service';
import { JobStatusComponent } from '../../shared/components/job-status/job-status.component';
import type { JobDto, PagedResult } from '../../core/models/models';

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [CommonModule, JobStatusComponent],
  template: `
<div class="p-6 max-w-4xl mx-auto space-y-5">
  <h1 class="text-xl font-semibold text-gray-900">My Jobs</h1>

  @if (loading()) {
    <div class="card p-10 text-center text-gray-400 text-sm">Loading...</div>
  } @else if ((result()?.items?.length ?? 0) === 0) {
    <div class="card p-10 text-center text-gray-400">
      <div class="text-4xl mb-2">📋</div>
      <p class="text-sm">No jobs yet. Start generating!</p>
    </div>
  } @else {
    <div class="card divide-y divide-border">
      @for (job of result()?.items; track job.id) {
        <div class="flex items-center gap-4 px-5 py-4">
          <span class="text-xl">{{ productIcon(job.product) }}</span>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900">{{ job.product }} · {{ job.tier }}</p>
            <p class="text-xs text-gray-400 mt-0.5">{{ job.createdAt | date:'medium' }}</p>
          </div>
          <app-job-status [status]="job.status"/>
          <span class="text-sm font-medium text-gray-700 w-16 text-right">
            {{ job.status === 'Completed' ? job.creditsCharged : job.creditsReserved }}cr
          </span>
          @if (job.outputUrl && job.status === 'Completed') {
            <a [href]="job.outputUrl" target="_blank"
               class="text-accent text-xs hover:underline whitespace-nowrap">Download ↗</a>
          }
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
export class JobsComponent implements OnInit {
  private gen = inject(GenerationService);
  result = signal<PagedResult<JobDto> | null>(null);
  loading = signal(true);
  page = signal(1);

  productIcon(p: string) {
    const map: Record<string, string> = { ImageGen: '🖼️', ImageToVideo: '🎬', TextToVideo: '🎥', Voice: '🎙️', Transcription: '📝', BackgroundRemoval: '✂️' };
    return map[p] ?? '🎨';
  }

  ngOnInit() { this.loadPage(1); }

  loadPage(p: number) {
    this.loading.set(true); this.page.set(p);
    this.gen.getJobs(p, 20).subscribe({ next: r => { this.result.set(r); this.loading.set(false); }, error: () => this.loading.set(false) });
  }
}
