import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
<!-- ===== NAVBAR ===== -->
<nav class="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
    <!-- Logo -->
    <a routerLink="/" class="flex items-center gap-2.5 flex-shrink-0">
      <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 128 128">
        <defs>
          <linearGradient id="land-logo-g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#8B5CF6"/>
            <stop offset="100%" stop-color="#4F46E5"/>
          </linearGradient>
        </defs>
        <rect width="128" height="128" rx="28" fill="url(#land-logo-g)"/>
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
      </svg>
      <div>
        <span style="font-size:16px;font-weight:700;color:#111827;">Ai<span style="color:#7c3aed;">Media</span></span>
      </div>
    </a>

    <!-- Nav links (desktop) -->
    <div class="hidden md:flex items-center gap-1">
      <a routerLink="/explore"
         class="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
        Explore
      </a>
      <a routerLink="/faq"
         class="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
        FAQ
      </a>
      <a routerLink="/contact"
         class="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
        Contact
      </a>
    </div>

    <!-- Auth CTAs -->
    <div class="flex items-center gap-2 flex-shrink-0">
      @if (auth.isLoggedIn()) {
        <a routerLink="/dashboard"
           class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
           style="background:#7c3aed;">
          Go to Dashboard
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
        </a>
      } @else {
        <a routerLink="/auth/login"
           class="hidden sm:inline-flex px-4 py-2 rounded-lg text-sm font-medium text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors">
          Login
        </a>
        <a routerLink="/auth/register"
           class="inline-flex px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
           style="background:#7c3aed; hover:background:#6d28d9;">
          Sign Up Free
        </a>
      }
    </div>
  </div>
</nav>

<!-- ===== HERO ===== -->
<section class="relative overflow-hidden pt-16">
  <!-- Purple mesh background -->
  <div class="absolute inset-0 -z-10"
       style="background: linear-gradient(135deg, #faf5ff 0%, #ede9fe 30%, #f0f4ff 60%, #ffffff 100%);">
  </div>
  <!-- Decorative blobs -->
  <div class="absolute top-0 right-0 -z-10 w-96 h-96 rounded-full opacity-20 blur-3xl"
       style="background: radial-gradient(circle, #7c3aed, transparent 70%); transform: translate(30%, -30%);"></div>
  <div class="absolute bottom-0 left-0 -z-10 w-80 h-80 rounded-full opacity-15 blur-3xl"
       style="background: radial-gradient(circle, #4f46e5, transparent 70%); transform: translate(-30%, 30%);"></div>

  <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 text-center">
    <!-- Badge -->
    <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-6 border"
         style="background:#f5f3ff; border-color:#ddd6fe; color:#6d28d9;">
      <span class="w-2 h-2 rounded-full animate-pulse" style="background:#7c3aed;"></span>
      100 free credits on signup — no credit card required
    </div>

    <!-- Headline -->
    <h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight mb-6">
      Create stunning<br/>
      <span style="color:#7c3aed;">AI media</span> in seconds
    </h1>

    <!-- Subheadline -->
    <p class="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
      Generate images, videos, voice, transcriptions and more — powered by
      cutting-edge AI models. No skills required.
    </p>

    <!-- CTAs -->
    <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
      <a routerLink="/auth/register"
         class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold text-white shadow-lg transition-all duration-150 hover:shadow-xl hover:scale-[1.02]"
         style="background: linear-gradient(135deg, #7c3aed, #4f46e5);">
        Start for Free
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/>
        </svg>
      </a>
      <a routerLink="/explore"
         class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold text-gray-700 border-2 border-gray-200 bg-white hover:border-gray-300 transition-colors">
        Explore Creations
      </a>
    </div>

    <!-- Social proof -->
    <div class="flex items-center justify-center gap-6 mt-10 text-sm text-gray-400">
      <div class="flex items-center gap-1.5">
        <svg class="w-4 h-4" style="color:#7c3aed;" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
        <span>6 AI tools</span>
      </div>
      <div class="w-1 h-1 rounded-full bg-gray-300"></div>
      <span>Credit-based pricing</span>
      <div class="w-1 h-1 rounded-full bg-gray-300"></div>
      <span>No subscription needed</span>
    </div>
  </div>
</section>

