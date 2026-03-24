import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';
import { ExploreService } from '../../core/services/explore.service';
import { LoginModalService } from '../../core/services/login-modal.service';
import type { ExploreItemDto } from '../../core/models/models';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
<!-- ===== NAVBAR ===== -->
<nav class="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
    <!-- Logo -->
    <a routerLink="/" class="flex items-center gap-2.5 flex-shrink-0">
      <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 128 128">
        <defs>
          <linearGradient id="land-logo-g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#8B5CF6"/>
            <stop offset="100%" stop-color="#4F46E5"/>
          </linearGradient>
        </defs>
        <rect width="128" height="128" rx="28" fill="url(#land-logo-g)"/>
        <rect x="18" y="18" width="8" height="92" rx="4" fill="rgba(255,255,255,0.2)"/>
        <rect x="20" y="26" width="4" height="6" rx="2" fill="rgba(255,255,255,0.5)"/>
        <rect x="20" y="40" width="4" height="6" rx="2" fill="rgba(255,255,255,0.5)"/>
        <rect x="20" y="54" width="4" height="6" rx="2" fill="rgba(255,255,255,0.5)"/>
        <rect x="20" y="68" width="4" height="6" rx="2" fill="rgba(255,255,255,0.5)"/>
        <rect x="20" y="82" width="4" height="6" rx="2" fill="rgba(255,255,255,0.5)"/>
        <rect x="20" y="96" width="4" height="6" rx="2" fill="rgba(255,255,255,0.5)"/>
        <rect x="102" y="18" width="8" height="92" rx="4" fill="rgba(255,255,255,0.2)"/>
        <rect x="104" y="26" width="4" height="6" rx="2" fill="rgba(255,255,255,0.5)"/>
        <rect x="104" y="40" width="4" height="6" rx="2" fill="rgba(255,255,255,0.5)"/>
        <rect x="104" y="54" width="4" height="6" rx="2" fill="rgba(255,255,255,0.5)"/>
        <rect x="104" y="68" width="4" height="6" rx="2" fill="rgba(255,255,255,0.5)"/>
        <rect x="104" y="82" width="4" height="6" rx="2" fill="rgba(255,255,255,0.5)"/>
        <rect x="104" y="96" width="4" height="6" rx="2" fill="rgba(255,255,255,0.5)"/>
        <polygon points="50,42 50,86 88,64" fill="white" opacity="0.95"/>
        <circle cx="90" cy="36" r="5" fill="#A78BFA"/>
      </svg>
      <span style="font-size:16px;font-weight:700;color:#111827;">Ai<span style="color:#7c3aed;">Media</span></span>
    </a>

    <!-- Nav links (desktop) -->
    <div class="hidden md:flex items-center gap-1">
      <a routerLink="/explore"
         class="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
        Explore
      </a>
      <a routerLink="/faq"
         class="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
        FAQ
      </a>
      <a routerLink="/contact"
         class="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
        Contact
      </a>
    </div>

    <!-- Auth CTAs -->
    <div class="flex items-center gap-2 flex-shrink-0">
      @if (auth.isLoggedIn()) {
        <a routerLink="/dashboard"
           class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
           style="background:#7c3aed;">
          Go to Dashboard
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
        </a>
      } @else {
        <button (click)="loginModal.show()"
                class="hidden sm:inline-flex px-4 py-2 rounded-lg text-sm font-medium text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors">
          Login
        </button>
        <button (click)="loginModal.show('register')"
                class="inline-flex px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                style="background:#7c3aed;">
          Sign Up Free
        </button>
      }
    </div>
  </div>
</nav>

<!-- ===== HERO ===== -->
<section class="relative overflow-hidden pt-16">
  <div class="absolute inset-0 -z-10"
       style="background: linear-gradient(135deg, #faf5ff 0%, #ede9fe 30%, #f0f4ff 60%, #ffffff 100%);">
  </div>
  <div class="absolute top-0 right-0 -z-10 w-96 h-96 rounded-full opacity-20 blur-3xl"
       style="background: radial-gradient(circle, #7c3aed, transparent 70%); transform: translate(30%, -30%);"></div>

  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 text-center">
    <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-5 border"
         style="background:#f5f3ff; border-color:#ddd6fe; color:#6d28d9;">
      <span class="w-2 h-2 rounded-full animate-pulse" style="background:#7c3aed;"></span>
      100 free credits on signup — no credit card required
    </div>
    <h1 class="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight mb-4">
      Create stunning <span style="color:#7c3aed;">AI media</span> in seconds
    </h1>
    <p class="text-lg text-gray-500 max-w-xl mx-auto mb-8">
      Generate images, videos, voice, and more — powered by cutting-edge AI. Pick a tool and start creating.
    </p>
    <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
      <button (click)="loginModal.show('register')"
              class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02]"
              style="background: linear-gradient(135deg, #7c3aed, #4f46e5);">
        Start for Free
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/>
        </svg>
      </button>
      <a routerLink="/explore"
         class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold text-gray-700 border-2 border-gray-200 bg-white hover:border-gray-300 transition-colors">
        Browse Community Work
      </a>
    </div>
  </div>
