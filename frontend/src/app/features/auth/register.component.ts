import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
<div class="min-h-screen bg-sidebar flex items-center justify-center p-4">
  <div class="w-full max-w-sm">
    <div class="text-center mb-8">
      <div class="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-5 py-3 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 128 128">
          <defs><linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#8B5CF6"/><stop offset="100%" stop-color="#4F46E5"/></linearGradient></defs>
          <rect width="128" height="128" rx="28" fill="url(#rg)"/>
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
      <h1 class="text-2xl font-bold text-white">Create account</h1>
      <p class="text-gray-400 text-sm mt-1">Start creating AI media today</p>
    </div>
    @if (verified()) {
      <!-- Email sent state -->
      <div class="card p-8 text-center space-y-4">
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
        </div>
        <h2 class="text-lg font-semibold text-gray-900">Check your email</h2>
        <p class="text-sm text-gray-500">We sent a verification link to <strong>{{ email }}</strong>. Click the link to activate your account and get your 50 free credits.</p>
        <p class="text-xs text-gray-400">Link expires in 24 hours. Check your spam folder if you don't see it.</p>
        <a routerLink="/auth/login" class="btn-primary w-full block text-center mt-2">Back to Sign In</a>
      </div>
    } @else {
      <div class="card p-6 space-y-4">
        @if (error()) {
          <div class="p-3 bg-red-50 border border-red-300 rounded-lg text-sm text-red-700">{{ error() }}</div>
        }
        <div>
          <label class="form-label">Full Name</label>
          <input type="text" class="form-input" [(ngModel)]="fullName" placeholder="John Doe" autocomplete="name"/>
        </div>
        <div>
          <label class="form-label">Email</label>
          <input type="email" class="form-input" [(ngModel)]="email" placeholder="you@example.com" autocomplete="email"/>
        </div>
        <div>
          <label class="form-label">Password</label>
          <div class="relative">
            <input [type]="showPassword() ? 'text' : 'password'" class="form-input pr-10"
                   [(ngModel)]="password" placeholder="Min 8 characters"
                   autocomplete="new-password" (keyup.enter)="register()"/>
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
        <button class="btn-primary w-full mt-2" (click)="register()" [disabled]="loading()">
          @if (loading()) { <span class="animate-spin inline-block mr-1">⟳</span> Creating account... }
          @else { Create account }
        </button>
      </div>
      <p class="text-center text-sm text-gray-400 mt-4">
        Already have an account?
        <a routerLink="/auth/login" class="text-accent hover:underline">Sign in</a>
      </p>
    }
  </div>
</div>
  `
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  fullName = ''; email = ''; password = '';
  loading = signal(false);
  error = signal('');
  showPassword = signal(false);
  verified = signal(false);

  register() {
    if (!this.email || !this.password) { this.error.set('Email and password are required.'); return; }
    this.loading.set(true); this.error.set('');
    this.auth.register(this.email, this.password, this.fullName || undefined).subscribe({
      next: () => { this.loading.set(false); this.verified.set(true); },
      error: err => {
        this.loading.set(false);
        this.error.set(err.error?.detail ?? err.error?.message ?? err.error?.error ?? err.error?.title ?? 'Registration failed. Please try again.');
      }
    });
  }
}
