import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GenerationService } from '../../core/services/generation.service';
import { CreditsService } from '../../core/services/credits.service';
import { ModelCatalogService } from '../../core/services/model-catalog.service';
import { AuthService } from '../../core/auth/auth.service';
import { JobStatusComponent } from '../../shared/components/job-status/job-status.component';
import type { JobDto } from '../../core/models/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, JobStatusComponent],
  template: `
<div class="p-4 sm:p-6 max-w-5xl mx-auto space-y-5 sm:space-y-6">
  <!-- Welcome -->
  <div>
    <h1 class="text-xl font-semibold text-gray-900">Welcome back, {{ name() }} 👋</h1>
    <p class="text-sm text-gray-500 mt-1">Here's what's happening with your media.</p>
  </div>

  <!-- Stats — 2 cols -->
  <div class="grid grid-cols-2 gap-3">
    <div class="card p-3 sm:p-5">
      <p class="text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wide">Credit Balance</p>
      <p class="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{{ credits.balance().balance }}</p>
      <p class="text-[10px] sm:text-xs text-gray-400 mt-1">{{ credits.balance().reserved }} reserved</p>
    </div>
    <div class="card p-3 sm:p-5">
      <p class="text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wide">Total Jobs</p>
      <p class="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{{ recentJobs().length }}</p>
      <p class="text-[10px] sm:text-xs text-gray-400 mt-1">This session</p>
    </div>
  </div>

  <!-- Quick actions — 2 cols on mobile, 3 on sm+ -->
  <div>
    <h2 class="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h2>
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
      @for (action of quickActions; track action.route) {
        <a [routerLink]="action.route"
           class="card p-3 sm:p-4 flex items-center gap-2 sm:gap-3 hover:border-accent/50 hover:shadow-md transition-all group">
          <span class="text-xl sm:text-2xl flex-shrink-0">{{ action.icon }}</span>
          <div class="min-w-0">
            <p class="text-xs sm:text-sm font-medium text-gray-900 group-hover:text-accent transition-colors leading-tight">{{ action.label }}</p>
            <p class="text-[10px] sm:text-xs text-gray-400 mt-0.5">{{ quickActionPrice(action.product, action.fallbackCost) }}</p>
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
          <div class="flex items-center gap-3 px-4 py-3">
            <span class="text-lg flex-shrink-0">{{ productIcon(job.product) }}</span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">{{ productLabel(job.product) }}</p>
              <p class="text-xs text-gray-400">{{ job.createdAt | date:'M/d/yy, h:mm a' }}</p>
            </div>
            <div class="flex flex-col items-end gap-0.5 flex-shrink-0">
              <app-job-status [status]="job.status"/>
              <span class="text-[10px] text-gray-400">{{ job.creditsCharged || job.creditsReserved }} cr</span>
            </div>
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
  private modelCatalog = inject(ModelCatalogService);
  private gen = inject(GenerationService);
  catalog = this.modelCatalog.catalog;

  recentJobs = signal<JobDto[]>([]);
  loading = signal(true);

  name = () => this.auth.user()?.fullName ?? this.auth.user()?.email?.split('@')[0] ?? 'there';

  quickActions = [
    { icon: '🖼️', label: 'Text to Image', route: '/text-to-image', product: 'ImageGen', fallbackCost: 'From 10 credits' },
    { icon: '🎬', label: 'Image to Video', route: '/image-to-video', product: 'ImageToVideo', fallbackCost: 'From 42 credits' },
    { icon: '🎥', label: 'Text to Video', route: '/text-to-video', product: 'TextToVideo', fallbackCost: 'From 25 credits' },
    { icon: '🎙️', label: 'Text to Audio', route: '/voice', product: 'Voice', fallbackCost: 'From 4 credits' },
    { icon: '📝', label: 'Audio to Text', route: '/transcription', product: 'Transcription', fallbackCost: 'From 1 credit' },
    { icon: '✂️', label: 'Remove BG', route: '/background-removal', product: 'BackgroundRemoval', fallbackCost: 'From 4 credits' },
  ];

  productIcon(p: string) {
    const map: Record<string, string> = { ImageGen: '🖼️', ImageToVideo: '🎬', TextToVideo: '🎥', Voice: '🎙️', Transcription: '📝', BackgroundRemoval: '✂️' };
    return map[p] ?? '🎨';
  }

  productLabel(p: string) {
    const map: Record<string, string> = { ImageGen: 'Text to Image', ImageToVideo: 'Image to Video', TextToVideo: 'Text to Video', Voice: 'Text to Audio', Transcription: 'Audio to Text', BackgroundRemoval: 'Image Studio' };
    return map[p] ?? p;
  }

  ngOnInit() {
    this.modelCatalog.loadAll();
    this.gen.getJobs(1, 5).subscribe({
      next: r => { this.recentJobs.set(r.items); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  quickActionPrice(product: string, fallback: string) {
    const values = this.catalog()
      .filter(item => item.product === product && this.activeModelIdsForProduct(product).includes(item.id))
      .map(item => item.displayPrice);

    const parsed = values.map(v => this.parseDisplayPrice(v)).filter((v): v is number => v !== null);
    if (parsed.length > 0) {
      const min = Math.min(...parsed);
      return `From ${min} credit${min === 1 ? '' : 's'}`;
    }

    return fallback;
  }

  private activeModelIdsForProduct(product: string): string[] {
    const map: Record<string, string[]> = {
      ImageGen: ['fal-ai/flux/schnell', 'fal-ai/flux-pro/v1.1', 'fal-ai/flux-2-pro', 'fal-ai/nano-banana', 'fal-ai/nano-banana-2', 'fal-ai/nano-banana-pro', 'fal-ai/imagen3/fast', 'fal-ai/imagen4/preview', 'fal-ai/bytedance/seedream/v4/text-to-image', 'fal-ai/bytedance/seedream/v5/lite/text-to-image', 'fal-ai/ideogram/v2', 'fal-ai/ideogram/v3'],
      ImageToVideo: ['fal-ai/kling-video/v3/pro/image-to-video', 'fal-ai/kling-video/o3/standard/image-to-video', 'fal-ai/kling-video/v2.6/pro/image-to-video', 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video', 'fal-ai/minimax/hailuo-2.3/pro/image-to-video', 'fal-ai/minimax/hailuo-02/standard/image-to-video', 'fal-ai/veo3.1/image-to-video', 'fal-ai/veo3.1/fast/first-last-frame-to-video', 'fal-ai/veo3/fast', 'fal-ai/veo3/image-to-video'],
      TextToVideo: ['fal-ai/kling-video/v3/pro/text-to-video', 'fal-ai/kling-video/o3/pro/text-to-video', 'fal-ai/kling-video/v2.6/pro/text-to-video', 'fal-ai/kling-video/v2.5-turbo/pro/text-to-video', 'fal-ai/minimax/hailuo-2.3/pro/text-to-video', 'fal-ai/minimax/hailuo-02/standard/text-to-video', 'fal-ai/veo3.1', 'fal-ai/veo3.1/fast', 'fal-ai/veo3'],
      Voice: ['fal-ai/kokoro/american-english', 'fal-ai/kokoro/british-english', 'fal-ai/kokoro/spanish', 'fal-ai/kokoro/french', 'fal-ai/kokoro/japanese', 'fal-ai/kokoro/brazilian-portuguese', 'fal-ai/kokoro/hindi', 'fal-ai/kokoro/mandarin-chinese', 'fal-ai/kokoro/italian', 'fal-ai/elevenlabs/tts/eleven-v3', 'fal-ai/elevenlabs/tts/turbo-v2.5', 'fal-ai/elevenlabs/tts/multilingual-v2', 'fal-ai/minimax/speech-2.8-hd', 'fal-ai/f5-tts'],
      Transcription: ['fal-ai/whisper', 'fal-ai/wizper', 'fal-ai/elevenlabs/speech-to-text/scribe-v2', 'fal-ai/elevenlabs/speech-to-text'],
      BackgroundRemoval: ['fal-ai/bria/background/remove', 'fal-ai/bria/background/replace', 'fal-ai/image-editing/object-removal', 'fal-ai/ideogram/v3/edit', 'fal-ai/iclight-v2', 'fal-ai/image-apps-v2/headshot-photo', 'fal-ai/image-apps-v2/makeup-application', 'fal-ai/flux-2-lora-gallery/ballpoint-pen-sketch', 'fal-ai/flux-2-lora-gallery/digital-comic-art', 'fal-ai/flux-2-lora-gallery/sepia-vintage', 'fal-ai/flux-2-lora-gallery/face-to-full-portrait', 'fal-ai/flux-2-lora-gallery/virtual-tryon', 'fal-ai/qwen-image-edit-plus-lora-gallery/integrate-product']
    };
    return map[product] ?? [];
  }

  private parseDisplayPrice(value: string): number | null {
    const exact = /^(\d+)\s+credits?$/.exec(value);
    if (exact) return Number(exact[1]);
    const rangePerSecond = /^(\d+)-(\d+)\s+cr\/s$/.exec(value);
    if (rangePerSecond) return Number(rangePerSecond[1]);
    const perSecond = /^(\d+)\s+cr\/s$/.exec(value);
    if (perSecond) return Number(perSecond[1]);
    const perMinute = /^(\d+)\s+cr\/min$/.exec(value);
    if (perMinute) return Number(perMinute[1]);
    const perK = /^(\d+)\s+cr\/1K chars$/.exec(value);
    if (perK) return Number(perK[1]);
    return null;
  }
}
