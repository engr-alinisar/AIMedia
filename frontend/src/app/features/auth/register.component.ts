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
      <div class="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mx-auto mb-4">
        <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      </div>
      <h1 class="text-2xl font-bold text-white">Create account</h1>
      <p class="text-gray-400 text-sm mt-1">Start creating AI media today</p>
    </div>
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

  register() {
    if (!this.email || !this.password) { this.error.set('Email and password are required.'); return; }
    this.loading.set(true); this.error.set('');
    this.auth.register(this.email, this.password, this.fullName || undefined).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: err => {
        this.loading.set(false);
        this.error.set(err.error?.detail ?? err.error?.message ?? err.error?.error ?? err.error?.title ?? 'Registration failed. Please try again.');
      }
    });
  }
}
