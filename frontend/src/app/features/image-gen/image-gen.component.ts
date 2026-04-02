import { Component, signal, computed, inject, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { GenerationService } from '../../core/services/generation.service';
import { CreditsService } from '../../core/services/credits.service';
import { SignalRService } from '../../core/services/signalr.service';
import { AuthService } from '../../core/auth/auth.service';
import { LoginModalService } from '../../core/services/login-modal.service';
import { MediaPreviewComponent } from '../../shared/components/media-preview/media-preview.component';
import { JobStatusComponent } from '../../shared/components/job-status/job-status.component';
import { type JobStatus } from '../../core/models/models';
import { ModelPickerComponent, type PickerGroup, type PickerModel } from '../../shared/components/model-picker/model-picker.component';
import { AspectRatioPickerComponent, type AspectRatio } from '../../shared/components/aspect-ratio-picker/aspect-ratio-picker.component';
import { ResolutionPickerComponent } from '../../shared/components/resolution-picker/resolution-picker.component';

interface ImageModel {
  id: string;
  name: string;
  description: string;
  credits: number;
  badge?: string;
  badgeColor?: string;
  tags: string[];
  // sizing
  paramMode: 'imageSize' | 'aspectRatio';
  imageSizes: string[];
  aspectRatios: string[];
  // optional extras
  styles?: string[];
  resolutions?: string[];
  qualities?: string[];
  backgrounds?: string[];
  supportsNegativePrompt: boolean;
}

interface ImageGroup {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  iconBg: string;
  iconUrl?: string;
  tags: string[];
  badge?: string;
  subModels: ImageModel[];
}

const IMAGE_SIZES = ['square_hd', 'square', 'portrait_4_3', 'portrait_16_9', 'landscape_4_3', 'landscape_16_9'];
const SEEDREAM_V5_LITE_SIZES = ['square_hd', 'square', 'portrait_4_3', 'portrait_16_9', 'landscape_4_3', 'landscape_16_9', 'auto', 'auto_2K', 'auto_3K', 'auto_4K'];
const ASPECT_RATIOS_STANDARD = ['1:1', '16:9', '9:16', '4:3', '3:4'];
const ASPECT_RATIOS_NANO = ['21:9', '16:9', '3:2', '4:3', '5:4', '1:1', '4:5', '3:4', '2:3', '9:16'];
const ASPECT_RATIOS_NANO_EXTENDED = ['auto', ...ASPECT_RATIOS_NANO, '4:1', '1:4', '8:1', '1:8'];
const GPT_SIZES = ['1024x1024', '1536x1024', '1024x1536'];

const IDEOGRAM_STYLES_V2 = ['auto', 'general', 'realistic', 'design', 'render_3D', 'anime'];
const IDEOGRAM_STYLES_V3 = ['AUTO', 'GENERAL', 'REALISTIC', 'DESIGN'];
const RECRAFT_V3_STYLES = [
  'realistic_image', 'digital_illustration', 'vector_illustration',
  'b_and_w', 'hard_flash', 'hdr', 'natural_light', 'studio_portrait',
  'pixel_art', 'hand_drawn', 'watercolor', 'pop_art', 'noir'
];
const THINKING_LEVELS: ReadonlyArray<'minimal' | 'high'> = ['minimal', 'high'];

@Component({
  selector: 'app-image-gen',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MediaPreviewComponent, JobStatusComponent, ModelPickerComponent, AspectRatioPickerComponent, ResolutionPickerComponent],
  template: `
<div class="flex flex-col lg:flex-row lg:h-full">
  <div class="w-full lg:w-[420px] lg:flex-shrink-0 border-b lg:border-b-0 lg:border-r border-border bg-white flex flex-col">
    <div class="px-5 py-4 border-b border-border">
      <h1 class="text-base font-semibold text-gray-900">Text to Image</h1>
    </div>

    <div class="flex-1 overflow-y-auto px-5 py-4 space-y-5">

      <!-- Model dropdown -->
      <app-model-picker
        [groups]="pickerGroups()"
        [selectedId]="selectedModel()?.id ?? null"
        (modelSelect)="onModelSelect($event)" />

      <!-- Prompt -->
      <div>
        <label class="form-label">Prompt</label>
        <textarea class="form-textarea h-28" [(ngModel)]="prompt"
          spellcheck="true" lang="en" autocorrect="on" autocapitalize="sentences"
          placeholder="Describe the image you want to generate..." maxlength="2500"></textarea>
        <p class="text-right text-xs text-gray-400 mt-1">{{ prompt.length }}/2500</p>
      </div>

      <!-- Negative Prompt (models that support it) -->
      @if (showInlineNegativePrompt()) {
        <div>
          <label class="form-label">Negative Prompt <span class="text-gray-400 font-normal">(optional)</span></label>
          <textarea class="form-textarea h-16" [(ngModel)]="negativePrompt"
            spellcheck="true" lang="en"
            placeholder="What to avoid in the image..."></textarea>
        </div>
      }

      <!-- Aspect Ratio (Google/Imagen models) -->
      @if (selectedModel()?.paramMode === 'aspectRatio') {
        <app-aspect-ratio-picker
          [ratios]="currentAspectRatios()"
          [value]="aspectRatio()"
          (valueChange)="aspectRatio.set($event)" />
      }

      <!-- Image Size (FLUX / GPT / Seedream / Ideogram / Recraft) -->
      @if (selectedModel()?.paramMode === 'imageSize') {
        <div>
          <label class="form-label">Image Size</label>
          <div class="flex flex-wrap gap-2">
            @for (s of allSizeOptions(); track s.value) {
              <button type="button" (click)="imageSize.set(s.value)"
                class="flex flex-col items-center justify-center px-3 py-2 min-w-[58px] border rounded-lg text-center transition-colors"
                [class.border-accent]="imageSize() === s.value"
                [class.bg-accent-light]="imageSize() === s.value"
                [class.text-accent]="imageSize() === s.value"
                [class.border-border]="imageSize() !== s.value"
                [class.text-gray-600]="imageSize() !== s.value">
                <span class="text-xs font-medium">{{ s.label }}</span>
                <span class="text-[10px] text-gray-400 mt-0.5">{{ s.dims }}</span>
              </button>
            }
          </div>
        </div>
      }

      <!-- Resolution (Nano Banana 2/Pro, Imagen 4) -->
      <app-resolution-picker
        [resolutions]="selectedModel()?.resolutions ?? []"
        [value]="resolution()"
        [premiumResolutions]="premiumResolutions()"
        (valueChange)="resolution.set($event)" />

      <!-- Style (Ideogram, Recraft v3) -->
      @if (selectedModel()?.styles?.length) {
        <div>
          <label class="form-label">Style</label>
          <div class="flex flex-wrap gap-2">
            @for (s of selectedModel()!.styles!; track s) {
              <button type="button" (click)="style.set(s)"
                class="px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors capitalize"
                [class.border-accent]="style() === s"
                [class.bg-accent-light]="style() === s"
                [class.text-accent]="style() === s"
                [class.border-border]="style() !== s"
                [class.text-gray-600]="style() !== s">{{ s.replace('_', ' ').toLowerCase() }}</button>
            }
          </div>
        </div>
      }

      <!-- Quality (GPT Image) -->
      @if (selectedModel()?.qualities?.length) {
        <div>
          <label class="form-label">Quality</label>
          <div class="flex gap-2">
            @for (q of selectedModel()!.qualities!; track q) {
              <button type="button" (click)="quality.set(q)"
                class="px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors capitalize"
                [class.border-accent]="quality() === q"
                [class.bg-accent-light]="quality() === q"
                [class.text-accent]="quality() === q"
                [class.border-border]="quality() !== q"
                [class.text-gray-600]="quality() !== q">{{ q }}</button>
            }
          </div>
        </div>
      }

      <!-- Background (GPT Image) -->
      @if (selectedModel()?.backgrounds?.length) {
        <div>
          <label class="form-label">Background</label>
          <div class="flex gap-2">
            @for (b of selectedModel()!.backgrounds!; track b) {
              <button type="button" (click)="background.set(b)"
                class="px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors capitalize"
                [class.border-accent]="background() === b"
                [class.bg-accent-light]="background() === b"
                [class.text-accent]="background() === b"
                [class.border-border]="background() !== b"
                [class.text-gray-600]="background() !== b">{{ b }}</button>
            }
          </div>
        </div>
      }

      @if (showFluxAdvanced() || showNanoAdvanced() || showImagenAdvanced() || showSeedreamAdvanced()) {
        <div class="rounded-xl border border-border overflow-hidden">
          <button type="button"
                  class="w-full flex items-center justify-between px-4 py-3 bg-gray-50 text-left"
                  (click)="advancedOpen.update(v => !v)">
            <div>
              <p class="text-sm font-medium text-gray-900">Advanced Options</p>
              <p class="text-xs text-gray-400">{{ selectedModel()?.name }} generation controls</p>
            </div>
            <span class="text-sm text-gray-400">{{ advancedOpen() ? 'Hide' : 'Show' }}</span>
          </button>

          @if (advancedOpen()) {
            <div class="p-4 space-y-4 bg-white">
              <div>
                <label class="form-label">Seed</label>
                <div class="flex gap-2">
                  <input type="number"
                         class="form-input"
                         [ngModel]="seed()"
                         (ngModelChange)="onSeedChange($event)"
                         min="0"
                         max="2147483647"
                         placeholder="Random seed" />
                  <button type="button"
                          class="px-3 py-2 text-sm border border-border rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                          (click)="randomizeSeed()">
                    Random
                  </button>
                </div>
              </div>

              @if (showSchnellAdvanced()) {
                <div>
                  <label class="form-label">Guidance scale (CFG)</label>
                  <div class="flex items-center gap-3">
                    <input type="range"
                           class="flex-1 accent-[var(--accent)]"
                           min="1"
                           max="20"
                           step="0.5"
                           [ngModel]="guidanceScale()"
                           (ngModelChange)="onGuidanceScaleChange($event)" />
                    <input type="number"
                           class="w-24 form-input"
                           min="1"
                           max="20"
                           step="0.5"
                           [ngModel]="guidanceScale()"
                           (ngModelChange)="onGuidanceScaleChange($event)" />
                    <button type="button"
                            class="px-3 py-2 text-sm border border-border rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                            (click)="guidanceScale.set(3.5)">
                      Reset
                    </button>
                  </div>
                </div>
              }

              @if (showImagen3FastAdvanced()) {
                <div>
                  <label class="form-label">Negative Prompt <span class="text-gray-400 font-normal">(optional)</span></label>
                  <textarea class="form-textarea h-16" [(ngModel)]="negativePrompt"
                    spellcheck="true" lang="en"
                    placeholder="What to avoid in the image..."></textarea>
                </div>
              }

              @if (showFormatAdvanced()) {
                <div>
                  <label class="form-label">Output Format</label>
                  <select class="form-select" [ngModel]="outputFormat()" (ngModelChange)="outputFormat.set($event)">
                    <option value="">Default</option>
                    <option value="jpeg">jpeg</option>
                    <option value="png">png</option>
                  </select>
                </div>
              }

              @if (showFluxPro11Advanced()) {
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div>
                    <p class="text-sm font-medium text-gray-700">Enhance Prompt</p>
                    <p class="text-xs text-gray-400">Let the model improve and expand your prompt</p>
                  </div>
                  <button type="button" (click)="enhancePrompt.update(v => !v)"
                          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                          [class.bg-accent]="enhancePrompt()"
                          [class.bg-gray-300]="!enhancePrompt()">
                    <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                          [class.translate-x-6]="enhancePrompt()"
                          [class.translate-x-1]="!enhancePrompt()"></span>
                  </button>
                </div>
              }

              @if (showNanoBanana2Advanced()) {
                <div>
                  <label class="form-label">Thinking Level</label>
                  <div class="flex gap-2">
                    @for (level of thinkingLevels; track level) {
                      <button type="button" (click)="thinkingLevel.set(level)"
                              class="px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors capitalize"
                              [class.border-accent]="thinkingLevel() === level"
                              [class.bg-accent-light]="thinkingLevel() === level"
                              [class.text-accent]="thinkingLevel() === level"
                              [class.border-border]="thinkingLevel() !== level"
                              [class.text-gray-600]="thinkingLevel() !== level">{{ level }}</button>
                    }
                  </div>
                </div>
              }

              @if (showSeedreamV5LiteAdvanced()) {
                <div>
                  <label class="form-label">Custom Image Size <span class="text-gray-400 font-normal">(optional)</span></label>
                  <div class="grid grid-cols-2 gap-3">
                    <input type="number"
                           class="form-input"
                           [ngModel]="customWidth()"
                           (ngModelChange)="onCustomSizeChange('width', $event)"
                           min="256"
                           max="4096"
                           step="1"
                           placeholder="Width" />
                    <input type="number"
                           class="form-input"
                           [ngModel]="customHeight()"
                           (ngModelChange)="onCustomSizeChange('height', $event)"
                           min="256"
                           max="4096"
                           step="1"
                           placeholder="Height" />
                  </div>
                  <p class="text-xs text-gray-400 mt-2">If both width and height are set, they override the preset image size.</p>
                </div>
              }
            </div>
          }
        </div>
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
              [disabled]="!prompt.trim() || generating() || !selectedModel()">
        @if (generating()) { <span class="animate-spin mr-1">⟳</span> Generating... }
        @else { ✨ Generate }
      </button>
    </div>
  </div>

  <!-- Right panel -->
  <div class="flex-1 p-4 lg:p-6 flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-medium text-gray-600">Image Output</h2>
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
          <p class="text-sm font-medium text-accent">Generating your image...</p>
          <p class="text-xs text-accent/70">Usually takes 15–60 seconds. You can navigate away — results will be in <a routerLink="/jobs" class="underline">My Jobs</a>.</p>
        </div>
      </div>
    }
    <div class="h-[55vw] sm:h-[420px] lg:h-auto lg:flex-1 lg:min-h-0 card overflow-hidden">
      <app-media-preview [url]="outputUrl()" product="ImageGen"/>
    </div>
  </div>
</div>
  `
})
export class ImageGenComponent implements OnInit, OnDestroy {
  private gen = inject(GenerationService);
  private credits = inject(CreditsService);
  private signalR = inject(SignalRService);
  private auth = inject(AuthService);
  private loginModal = inject(LoginModalService);
  private route = inject(ActivatedRoute);
  readonly thinkingLevels = THINKING_LEVELS;

