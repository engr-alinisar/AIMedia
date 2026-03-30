import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ExploreService } from '../../core/services/explore.service';
import { AuthService } from '../../core/auth/auth.service';
import { LoginModalService } from '../../core/services/login-modal.service';
import { ExploreItemModalComponent } from '../../shared/components/explore-item-modal/explore-item-modal.component';
import type { ExploreItemDto } from '../../core/models/models';

interface FilterItem {
  label: string;
  value: string | null;
}

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [CommonModule, ExploreItemModalComponent],
  template: `
<div class="min-h-full bg-gray-50">
  <!-- Header -->
  <div class="bg-white border-b border-border px-4 lg:px-8 py-5">
    <div class="max-w-7xl mx-auto">
      <h1 class="text-xl font-bold text-gray-900">Explore</h1>
      <p class="text-sm text-gray-500 mt-0.5">Discover AI-generated media from the community</p>
    </div>
  </div>

  <!-- Filter bar -->
  <div class="bg-white border-b border-border sticky top-0 z-10">
    <div class="max-w-7xl mx-auto px-4 lg:px-8 py-3">
      <div class="flex flex-wrap gap-2">
        @for (f of filters; track f.value) {
          <button (click)="setFilter(f.value)"
                  class="px-3 py-1.5 text-xs font-medium rounded-full border transition-colors whitespace-nowrap"
                  [class.bg-accent]="activeFilter() === f.value"
                  [class.text-white]="activeFilter() === f.value"
                  [class.border-accent]="activeFilter() === f.value"
                  [class.bg-white]="activeFilter() !== f.value"
                  [class.text-gray-600]="activeFilter() !== f.value"
                  [class.border-border]="activeFilter() !== f.value"
                  [class.hover:bg-gray-50]="activeFilter() !== f.value">
            {{ f.label }}
          </button>
        }
      </div>
    </div>
  </div>

  <!-- Content -->
  <div class="max-w-7xl mx-auto px-4 lg:px-8 py-6">

    <!-- Loading skeleton -->
    @if (loading()) {
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        @for (s of skeletons; track $index) {
          <div class="bg-white rounded-xl border border-border overflow-hidden animate-pulse">
            <div class="bg-gray-200 aspect-square"></div>
            <div class="p-3 space-y-2">
              <div class="h-3 bg-gray-200 rounded w-16"></div>
              <div class="h-3 bg-gray-200 rounded w-full"></div>
              <div class="h-3 bg-gray-200 rounded w-3/4"></div>
              <div class="h-7 bg-gray-200 rounded-lg w-full mt-1"></div>
            </div>
          </div>
        }
      </div>
    }

    <!-- Empty state -->
    @else if (items().length === 0) {
      <div class="flex flex-col items-center justify-center py-24 text-center">
        <div class="text-5xl mb-4">🔍</div>
        <h3 class="text-lg font-semibold text-gray-700">No public creations yet</h3>
        <p class="text-sm text-gray-400 mt-1 max-w-xs">Be the first to share your AI-generated media with the community!</p>
      </div>
    }

    <!-- Grid -->
    @else {
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        @for (item of items(); track item.id) {
          <div class="bg-white rounded-xl border border-border overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 group cursor-pointer"
               (click)="selectedItem.set(item)">

            <!-- Media thumbnail -->
            <div class="relative aspect-square bg-gray-100 overflow-hidden">
              @if (isVideo(item)) {
                <video [src]="item.outputUrl" class="w-full h-full object-cover" muted preload="metadata"
                       (mouseenter)="safePlay($event)" (mouseleave)="$any($event.target).pause()"></video>
                <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div class="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center group-hover:opacity-0 transition-opacity">
                    <svg class="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                </div>
              } @else if (isAudio(item)) {
                <div class="w-full h-full flex flex-col items-center justify-center p-4"
                     [style]="audioMoodGradient(item)">
                  <div class="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-2">
                    <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
                    </svg>
                  </div>
                  @if (item.title) {
                    <p class="text-xs text-white font-semibold text-center line-clamp-2 leading-snug px-1">{{ item.title }}</p>
                  } @else {
                    <p class="text-xs text-white/80 text-center font-medium">{{ item.zone || 'Audio' }}</p>
                  }
                </div>
              } @else if (isTranscription(item)) {
                <div class="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
                  <div class="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center mb-2">
                    <svg class="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                  </div>
                  <p class="text-xs text-gray-500 text-center">Transcript</p>
                </div>
              } @else {
                <img [src]="item.outputUrl" [alt]="item.prompt || 'AI generated image'"
                     class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                     loading="lazy"/>
              }

              <!-- Hover expand hint -->
              <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center pointer-events-none">
                <div class="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg">
                  <svg class="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"/>
                  </svg>
                </div>
              </div>
            </div>

            <!-- Card body -->
            <div class="p-3 space-y-2">
              <!-- Product badge + user -->
              <div class="flex items-center justify-between gap-1">
                <span class="px-1.5 py-0.5 text-[10px] font-semibold rounded"
                      [style.background]="productColor(item.product)"
                      style="color:white">{{ productLabel(item.product) }}</span>
                <span class="text-[10px] text-gray-400 truncate">{{ item.userDisplayName }}</span>
              </div>

              <!-- Title (audio) or Prompt -->
              @if (isAudio(item) && item.title) {
                <p class="text-xs font-semibold text-gray-800 line-clamp-1">{{ item.title }}</p>
                @if (item.prompt) {
                  <p class="text-xs text-gray-500 line-clamp-1 leading-relaxed">{{ item.prompt }}</p>
                }
              } @else if (item.prompt) {
                <p class="text-xs text-gray-600 line-clamp-2 leading-relaxed">{{ item.prompt }}</p>
              } @else {
                <p class="text-xs text-gray-400 italic">{{ noPromptLabel(item.product) }}</p>
              }

              <!-- Try this button -->
              <button (click)="$event.stopPropagation(); tryThis(item)"
                      class="w-full flex items-center justify-center gap-1 px-3 py-1.5 bg-accent text-white text-xs font-medium rounded-lg hover:bg-accent/90 transition-colors">
                Try this
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
          </div>
        }
      </div>

      <!-- Pagination -->
      @if (totalPages() > 1) {
        <div class="flex items-center justify-center gap-2 mt-8">
          <button (click)="goToPage(currentPage() - 1)" [disabled]="currentPage() === 1"
                  class="px-3 py-1.5 text-sm border border-border rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Previous
          </button>
          @for (p of pageNumbers(); track p) {
            @if (p === -1) {
              <span class="px-2 text-gray-400">...</span>
            } @else {
              <button (click)="goToPage(p)"
                      class="w-8 h-8 text-sm rounded-lg font-medium transition-colors"
                      [class.bg-accent]="p === currentPage()"
                      [class.text-white]="p === currentPage()"
                      [class.text-gray-600]="p !== currentPage()"
                      [class.hover:bg-gray-100]="p !== currentPage()">
                {{ p }}
              </button>
            }
          }
          <button (click)="goToPage(currentPage() + 1)" [disabled]="currentPage() === totalPages()"
                  class="px-3 py-1.5 text-sm border border-border rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Next
          </button>
        </div>
      }
    }

  </div>
</div>

<!-- Lightbox modal -->
@if (selectedItem()) {
  <app-explore-item-modal
    [item]="selectedItem()!"
    (closed)="selectedItem.set(null)"
    (tryThis)="tryThis($event); selectedItem.set(null)">
  </app-explore-item-modal>
}
  `
})
export class ExploreComponent implements OnInit {
  private exploreSvc = inject(ExploreService);
  private router = inject(Router);
  private auth = inject(AuthService);
  private loginModal = inject(LoginModalService);