</section>

<!-- ===== TOOL DISCOVERY GRID ===== -->
<section class="py-16 bg-white">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="text-center mb-10">
      <p class="text-sm font-semibold uppercase tracking-widest mb-2" style="color:#7c3aed;">6 AI Tools</p>
      <h2 class="text-2xl sm:text-3xl font-extrabold text-gray-900">What do you want to create?</h2>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      @for (tool of tools; track tool.route) {
        <div class="group relative rounded-2xl border border-gray-100 bg-white overflow-hidden hover:border-purple-200 hover:shadow-xl transition-all duration-200"
             style="cursor:pointer;" (click)="tryTool(tool.route)">
          <!-- Colored top bar -->
          <div class="h-1.5 w-full" [style.background]="tool.color"></div>

          <div class="p-6">
            <!-- Icon + title row -->
            <div class="flex items-start gap-4 mb-3">
              <div class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform duration-200"
                   [style.background]="tool.bgColor">
                {{ tool.icon }}
              </div>
              <div>
                <h3 class="text-base font-semibold text-gray-900">{{ tool.title }}</h3>
                <span class="text-[11px] font-medium px-2 py-0.5 rounded-full"
                      [style.background]="tool.bgColor" [style.color]="tool.textColor">
                  from {{ tool.minCredits }} credits
                </span>
              </div>
            </div>

            <p class="text-sm text-gray-500 leading-relaxed mb-4">{{ tool.description }}</p>

            <!-- CTA -->
            <div class="flex items-center gap-1.5 text-sm font-semibold transition-colors"
                 [style.color]="tool.textColor">
              @if (auth.isLoggedIn()) {
                Try it now
              } @else {
                Sign up to try
              }
              <svg class="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/>
              </svg>
            </div>
          </div>
        </div>
      }
    </div>
  </div>
</section>

<!-- ===== RECENT FROM EXPLORE ===== -->
<section class="py-16" style="background:#f9fafb;">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex items-end justify-between mb-8">
      <div>
        <p class="text-sm font-semibold uppercase tracking-widest mb-1" style="color:#7c3aed;">Community</p>
        <h2 class="text-2xl sm:text-3xl font-extrabold text-gray-900">Recent creations</h2>
      </div>
      <a routerLink="/explore"
         class="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold transition-colors hover:underline"
         style="color:#7c3aed;">
        See all
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/>
        </svg>
      </a>
    </div>

    <!-- Loading skeleton -->
    @if (recentLoading()) {
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        @for (s of skeletons; track s) {
          <div class="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
            <div class="bg-gray-200 aspect-square"></div>
            <div class="p-3 space-y-2">
              <div class="h-3 bg-gray-200 rounded w-16"></div>
              <div class="h-3 bg-gray-200 rounded w-full"></div>
            </div>
          </div>
        }
      </div>
    }

    <!-- Items grid -->
    @else if (recentItems().length > 0) {
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        @for (item of recentItems(); track item.id) {
          <a routerLink="/explore"
             class="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group block">
            <!-- Thumbnail -->
            <div class="relative aspect-square bg-gray-100 overflow-hidden">
              @if (isVideoItem(item)) {
                <video [src]="item.outputUrl" class="w-full h-full object-cover" muted preload="metadata"
                       (mouseenter)="$any($event.target).play()" (mouseleave)="$any($event.target).pause()"></video>
                <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div class="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center">
                    <svg class="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                </div>
              } @else if (isAudioItem(item)) {
                <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-purple-100">
                  <svg class="w-10 h-10 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
                  </svg>
                </div>
              } @else if (isTranscriptionItem(item)) {
                <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
                  <svg class="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                </div>
              } @else {
                <img [src]="item.outputUrl" [alt]="item.prompt || 'AI output'"
                     class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                     loading="lazy"/>
              }
            </div>
            <!-- Caption -->
            <div class="p-2.5">
              <div class="flex items-center gap-1.5 mb-1">
                <span class="px-1.5 py-0.5 text-[10px] font-semibold rounded text-white"
                      [style.background]="getProductColor(item.product)">
                  {{ getProductLabel(item.product) }}
                </span>
              </div>
              @if (item.prompt) {
                <p class="text-xs text-gray-500 line-clamp-1">{{ item.prompt }}</p>
              }
            </div>
          </a>
        }
      </div>

      <!-- Mobile see all -->
      <div class="mt-6 text-center sm:hidden">
        <a routerLink="/explore"
           class="inline-flex items-center gap-1.5 text-sm font-semibold"
           style="color:#7c3aed;">
          See all community creations
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/>
          </svg>
        </a>
      </div>
    }
  </div>
