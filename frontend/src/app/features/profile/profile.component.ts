import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">

  <div>
    <h1 class="text-xl font-semibold text-gray-900">Profile</h1>
    <p class="text-xs text-gray-400 mt-0.5">Manage your account settings</p>
  </div>

  <!-- Account Info -->
  <div class="card p-5 space-y-4">
    <h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">Account Info</h2>

    <!-- Email (read-only) -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
      <input type="email"
             [value]="auth.user()?.email ?? ''"
             readonly
             class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed" />
    </div>

    <!-- Display Name -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
      <input type="text"
             [(ngModel)]="displayName"
             placeholder="Enter your name"
             class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent" />
    </div>

    @if (profileError()) {
      <p class="text-sm text-red-600">{{ profileError() }}</p>
    }
    @if (profileSuccess()) {
      <p class="text-sm text-green-600">{{ profileSuccess() }}</p>
    }

    <button class="btn-primary text-sm"
            [disabled]="profileLoading()"
            (click)="saveProfile()">
      {{ profileLoading() ? 'Saving...' : 'Save Changes' }}
    </button>
  </div>

  <!-- Change Password -->
  <div class="card p-5 space-y-4">
    <h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">Change Password</h2>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
      <div class="relative">
        <input [type]="showCurrentPw() ? 'text' : 'password'"
               [(ngModel)]="currentPassword"
               placeholder="Enter current password"
               class="w-full px-3 py-2 pr-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent" />
        <button type="button" (click)="showCurrentPw.update(v => !v)"
                class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            @if (showCurrentPw()) {
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
            } @else {
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            }
          </svg>
        </button>
      </div>
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">New Password</label>
      <div class="relative">
        <input [type]="showNewPw() ? 'text' : 'password'"
               [(ngModel)]="newPassword"
               placeholder="Create a new password"
               class="w-full px-3 py-2 pr-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent" />
        <button type="button" (click)="showNewPw.update(v => !v)"
                class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            @if (showNewPw()) {
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
            } @else {
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            }
          </svg>
        </button>
      </div>

      <!-- Password requirements — shown once user starts typing -->
      @if (newPassword.length > 0) {
        <ul class="mt-2 space-y-1">
          @for (rule of newPasswordRules; track rule.label) {
            <li class="flex items-center gap-1.5 text-xs"
                [class.text-green-600]="rule.met"
                [class.text-gray-400]="!rule.met">
              @if (rule.met) {
                <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                </svg>
              } @else {
                <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" stroke-width="2"/>
                </svg>
              }
              {{ rule.label }}
            </li>
          }
        </ul>
      }
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
      <div class="relative">
        <input [type]="showConfirmPw() ? 'text' : 'password'"
               [(ngModel)]="confirmPassword"
               placeholder="Repeat new password"
               class="w-full px-3 py-2 pr-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent" />
        <button type="button" (click)="showConfirmPw.update(v => !v)"
                class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            @if (showConfirmPw()) {
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
            } @else {
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            }
          </svg>
        </button>
      </div>
    </div>

    @if (passwordError()) {
      <p class="text-sm text-red-600">{{ passwordError() }}</p>
    }
    @if (passwordSuccess()) {
      <p class="text-sm text-green-600">{{ passwordSuccess() }}</p>
    }

    <button class="btn-primary text-sm"
            [disabled]="passwordLoading()"
            (click)="changePassword()">
      {{ passwordLoading() ? 'Updating...' : 'Update Password' }}
    </button>
  </div>

  <!-- Danger Zone -->
  <div class="card p-5 space-y-4 border-red-200">
    <h2 class="text-sm font-semibold text-red-600 uppercase tracking-wide">Danger Zone</h2>
    <p class="text-sm text-gray-600">
      Permanently delete your account and all associated data. This action cannot be undone.
    </p>

    @if (!showDeleteConfirm()) {
      <button class="text-sm px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              (click)="showDeleteConfirm.set(true)">
        Delete Account
      </button>
    } @else {
      <div class="space-y-3 p-4 bg-red-50 border border-red-200 rounded-lg">
        <p class="text-sm font-medium text-red-700">
          Are you sure? Enter your password to confirm deletion.
        </p>
        <div class="relative">
          <input [type]="showDeletePw() ? 'text' : 'password'"
                 [(ngModel)]="deletePassword"
                 placeholder="Enter your password"
                 class="w-full px-3 py-2 pr-10 text-sm border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400" />
          <button type="button" (click)="showDeletePw.update(v => !v)"
                  class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              @if (showDeletePw()) {
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
              } @else {
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              }
            </svg>
          </button>
        </div>

        @if (deleteError()) {
          <p class="text-sm text-red-600">{{ deleteError() }}</p>
        }

        <div class="flex gap-2">
          <button class="text-sm px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  [disabled]="deleteLoading()"
                  (click)="deleteAccount()">
            {{ deleteLoading() ? 'Deleting...' : 'Yes, Delete My Account' }}
          </button>
          <button class="text-sm px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                  (click)="cancelDelete()">
            Cancel
          </button>
        </div>
      </div>
    }
  </div>