  filters: FilterItem[] = [
    { label: 'All',             value: null },
    { label: 'Cinematic',       value: 'Cinematic' },
    { label: 'Character',       value: 'Character' },
    { label: 'Viral',           value: 'Viral' },
    { label: 'Dramatic',        value: 'Dramatic' },
    { label: 'Cool',            value: 'Cool' },
    { label: 'Playful',         value: 'Playful' },
    { label: 'Fantasy',         value: 'Fantasy' },
    { label: 'Dark',            value: 'Dark' },
    { label: 'Anime',           value: 'Anime' },
    { label: 'Narration',       value: 'Narration' },
    { label: 'Podcast',         value: 'Podcast' },
    { label: 'Character Voice', value: 'Character Voice' },
    { label: 'Storytelling',    value: 'Storytelling' },
    { label: 'Kids',            value: 'Kids' },
    { label: 'Meditation',      value: 'Meditation' },
    { label: 'News',            value: 'News' },
    { label: 'Entertainment',   value: 'Entertainment' },
  ];

  skeletons = Array(12).fill(0);

  loading = signal(true);
  items = signal<ExploreItemDto[]>([]);
  currentPage = signal(1);
  totalCount = signal(0);
  pageSize = 20;
  activeFilter = signal<string | null>(null);
  selectedItem = signal<ExploreItemDto | null>(null);