</section>

<!-- ===== FOOTER ===== -->
<footer class="bg-gray-900 text-gray-400 py-10">
  <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
      <div class="text-center md:text-left">
        <div class="flex items-center gap-2 justify-center md:justify-start mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 128 128">
            <defs>
              <linearGradient id="foot-logo-g" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#8B5CF6"/>
                <stop offset="100%" stop-color="#4F46E5"/>
              </linearGradient>
            </defs>
            <rect width="128" height="128" rx="28" fill="url(#foot-logo-g)"/>
            <rect x="18" y="18" width="8" height="92" rx="4" fill="rgba(255,255,255,0.2)"/>
            <rect x="20" y="26" width="4" height="6" rx="2" fill="rgba(255,255,255,0.5)"/>
            <rect x="20" y="40" width="4" height="6" rx="2" fill="rgba(255,255,255,0.5)"/>
            <rect x="20" y="54" width="4" height="6" rx="2" fill="rgba(255,255,255,0.5)"/>
            <rect x="20" y="68" width="4" height="6" rx="2" fill="rgba(255,255,255,0.5)"/>
            <rect x="20" y="82" width="4" height="6" rx="2" fill="rgba(255,255,255,0.5)"/>
            <rect x="20" y="96" width="4" height="6" rx="2" fill="rgba(255,255,255,0.5)"/>
            <rect x="102" y="18" width="8" height="92" rx="4" fill="rgba(255,255,255,0.2)"/>
            <rect x="104" y="26" width="4" height="6" rx="2" fill="rgba(255,255,255,0.5)"/>
            <rect x="104" y="40" width="4" height="6" rx="2" fill="rgba(255,255,255,0.5)"/>
            <rect x="104" y="54" width="4" height="6" rx="2" fill="rgba(255,255,255,0.5)"/>
            <rect x="104" y="68" width="4" height="6" rx="2" fill="rgba(255,255,255,0.5)"/>
            <rect x="104" y="82" width="4" height="6" rx="2" fill="rgba(255,255,255,0.5)"/>
            <rect x="104" y="96" width="4" height="6" rx="2" fill="rgba(255,255,255,0.5)"/>
            <polygon points="50,42 50,86 88,64" fill="white" opacity="0.95"/>
            <circle cx="90" cy="36" r="5" fill="#A78BFA"/>
            <line x1="90" y1="28" x2="90" y2="32" stroke="white" stroke-width="2" stroke-linecap="round"/>
            <line x1="90" y1="40" x2="90" y2="44" stroke="white" stroke-width="2" stroke-linecap="round"/>
            <line x1="82" y1="36" x2="86" y2="36" stroke="white" stroke-width="2" stroke-linecap="round"/>
            <line x1="94" y1="36" x2="98" y2="36" stroke="white" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span style="font-size:15px;font-weight:700;color:white;">Ai<span style="color:#a78bfa;">Media</span></span>
        </div>
        <p class="text-sm text-gray-500">AI-Powered Media Creation</p>
      </div>
      <div class="flex flex-wrap justify-center md:justify-end gap-x-8 gap-y-2 text-sm">
        <a routerLink="/explore" class="hover:text-white transition-colors">Explore</a>
        <a routerLink="/faq" class="hover:text-white transition-colors">FAQ</a>
        <a routerLink="/contact" class="hover:text-white transition-colors">Contact Us</a>
        <button (click)="loginModal.show('login')" class="hover:text-white transition-colors">Login</button>
        <button (click)="loginModal.show('register')" class="hover:text-white transition-colors">Sign Up</button>
      </div>
    </div>
    <div class="mt-8 pt-6 border-t border-gray-800 text-center text-xs text-gray-600">
      &copy; {{ currentYear }} AiMedia. All rights reserved.
    </div>
  </div>