</div>
  `
})
export class ProfileComponent implements OnInit {
  auth = inject(AuthService);
  private router = inject(Router);

  // Profile form state
  displayName = '';
  profileLoading = signal(false);
  profileError = signal('');
  profileSuccess = signal('');

  // Password form state
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  passwordLoading = signal(false);
  passwordError = signal('');
  passwordSuccess = signal('');

  // Password visibility
  showCurrentPw = signal(false);
  showNewPw = signal(false);
  showConfirmPw = signal(false);
  showDeletePw = signal(false);

  get newPasswordRules() {
    return [
      { label: 'At least 8 characters',      met: this.newPassword.length >= 8 },
      { label: 'One uppercase letter (A–Z)',  met: /[A-Z]/.test(this.newPassword) },
      { label: 'One lowercase letter (a–z)',  met: /[a-z]/.test(this.newPassword) },
      { label: 'One number (0–9)',            met: /[0-9]/.test(this.newPassword) },
      { label: 'One special character',       met: /[^A-Za-z0-9]/.test(this.newPassword) },
    ];
  }

  // Delete account state
  showDeleteConfirm = signal(false);
  deletePassword = '';
  deleteLoading = signal(false);
  deleteError = signal('');

  ngOnInit() {
    const user = this.auth.user();
    this.displayName = user?.fullName ?? '';
  }

  saveProfile() {
    this.profileError.set('');
    this.profileSuccess.set('');

    const trimmed = this.displayName.trim();
    this.profileLoading.set(true);

    this.auth.updateProfile(trimmed || null).subscribe({
      next: () => {
        this.profileSuccess.set('Profile updated successfully.');
        this.profileLoading.set(false);
      },
      error: (err) => {
        this.profileError.set(err?.error?.message ?? 'Failed to update profile.');
        this.profileLoading.set(false);
      }
    });
  }

  changePassword() {
    this.passwordError.set('');
    this.passwordSuccess.set('');

    if (!this.currentPassword) {
      this.passwordError.set('Please enter your current password.');
      return;
    }
    const unmet = this.newPasswordRules.filter(r => !r.met);
    if (unmet.length > 0) {
      this.passwordError.set(unmet[0].label + ' is required.');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.passwordError.set('New passwords do not match.');
      return;
    }

    this.passwordLoading.set(true);

    this.auth.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: () => {
        this.passwordSuccess.set('Password updated successfully.');
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        this.passwordLoading.set(false);
      },
      error: (err) => {
        this.passwordError.set(err?.error?.message ?? 'Failed to update password.');
        this.passwordLoading.set(false);
      }
    });
  }

  cancelDelete() {
    this.showDeleteConfirm.set(false);
    this.deletePassword = '';
    this.deleteError.set('');
  }

  deleteAccount() {
    this.deleteError.set('');

    if (!this.deletePassword) {
      this.deleteError.set('Please enter your password to confirm.');
      return;
    }

    this.deleteLoading.set(true);

    this.auth.deleteAccount(this.deletePassword).subscribe({
      next: () => {
        this.deleteLoading.set(false);
        this.auth.logout();
      },
      error: (err) => {
        this.deleteError.set(err?.error?.message ?? 'Failed to delete account. Check your password.');
        this.deleteLoading.set(false);
      }
    });
  }
}