  // ── model groups ──────────────────────────────────────────────────
  groups: ImageGroup[] = [
    {
      id: 'flux', name: 'FLUX', tagline: 'Black Forest Labs',
      icon: 'F', iconBg: '#000000', iconUrl: '/assets/icons/flux.png',
      tags: ['Open Source', 'Fast'],
      subModels: [
        { id: 'fal-ai/flux/schnell', name: 'FLUX Schnell', description: 'Ultra-fast 1-4 step generation', credits: 10, tags: ['Fastest', 'Low Cost'], paramMode: 'imageSize', imageSizes: IMAGE_SIZES, aspectRatios: [], supportsNegativePrompt: false },
        { id: 'fal-ai/flux-pro/v1.1', name: 'FLUX Pro 1.1', description: 'High quality with improved photorealism', credits: 10, tags: ['High Quality'], paramMode: 'imageSize', imageSizes: IMAGE_SIZES, aspectRatios: [], supportsNegativePrompt: true },
        { id: 'fal-ai/flux-2-pro', name: 'FLUX 2 Pro', description: 'Latest FLUX with improved typography', credits: 10, badge: 'NEW', badgeColor: '#0EA5E9', tags: ['Latest', 'Typography'], paramMode: 'imageSize', imageSizes: IMAGE_SIZES, aspectRatios: [], supportsNegativePrompt: false },
      ]
    },
    {
      id: 'google-nano', name: 'Nano Banana', tagline: 'Google DeepMind',
      icon: 'G', iconBg: '#4285F4', iconUrl: '/assets/icons/nano.png',
      tags: ['Google', 'Fast'],
      subModels: [
        { id: 'fal-ai/nano-banana', name: 'Nano Banana', description: "Google's fast generation model", credits: 10, tags: ['Fast'], paramMode: 'aspectRatio', imageSizes: [], aspectRatios: ASPECT_RATIOS_NANO, supportsNegativePrompt: false },
        { id: 'fal-ai/nano-banana-2', name: 'Nano Banana 2', description: 'Web search + up to 4K resolution', credits: 10, badge: 'NEW', badgeColor: '#0EA5E9', tags: ['4K', 'Web Search'], paramMode: 'aspectRatio', imageSizes: [], aspectRatios: ASPECT_RATIOS_NANO_EXTENDED, resolutions: ['0.5K', '1K', '2K', '4K'], supportsNegativePrompt: false },
        { id: 'fal-ai/nano-banana-pro', name: 'Nano Banana Pro', description: "Google's pro model with 4K resolution", credits: 23, tags: ['Pro', '4K'], paramMode: 'aspectRatio', imageSizes: [], aspectRatios: ['auto', ...ASPECT_RATIOS_NANO], resolutions: ['1K', '2K', '4K'], supportsNegativePrompt: false },
      ]
    },
    {
      id: 'google-imagen', name: 'Imagen', tagline: 'Google DeepMind',
      icon: 'G', iconBg: '#4285F4', iconUrl: '/assets/icons/veo.png',
      tags: ['Google', 'Photorealistic'],
      subModels: [
        { id: 'fal-ai/imagen3/fast', name: 'Imagen 3 Fast', description: 'Fast version of Google Imagen 3', credits: 10, tags: ['Fast'], paramMode: 'aspectRatio', imageSizes: [], aspectRatios: ASPECT_RATIOS_STANDARD, supportsNegativePrompt: true },
        { id: 'fal-ai/imagen4/preview', name: 'Imagen 4 Preview', description: 'Google Imagen 4 preview with up to 2K', credits: 10, badge: 'NEW', badgeColor: '#0EA5E9', tags: ['2K', 'Preview'], paramMode: 'aspectRatio', imageSizes: [], aspectRatios: ASPECT_RATIOS_STANDARD, resolutions: ['1K', '2K'], supportsNegativePrompt: false },
      ]
    },
    {
      id: 'seedream', name: 'Seedream', tagline: 'ByteDance',
      icon: 'S', iconBg: '#1D4ED8', iconUrl: '/assets/icons/seedream.png',
      tags: ['ByteDance', 'High Quality'],
      subModels: [
        { id: 'fal-ai/bytedance/seedream/v4/text-to-image', name: 'Seedream v4', description: 'ByteDance high-quality generation', credits: 10, tags: ['High Quality'], paramMode: 'imageSize', imageSizes: IMAGE_SIZES, aspectRatios: [], supportsNegativePrompt: false },
        { id: 'fal-ai/bytedance/seedream/v5/lite/text-to-image', name: 'Seedream v5 Lite', description: 'ByteDance v5 with flexible auto and high-res sizing', credits: 10, badge: 'NEW', badgeColor: '#0EA5E9', tags: ['4K', 'Latest'], paramMode: 'imageSize', imageSizes: SEEDREAM_V5_LITE_SIZES, aspectRatios: [], supportsNegativePrompt: false },
      ]
    },
    {
      id: 'ideogram', name: 'Ideogram', tagline: 'Ideogram AI',
      icon: 'I', iconBg: '#6366F1', iconUrl: '/assets/icons/ideogram.svg',
      tags: ['Style Control', 'Text Rendering'],
      subModels: [
        { id: 'fal-ai/ideogram/v2', name: 'Ideogram v2', description: 'Style-rich generation with text rendering', credits: 8, tags: ['Styles', 'Text'], paramMode: 'imageSize', imageSizes: IMAGE_SIZES, aspectRatios: [], styles: IDEOGRAM_STYLES_V2, supportsNegativePrompt: true },
        { id: 'fal-ai/ideogram/v3', name: 'Ideogram v3', description: 'Latest with style presets and text rendering', credits: 12, badge: 'NEW', badgeColor: '#0EA5E9', tags: ['Latest', 'Styles'], paramMode: 'imageSize', imageSizes: IMAGE_SIZES, aspectRatios: [], styles: IDEOGRAM_STYLES_V3, supportsNegativePrompt: true },
      ]
    },
    {
      id: 'recraft', name: 'Recraft', tagline: 'Recraft AI',
      icon: 'R', iconBg: '#DC2626', iconUrl: '/assets/icons/recraft.png',
      tags: ['Design', 'Styles'],
      subModels: [
        { id: 'fal-ai/recraft/v3/text-to-image', name: 'Recraft v3', description: '80+ style options for professional imagery', credits: 6, tags: ['80+ Styles', 'Design'], paramMode: 'imageSize', imageSizes: IMAGE_SIZES, aspectRatios: [], styles: RECRAFT_V3_STYLES, supportsNegativePrompt: false },
        { id: 'fal-ai/recraft/v4/text-to-image', name: 'Recraft v4', description: 'Latest Recraft with enhanced quality', credits: 8, badge: 'NEW', badgeColor: '#0EA5E9', tags: ['Latest'], paramMode: 'imageSize', imageSizes: IMAGE_SIZES, aspectRatios: [], supportsNegativePrompt: false },
        { id: 'fal-ai/recraft/v4/pro/text-to-image', name: 'Recraft v4 Pro', description: 'Recraft v4 Pro — highest quality design', credits: 12, badge: 'PRO', badgeColor: '#7C3AED', tags: ['Pro', 'Highest Quality'], paramMode: 'imageSize', imageSizes: IMAGE_SIZES, aspectRatios: [], supportsNegativePrompt: false },
      ]
    },
    {
      id: 'openai', name: 'GPT Image', tagline: 'OpenAI',
      icon: 'O', iconBg: '#10A37F', iconUrl: '/assets/icons/openai.png',
      tags: ['OpenAI', 'High Quality'],
      subModels: [
        { id: 'fal-ai/gpt-image-1-mini', name: 'GPT Image 1 Mini', description: 'OpenAI GPT Image 1 Mini — fast generation', credits: 8, tags: ['Fast', 'OpenAI'], paramMode: 'imageSize', imageSizes: GPT_SIZES, aspectRatios: [], qualities: ['auto', 'low', 'medium', 'high'], backgrounds: ['auto', 'transparent', 'opaque'], supportsNegativePrompt: false },
        { id: 'fal-ai/gpt-image-1/text-to-image', name: 'GPT Image 1', description: 'OpenAI GPT Image 1 — high quality', credits: 12, tags: ['High Quality', 'OpenAI'], paramMode: 'imageSize', imageSizes: GPT_SIZES, aspectRatios: [], qualities: ['auto', 'low', 'medium', 'high'], backgrounds: ['auto', 'transparent', 'opaque'], supportsNegativePrompt: false },
        { id: 'fal-ai/gpt-image-1.5', name: 'GPT Image 1.5', description: 'OpenAI GPT Image 1.5 — latest model', credits: 15, badge: 'NEW', badgeColor: '#0EA5E9', tags: ['Latest', 'OpenAI'], paramMode: 'imageSize', imageSizes: GPT_SIZES, aspectRatios: [], qualities: ['low', 'medium', 'high'], backgrounds: ['auto', 'transparent', 'opaque'], supportsNegativePrompt: false },
      ]
    },
  ];