</footer>
  `
})
export class LandingComponent implements OnInit {
  auth = inject(AuthService);
  loginModal = inject(LoginModalService);
  private exploreSvc = inject(ExploreService);
  private router = inject(Router);

  currentYear = new Date().getFullYear();
  recentItems = signal<ExploreItemDto[]>([]);
  recentLoading = signal(true);
  skeletons = Array(8).fill(0);

  tools = [
    {
      icon: '🖼️',
      title: 'Image Generation',
      description: 'Turn text prompts into stunning, high-quality images using state-of-the-art diffusion models.',
      route: '/image-gen',
      minCredits: 5,
      color: 'linear-gradient(90deg, #7C3AED, #6D28D9)',
      bgColor: '#f5f3ff',
      textColor: '#7c3aed',
    },
    {
      icon: '🎬',
      title: 'Image to Video',
      description: 'Animate any image into a dynamic, fluid video clip — bring your photos to life.',
      route: '/image-to-video',
      minCredits: 5,
      color: 'linear-gradient(90deg, #EF4444, #DC2626)',
      bgColor: '#fef2f2',
      textColor: '#dc2626',
    },
    {
      icon: '🎥',
      title: 'Text to Video',
      description: 'Generate cinematic videos directly from text descriptions — no footage required.',
      route: '/text-to-video',
      minCredits: 5,
      color: 'linear-gradient(90deg, #F97316, #EA580C)',
      bgColor: '#fff7ed',
      textColor: '#ea580c',
    },
    {
      icon: '🎙️',
      title: 'Text to Voice',
      description: 'Convert text to natural, expressive speech with realistic AI voices.',
      route: '/voice',
      minCredits: 4,
      color: 'linear-gradient(90deg, #059669, #047857)',
      bgColor: '#f0fdf4',
      textColor: '#059669',
    },
    {
      icon: '📝',
      title: 'Transcription',
      description: 'Transcribe any audio or video file to accurate, formatted text instantly.',
      route: '/transcription',
      minCredits: 10,
      color: 'linear-gradient(90deg, #2563EB, #1D4ED8)',
      bgColor: '#eff6ff',
      textColor: '#2563eb',
    },
    {
      icon: '✂️',
      title: 'Background Removal',
      description: 'Remove backgrounds from images in one click with pixel-perfect AI precision.',
      route: '/background-removal',
      minCredits: 3,
      color: 'linear-gradient(90deg, #0891B2, #0E7490)',
      bgColor: '#ecfeff',
      textColor: '#0891b2',
    },
  ];

  ngOnInit() {
    this.exploreSvc.getExplore(1, 8).subscribe({
      next: result => {
        this.recentItems.set(result.items);
        this.recentLoading.set(false);
      },
      error: () => this.recentLoading.set(false)
    });
  }

  tryTool(route: string) {
    if (!this.auth.isLoggedIn()) {
      this.loginModal.show();
    } else {
      this.router.navigate([route]);
    }
  }

  isVideoItem(item: ExploreItemDto): boolean {
    return item.product === 'ImageToVideo' || item.product === 'TextToVideo';
  }

  isAudioItem(item: ExploreItemDto): boolean {
    return item.product === 'Voice';
  }

  isTranscriptionItem(item: ExploreItemDto): boolean {
    return item.product === 'Transcription';
  }

  getProductLabel(product: string): string {
    const labels: Record<string, string> = {
      ImageGen: 'Image', ImageToVideo: 'Img→Video', TextToVideo: 'Text→Video',
      Voice: 'Voice', Transcription: 'Transcript', BackgroundRemoval: 'BG Removal',
    };
    return labels[product] ?? product;
  }

  getProductColor(product: string): string {
    const colors: Record<string, string> = {
      ImageGen: '#7C3AED', ImageToVideo: '#EF4444', TextToVideo: '#F97316',
      Voice: '#059669', Transcription: '#2563EB', BackgroundRemoval: '#0891B2',
    };
    return colors[product] ?? '#6B7280';
  }
}
