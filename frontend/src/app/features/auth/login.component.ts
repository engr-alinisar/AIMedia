import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
<div class="min-h-screen bg-sidebar flex items-center justify-center p-4">
  <div class="w-full max-w-sm">
    <div class="text-center mb-8">
      <div class="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-5 py-3 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 128 128">
          <defs><linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#8B5CF6"/><stop offset="100%" stop-color="#4F46E5"/></linearGradient></defs>
          <rect width="128" height="128" rx="28" fill="url(#lg)"/>
          <rect x="18" y="18" width="8" height="92" rx="4" fill="rgba(255,255,255,0.2)"/>
          <rect x="20" y="26" width="4" height="6" rx="2" fill="rgba(255,255,255,0.5)"/><rect x="20" y="40" width="4" height="6" rx="2" fill="rgba(255,255,255,0.5)"/><rect x="20" y="54" width="4" height="6" rx="2" fill="rgba(255,255,255,0.5)"/><rect x="20" y="68" width="4" height="6" rx="2" fill="rgba(255,255,255,0.5)"/><rect x="20" y="82" width="4" height="6" rx="2" fill="rgba(255,255,255,0.5)"/><rect x="20" y="96" width="4" height="6" rx="2" fill="rgba(255,255,255,0.5)"/>
          <rect x="102" y="18" width="8" height="92" rx="4" fill="rgba(255,255,255,0.2)"/>
          <rect x="104" y="26" width="4" height="6" rx="2" fill="rgba(255,255,255,0.5)"/><rect x="104" y="40" width="4" height="6" rx="2" fill="rgba(255,255,255,0.5)"/><rect x="104" y="54" width="4" height="6" rx="2" fill="rgba(255,255,255,0.5)"/><rect x="104" y="68" width="4" height="6" rx="2" fill="rgba(255,255,255,0.5)"/><rect x="104" y="82" width="4" height="6" rx="2" fill="rgba(255,255,255,0.5)"/><rect x="104" y="96" width="4" height="6" rx="2" fill="rgba(255,255,255,0.5)"/>
          <polygon points="50,42 50,86 88,64" fill="white" opacity="0.95"/>
          <circle cx="90" cy="36" r="5" fill="#A78BFA"/>
          <line x1="90" y1="28" x2="90" y2="32" stroke="white" stroke-width="2" stroke-linecap="round"/><line x1="90" y1="40" x2="90" y2="44" stroke="white" stroke-width="2" stroke-linecap="round"/><line x1="82" y1="36" x2="86" y2="36" stroke="white" stroke-width="2" stroke-linecap="round"/><line x1="94" y1="36" x2="98" y2="36" stroke="white" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <div class="text-left">
          <div class="text-xl font-bold leading-tight"><span class="text-gray-900">Ai</span><span style="color:#7C3AED">Media</span></div>
          <div class="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">AI-Powered Media</div>
        </div>
      </div>
      <h1 class="text-2xl font-bold text-white">Welcome back</h1>
      <p class="text-gray-400 text-sm mt-1">Sign in to AiMedia</p>
    </div>

    <div class="card p-6 space-y-4">
      @if (unverified()) {
        <div class="p-3 bg-amber-50 border border-amber-300 rounded-lg text-sm text-amber-800">
          <strong>Email not verified.</strong> Please check your inbox and click the verification link before logging in.
        </div>
      }
      @if (error()) {
        <div class="p-3 bg-red-50 border border-red-300 rounded-lg text-sm text-red-700">{{ error() }}</div>
      }
      <div>
        <label class="form-label">Email</label>
        <input type="email" class="form-input" [(ngModel)]="email" placeholder="you@example.com" autocomplete="email"/>
      </div>
      <div>
        <label class="form-label">Password</label>
        <div class="relative">
          <input [type]="showPassword() ? 'text' : 'password'" class="form-input pr-10"
                 [(ngModel)]="password" placeholder="••••••••"
                 autocomplete="current-password" (keyup.enter)="login()"/>
          <button type="button" class="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-200"
                  (click)="showPassword.set(!showPassword())">
            @if (showPassword()) {
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
              </svg>
            } @else {
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
            }
          </button>
        </div>
      </div>
      <button class="btn-primary w-full mt-2" (click)="login()" [disabled]="loading()">
        @if (loading()) { <span class="animate-spin inline-block mr-1">⟳</span> Signing in... }
        @else { Sign in }
      </button>
    </div>

    <p class="text-center text-sm text-gray-400 mt-4">
      Don't have an account?
      <a routerLink="/auth/register" class="text-accent hover:underline">Create one</a>
    </p>
  </div>
</div>
  `
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = ''; password = '';
  loading = signal(false);
  error = signal('');
  unverified = signal(false);
  showPassword = signal(false);

  login() {
    if (!this.email || !this.password) { this.error.set('Email and password are required.'); return; }
    this.loading.set(true); this.error.set(''); this.unverified.set(false);
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: err => {
        this.loading.set(false);
        const msg = err.error?.detail ?? err.error?.message ?? err.error?.error ?? err.error?.title ?? '';
        if (msg === 'EMAIL_NOT_VERIFIED') {
          this.unverified.set(true);
        } else {
          this.error.set(msg || 'Invalid email or password.');
        }
      }
    });
  }
}