  pickerGroups = computed<PickerGroup[]>(() =>
    this.groups.map(g => ({
      id: g.id,
      name: g.name,
      tagline: g.tagline,
      icon: g.icon,
      iconBg: g.iconBg,
      iconUrl: g.iconUrl,
      groupTags: g.tags,
      badge: g.badge,
      models: g.subModels.map(m => ({
        id: m.id,
        name: m.name,
        description: m.description,
        creditsDisplay: `${m.credits} credits`,
        badge: m.badge,
        badgeColor: m.badgeColor,
        tags: m.tags,
      } satisfies PickerModel))
    } satisfies PickerGroup))
  );

  readonly sizeOptionMap: { value: string; label: string; dims: string }[] = [
    { value: 'square_hd',      label: 'Square HD',    dims: '1024×1024' },
    { value: 'square',         label: 'Square',       dims: '512×512'   },
    { value: 'portrait_4_3',   label: 'Portrait 4:3', dims: '768×1024'  },
    { value: 'portrait_16_9',  label: 'Portrait 9:16',dims: '576×1024'  },
    { value: 'landscape_4_3',  label: 'Landscape 4:3',dims: '1024×768'  },
    { value: 'landscape_16_9', label: 'Wide 16:9',    dims: '1024×576'  },
    { value: 'auto',           label: 'Auto',         dims: 'Model decides' },
    { value: 'auto_2K',        label: 'Auto 2K',      dims: 'Up to 2K' },
    { value: 'auto_3K',        label: 'Auto 3K',      dims: 'Up to 3K' },
    { value: 'auto_4K',        label: 'Auto 4K',      dims: 'Up to 4K' },
    { value: '1024x1024',      label: 'Square',       dims: '1024×1024' },
    { value: '1536x1024',      label: 'Landscape',    dims: '1536×1024' },
    { value: '1024x1536',      label: 'Portrait',     dims: '1024×1536' },
  ];

