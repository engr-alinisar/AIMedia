import { Component, inject, signal, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth/auth.service';
import { ContactService } from '../../core/services/contact.service';

const SUBJECT_OPTIONS = [
  'General Inquiry',
  'Payment Issue',
  'Technical Issue',
  'Feature Request',
  'Other',
];

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="p-6 max-w-2xl mx-auto">
  <h1 class="text-2xl font-bold text-gray-900 mb-1">Contact Us</h1>
  <p class="text-gray-500 mb-8 text-sm">
    Have a question or issue? We're here to help. Fill out the form and we'll get back to you within 24 hours.
  </p>

  @if (success()) {
    <div class="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div class="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl">✓</div>
      <h2 class="text-xl font-semibold text-gray-900">Message sent!</h2>
      <p class="text-gray-500 max-w-sm">We'll get back to you within 24 hours. Check your inbox for a confirmation email.</p>
      <button (click)="resetForm()"
              class="mt-2 px-5 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-dark transition-colors">
        Send another message
      </button>
    </div>
  } @else {
    <form (ngSubmit)="submit()" #contactForm="ngForm" novalidate>
      <div class="grid grid-cols-1 gap-5">

        <!-- Name -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">Name <span class="text-red-500">*</span></label>
          <input
            type="text"
            name="name"
            [(ngModel)]="name"
            required
            maxlength="150"
            placeholder="Your full name"
            class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition"
          />
        </div>

        <!-- Email -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">Email <span class="text-red-500">*</span></label>
          <input
            type="email"
            name="email"
            [(ngModel)]="email"
            required
            maxlength="200"
            placeholder="you@example.com"
            [disabled]="isLoggedIn()"
            [class.bg-gray-50]="isLoggedIn()"
            [class.cursor-not-allowed]="isLoggedIn()"
            [class.opacity-60]="isLoggedIn()"
            class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition"
          />
          @if (isLoggedIn()) {
            <p class="text-xs text-gray-400 mt-1">Email is pre-filled from your account and cannot be changed.</p>
          }
        </div>

        <!-- Subject -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">Subject <span class="text-red-500">*</span></label>
          <select
            name="subject"
            [(ngModel)]="subject"
            required
            class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition bg-white"
          >
            <option value="" disabled>Select a subject...</option>
            @for (opt of subjectOptions; track opt) {
              <option [value]="opt">{{ opt }}</option>
            }
          </select>
        </div>

        <!-- Message -->
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="block text-sm font-medium text-gray-700">Message <span class="text-red-500">*</span></label>
            <span class="text-xs" [class.text-red-500]="message.length > 2000" [class.text-gray-400]="message.length <= 2000">
              {{ message.length }} / 2000
            </span>
          </div>
          <textarea
            name="message"
            [(ngModel)]="message"
            required
            minlength="10"
            maxlength="2000"
            rows="7"
            spellcheck="true" lang="en" autocorrect="on" autocapitalize="sentences"
            placeholder="Describe your question or issue in detail..."
            class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition resize-y"
          ></textarea>
          @if (message.length > 0 && message.length < 10) {
            <p class="text-xs text-red-500 mt-1">Message must be at least 10 characters.</p>
          }
        </div>

        <!-- Error -->
        @if (error()) {
          <div class="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {{ error() }}
          </div>
        }

        <!-- Submit -->
        <div>
          <button
            type="submit"
            [disabled]="loading() || !isFormValid"
            class="w-full sm:w-auto px-8 py-2.5 bg-accent text-white rounded-lg text-sm font-semibold hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            @if (loading()) {
              Sending...
            } @else {
              Send Message
            }
          </button>
        </div>

      </div>
    </form>
  }
</div>
  `
})
export class ContactComponent {
  private auth = inject(AuthService);
  private contactService = inject(ContactService);
  private destroyRef = inject(DestroyRef);

  subjectOptions = SUBJECT_OPTIONS;

  // Form fields — pre-fill from logged-in user
  name = this.auth.user()?.fullName ?? '';
  email = this.auth.user()?.email ?? '';
  subject = '';
  message = '';

  // State signals
  loading = signal(false);
  success = signal(false);
  error = signal<string | null>(null);

  isLoggedIn = this.auth.isLoggedIn;

  get isFormValid(): boolean {
    return (
      this.name.trim().length > 0 &&
      this.email.trim().length > 0 &&
      this.subject.length > 0 &&
      this.message.trim().length >= 10 &&
      this.message.length <= 2000
    );
  }

  submit() {
    if (this.loading() || !this.isFormValid) return;

    this.loading.set(true);
    this.error.set(null);

    this.contactService
      .sendContactMessage({
        name: this.name.trim(),
        email: this.email.trim(),
        subject: this.subject,
        message: this.message.trim(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.success.set(true);
        },
        error: (err) => {
          this.loading.set(false);
          const msg =
            err?.error?.message ??
            err?.error?.title ??
            'Something went wrong. Please try again.';
          this.error.set(msg);
        },
      });
  }

  resetForm() {
    this.name = this.auth.user()?.fullName ?? '';
    this.email = this.auth.user()?.email ?? '';
    this.subject = '';
    this.message = '';
    this.success.set(false);
    this.error.set(null);
  }
}
