import { Component, OnInit, OnDestroy, inject, signal, effect, untracked } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../core/auth/auth.service';
import { CreditsService } from '../core/services/credits.service';
import { SignalRService } from '../core/services/signalr.service';
import { GenerationService } from '../core/services/generation.service';
import { NotificationService, AppNotification } from '../core/services/notification.service';

interface NavItem { label: string; icon: string; route: string; badge?: string; }
interface NavGroup { category: string; items: NavItem[]; }

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
<div class="flex h-screen overflow-hidden bg-surface">

  <!-- Mobile overlay -->
  @if (sidebarOpen()) {
    <div class="fixed inset-0 bg-black/40 z-40 lg:hidden" (click)="sidebarOpen.set(false)"></div>
  }

  <!-- Sidebar -->
  <aside class="fixed lg:static inset-y-0 left-0 z-50 w-64 lg:w-56 flex-shrink-0 bg-sidebar border-r border-border flex flex-col h-full overflow-y-auto transition-transform duration-300 lg:translate-x-0"
         [class.-translate-x-full]="!sidebarOpen()">
    <!-- Logo + mobile close -->
    <div class="px-4 py-5 flex items-center gap-2.5">
      <button class="lg:hidden absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              (click)="sidebarOpen.set(false)" aria-label="Close menu">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 128 128">
        <defs>
          <linearGradient id="logo-g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#8B5CF6"/>
            <stop offset="100%" stop-color="#4F46E5"/>
          </linearGradient>
        </defs>
        <rect width="128" height="128" rx="28" fill="url(#logo-g)"/>
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
      <div>
        <div style="font-size:15px;font-weight:700;color:#111827;line-height:1.1;">
          Ai<span style="color:#7C3AED;">Media</span>
        </div>
        <div style="font-size:9px;color:#9ca3af;letter-spacing:0.06em;text-transform:uppercase;">AI-Powered Media</div>
      </div>
    </div>


    <!-- Nav -->
    <nav class="flex-1 px-2 pb-4">
      @for (group of navGroups; track group.category) {
        <p class="nav-category">{{ group.category }}</p>
        @for (item of group.items; track item.route) {
          <a class="nav-item" [routerLink]="item.route" routerLinkActive="active" (click)="sidebarOpen.set(false)">
            <span class="text-base">{{ item.icon }}</span>
            <span class="flex-1">{{ item.label }}</span>
            @if (item.badge) {
              <span class="px-1.5 py-0.5 text-[10px] font-bold rounded bg-accent text-white">{{ item.badge }}</span>
            }
          </a>
        }
      }
    </nav>

    <!-- User menu -->
    <div class="px-3 py-3 border-t border-gray-200 relative" data-user-menu>
      <!-- Popup menu -->
      @if (showUserMenu()) {
        <div class="absolute bottom-full left-2 right-2 mb-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
          <div class="px-4 py-3 border-b border-gray-100">
            <p class="text-xs font-semibold text-gray-900 truncate">{{ auth.user()?.fullName || auth.user()?.email }}</p>
            <p class="text-xs text-gray-400 truncate">{{ auth.user()?.email }}</p>
          </div>
          <a routerLink="/profile" (click)="showUserMenu.set(false); sidebarOpen.set(false)"
             class="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
            Profile
          </a>
          <button (click)="auth.logout()"
                  class="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
            Log out
          </button>
        </div>
      }

      <!-- Avatar button -->
      <button (click)="showUserMenu.update(v => !v)"
              class="w-full flex items-center gap-2.5 rounded-lg px-1 py-1 hover:bg-gray-100 transition-colors">
        <div class="w-8 h-8 rounded-full bg-accent-light flex items-center justify-center text-accent flex-shrink-0">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
        </div>
        <div class="flex-1 min-w-0 text-left">
          <p class="text-gray-900 text-xs font-medium truncate">{{ auth.user()?.fullName || auth.user()?.email }}</p>
          <p class="text-gray-400 text-[11px] truncate">{{ auth.user()?.email }}</p>
        </div>
        <svg class="w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform" [class.rotate-180]="showUserMenu()"
             fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/>
        </svg>
      </button>
    </div>
  </aside>

  <!-- Main -->
  <div class="flex-1 flex flex-col overflow-hidden min-w-0">
    <!-- Top bar -->
    <header class="h-12 bg-white border-b border-border flex items-center px-3 lg:px-6 gap-2 lg:gap-4 flex-shrink-0">

      <!-- Hamburger (mobile/tablet only) -->
      <button class="lg:hidden p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors flex-shrink-0"
              (click)="sidebarOpen.set(true)" aria-label="Open menu">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      </button>

      <!-- Mobile logo -->
      <span class="lg:hidden font-bold text-gray-900 text-sm flex-shrink-0">
        Ai<span style="color:#7C3AED;">Media</span>
      </span>

      <div class="flex-1"></div>

      <!-- Credit balance -->
      <a routerLink="/credits" class="flex items-center gap-1 lg:gap-1.5 text-sm text-gray-600 hover:text-accent transition-colors">
        <svg class="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10"/>
          <path fill="white" d="M12 6v12M9 9h4.5a1.5 1.5 0 010 3H10.5a1.5 1.5 0 000 3H15"/>
        </svg>
        <span class="font-semibold text-gray-900">{{ credits.balance().balance }}</span>
        <span class="hidden sm:inline text-gray-400">credits</span>
        @if (credits.balance().balance < 50) {
          <span class="px-1.5 py-0.5 text-[10px] bg-red-50 text-red-600 rounded font-medium">Low</span>
        }
      </a>

      <!-- Notification Bell -->
      <div class="relative" data-bell-container>
        <button (click)="toggleNotifications()"
                class="relative p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
          </svg>
          @if (notif.hasUnread()) {
            <span class="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {{ notif.unreadCount() > 9 ? '9+' : notif.unreadCount() }}
            </span>
          }
        </button>

        <!-- Dropdown -->
        @if (showNotifications()) {
          <div class="absolute right-0 top-10 w-[calc(100vw-2rem)] sm:w-80 max-w-sm bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">

            <!-- Header -->
            <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span class="text-sm font-semibold text-gray-900">
                Notifications
                @if (notif.unreadCount() > 0) {
                  <span class="ml-1.5 px-1.5 py-0.5 text-[10px] bg-red-500 text-white rounded-full font-bold">
                    {{ notif.unreadCount() }}
                  </span>
                }
              </span>
              <div class="flex gap-3">
                @if (notif.unreadCount() > 0) {
                  <button (click)="notif.markAllRead()"
                          class="text-xs text-accent hover:underline">Mark all read</button>
                }
                @if (notif.notifications().length > 0) {
                  <button (click)="notif.clearAll()"
                          class="text-xs text-gray-400 hover:text-red-500">Clear all</button>
                }
              </div>
            </div>

            <!-- List -->
            <div class="max-h-96 overflow-y-auto divide-y divide-gray-50">
              @if (notif.notifications().length === 0) {
                <div class="px-4 py-8 text-center text-gray-400 text-sm">
                  <div class="text-3xl mb-2">🔔</div>
                  <p>No notifications yet</p>
                  <p class="text-xs mt-1">You'll be notified when jobs complete</p>
                </div>
              }
              @for (n of notif.notifications(); track n.id) {
                <div (click)="onNotificationClick(n)"
                     class="flex gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50"
                     [class.bg-blue-50]="!n.read">

                  <!-- Status icon -->
                  <div class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm mt-0.5"
                       [class.bg-green-100]="n.type === 'completed'"
                       [class.bg-red-100]="n.type === 'failed'">
                    {{ n.type === 'completed' ? '✅' : '❌' }}
                  </div>

                  <!-- Content -->
                  <div class="flex-1 min-w-0">
                    <p class="text-sm text-gray-800 leading-snug" [class.font-semibold]="!n.read">
                      {{ n.message }}
                    </p>
                    <div class="flex items-center gap-2 mt-1">
                      <span class="text-xs text-gray-400">{{ timeAgo(n.createdAt) }}</span>
                      @if (n.type === 'completed' && n.outputUrl) {
                        <span class="text-xs text-accent font-medium">· Click to view</span>
                      } @else if (n.type === 'failed') {
                        <span class="text-xs text-amber-500 font-medium">· Click to retry</span>
                      }
                    </div>
                  </div>

                  <!-- Unread dot -->
                  @if (!n.read) {
                    <div class="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-2.5"></div>
                  }
                </div>
              }
            </div>

            <!-- Footer -->
            @if (notif.notifications().length > 0) {
              <div class="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
                <a routerLink="/jobs" (click)="showNotifications.set(false)"
                   class="text-xs text-accent hover:underline font-medium">View all jobs →</a>
              </div>
            }
          </div>
        }
      </div>

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
  notif = inject(NotificationService);
  private signalR = inject(SignalRService);
  private generation = inject(GenerationService);

  constructor() {
    // effect() is truly reactive — fires instantly when latestUpdate signal changes,
    // no polling interval needed, works regardless of NgZone
    effect(() => {
      const update = this.signalR.latestUpdate();
      if (!update) return;
      untracked(() => {
        this.generation.applyUpdate(update);
        if (update.status === 'Completed' || update.status === 'Failed') {
          this.credits.loadBalance().subscribe();
          this.notif.addFromJobUpdate(update, update.product ?? 'Unknown');
        }
      });
    });
  }
  private router = inject(Router);

  showNotifications = signal(false);
  showUserMenu = signal(false);
  sidebarOpen = signal(false);

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

  toggleNotifications() {
    this.showNotifications.update(v => !v);
  }

  onNotificationClick(n: AppNotification) {
    this.notif.markRead(n.id);
    this.showNotifications.set(false);
    this.router.navigate(['/jobs'], { queryParams: { highlight: n.jobId } });
  }

  timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  ngOnInit() {
    this.signalR.start();
    this.credits.loadBalance().subscribe();

    // Close dropdown when clicking outside
    document.addEventListener('click', this.onDocumentClick);
  }

  private onDocumentClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const bellEl = document.querySelector('[data-bell-container]');
    if (bellEl && !bellEl.contains(target)) {
      this.showNotifications.set(false);
    }
    const userMenuEl = document.querySelector('[data-user-menu]');
    if (userMenuEl && !userMenuEl.contains(target)) {
      this.showUserMenu.set(false);
    }
  };

  ngOnDestroy() {
    this.signalR.stop();
    document.removeEventListener('click', this.onDocumentClick);
  }
}