  allSizeOptions = computed(() => {
    const m = this.selectedModel();
    if (!m || m.paramMode !== 'imageSize') return [];
    return this.sizeOptionMap.filter(s => m.imageSizes.includes(s.value));
  });

  private readonly arDimMap: Record<string, { w: number; h: number }> = {
    'auto': { w: 18, h: 18 },
    '1:1':  { w: 18, h: 18 },
    '16:9': { w: 22, h: 13 },
    '9:16': { w: 13, h: 22 },
    '4:3':  { w: 20, h: 15 },
    '3:4':  { w: 15, h: 20 },
    '5:4':  { w: 20, h: 16 },
    '4:5':  { w: 16, h: 20 },
    '3:2':  { w: 21, h: 14 },
    '2:3':  { w: 14, h: 21 },
    '21:9': { w: 24, h: 10 },
    '4:1':  { w: 24, h: 9 },
    '1:4':  { w: 9, h: 24 },
    '8:1':  { w: 24, h: 7 },
    '1:8':  { w: 7, h: 24 },
  };

  currentAspectRatios = computed<AspectRatio[]>(() => {
    const m = this.selectedModel();
    if (!m || m.paramMode !== 'aspectRatio') return [];
    return m.aspectRatios.map(v => ({ value: v, ...(this.arDimMap[v] ?? { w: 18, h: 18 }) }));
  });

