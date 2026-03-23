import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../core/auth/auth.service';
import { LoginModalService } from '../core/services/login-modal.service';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  badge?: string;
  badgeColor?: string;
}

interface NavGroup {
  category: string;
  items: NavItem[];
}

@Component({
  selector: 'app-public-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
<div class="flex h-screen overflow-hidden bg-gray-50">

  <!-- Mobile overlay -->
  @if (sidebarOpen()) {
    <div class="fixed inset-0 bg-black/40 z-40 lg:hidden" (click)="sidebarOpen.set(false)"></div>
  }

  <!-- Sidebar -->
  <aside class="fixed lg:static inset-y-0 left-0 z-50 w-56 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-full overflow-y-auto transition-transform duration-300 lg:translate-x-0"
         [class.-translate-x-full]="!sidebarOpen()">

    <!-- Logo -->
    <div class="px-4 py-4 flex items-center gap-2.5 border-b border-gray-100">
      <a routerLink="/" class="flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 128 128">
          <defs>
            <linearGradient id="pub-logo-g" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#8B5CF6"/>
              <stop offset="100%" stop-color="#4F46E5"/>
            </linearGradient>
          </defs>
          <rect width="128" height="128" rx="28" fill="url(#pub-logo-g)"/>
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
        </svg>
        <span style="font-size:15px;font-weight:700;color:#111827;">Ai<span style="color:#7c3aed;">Media</span></span>
      </a>
    </div>

    <!-- Nav -->
    <nav class="flex-1 px-3 py-3 overflow-y-auto">

      <!-- Top links -->
      <a routerLink="/"
         class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-gray-700 hover:bg-gray-100 mb-0.5">
        <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
        </svg>
        Home
      </a>

      <a routerLink="/explore" routerLinkActive="!bg-violet-50 !text-accent !font-semibold"
         class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-gray-700 hover:bg-gray-100 mb-0.5">
        <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        Explore
      </a>

      <div class="my-2 border-t border-gray-100"></div>

      <!-- Tool groups -->
      @for (group of navGroups; track group.category) {
        <p class="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
          {{ group.category }}
        </p>
        @for (item of group.items; track item.route) {
          <button (click)="navigate(item.route)"
                  class="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors text-left mb-0.5">
            <span class="text-base leading-none flex-shrink-0">{{ item.icon }}</span>
            <span class="flex-1 truncate">{{ item.label }}</span>
            @if (item.badge) {
              <span class="text-[9px] font-bold px-1.5 py-0.5 rounded text-white flex-shrink-0"
                    [style.background]="item.badgeColor ?? '#ef4444'">
                {{ item.badge }}
              </span>
            }
          </button>
        }
      }
    </nav>

    <!-- Bottom auth CTA -->
    <div class="px-3 py-3 border-t border-gray-100">
      @if (auth.isLoggedIn()) {
        <a routerLink="/dashboard"
           class="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
           style="background:#7c3aed;">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
          Go to Dashboard
        </a>
      } @else {
        <button (click)="loginModal.show()"
                class="flex items-center justify-center w-full px-3 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors"
                style="background:#7c3aed;">
          Login / Sign Up
        </button>
      }
    </div>
  </aside>

  <!-- Main content -->
  <div class="flex-1 flex flex-col min-w-0 overflow-hidden">

    <!-- Mobile topbar -->
    <div class="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
      <button (click)="sidebarOpen.set(true)"
              class="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      </button>
      <span style="font-size:15px;font-weight:700;color:#111827;">Ai<span style="color:#7c3aed;">Media</span></span>
    </div>

    <div class="flex-1 overflow-y-auto">
      <router-outlet></router-outlet>
    </div>
  </div>

</div>
  `
})
export class PublicShellComponent {
  auth = inject(AuthService);
  loginModal = inject(LoginModalService);
  private router = inject(Router);
  sidebarOpen = signal(false);

  navGroups: NavGroup[] = [
    {
      category: 'Image AI',
      items: [
        { label: 'Image Generation', route: '/image-gen', icon: '🖼️' },
        { label: 'Background Removal', route: '/background-removal', icon: '✂️' },
      ]
    },
    {
      category: 'Video AI',
      items: [
        { label: 'Image to Video', route: '/image-to-video', icon: '🎬', badge: 'HOT', badgeColor: '#ef4444' },
        { label: 'Text to Video', route: '/text-to-video', icon: '🎥' },
      ]
    },
    {
      category: 'Audio AI',
      items: [
        { label: 'Text to Voice', route: '/voice', icon: '🎙️' },
        { label: 'Transcription', route: '/transcription', icon: '📝' },
      ]
    },
  ];

  navigate(route: string) {
    this.router.navigate([route]);
  }
}