  totalPages = computed(() => Math.ceil(this.totalCount() / this.pageSize));

  pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: number[] = [];
    pages.push(1);
    if (current > 3) pages.push(-1);
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
    if (current < total - 2) pages.push(-1);
    pages.push(total);
    return pages;
  });

  ngOnInit() {
    this.load();
  }

  setFilter(value: string | null) {
    this.activeFilter.set(value);
    this.currentPage.set(1);
    this.load();
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.load();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private load() {
    this.loading.set(true);
    this.exploreSvc.getExplore(this.currentPage(), this.pageSize, this.activeFilter() ?? undefined).subscribe({
      next: result => {
        this.items.set(result.items);
        this.totalCount.set(result.totalCount);
        this.loading.set(false);
      },
      error: () => {
        this.items.set([]);
        this.loading.set(false);
      }
    });
  }

  isVideo(item: ExploreItemDto): boolean {
    return item.product === 'ImageToVideo' || item.product === 'TextToVideo';
  }

  isAudio(item: ExploreItemDto): boolean {
    return item.product === 'Voice';
  }

  audioMoodGradient(item: ExploreItemDto): string {
    const gradients: Record<string, string> = {
      'Narration':       'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'Podcast':         'background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
      'Character Voice': 'background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'Storytelling':    'background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'Kids':            'background: linear-gradient(135deg, #f9d423 0%, #ff4e50 100%)',
      'Meditation':      'background: linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
      'News':            'background: linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
      'Entertainment':   'background: linear-gradient(135deg, #fd7043 0%, #ef5350 100%)',
    };
    return gradients[item.zone ?? ''] ?? 'background: linear-gradient(135deg, #6b7280 0%, #374151 100%)';
  }

  isTranscription(item: ExploreItemDto): boolean {
    return item.product === 'Transcription';
  }

  productLabel(product: string): string {
    const labels: Record<string, string> = {
      ImageGen: 'Image Gen', ImageToVideo: 'Img → Video', TextToVideo: 'Text → Video',
      Voice: 'Voice', Transcription: 'Transcript', BackgroundRemoval: 'BG Removal',
    };
    return labels[product] ?? product;
  }

  productColor(product: string): string {
    const colors: Record<string, string> = {
      ImageGen: '#7C3AED', ImageToVideo: '#EF4444', TextToVideo: '#F97316',
      Voice: '#059669', Transcription: '#2563EB', BackgroundRemoval: '#0891B2',
    };
    return colors[product] ?? '#6B7280';
  }

  noPromptLabel(product: string): string {
    const labels: Record<string, string> = {
      Voice: 'Text-to-speech output', Transcription: 'Audio to Text output',
      BackgroundRemoval: 'Background removed', ImageToVideo: 'Image animated to video',
    };
    return labels[product] ?? 'AI generated content';
  }

  safePlay(event: Event) {
    (event.target as HTMLVideoElement).play().catch(() => {});
  }

  tryThis(item: ExploreItemDto) {
    if (!this.auth.isLoggedIn()) {
      this.loginModal.show();
      return;
    }
    const routes: Record<string, string> = {
      ImageGen: '/image-gen', ImageToVideo: '/image-to-video', TextToVideo: '/text-to-video',
      Voice: '/voice', Transcription: '/transcription', BackgroundRemoval: '/background-removal',
    };
    const route = routes[item.product];
    if (!route) return;
    const queryParams: Record<string, string> = {};
    if (item.prompt) queryParams['prompt'] = item.prompt;
    if (item.modelId) queryParams['model'] = item.modelId;
    if (item.outputUrl) queryParams['outputUrl'] = item.outputUrl;
    if (item.multiPrompts?.length) queryParams['multiPrompts'] = JSON.stringify(item.multiPrompts);
    this.router.navigate([route], { queryParams });
  }
}