  selectedModel = signal<ImageModel | null>(this.groups[0].subModels[1]); // FLUX Pro 1.1 default

  prompt = '';
  negativePrompt = '';
  imageSize    = signal('square_hd');
  aspectRatio  = signal('1:1');
  style        = signal('');
  quality      = signal('high');
  background   = signal('auto');
  resolution   = signal('');
  advancedOpen = signal(false);
  seed = signal<number | null>(null);
  guidanceScale = signal(3.5);
  outputFormat = signal('');
  enhancePrompt = signal(true);
  thinkingLevel = signal<'minimal' | 'high'>('minimal');
  customWidth = signal<number | null>(null);
  customHeight = signal<number | null>(null);

  // ── dynamic cost estimate ─────────────────────────────────────────
  costEstimate = computed(() => {
    const m = this.selectedModel();
    if (!m) return 0;

    if (m.id === 'fal-ai/flux/schnell') return 10;
    if (m.id === 'fal-ai/flux-pro/v1.1') return 10;
    if (m.id === 'fal-ai/flux-2-pro') return this.getFlux2ProCredits(this.imageSize());
    if (m.id === 'fal-ai/nano-banana') return 10;
    if (m.id === 'fal-ai/nano-banana-2') return this.getNanoBanana2Credits(this.resolution(), this.thinkingLevel());
    if (m.id === 'fal-ai/nano-banana-pro') return this.getNanoBananaProCredits(this.resolution());

    // GPT Image: quality + size based pricing
    if (m.id.includes('gpt-image')) {
      const isLarge = this.imageSize() === '1536x1024' || this.imageSize() === '1024x1536';
      if (m.id.includes('1-mini'))
        return this.quality() === 'low' ? 2 : this.quality() === 'medium' ? 5 : isLarge ? 11 : 8;
      if (m.id.includes('1.5'))
        return this.quality() === 'low' ? 2 : this.quality() === 'medium' ? 8 : isLarge ? 22 : 15;
      // gpt-image-1
      return this.quality() === 'low' ? 3 : this.quality() === 'medium' ? 7 : isLarge ? 16 : 12;
    }

    // Nano Banana 2: resolution multipliers (0.75× / 1× / 1.5× / 2×)
    if (m.id === 'fal-ai/nano-banana-2')
      return this.resolution() === '0.5K' ? 6 : this.resolution() === '2K' ? 12 : this.resolution() === '4K' ? 16 : 8;

    // Nano Banana Pro: only 4K costs extra — 2K is same price as 1K
    if (m.id === 'fal-ai/nano-banana-pro')
      return this.resolution() === '4K' ? 20 : 10;

    // Imagen 4: flat pricing regardless of resolution — fal.ai does NOT charge extra for 2K

    return m.credits;
  });

