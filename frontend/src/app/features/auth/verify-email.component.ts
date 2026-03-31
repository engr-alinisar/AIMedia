import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
<div class="min-h-screen bg-sidebar flex items-center justify-center p-4">
  <div class="w-full max-w-sm">
    <div class="text-center mb-8">
      <div class="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-5 py-3 mb-4">
        <div class="text-left">
          <div class="text-xl font-bold leading-tight"><span class="text-gray-900">Ai</span><span style="color:#7C3AED">Media</span></div>
          <div class="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">AI-Powered Media</div>
        </div>
      </div>
    </div>

    <div class="card p-8 text-center space-y-4">
      @if (status() === 'verifying') {
        <div class="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
          <svg class="w-8 h-8 text-purple-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        </div>
        <h2 class="text-lg font-semibold text-gray-900">Verifying your email...</h2>
        <p class="text-sm text-gray-500">Please wait a moment.</p>
      }

      @if (status() === 'success') {
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <h2 class="text-lg font-semibold text-gray-900">Email verified!</h2>
        <p class="text-sm text-gray-500">Your account is now active. You've been logged in automatically.</p>
        <p class="text-sm font-medium text-purple-600">🎉 50 free credits added to your account!</p>
        <button class="btn-primary w-full mt-2" (click)="goToDashboard()">Go to Dashboard</button>
      }

      @if (status() === 'error') {
        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </div>
        <h2 class="text-lg font-semibold text-gray-900">Verification failed</h2>
        <p class="text-sm text-gray-500">{{ error() }}</p>
        <a routerLink="/auth/register" class="btn-primary w-full block text-center mt-2">Register again</a>
        <a routerLink="/auth/login" class="block text-sm text-center text-gray-400 hover:text-gray-600 mt-2">Back to Sign In</a>
      }

      @if (status() === 'no-token') {
        <div class="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
          <svg class="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z"/>
          </svg>
        </div>
        <h2 class="text-lg font-semibold text-gray-900">Invalid link</h2>
        <p class="text-sm text-gray-500">This verification link is invalid. Please use the link from your email.</p>
        <a routerLink="/auth/login" class="btn-primary w-full block text-center mt-2">Back to Sign In</a>
      }
    </div>
  </div>
</div>
  `
})
export class VerifyEmailComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  status = signal<'verifying' | 'success' | 'error' | 'no-token'>('verifying');
  error = signal('');

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) { this.status.set('no-token'); return; }

    this.auth.verifyEmail(token).subscribe({
      next: () => this.status.set('success'),
      error: err => {
        this.status.set('error');
        this.error.set(err.error?.detail ?? err.error?.message ?? err.error?.error ?? 'Invalid or expired verification link.');
      }
    });
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }
}
