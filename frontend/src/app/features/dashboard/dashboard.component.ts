import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GenerationService } from '../../core/services/generation.service';
import { CreditsService } from '../../core/services/credits.service';
import { AuthService } from '../../core/auth/auth.service';
import { JobStatusComponent } from '../../shared/components/job-status/job-status.component';
import type { JobDto } from '../../core/models/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, JobStatusComponent],
  template: `
<div class="p-6 max-w-5xl mx-auto space-y-6">
  <!-- Welcome -->
  <div>
    <h1 class="text-xl font-semibold text-gray-900">Welcome back, {{ name() }} 👋</h1>
    <p class="text-sm text-gray-500 mt-1">Here's what's happening with your media.</p>
  </div>

  <!-- Stats -->
  <div class="grid grid-cols-3 gap-4">
    <div class="card p-5">
      <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Credit Balance</p>
      <p class="text-3xl font-bold text-gray-900 mt-1">{{ credits.balance().balance }}</p>
      <p class="text-xs text-gray-400 mt-1">{{ credits.balance().reserved }} reserved</p>
    </div>
    <div class="card p-5">
      <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Jobs</p>
      <p class="text-3xl font-bold text-gray-900 mt-1">{{ recentJobs().length }}</p>
      <p class="text-xs text-gray-400 mt-1">This session</p>
    </div>
    <div class="card p-5">
      <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Plan</p>
      <p class="text-3xl font-bold text-gray-900 mt-1">{{ auth.user()?.plan }}</p>
      <a routerLink="/credits" class="text-xs text-accent hover:underline mt-1 block">Upgrade →</a>
    </div>
  </div>

  <!-- Quick actions -->
  <div>
    <h2 class="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h2>
    <div class="grid grid-cols-3 gap-3">
      @for (action of quickActions; track action.route) {
        <a [routerLink]="action.route" class="card p-4 flex items-center gap-3 hover:border-accent/50 hover:shadow-md transition-all group">
          <span class="text-2xl">{{ action.icon }}</span>
          <div>
            <p class="text-sm font-medium text-gray-900 group-hover:text-accent transition-colors">{{ action.label }}</p>
            <p class="text-xs text-gray-400">{{ action.cost }}</p>
          </div>
        </a>
      }
    </div>
  </div>

  <!-- Recent jobs -->
  <div>
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-sm font-semibold text-gray-700">Recent Jobs</h2>
      <a routerLink="/jobs" class="text-xs text-accent hover:underline">View all →</a>
    </div>
    @if (loading()) {
      <div class="card p-8 text-center text-gray-400 text-sm">Loading...</div>
    } @else if (recentJobs().length === 0) {
      <div class="card p-8 text-center text-gray-400">
        <div class="text-3xl mb-2">🎨</div>
        <p class="text-sm">No jobs yet. Start generating!</p>
      </div>
    } @else {
      <div class="card divide-y divide-border">
        @for (job of recentJobs(); track job.id) {
          <div class="flex items-center gap-4 px-4 py-3">
            <span class="text-lg">{{ productIcon(job.product) }}</span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900">{{ job.product }}</p>
              <p class="text-xs text-gray-400">{{ job.createdAt | date:'short' }}</p>
            </div>
            <app-job-status [status]="job.status"/>
            <span class="text-xs text-gray-400">{{ job.creditsCharged || job.creditsReserved }}cr</span>
          </div>
        }
      </div>
    }
  </div>
</div>
  `
})
export class DashboardComponent implements OnInit {
  auth = inject(AuthService);
  credits = inject(CreditsService);
  private gen = inject(GenerationService);

  recentJobs = signal<JobDto[]>([]);
  loading = signal(true);

  name = () => this.auth.user()?.fullName ?? this.auth.user()?.email?.split('@')[0] ?? 'there';

  quickActions = [
    { icon: '🖼️', label: 'Generate Image', route: '/image-gen',         cost: 'From 5 credits' },
    { icon: '🎬', label: 'Image to Video',  route: '/image-to-video',   cost: 'From 25 credits' },
    { icon: '🎥', label: 'Text to Video',   route: '/text-to-video',    cost: 'From 25 credits' },
    { icon: '🎙️', label: 'Text to Voice',  route: '/voice',            cost: 'From 4 credits' },
    { icon: '📝', label: 'Transcription',   route: '/transcription',    cost: 'From 10 credits' },
    { icon: '✂️', label: 'Remove BG',       route: '/background-removal', cost: '3 credits' },
  ];

  productIcon(p: string) {
    const map: Record<string, string> = { ImageGen: '🖼️', ImageToVideo: '🎬', TextToVideo: '🎥', Voice: '🎙️', Transcription: '📝', BackgroundRemoval: '✂️' };
    return map[p] ?? '🎨';
  }

  ngOnInit() {
    this.gen.getJobs(1, 5).subscribe({
      next: r => { this.recentJobs.set(r.items); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }
}