  /** Which resolution buttons show a "+credits" badge — model-specific */
  premiumResolutions = computed<string[]>(() => {
    const m = this.selectedModel();
    if (!m) return [];
    if (m.id === 'fal-ai/nano-banana-2')  return ['2K', '4K']; // 0.5K cheaper, 1K base
    if (m.id === 'fal-ai/nano-banana-pro') return ['4K'];       // 2K = same as 1K, only 4K costs more
    return []; // Imagen 4 flat pricing — no badge
  });

  showFluxAdvanced = computed(() => {
    const modelId = this.selectedModel()?.id;
    return modelId === 'fal-ai/flux/schnell' || modelId === 'fal-ai/flux-pro/v1.1' || modelId === 'fal-ai/flux-2-pro';
  });
  showSchnellAdvanced = computed(() => this.selectedModel()?.id === 'fal-ai/flux/schnell');
  showFluxPro11Advanced = computed(() => this.selectedModel()?.id === 'fal-ai/flux-pro/v1.1');
  showFlux2ProAdvanced = computed(() => this.selectedModel()?.id === 'fal-ai/flux-2-pro');
  showNanoAdvanced = computed(() => {
    const modelId = this.selectedModel()?.id;
    return modelId === 'fal-ai/nano-banana' || modelId === 'fal-ai/nano-banana-2' || modelId === 'fal-ai/nano-banana-pro';
  });
  showNanoBanana2Advanced = computed(() => this.selectedModel()?.id === 'fal-ai/nano-banana-2');
  showImagenAdvanced = computed(() => {
    const modelId = this.selectedModel()?.id;
    return modelId === 'fal-ai/imagen3/fast' || modelId === 'fal-ai/imagen4/preview';
  });
  showImagen3FastAdvanced = computed(() => this.selectedModel()?.id === 'fal-ai/imagen3/fast');
  showImagen4PreviewAdvanced = computed(() => this.selectedModel()?.id === 'fal-ai/imagen4/preview');
  showSeedreamAdvanced = computed(() => {
    const modelId = this.selectedModel()?.id;
    return modelId === 'fal-ai/bytedance/seedream/v4/text-to-image'
      || modelId === 'fal-ai/bytedance/seedream/v5/lite/text-to-image';
  });
  showSeedreamV5LiteAdvanced = computed(() => this.selectedModel()?.id === 'fal-ai/bytedance/seedream/v5/lite/text-to-image');
  showFormatAdvanced = computed(() =>
    this.showFluxAdvanced() ||
    this.showNanoAdvanced() ||
    this.showImagen4PreviewAdvanced()
  );
  showInlineNegativePrompt = computed(() =>
    !!this.selectedModel()?.supportsNegativePrompt && !this.showImagen3FastAdvanced()
  );