<!-- ===== FEATURES GRID ===== -->
<section class="py-20 bg-white">
  <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
    <!-- Section header -->
    <div class="text-center mb-14">
      <p class="text-sm font-semibold uppercase tracking-widest mb-3" style="color:#7c3aed;">Everything you need</p>
      <h2 class="text-3xl sm:text-4xl font-extrabold text-gray-900">Six powerful AI tools</h2>
      <p class="mt-3 text-gray-500 max-w-xl mx-auto">All in one place. Create, transform, and enhance media with state-of-the-art AI.</p>
    </div>

    <!-- Cards grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      @for (feature of features; track feature.title) {
        <div class="group relative rounded-2xl border border-gray-100 bg-white p-6 hover:border-purple-200 hover:shadow-lg transition-all duration-200 cursor-default">
          <!-- Icon blob -->
          <div class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-200"
               style="background:#f5f3ff;">
            {{ feature.icon }}
          </div>
          <h3 class="text-base font-semibold text-gray-900 mb-1.5">{{ feature.title }}</h3>
          <p class="text-sm text-gray-500 leading-relaxed">{{ feature.description }}</p>
          <!-- Subtle accent line on hover -->
          <div class="absolute bottom-0 left-6 right-6 h-0.5 rounded-full scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"
               style="background: linear-gradient(90deg, #7c3aed, #4f46e5);"></div>
        </div>
      }
    </div>
  </div>
</section>

<!-- ===== HOW IT WORKS ===== -->
<section class="py-20" style="background:#faf5ff;">
  <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="text-center mb-14">
      <p class="text-sm font-semibold uppercase tracking-widest mb-3" style="color:#7c3aed;">Get started in minutes</p>
      <h2 class="text-3xl sm:text-4xl font-extrabold text-gray-900">How it works</h2>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      @for (step of steps; track step.number) {
        <div class="relative text-center">
          <!-- Step number circle -->
          <div class="w-14 h-14 rounded-full flex items-center justify-center text-xl font-black text-white mx-auto mb-5 shadow-md"
               style="background: linear-gradient(135deg, #7c3aed, #4f46e5);">
            {{ step.number }}
          </div>
          <!-- Connector line (desktop only, not on last) -->
          @if (step.number < 3) {
            <div class="hidden md:block absolute top-7 left-[calc(50%+28px)] right-0 h-0.5 bg-gradient-to-r from-purple-300 to-purple-100"></div>
          }
          <h3 class="text-lg font-bold text-gray-900 mb-2">{{ step.title }}</h3>
          <p class="text-sm text-gray-500 leading-relaxed">{{ step.description }}</p>
        </div>
      }
    </div>
  </div>
</section>

<!-- ===== PRICING ===== -->
<section class="py-20 bg-white">
  <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="text-center mb-14">
      <p class="text-sm font-semibold uppercase tracking-widest mb-3" style="color:#7c3aed;">Pricing</p>
      <h2 class="text-3xl sm:text-4xl font-extrabold text-gray-900">Simple credit-based pricing</h2>
      <p class="mt-3 text-gray-500 max-w-xl mx-auto">Pay only for what you use. No subscriptions, no hidden fees.</p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
      @for (pack of creditPacks; track pack.name) {
        <div class="relative rounded-2xl border p-6 flex flex-col items-center text-center transition-all duration-200 hover:shadow-xl"
             [class.shadow-lg]="pack.popular"
             [style.border-color]="pack.popular ? '#7c3aed' : '#e5e7eb'"
             [style.background]="pack.popular ? 'linear-gradient(160deg, #7c3aed 0%, #4f46e5 100%)' : 'white'">
          @if (pack.popular) {
            <div class="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold text-white shadow"
                 style="background:#f59e0b;">
              MOST POPULAR
            </div>
          }
          <div class="text-3xl font-black mb-1"
               [style.color]="pack.popular ? 'white' : '#111827'">
            {{ pack.price }}
          </div>
          <div class="text-sm font-semibold mb-3"
               [style.color]="pack.popular ? 'rgba(255,255,255,0.9)' : '#6b7280'">
            {{ pack.name }}
          </div>
          <div class="text-4xl font-extrabold mb-1"
               [style.color]="pack.popular ? 'white' : '#7c3aed'">
            {{ pack.credits }}
          </div>
          <div class="text-xs mb-5"
               [style.color]="pack.popular ? 'rgba(255,255,255,0.7)' : '#9ca3af'">
            credits
          </div>
          <a routerLink="/auth/register"
             class="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-150"
             [style.background]="pack.popular ? 'rgba(255,255,255,0.2)' : '#f5f3ff'"
             [style.color]="pack.popular ? 'white' : '#7c3aed'"
             [style.border]="pack.popular ? '1px solid rgba(255,255,255,0.3)' : '1px solid #ddd6fe'">
            Get Started
          </a>
        </div>
      }
    </div>

    <p class="text-center text-sm text-gray-500 mt-8">
      New accounts get
      <span class="font-semibold" style="color:#7c3aed;">100 free credits</span>
      to try everything — no credit card required
    </p>
  </div>
