import { Component, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { GenerationService } from '../../core/services/generation.service';
import { CreditsService } from '../../core/services/credits.service';
import { SignalRService } from '../../core/services/signalr.service';
import { AuthService } from '../../core/auth/auth.service';
import { LoginModalService } from '../../core/services/login-modal.service';
import { ModelCatalogService } from '../../core/services/model-catalog.service';
import { MediaPreviewComponent } from '../../shared/components/media-preview/media-preview.component';
import { JobStatusComponent } from '../../shared/components/job-status/job-status.component';
import { type JobStatus } from '../../core/models/models';
import { AspectRatioPickerComponent, type AspectRatio,
         ASPECT_RATIOS_169_916_11, ASPECT_RATIOS_169_916 } from '../../shared/components/aspect-ratio-picker/aspect-ratio-picker.component';
import { DurationPickerComponent } from '../../shared/components/duration-picker/duration-picker.component';
import { ResolutionPickerComponent } from '../../shared/components/resolution-picker/resolution-picker.component';
import { ModelPickerComponent, type PickerGroup, type PickerModel } from '../../shared/components/model-picker/model-picker.component';

interface TtvModel {
  id: string;
  name: string;
  description: string;
  creditsPerSec: number;
  creditsFlat: number;        // >0 for flat-rate models (no duration)
  badge?: string;
  badgeColor?: string;
  tags: string[];
  durations: number[];
  resolutions: string[];      // empty = no resolution picker
  aspectRatios: AspectRatio[]; // empty = no AR picker
  supportsMultiShot: boolean;
  supportsAudio: boolean;     // show generate_audio toggle
  audioDefault: boolean;
  supportsPromptOptimizer: boolean; // Hailuo models
  supportsMultiPrompt: boolean;     // multi-shot with explicit segments (Kling v3/o3)
  supportsNegativePrompt: boolean;  // negative prompt field
  supportsCfgScale: boolean;        // CFG scale slider
  supportsSeed?: boolean;           // seed input
  supportsAutoFix?: boolean;        // auto-fix toggle
  audioTiers?: { noAudio: number; audio: number }; // audio-dependent credit tiers
  audioResolutionTiers?: { res: string; noAudio: number; audio: number }[]; // res+audio combo tiers
}

interface TtvGroup {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  iconBg: string;
  iconUrl?: string;
  tags: string[];
  badge?: string;
  badgeColor?: string;
  subModels: TtvModel[];
}

@Component({
  selector: 'app-text-to-video',
  standalone: true,
  imports: [CommonModule, FormsModule, MediaPreviewComponent, JobStatusComponent,
            AspectRatioPickerComponent, DurationPickerComponent, ResolutionPickerComponent, ModelPickerComponent],
  template: `
<div class="flex flex-col lg:flex-row lg:h-full">
  <div class="w-full lg:w-[420px] lg:flex-shrink-0 border-b lg:border-b-0 lg:border-r border-border bg-white flex flex-col">
    <div class="px-5 py-4 border-b border-border">
      <h1 class="text-base font-semibold text-gray-900">Text to Video</h1>
    </div>

    <div class="flex-1 px-5 py-4 space-y-5 overflow-y-auto">

      <!-- Model dropdown -->
      <app-model-picker
        [groups]="pickerGroups()"
        [selectedId]="selectedModel()?.id ?? null"
        (modelSelect)="onModelSelect($event)" />

      <!-- Multi-Shot toggle (before prompt so user sees which input mode is active) -->
      @if (selectedModel()?.supportsMultiShot) {
        <div class="flex items-start justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
          <div>
            <p class="text-sm font-medium text-gray-700">Multi-Shot</p>
            <p class="text-xs text-gray-400 mt-0.5">Generate cinematic multi-scene video sequences</p>
          </div>
          <button type="button" (click)="multiShot.update(v => !v); clampDuration()"
                  class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 mt-0.5"
                  [class.bg-accent]="multiShot()"
                  [class.bg-gray-300]="!multiShot()">
            <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                  [class.translate-x-6]="multiShot()"
                  [class.translate-x-1]="!multiShot()"></span>
          </button>
        </div>
      }

      <!-- Prompt / Multi-Prompt segments -->
      @if (selectedModel()?.supportsMultiPrompt && multiShot()) {
        <div>
          <label class="form-label">Multi-Prompt Segments <span class="text-red-500">*</span></label>
          <p class="text-xs text-gray-400 mb-2">
            Each segment gets roughly equal time.
            {{ availableDurations().length > 0 ? availableDurations()[0] : duration() }}s ÷ {{ multiPrompts().length }} segments
            ≈ {{ ((availableDurations().length > 0 ? availableDurations()[0] : duration()) / multiPrompts().length) | number:'1.0-1' }}s each.
          </p>
          @for (seg of multiPrompts(); track $index) {
            <div class="flex gap-2 mb-2">
              <div class="flex items-center justify-center w-6 h-6 rounded-full bg-accent/10 text-accent text-xs font-bold flex-shrink-0 mt-1">
                {{ $index + 1 }}
              </div>
              <textarea class="form-textarea h-16 flex-1"
                [ngModel]="seg"
                (ngModelChange)="updatePromptSegment($index, $event)"
                [placeholder]="'Segment ' + ($index + 1) + ' — describe the scene...'"
                maxlength="1000"></textarea>
              @if (multiPrompts().length > 2) {
                <button type="button" (click)="removePromptSegment($index)"
                        class="flex-shrink-0 w-6 h-6 mt-1 rounded-full bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              }
            </div>
          }
          @if (multiPrompts().length < 6) {
            <button type="button" (click)="addPromptSegment()"
                    class="text-xs text-accent font-medium hover:underline">+ Add segment</button>
          }
        </div>
      } @else {
        <!-- Single prompt -->
        <div>
          <label class="form-label">Prompt</label>
          <textarea class="form-textarea h-32" [(ngModel)]="prompt"
            spellcheck="true" lang="en" autocorrect="on" autocapitalize="sentences"
            placeholder="Describe your video scene in detail..." maxlength="2500"></textarea>
          <p class="text-right text-xs text-gray-400 mt-1">{{ prompt.length }}/2500</p>
        </div>
      }

      <!-- Aspect Ratio -->
      @if ((selectedModel()?.aspectRatios?.length ?? 0) > 0) {
        <app-aspect-ratio-picker
          [ratios]="selectedModel()!.aspectRatios"
          [value]="aspectRatio()"
          (valueChange)="aspectRatio.set($event)" />
      }

      <!-- Duration -->
      @if (availableDurations().length > 0) {
        <app-duration-picker
          [durations]="availableDurations()"
          [value]="duration()"
          (valueChange)="duration.set($event)" />
      }
      @if ((selectedModel()?.durations?.length ?? 0) === 0) {
        <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 border border-indigo-100">
          <svg class="w-4 h-4 text-indigo-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"/>
          </svg>
          <span class="text-xs text-indigo-600">This model generates a fixed <strong>5s</strong> video.</span>
        </div>
      }

      <!-- Resolution -->
      <app-resolution-picker
        [resolutions]="selectedModel()?.resolutions ?? []"
        [value]="resolution()"
        [premiumResolutions]="['1080p','4k']"
        (valueChange)="resolution.set($event)" />

      <!-- Generate Audio toggle -->
      @if (selectedModel()?.supportsAudio) {
        <div class="flex items-start justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
          <div>
            <p class="text-sm font-medium text-gray-700">Generate Audio</p>
            <p class="text-xs text-gray-400 mt-0.5">Native audio with voice &amp; sound effects</p>
          </div>
          <button type="button" (click)="generateAudio.update(v => !v)"
                  class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 mt-0.5"
                  [class.bg-accent]="generateAudio()"
                  [class.bg-gray-300]="!generateAudio()">
            <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                  [class.translate-x-6]="generateAudio()"
                  [class.translate-x-1]="!generateAudio()"></span>
          </button>
        </div>
      }

      <!-- Advanced Options -->
      @if (selectedModel()?.supportsNegativePrompt || selectedModel()?.supportsCfgScale || selectedModel()?.supportsPromptOptimizer || selectedModel()?.supportsSeed || selectedModel()?.supportsAutoFix) {
        <button type="button" (click)="showAdvanced.update(v => !v)"
                class="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors">
          <svg class="w-3.5 h-3.5 transition-transform" [class.rotate-90]="showAdvanced()"
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
          Advanced Options
        </button>
        @if (showAdvanced()) {
          <div class="space-y-4 pl-1">
            @if (selectedModel()?.supportsNegativePrompt) {
              <div>
                <label class="form-label">Negative Prompt <span class="text-gray-400 font-normal">(optional)</span></label>
                <input type="text" class="form-input" [(ngModel)]="negativePrompt"
                  placeholder="blur, distort, low quality, watermark..." maxlength="500"/>
              </div>
            }
            @if (selectedModel()?.supportsCfgScale) {
              <div>
                <label class="form-label">Prompt Guidance (CFG Scale)
                  <span class="text-gray-400 font-normal ml-1">{{ cfgScale() | number:'1.1-1' }}</span>
                </label>
                <input type="range" class="w-full accent-accent" min="0" max="1" step="0.1"
                  [ngModel]="cfgScale()" (ngModelChange)="cfgScale.set(+$event)"/>
                <div class="flex justify-between text-[10px] text-gray-400 mt-0.5">
                  <span>Creative</span><span>Strict</span>
                </div>
              </div>
            }
            @if (selectedModel()?.supportsPromptOptimizer) {
              <div class="flex items-start justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <p class="text-sm font-medium text-gray-700">Prompt Optimizer</p>
                  <p class="text-xs text-gray-400 mt-0.5">Let the model enhance your prompt for better results</p>
                </div>
                <button type="button" (click)="promptOptimizer.update(v => !v)"
                        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 mt-0.5"
                        [class.bg-accent]="promptOptimizer()"
                        [class.bg-gray-300]="!promptOptimizer()">
                  <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                        [class.translate-x-6]="promptOptimizer()"
                        [class.translate-x-1]="!promptOptimizer()"></span>
                </button>
              </div>
            }
            @if (selectedModel()?.supportsSeed) {
              <div>
                <label class="form-label">Seed <span class="text-gray-400 font-normal">(optional)</span></label>
                <input type="number" class="form-input" placeholder="Leave empty for random"
                  [ngModel]="seed()" (ngModelChange)="seed.set($event || null)" min="0"/>
                <p class="text-xs text-gray-400 mt-1">Same seed + same prompt = same result. Useful for reproducibility.</p>
              </div>
            }
            @if (selectedModel()?.supportsAutoFix) {
              <div class="flex items-start justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <p class="text-sm font-medium text-gray-700">Auto Fix</p>
                  <p class="text-xs text-gray-400 mt-0.5">Automatically rewrite prompts that fail moderation or validation</p>
                </div>
                <button type="button" (click)="autoFix.update(v => !v)"
                        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 mt-0.5"
                        [class.bg-accent]="autoFix()"
                        [class.bg-gray-300]="!autoFix()">
                  <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                        [class.translate-x-6]="autoFix()"
                        [class.translate-x-1]="!autoFix()"></span>
                </button>
              </div>
            }
          </div>
        }
      }

      @if (errorMsg()) {
        <div class="p-3 bg-red-50 border border-red-300 rounded-lg text-sm text-red-700">{{ errorMsg() }}</div>
      }
    </div>

    <!-- Footer -->
    <div class="px-5 py-4 border-t border-border space-y-3">
      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-500">Cost estimate</span>
        <span class="font-semibold text-gray-900">
          <span class="text-accent">{{ costEstimate() }}</span> credits
        </span>
      </div>
      <!-- Public visibility toggle -->
      <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
        <div>
          <p class="text-sm font-medium text-gray-700">Public visibility</p>
          <p class="text-xs text-gray-400">Show this output on the Explore page</p>
        </div>
        <button type="button" (click)="isPublic.update(v => !v)"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                [class.bg-accent]="isPublic()"
                [class.bg-gray-300]="!isPublic()">
          <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                [class.translate-x-6]="isPublic()"
                [class.translate-x-1]="!isPublic()"></span>
        </button>
      </div>
      @if (isPublic()) {
        <div>
          <select [(ngModel)]="zone"
                  class="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent">
            <option value="">Zone (optional)</option>
            <option value="Cinematic">🎬 Cinematic</option>
            <option value="Character">🧑 Character</option>
            <option value="Viral">🔥 Viral</option>
            <option value="Pet">🐾 Pet</option>
            <option value="Dramatic">🎭 Dramatic</option>
            <option value="Cool">😎 Cool</option>
            <option value="Playful">🎮 Playful</option>
            <option value="Fantasy">🧙 Fantasy</option>
            <option value="Dark">🌑 Dark</option>
            <option value="Anime">🌸 Anime</option>
          </select>
        </div>
      }
      <button class="btn-primary w-full" (click)="generate()"
              [disabled]="!hasValidPrompt() || generating() || !selectedModel()">
        @if (generating()) { <span class="animate-spin mr-1">⟳</span> Generating... }
        @else { ✨ Generate }
      </button>
    </div>
  </div>

  <!-- Right panel -->
  <div class="flex-1 p-4 lg:p-6 flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-medium text-gray-600">Video Output</h2>
      <div class="flex items-center gap-3">
        @if (jobStatus()) { <app-job-status [status]="jobStatus()!"/> }
        @if (outputUrl()) {
          <a [href]="outputUrl()" download target="_blank"
             class="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white text-xs font-medium rounded-lg hover:bg-accent/90 transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            Download
          </a>
        }
      </div>
    </div>
    @if (generating() && !outputUrl()) {
      <div class="flex items-center gap-3 px-4 py-3 bg-accent-light border border-accent/20 rounded-xl">
        <svg class="w-5 h-5 text-accent animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <div>
          <p class="text-sm font-medium text-accent">Processing your video...</p>
          <p class="text-xs text-accent/70">This usually takes 1–3 minutes. You can navigate away — results will be in My Jobs.</p>
        </div>
      </div>
    }
    <div class="h-[55vw] sm:h-[420px] lg:h-auto lg:flex-1 lg:min-h-0 card overflow-hidden">
      <app-media-preview [url]="outputUrl()" product="TextToVideo"/>
    </div>
  </div>
</div>
  `
})
export class TextToVideoComponent implements OnInit, OnDestroy {
  private gen = inject(GenerationService);
  private credits = inject(CreditsService);
  private auth = inject(AuthService);
  private loginModal = inject(LoginModalService);
  private modelCatalog = inject(ModelCatalogService);
  private signalR = inject(SignalRService);
  private route = inject(ActivatedRoute);
  catalog = this.modelCatalog.catalog;
  pricingById = computed(() => new Map(this.catalog().map(item => [item.id, item.displayPrice])));

  modelGroups: TtvGroup[] = [
    {
      id: 'kling',
      name: 'Kling',
      tagline: 'Motion quality leader',
      icon: 'K', iconBg: '#F97316', iconUrl: '/assets/icons/kling.png',
      tags: ['Multi-Shot', 'Audio'],
      badge: 'HOT', badgeColor: '#EF4444',
      subModels: [
        {
          id: 'fal-ai/kling-video/v3/pro/text-to-video',
          name: 'Kling v3 Pro',
          description: 'Latest Kling — up to 15s, multi-shot, native audio.',
          creditsPerSec: 17, creditsFlat: 0,
          badge: 'HOT', badgeColor: '#EF4444',
          tags: ['Multi-Shot', 'Audio', '3–15s', '17–25 cr/s'],
          durations: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
          resolutions: [],
          aspectRatios: ASPECT_RATIOS_169_916_11,
          supportsMultiShot: true, supportsAudio: true, audioDefault: true, supportsPromptOptimizer: false,
          supportsMultiPrompt: true, supportsNegativePrompt: true, supportsCfgScale: true,
          audioTiers: { noAudio: 17, audio: 25 },
        },
        {
          id: 'fal-ai/kling-video/o3/pro/text-to-video',
          name: 'Kling o3 Pro',
          description: 'New o3 architecture — multi-shot, up to 15s, native audio.',
          creditsPerSec: 17, creditsFlat: 0,
          badge: 'NEW', badgeColor: '#7C3AED',
          tags: ['Multi-Shot', 'Audio', '3–15s', '17–21 cr/s'],
          durations: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
          resolutions: [],
          aspectRatios: ASPECT_RATIOS_169_916_11,
          supportsMultiShot: true, supportsAudio: true, audioDefault: true, supportsPromptOptimizer: false,
          supportsMultiPrompt: true, supportsNegativePrompt: true, supportsCfgScale: false,
          audioTiers: { noAudio: 17, audio: 21 },
        },
        {
          id: 'fal-ai/kling-video/v2.6/pro/text-to-video',
          name: 'Kling v2.6 Pro',
          description: 'Improved realism with native audio generation.',
          creditsPerSec: 11, creditsFlat: 0,
          tags: ['Audio', '5–10s', '11–21 cr/s'],
          durations: [5, 10],
          resolutions: [],
          aspectRatios: ASPECT_RATIOS_169_916_11,
          supportsMultiShot: false, supportsAudio: true, audioDefault: true, supportsPromptOptimizer: false,
          supportsMultiPrompt: false, supportsNegativePrompt: true, supportsCfgScale: true,
          audioTiers: { noAudio: 11, audio: 21 },
        },
        {
          id: 'fal-ai/kling-video/v2.5-turbo/pro/text-to-video',
          name: 'Kling v2.5 Turbo',
          description: 'Fast generation with strong visual fidelity.',
          creditsPerSec: 11, creditsFlat: 0,
          badge: 'FAST', badgeColor: '#2563EB',
          tags: ['Fast', '5–10s', '11 cr/s'],
          durations: [5, 10],
          resolutions: [],
          aspectRatios: ASPECT_RATIOS_169_916_11,
          supportsMultiShot: false, supportsAudio: false, audioDefault: false, supportsPromptOptimizer: false,
          supportsMultiPrompt: false, supportsNegativePrompt: true, supportsCfgScale: true,
        },
      ],
    },
    {
      id: 'hailuo',
      name: 'Hailuo',
      tagline: 'MiniMax AI Video',
      icon: 'H', iconBg: '#10B981', iconUrl: '/assets/icons/hailuo.png',
      tags: ['Prompt Optimizer'],
      badge: 'NEW', badgeColor: '#059669',
      subModels: [
        {
          id: 'fal-ai/minimax/hailuo-2.3/pro/text-to-video',
          name: 'Hailuo 2.3 Pro',
          description: 'Highest quality MiniMax — automatic prompt optimization.',
          creditsPerSec: 0, creditsFlat: 74,
          badge: 'NEW', badgeColor: '#059669',
          tags: ['1080p', 'Prompt Optimizer', '74 cr'],
          durations: [],
          resolutions: [],
          aspectRatios: [],
          supportsMultiShot: false, supportsAudio: false, audioDefault: false, supportsPromptOptimizer: true,
          supportsMultiPrompt: false, supportsNegativePrompt: false, supportsCfgScale: false,
        },
        {
          id: 'fal-ai/minimax/hailuo-02/standard/text-to-video',
          name: 'Hailuo 2.0 Standard',
          description: 'Reliable MiniMax with flexible duration control.',
          creditsPerSec: 7, creditsFlat: 0,
          tags: ['768p', 'Prompt Optimizer', '7 cr/s'],
          durations: [6, 10],
          resolutions: [],
          aspectRatios: [],
          supportsMultiShot: false, supportsAudio: false, audioDefault: false, supportsPromptOptimizer: true,
          supportsMultiPrompt: false, supportsNegativePrompt: false, supportsCfgScale: false,
        },
      ],
    },
    {
      id: 'veo',
      name: 'Google Veo',
      tagline: 'Cinematic realism with audio',
      icon: 'G', iconBg: '#4285F4', iconUrl: '/assets/icons/veo.png',
      tags: ['Audio', 'Ultra Quality', '4K'],
      subModels: [
        {
          id: 'fal-ai/veo3.1',
          name: 'Veo 3.1',
          description: 'Latest Google Veo — up to 4K with native audio.',
          creditsPerSec: 30, creditsFlat: 0,
          badge: 'NEW', badgeColor: '#1a73e8',
          tags: ['Audio', 'Up to 4K', '30–90 cr/s'],
          durations: [4, 6, 8],
          resolutions: ['720p', '1080p', '4k'],
          aspectRatios: ASPECT_RATIOS_169_916,
          supportsMultiShot: false, supportsAudio: true, audioDefault: true, supportsPromptOptimizer: false,
          supportsMultiPrompt: false, supportsNegativePrompt: true, supportsCfgScale: false,
          supportsSeed: true, supportsAutoFix: true,
          audioResolutionTiers: [
            { res: '720p',  noAudio: 30, audio: 60 },
            { res: '1080p', noAudio: 30, audio: 60 },
            { res: '4k',    noAudio: 60, audio: 90 },
          ],
        },
        {
          id: 'fal-ai/veo3.1/fast',
          name: 'Veo 3.1 Fast',
          description: 'Faster Veo 3.1 — 4K and audio at lower cost.',
          creditsPerSec: 15, creditsFlat: 0,
          badge: 'FAST', badgeColor: '#2563EB',
          tags: ['Audio', 'Up to 4K', 'Fast', '15–53 cr/s'],
          durations: [4, 6, 8],
          resolutions: ['720p', '1080p', '4k'],
          aspectRatios: ASPECT_RATIOS_169_916,
          supportsMultiShot: false, supportsAudio: true, audioDefault: true, supportsPromptOptimizer: false,
          supportsMultiPrompt: false, supportsNegativePrompt: true, supportsCfgScale: false,
          supportsSeed: true, supportsAutoFix: true,
          audioResolutionTiers: [
            { res: '720p',  noAudio: 15, audio: 23 },
            { res: '1080p', noAudio: 15, audio: 23 },
            { res: '4k',    noAudio: 45, audio: 53 },
          ],
        },
        {
          id: 'fal-ai/veo3',
          name: 'Veo 3',
          description: 'Google Veo 3 — cinematic realism with synchronized audio.',
          creditsPerSec: 30, creditsFlat: 0,
          tags: ['Audio', '1080p', '30–60 cr/s'],
          durations: [4, 6, 8],
          resolutions: ['720p', '1080p'],
          aspectRatios: ASPECT_RATIOS_169_916,
          supportsMultiShot: false, supportsAudio: true, audioDefault: true, supportsPromptOptimizer: false,
          supportsMultiPrompt: false, supportsNegativePrompt: true, supportsCfgScale: false,
          supportsSeed: true, supportsAutoFix: true,
          audioTiers: { noAudio: 30, audio: 60 },
        },
        {
          id: 'fal-ai/veo3/fast',
          name: 'Veo 3 Fast',
          description: 'Speed-optimised Veo 3 with audio — lower cost.',
          creditsPerSec: 15, creditsFlat: 0,
          badge: 'FAST', badgeColor: '#2563EB',
          tags: ['Audio', 'Fast', '15–23 cr/s'],
          durations: [4, 6, 8],
          resolutions: ['720p', '1080p'],
          aspectRatios: ASPECT_RATIOS_169_916,
          supportsMultiShot: false, supportsAudio: true, audioDefault: true, supportsPromptOptimizer: false,
          supportsMultiPrompt: false, supportsNegativePrompt: true, supportsCfgScale: false,
          supportsSeed: true, supportsAutoFix: true,
          audioTiers: { noAudio: 15, audio: 23 },
        },
      ],
    },
  ];

  get allModels(): TtvModel[] {
    return this.modelGroups.flatMap(g => g.subModels);
  }

  pickerGroups = computed<PickerGroup[]>(() =>
    this.modelGroups.map(g => ({
      id: g.id,
      name: g.name,
      tagline: g.tagline,
      icon: g.icon,
      iconBg: g.iconBg,
      iconUrl: g.iconUrl,
      groupTags: g.tags,
      badge: g.badge,
      badgeColor: g.badgeColor,
      models: g.subModels.map(m => ({
        id: m.id,
        name: m.name,
        description: m.description,
        creditsDisplay: this.pricingById().get(m.id) ?? (m.creditsFlat > 0
          ? `${m.creditsFlat} cr`
          : m.audioResolutionTiers
            ? `${m.audioResolutionTiers[0].noAudio}–${m.audioResolutionTiers[m.audioResolutionTiers.length - 1].audio} cr/s`
            : m.audioTiers
              ? `${m.audioTiers.noAudio}–${m.audioTiers.audio} cr/s`
              : `${m.creditsPerSec} cr/s`),
        badge: m.badge,
        badgeColor: m.badgeColor,
        tags: m.tags,
        audioBadge: m.supportsAudio,
      } satisfies PickerModel)),
    } satisfies PickerGroup))
  );

  selectedModel = signal<TtvModel | null>(this.modelGroups[0].subModels[0]);

  prompt = '';
  aspectRatio = signal('16:9');
  duration = signal(5);
  resolution = signal<string>('720p');
  multiShot = signal(false);
  generateAudio = signal(true);

  // Multi-prompt segments (Kling v3/o3 multi-shot)
  multiPrompts = signal<string[]>(['', '']);
  // Advanced options
  negativePrompt = '';
  cfgScale = signal(0.5);
  promptOptimizer = signal(true);
  seed = signal<number | null>(null);
  autoFix = signal(false);
  showAdvanced = signal(false);

  generating = signal(false);
  jobStatus = signal<JobStatus | null>(null);
  outputUrl = signal<string | undefined>(undefined);
  errorMsg = signal<string | undefined>(undefined);
  isPublic = signal(true);
  zone = '';

  /** Filter durations so each multi-prompt segment gets at least 3s */
  availableDurations = computed(() => {
    const m = this.selectedModel();
    if (!m || m.durations.length === 0) return m?.durations ?? [];
    if (!m.supportsMultiPrompt || !this.multiShot()) return m.durations;
    const minDur = this.multiPrompts().length * 3;
    const filtered = m.durations.filter(d => d >= minDur);
    return filtered.length > 0 ? filtered : [m.durations[m.durations.length - 1]];
  });

  hasValidPrompt = computed(() => {
    const m = this.selectedModel();
    if (!m) return false;
    if (m.supportsMultiPrompt && this.multiShot()) {
      return this.multiPrompts().filter(p => p.trim().length > 0).length >= 2;
    }
    return this.prompt.trim().length > 0;
  });

  costEstimate = computed(() => {
    const m = this.selectedModel();
    if (!m) return 0;
    if (m.creditsFlat > 0) return m.creditsFlat;
    const dur = m.durations.length > 0 ? this.duration() : 1;
    const res = this.resolution();
    // Audio + resolution combo tiers (Veo 3.1)
    if (m.audioResolutionTiers) {
      const tier = m.audioResolutionTiers.find(t => t.res === res) ?? m.audioResolutionTiers[0];
      return (this.generateAudio() ? tier.audio : tier.noAudio) * dur;
    }
    // Audio-tiered pricing (Kling v3, o3, Veo 3/3 Fast)
    if (m.audioTiers) {
      const crPerSec = this.generateAudio() ? m.audioTiers.audio : m.audioTiers.noAudio;
      return crPerSec * dur;
    }
    const resMult = m.resolutions.length > 0
      ? (res === '4k' ? 2 : res === '1080p' ? 1.5 : 1)
      : 1;
    return Math.ceil(m.creditsPerSec * dur * resMult);
  });

  private currentJobId: string | null = null;
  private pollInterval?: ReturnType<typeof setInterval>;

  ngOnInit() {
    this.modelCatalog.loadAll();
    const qp = this.route.snapshot.queryParams;
    if (qp['prompt']) this.prompt = qp['prompt'];
    if (qp['model']) {
      const m = this.allModels.find(x => x.id === qp['model']);
      if (m) this.selectModel(m);
    }
    if (qp['outputUrl']) this.outputUrl.set(qp['outputUrl']);
  }

  onModelSelect(id: string) {
    const m = this.allModels.find(x => x.id === id);
    if (m) this.selectModel(m);
  }

  selectModel(m: TtvModel) {
    this.selectedModel.set(m);
    if (m.durations.length > 0) this.duration.set(m.durations[0]);
    this.aspectRatio.set(m.aspectRatios[0]?.value ?? '16:9');
    if (m.resolutions.length > 0) this.resolution.set(m.resolutions[0]);
    this.generateAudio.set(m.audioDefault);
    if (!m.supportsMultiShot) this.multiShot.set(false);
    this.multiPrompts.set(['', '']);
    this.negativePrompt = '';
    this.cfgScale.set(0.5);
    this.promptOptimizer.set(true);
    this.seed.set(null);
    this.autoFix.set(false);
    this.showAdvanced.set(false);
  }

  addPromptSegment() {
    this.multiPrompts.update(p => [...p, '']);
    this.clampDuration();
  }

  removePromptSegment(i: number) {
    this.multiPrompts.update(p => p.filter((_, idx) => idx !== i));
    this.clampDuration();
  }

  updatePromptSegment(i: number, val: string) {
    this.multiPrompts.update(p => p.map((v, idx) => idx === i ? val : v));
  }

  /** Ensure selected duration stays valid after segment count changes */
  clampDuration() {
    setTimeout(() => {
      const avail = this.availableDurations();
      if (avail.length > 0 && !avail.includes(this.duration())) {
        this.duration.set(avail[0]);
      }
    });
  }

  generate() {
    if (!this.auth.isLoggedIn()) { this.loginModal.show(); return; }
    if (!this.hasValidPrompt() || this.generating() || !this.selectedModel()) return;
    this.generating.set(true);
    this.jobStatus.set('Queued');
    this.outputUrl.set(undefined);
    this.errorMsg.set(undefined);
    const m = this.selectedModel()!;

    const multiPromptsClean = m.supportsMultiPrompt && this.multiShot()
      ? this.multiPrompts().filter(p => p.trim()) : [];

    this.gen.generateTextToVideo({
      prompt: multiPromptsClean.length > 0 ? undefined : this.prompt,
      multiPrompts: multiPromptsClean.length > 0 ? multiPromptsClean : undefined,
      modelId: m.id,
      durationSeconds: m.durations.length > 0 ? this.duration() : 1,
      aspectRatio: m.aspectRatios.length > 0 ? this.aspectRatio() : '16:9',
      resolution: m.resolutions.length > 0 ? this.resolution() : undefined,
      multiShot: m.supportsMultiShot ? this.multiShot() : undefined,
      generateAudio: m.supportsAudio ? this.generateAudio() : undefined,
      negativePrompt: m.supportsNegativePrompt && this.negativePrompt.trim() ? this.negativePrompt.trim() : undefined,
      cfgScale: m.supportsCfgScale ? this.cfgScale() : undefined,
      promptOptimizer: m.supportsPromptOptimizer ? this.promptOptimizer() : undefined,
      seed: m.supportsSeed ? (this.seed() ?? undefined) : undefined,
      autoFix: m.supportsAutoFix ? this.autoFix() : undefined,
      isPublic: this.isPublic(),
      zone: this.zone || undefined,
    }).subscribe({
      next: res => {
        this.currentJobId = res.jobId;
        this.credits.reserveLocally(res.creditsReserved);
        this.signalR.trackJob(res.jobId, 'TextToVideo');
        this.startFallback();
      },
      error: err => {
        this.generating.set(false);
        this.jobStatus.set('Failed');
        this.errorMsg.set(err.error?.error ?? 'Failed.');
      }
    });
  }

  private startFallback() {
    let polling = false;
    this.pollInterval = setInterval(() => {
      const u = this.signalR.latestUpdate();
      if (u?.jobId === this.currentJobId && (u.status === 'Completed' || u.status === 'Failed')) {
        this.apply(u.status as JobStatus, u.outputUrl, u.errorMessage);
        clearInterval(this.pollInterval); return;
      }
      if (polling || !this.currentJobId) return;
      polling = true;
      this.gen.getJob(this.currentJobId).subscribe({
        next: j => {
          polling = false;
          if (j.status === 'Completed' || j.status === 'Failed') {
            this.signalR.publishUpdate({ jobId: j.id, status: j.status, outputUrl: j.outputUrl, creditsCharged: j.creditsCharged, errorMessage: j.errorMessage });
            this.apply(j.status, j.outputUrl, j.errorMessage);
            clearInterval(this.pollInterval);
          }
        },
        error: () => { polling = false; }
      });
    }, 5000);
  }

  private apply(status: JobStatus, url?: string, err?: string) {
    this.jobStatus.set(status);
    this.generating.set(false);
    if (status === 'Completed') { this.outputUrl.set(url); this.credits.loadBalance().subscribe(); }
    else { this.errorMsg.set(err ?? 'Failed.'); this.credits.loadBalance().subscribe(); }
  }

  ngOnDestroy() { clearInterval(this.pollInterval); }
}