  generating = signal(false);
  jobStatus = signal<JobStatus | null>(null);
  outputUrl = signal<string | undefined>(undefined);
  errorMsg = signal<string | undefined>(undefined);
  isPublic = signal(true);
  zone = '';

  private currentJobId: string | null = null;
  private pollInterval?: ReturnType<typeof setInterval>;

  ngOnInit() {
    const qp = this.route.snapshot.queryParams;
    if (qp['prompt']) this.prompt = qp['prompt'];
    if (qp['model']) {
      const m = this.groups.flatMap(g => g.subModels).find(x => x.id === qp['model']);
      if (m) this.selectModel(m);
    }
  }

  onModelSelect(id: string) {
    const m = this.groups.flatMap(g => g.subModels).find(x => x.id === id);
    if (m) this.selectModel(m);
  }

  selectModel(m: ImageModel) {
    this.selectedModel.set(m);
    this.imageSize.set(m.imageSizes[0] ?? 'square_hd');
    this.aspectRatio.set(m.aspectRatios[0] ?? '1:1');
    this.style.set(m.styles?.[0] ?? '');
    this.resolution.set(m.resolutions?.[0] ?? '');
    this.quality.set(m.qualities?.[0] ?? 'high');
    this.background.set(m.backgrounds?.[0] ?? 'auto');
    this.advancedOpen.set(false);
    this.seed.set(null);
    this.guidanceScale.set(3.5);
    this.outputFormat.set('');
    this.enhancePrompt.set(true);
    this.thinkingLevel.set('minimal');
    this.customWidth.set(null);
    this.customHeight.set(null);
  }