</section>

<!-- ===== CTA BANNER ===== -->
<section class="py-20"
         style="background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);">
  <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
    <h2 class="text-3xl sm:text-4xl font-extrabold text-white mb-4">Ready to create?</h2>
    <p class="text-purple-200 text-lg mb-8">Join thousands of creators using AI to make stunning media.</p>
    <a routerLink="/auth/register"
       class="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-bold text-white border-2 border-white/30 hover:bg-white/10 transition-colors">
      Get started free
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/>
      </svg>
    </a>
    <p class="mt-4 text-purple-300 text-sm">100 free credits • No credit card • Cancel anytime</p>
  </div>
</section>

<!-- ===== FOOTER ===== -->
<footer class="bg-gray-900 text-gray-400 py-12">
  <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
      <!-- Brand -->
      <div class="text-center md:text-left">
        <div class="flex items-center gap-2 justify-center md:justify-start mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 128 128">
            <defs>
              <linearGradient id="foot-logo-g" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#8B5CF6"/>
                <stop offset="100%" stop-color="#4F46E5"/>
              </linearGradient>
            </defs>
            <rect width="128" height="128" rx="28" fill="url(#foot-logo-g)"/>
            <polygon points="50,42 50,86 88,64" fill="white" opacity="0.95"/>
          </svg>
          <span style="font-size:15px;font-weight:700;color:white;">Ai<span style="color:#a78bfa;">Media</span></span>
        </div>
        <p class="text-sm text-gray-500">AI-Powered Media Creation</p>
      </div>

      <!-- Links -->
      <div class="flex flex-wrap justify-center md:justify-end gap-x-8 gap-y-2 text-sm">
        <a routerLink="/explore" class="hover:text-white transition-colors">Explore</a>
        <a routerLink="/faq" class="hover:text-white transition-colors">FAQ</a>
        <a routerLink="/contact" class="hover:text-white transition-colors">Contact Us</a>
        <a routerLink="/auth/login" class="hover:text-white transition-colors">Login</a>
        <a routerLink="/auth/register" class="hover:text-white transition-colors">Sign Up</a>
      </div>
    </div>
    <div class="mt-8 pt-6 border-t border-gray-800 text-center text-xs text-gray-600">
      &copy; {{ currentYear }} AiMedia. All rights reserved.
    </div>
  </div>
</footer>
  `
})
export class LandingComponent {
  auth = inject(AuthService);
  currentYear = new Date().getFullYear();

  features = [
    {
      icon: '🖼️',
      title: 'Image Generation',
      description: 'Turn text prompts into stunning, high-quality images using state-of-the-art diffusion models.'
    },
    {
      icon: '🎬',
      title: 'Image to Video',
      description: 'Animate any image into a dynamic, fluid video clip with a single click.'
    },
    {
      icon: '🎥',
      title: 'Text to Video',
      description: 'Generate cinematic videos directly from text descriptions — no footage required.'
    },
    {
      icon: '🎙️',
      title: 'Text to Voice',
      description: 'Convert text to natural, expressive speech with realistic voice cloning.'
    },
    {
      icon: '📝',
      title: 'Transcription',
      description: 'Transcribe any audio or video file to accurate, formatted text instantly.'
    },
    {
      icon: '✂️',
      title: 'Background Removal',
      description: 'Remove backgrounds from images in one click with pixel-perfect precision.'
    }
  ];

  steps = [
    {
      number: 1,
      title: 'Sign up free',
      description: 'Create your account in seconds and receive 100 free credits instantly — no credit card needed.'
    },
    {
      number: 2,
      title: 'Choose your AI tool',
      description: 'Pick from 6 powerful AI tools: image generation, video, voice, transcription, and more.'
    },
    {
      number: 3,
      title: 'Download your creation',
      description: 'Your AI media is ready in seconds. Download it and share or use it anywhere.'
    }
  ];

  creditPacks = [
    { name: 'Starter', credits: '500', price: '$5', popular: false },
    { name: 'Popular', credits: '1,200', price: '$10', popular: true },
    { name: 'Pro', credits: '3,000', price: '$20', popular: false }
  ];
}
