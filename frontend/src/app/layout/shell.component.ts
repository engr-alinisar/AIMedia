import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../core/auth/auth.service';
import { CreditsService } from '../core/services/credits.service';
import { SignalRService } from '../core/services/signalr.service';
import { GenerationService } from '../core/services/generation.service';

interface NavItem { label: string; icon: string; route: string; badge?: string; }
interface NavGroup { category: string; items: NavItem[]; }

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
<div class="flex h-screen overflow-hidden bg-surface">

  <!-- Sidebar -->
  <aside class="w-56 flex-shrink-0 bg-sidebar flex flex-col h-full overflow-y-auto">
    <!-- Logo -->
    <div class="px-4 py-5 flex items-center gap-2.5">
      <div class="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
        <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      </div>
      <span class="text-white font-semibold text-base">AiMedia</span>
    </div>

    <!-- Nav -->
    <nav class="flex-1 px-2 pb-4">
      @for (group of navGroups; track group.category) {
        <p class="nav-category">{{ group.category }}</p>
        @for (item of group.items; track item.route) {
          <a class="nav-item" [routerLink]="item.route" routerLinkActive="active">
            <span class="text-base">{{ item.icon }}</span>
            <span class="flex-1">{{ item.label }}</span>
            @if (item.badge) {
              <span class="px-1.5 py-0.5 text-[10px] font-bold rounded bg-accent text-white">{{ item.badge }}</span>
            }
          </a>
        }
      }
    </nav>

    <!-- User -->
    <div class="px-3 py-3 border-t border-white/10">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-full bg-accent-light flex items-center justify-center text-accent font-semibold text-sm">
          {{ userInitial() }}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-white text-xs font-medium truncate">{{ auth.user()?.email }}</p>
          <p class="text-gray-400 text-xs">{{ auth.user()?.plan }}</p>
        </div>
        <button (click)="auth.logout()" class="text-gray-500 hover:text-gray-300 transition-colors" title="Logout">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
        </button>
      </div>
    </div>
  </aside>

  <!-- Main -->
  <div class="flex-1 flex flex-col overflow-hidden">
    <!-- Top bar -->
    <header class="h-12 bg-white border-b border-border flex items-center justify-end px-6 gap-4 flex-shrink-0">
      <!-- Credit balance -->
      <a routerLink="/credits" class="flex items-center gap-1.5 text-sm text-gray-600 hover:text-accent transition-colors">
        <svg class="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10"/>
          <path fill="white" d="M12 6v12M9 9h4.5a1.5 1.5 0 010 3H10.5a1.5 1.5 0 000 3H15"/>
        </svg>
        <span class="font-semibold text-gray-900">{{ credits.balance().balance }}</span>
        <span class="text-gray-400">credits</span>
        @if (credits.balance().balance < 50) {
          <span class="px-1.5 py-0.5 text-[10px] bg-red-50 text-red-600 rounded font-medium">Low</span>
        }
      </a>
    </header>

    <!-- Page content -->
    <main class="flex-1 overflow-y-auto">
      <router-outlet/>
    </main>
  </div>
</div>
  `
})
export class ShellComponent implements OnInit, OnDestroy {
  auth = inject(AuthService);
  credits = inject(CreditsService);
  private signalR = inject(SignalRService);
  private generation = inject(GenerationService);

  navGroups: NavGroup[] = [
    {
      category: 'Video AI',
      items: [
        { label: 'Image to Video', icon: '🎬', route: '/image-to-video', badge: 'HOT' },
        { label: 'Text to Video',  icon: '🎥', route: '/text-to-video' },
      ]
    },
    {
      category: 'Image AI',
      items: [
        { label: 'Image Generation', icon: '🖼️', route: '/image-gen' },
        { label: 'Background Removal', icon: '✂️', route: '/background-removal' },
      ]
    },
    {
      category: 'Audio AI',
      items: [
        { label: 'Text to Voice', icon: '🎙️', route: '/voice' },
        { label: 'Transcription',  icon: '📝', route: '/transcription' },
      ]
    },
    {
      category: 'Account',
      items: [
        { label: 'Dashboard',    icon: '🏠', route: '/dashboard' },
        { label: 'My Jobs',      icon: '📋', route: '/jobs' },
        { label: 'Credits',      icon: '💳', route: '/credits' },
      ]
    }
  ];

  userInitial() {
    const u = this.auth.user();
    return (u?.fullName ?? u?.email ?? 'U')[0].toUpperCase();
  }

  ngOnInit() {
    this.signalR.start();
    this.credits.loadBalance().subscribe();

    // Wire SignalR updates to pending jobs
    // Using effect-like pattern with computed
    this.watchUpdates();
  }

  private updateInterval?: ReturnType<typeof setInterval>;

  private watchUpdates() {
    // Poll for SignalR updates
    this.updateInterval = setInterval(() => {
      const update = this.signalR.latestUpdate();
      if (update) {
        this.generation.applyUpdate(update);
        if (update.status === 'Completed' || update.status === 'Failed') {
          this.credits.loadBalance().subscribe();
        }
      }
    }, 500);
  }

  ngOnDestroy() {
    clearInterval(this.updateInterval);
    this.signalR.stop();
  }
}