  generate() {
    if (!this.auth.isLoggedIn()) { this.loginModal.show(); return; }
    const m = this.selectedModel();
    if (!this.prompt.trim() || this.generating() || !m) return;
    this.generating.set(true);
    this.jobStatus.set('Queued');
    this.outputUrl.set(undefined);
    this.errorMsg.set(undefined);
    this.gen.generateImage({
      prompt: this.prompt,
      modelId: m.id,
      imageSize: m.paramMode === 'imageSize' ? this.imageSize() : 'square_hd',
      negativePrompt: this.negativePrompt || undefined,
      isPublic: this.isPublic(),
      zone: this.zone || undefined,
      aspectRatio: m.paramMode === 'aspectRatio' ? this.aspectRatio() : undefined,
      style: this.style() || undefined,
      quality: this.quality() || undefined,
      background: this.background() !== 'auto' ? this.background() : undefined,
      resolution: this.resolution() || undefined,
      seed: (this.showFluxAdvanced() || this.showNanoAdvanced() || this.showImagenAdvanced() || this.showSeedreamAdvanced()) ? this.seed() ?? undefined : undefined,
      guidanceScale: this.showSchnellAdvanced() ? this.guidanceScale() : undefined,
      outputFormat: this.showFormatAdvanced() ? this.outputFormat() || undefined : undefined,
      enhancePrompt: this.showFluxPro11Advanced() ? this.enhancePrompt() : undefined,
      thinkingLevel: this.showNanoBanana2Advanced() ? this.thinkingLevel() : undefined,
      customWidth: this.showSeedreamV5LiteAdvanced() ? this.customWidth() ?? undefined : undefined,
      customHeight: this.showSeedreamV5LiteAdvanced() ? this.customHeight() ?? undefined : undefined,
    }).subscribe({
      next: res => {
        this.currentJobId = res.jobId;
        this.credits.reserveLocally(res.creditsReserved);
        this.signalR.trackJob(res.jobId, 'ImageGen');
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

  onSeedChange(value: string | number | null) {
    if (value === '' || value === null || value === undefined) {
      this.seed.set(null);
      return;
    }

    const parsed = Number(value);
    if (Number.isFinite(parsed))
      this.seed.set(Math.max(0, Math.min(2147483647, Math.round(parsed))));
  }

  onGuidanceScaleChange(value: string | number) {
    const parsed = Number(value);
    if (Number.isFinite(parsed))
      this.guidanceScale.set(Math.max(1, Math.min(20, parsed)));
  }

  onCustomSizeChange(kind: 'width' | 'height', value: string | number | null) {
    const target = kind === 'width' ? this.customWidth : this.customHeight;
    if (value === '' || value === null || value === undefined) {
      target.set(null);
      return;
    }

    const parsed = Number(value);
    if (Number.isFinite(parsed))
      target.set(Math.max(256, Math.min(4096, Math.round(parsed))));
  }

  randomizeSeed() {
    this.seed.set(Math.floor(Math.random() * 2147483647));
  }

  private getFlux2ProCredits(imageSize: string) {
    const billedMegapixels = this.getBilledMegapixels(imageSize);
    const credits = 4.5 + Math.max(0, billedMegapixels - 1) * 2.25;
    return Math.max(10, Math.round(credits));
  }

  private getNanoBanana2Credits(resolution: string, thinkingLevel: 'minimal' | 'high') {
    const baseCredits = resolution === '0.5K'
      ? 9
      : resolution === '2K'
        ? 18
        : resolution === '4K'
          ? 24
          : 12;
    const thinkingCredits = thinkingLevel === 'high' ? 0.3 : 0;
    return Math.max(10, Math.round(baseCredits + thinkingCredits));
  }

  private getNanoBananaProCredits(resolution: string) {
    const credits = resolution === '4K' ? 45 : 22.5;
    return Math.max(10, Math.round(credits));
  }

  private getBilledMegapixels(imageSize: string) {
    const dimensions: Record<string, { width: number; height: number }> = {
      square_hd: { width: 1024, height: 1024 },
      square: { width: 512, height: 512 },
      portrait_4_3: { width: 768, height: 1024 },
      portrait_16_9: { width: 576, height: 1024 },
      landscape_4_3: { width: 1024, height: 768 },
      landscape_16_9: { width: 1024, height: 576 },
      '1024x1024': { width: 1024, height: 1024 },
      '1536x1024': { width: 1536, height: 1024 },
      '1024x1536': { width: 1024, height: 1536 },
    };

    const dims = dimensions[imageSize] ?? dimensions['square_hd'];
    return Math.max(1, Math.ceil((dims.width * dims.height) / 1_000_000));
  }

  ngOnDestroy() { clearInterval(this.pollInterval); }
}
