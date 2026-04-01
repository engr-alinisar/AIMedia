import { Component, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { LoginModalService } from '../../../core/services/login-modal.service';
import { CreditsService } from '../../../core/services/credits.service';

@Component({
  selector: 'app-login-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="fixed inset-0 z-[100] flex items-center justify-center p-4"
     (click)="onBackdrop($event)">
  <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

  <div class="modal-inner relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
       (click)="$event.stopPropagation()">

    <!-- Close -->
    <button (click)="close()"
            class="absolute top-3 right-3 w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors z-10">
      <svg class="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
      </svg>
    </button>

    <!-- Logo + title -->
    <div class="px-7 pt-7 pb-5 border-b border-gray-100">
      <div class="flex items-center gap-2.5 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 128 128">
          <defs>
            <linearGradient id="am-modal-g" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#8B5CF6"/>
              <stop offset="100%" stop-color="#4F46E5"/>
            </linearGradient>
          </defs>
          <rect width="128" height="128" rx="28" fill="url(#am-modal-g)"/>
          <polygon points="50,42 50,86 88,64" fill="white" opacity="0.95"/>
        </svg>
        <span style="font-size:15px;font-weight:700;color:#111827;">Ai<span style="color:#7c3aed;">Media</span></span>
      </div>

      @if (!registered()) {
        <div class="flex bg-gray-100 rounded-xl p-1">
          <button (click)="switchMode('login')"
                  class="flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all"
                  [class.bg-white]="modalSvc.mode() === 'login'"
                  [class.shadow-sm]="modalSvc.mode() === 'login'"
                  [class.text-gray-900]="modalSvc.mode() === 'login'"
                  [class.text-gray-500]="modalSvc.mode() !== 'login'">
            Log in
          </button>
          <button (click)="switchMode('register')"
                  class="flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all"
                  [class.bg-white]="modalSvc.mode() === 'register'"
                  [class.shadow-sm]="modalSvc.mode() === 'register'"
                  [class.text-gray-900]="modalSvc.mode() === 'register'"
                  [class.text-gray-500]="modalSvc.mode() !== 'register'">
            Sign up
          </button>
        </div>
      }
    </div>

    <!-- ===== SUCCESS STATE ===== -->
    @if (registered()) {
      <div class="px-7 py-10 text-center">
        <div class="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg class="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <h3 class="text-lg font-bold text-gray-900 mb-2">Check your email</h3>
        <p class="text-sm text-gray-500 leading-relaxed mb-6">
          We sent a verification link to <strong class="text-gray-700">{{ regEmail }}</strong>.
          Click it to activate your account and get 50 free credits.
        </p>
        <button (click)="switchMode('login')"
                class="text-sm font-semibold hover:underline" style="color:#7c3aed;">
          Back to log in
        </button>
      </div>
    }

    <!-- ===== LOGIN FORM ===== -->
    @else if (modalSvc.mode() === 'login') {
      <form (ngSubmit)="login()" class="px-7 py-5 space-y-4">
        @if (errorMessage()) {
          <div class="px-3 py-2.5 rounded-lg bg-red-50 text-red-700 text-sm">{{ errorMessage() }}</div>
        }
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1.5">Email address</label>
          <input type="email" [(ngModel)]="email" name="email" required autocomplete="email"
                 placeholder="you@example.com"
                 class="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition-all"/>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1.5">Password</label>
          <div class="relative">
            <input [type]="showPw() ? 'text' : 'password'"
                   [ngModel]="password()" (ngModelChange)="password.set($event)"
                   name="password" required autocomplete="current-password"
                   placeholder="Your password"
                   class="w-full px-3 py-2.5 pr-10 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition-all"/>
            <button type="button" (click)="showPw.update(v => !v)"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                @if (showPw()) {
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21"/>
                } @else {
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                }
              </svg>
            </button>
          </div>
        </div>
        <button type="submit" [disabled]="loading() || !email || !password()"
                class="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style="background:#7c3aed;">
          @if (loading()) {
            <span class="flex items-center justify-center gap-2">
              <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Logging in...
            </span>
          } @else { Log in }
        </button>
      </form>
    }

    <!-- ===== REGISTER FORM ===== -->
    @else {
      <form (ngSubmit)="register()" class="px-7 py-5 space-y-4">
        @if (errorMessage()) {
          <div class="px-3 py-2.5 rounded-lg bg-red-50 text-red-700 text-sm">{{ errorMessage() }}</div>
        }
        <div class="px-3 py-2 rounded-lg text-xs text-violet-700 bg-violet-50 font-medium">
          🎉 Get 50 free credits on signup — no credit card required
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1.5">Full name</label>
          <input type="text" [(ngModel)]="fullName" name="fullName" autocomplete="name"
                 placeholder="Your name"
                 (ngModelChange)="errorMessage.set('')"
                 class="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition-all"/>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1.5">Email address</label>
          <input type="email" [(ngModel)]="email" name="email" required autocomplete="email"
                 placeholder="you@example.com"
                 (ngModelChange)="errorMessage.set('')"
                 class="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition-all"/>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1.5">Password</label>
          <div class="relative">
            <input [type]="showPw() ? 'text' : 'password'"
                   [ngModel]="password()" (ngModelChange)="password.set($event); errorMessage.set('')"
                   name="password" required autocomplete="new-password"
                   placeholder="Create a password"
                   class="w-full px-3 py-2.5 pr-10 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition-all"/>
            <button type="button" (click)="showPw.update(v => !v)"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                @if (showPw()) {
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21"/>
                } @else {
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                }
              </svg>
            </button>
          </div>

          <!-- Live password rules — visible as soon as user starts typing -->
          @if (password().length > 0) {
            <ul class="mt-2.5 space-y-1.5">
              @for (rule of passwordRules(); track rule.label) {
                <li class="flex items-center gap-2 text-xs transition-colors duration-150"
                    [class.text-green-600]="rule.met"
                    [class.text-gray-400]="!rule.met">
                  @if (rule.met) {
                    <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                    </svg>
                  } @else {
                    <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="8" stroke-width="1.5"/>
                    </svg>
                  }
                  <span>{{ rule.label }}</span>
                </li>
              }
            </ul>
          }
        </div>

        <button type="submit" [disabled]="loading() || !email || !password()"
                class="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style="background:#7c3aed;">
          @if (loading()) {
            <span class="flex items-center justify-center gap-2">
              <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Creating account...
            </span>
          } @else { Create account }
        </button>
      </form>
    }

  </div>
</div>
  `
})
export class LoginModalComponent {
  private authService = inject(AuthService);
  modalSvc = inject(LoginModalService);
  private creditsService = inject(CreditsService);

  email = '';
  password = signal('');
  fullName = '';
  regEmail = '';
  loading = signal(false);
  errorMessage = signal('');
  showPw = signal(false);
  registered = signal(false);

  // Reacts to every keystroke because `password` is a signal
  passwordRules = computed(() => [
    { label: 'At least 8 characters',      met: this.password().length >= 8 },
    { label: 'One uppercase letter (A–Z)',  met: /[A-Z]/.test(this.password()) },
    { label: 'One lowercase letter (a–z)',  met: /[a-z]/.test(this.password()) },
    { label: 'One number (0–9)',            met: /[0-9]/.test(this.password()) },
    { label: 'One special character',       met: /[^A-Za-z0-9]/.test(this.password()) },
  ]);

  @HostListener('document:keydown.escape')
  onEscape() { this.close(); }

  onBackdrop(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('fixed')) this.close();
  }

  switchMode(mode: 'login' | 'register') {
    this.modalSvc.mode.set(mode);
    this.errorMessage.set('');
    this.registered.set(false);
  }

  close() {
    this.modalSvc.hide();
    this.errorMessage.set('');
    this.email = '';
    this.password.set('');
    this.fullName = '';
    this.loading.set(false);
    this.registered.set(false);
  }

  login() {
    if (this.loading() || !this.email || !this.password()) return;
    this.loading.set(true);
    this.errorMessage.set('');
    this.authService.login(this.email, this.password()).subscribe({
      next: () => {
        this.creditsService.loadBalance().subscribe();
        this.close();
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.message || err?.error?.detail || 'Invalid email or password');
      }
    });
  }

  register() {
    if (this.loading() || !this.email || !this.password()) return;
    const unmet = this.passwordRules().filter(r => !r.met);
    if (unmet.length > 0) { this.errorMessage.set(unmet[0].label + ' is required.'); return; }
    this.loading.set(true);
    this.errorMessage.set('');
    this.authService.register(this.email, this.password(), this.fullName || undefined).subscribe({
      next: () => {
        this.regEmail = this.email;
        this.loading.set(false);
        this.registered.set(true);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.message || err?.error?.detail || 'Registration failed. Please try again.');
      }
    });
  }
}
