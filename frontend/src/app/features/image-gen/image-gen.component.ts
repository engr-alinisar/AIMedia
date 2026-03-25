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
const ASPECT_RATIOS_STANDARD = ['1:1', '16:9', '9:16', '4:3', '3:4'];
const ASPECT_RATIOS_NANO = ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '21:9'];
const GPT_SIZES = ['1024x1024', '1536x1024', '1024x1536'];

const IDEOGRAM_STYLES_V2 = ['auto', 'general', 'realistic', 'design', 'render_3D', 'anime'];
const IDEOGRAM_STYLES_V3 = ['AUTO', 'GENERAL', 'REALISTIC', 'DESIGN'];
const RECRAFT_V3_STYLES = [
  'realistic_image', 'digital_illustration', 'vector_illustration',
  'b_and_w', 'hard_flash', 'hdr', 'natural_light', 'studio_portrait',
  'pixel_art', 'hand_drawn', 'watercolor', 'pop_art', 'noir'
];

@Component({
  selector: 'app-image-gen',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MediaPreviewComponent, JobStatusComponent, ModelPickerComponent, AspectRatioPickerComponent, ResolutionPickerComponent],
  template: `
<div class="flex flex-col lg:flex-row lg:h-full">
  <div class="w-full lg:w-[420px] lg:flex-shrink-0 border-b lg:border-b-0 lg:border-r border-border bg-white flex flex-col">
    <div class="px-5 py-4 border-b border-border">
      <h1 class="text-base font-semibold text-gray-900">Image Generation</h1>
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
      @if (selectedModel()?.supportsNegativePrompt) {
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

  // ── model groups ──────────────────────────────────────────────────
  groups: ImageGroup[] = [
    {
      id: 'flux', name: 'FLUX', tagline: 'Black Forest Labs',
      icon: 'F', iconBg: '#000000', iconUrl: '/assets/icons/flux.png',
      tags: ['Open Source', 'Fast'],
      subModels: [
        { id: 'fal-ai/flux/schnell', name: 'FLUX Schnell', description: 'Ultra-fast 1-4 step generation', credits: 2, tags: ['Fastest', 'Free'], paramMode: 'imageSize', imageSizes: IMAGE_SIZES, aspectRatios: [], supportsNegativePrompt: false },
        { id: 'fal-ai/flux/dev', name: 'FLUX Dev', description: 'Open-source 12B model, great for experiments', credits: 5, tags: ['Open Source'], paramMode: 'imageSize', imageSizes: IMAGE_SIZES, aspectRatios: [], supportsNegativePrompt: true },
        { id: 'fal-ai/flux-pro/v1.1', name: 'FLUX Pro 1.1', description: 'High quality with improved photorealism', credits: 8, tags: ['High Quality'], paramMode: 'imageSize', imageSizes: IMAGE_SIZES, aspectRatios: [], supportsNegativePrompt: true },
        { id: 'fal-ai/flux-pro/v1.1-ultra', name: 'FLUX Pro 1.1 Ultra', description: 'Maximum detail and resolution up to 2K', credits: 11, badge: 'BEST', badgeColor: '#7C3AED', tags: ['Ultra Quality', '2K'], paramMode: 'imageSize', imageSizes: IMAGE_SIZES, aspectRatios: [], supportsNegativePrompt: true },
        { id: 'fal-ai/flux-2-pro', name: 'FLUX 2 Pro', description: 'Latest FLUX with improved typography', credits: 10, badge: 'NEW', badgeColor: '#0EA5E9', tags: ['Latest', 'Typography'], paramMode: 'imageSize', imageSizes: IMAGE_SIZES, aspectRatios: [], supportsNegativePrompt: false },
      ]
    },
    {
      id: 'google-nano', name: 'Nano Banana', tagline: 'Google DeepMind',
      icon: 'G', iconBg: '#4285F4', iconUrl: '/assets/icons/nano.png',
      tags: ['Google', 'Fast'],
      subModels: [
        { id: 'fal-ai/nano-banana', name: 'Nano Banana', description: "Google's fast generation model", credits: 5, tags: ['Fast'], paramMode: 'aspectRatio', imageSizes: [], aspectRatios: ASPECT_RATIOS_NANO, supportsNegativePrompt: false },
        { id: 'fal-ai/nano-banana-2', name: 'Nano Banana 2', description: 'Web search + up to 4K resolution', credits: 8, badge: 'NEW', badgeColor: '#0EA5E9', tags: ['4K', 'Web Search'], paramMode: 'aspectRatio', imageSizes: [], aspectRatios: ['auto', ...ASPECT_RATIOS_NANO], resolutions: ['0.5K', '1K', '2K', '4K'], supportsNegativePrompt: false },
        { id: 'fal-ai/nano-banana-pro', name: 'Nano Banana Pro', description: "Google's pro model with 4K resolution", credits: 10, tags: ['Pro', '4K'], paramMode: 'aspectRatio', imageSizes: [], aspectRatios: ['auto', ...ASPECT_RATIOS_STANDARD], resolutions: ['1K', '2K', '4K'], supportsNegativePrompt: false },
      ]
    },
    {
      id: 'google-imagen', name: 'Imagen', tagline: 'Google DeepMind',
      icon: 'G', iconBg: '#4285F4', iconUrl: '/assets/icons/veo.png',
      tags: ['Google', 'Photorealistic'],
      subModels: [
        { id: 'fal-ai/imagen3/fast', name: 'Imagen 3 Fast', description: 'Fast version of Google Imagen 3', credits: 6, tags: ['Fast'], paramMode: 'aspectRatio', imageSizes: [], aspectRatios: ASPECT_RATIOS_STANDARD, supportsNegativePrompt: true },
        { id: 'fal-ai/imagen3', name: 'Imagen 3', description: 'High-quality photorealistic generation', credits: 10, tags: ['High Quality'], paramMode: 'aspectRatio', imageSizes: [], aspectRatios: ASPECT_RATIOS_STANDARD, supportsNegativePrompt: true },
        { id: 'fal-ai/imagen4/preview/fast', name: 'Imagen 4 Fast', description: 'Fast Imagen 4 preview generation', credits: 12, badge: 'NEW', badgeColor: '#0EA5E9', tags: ['Fast', 'Preview'], paramMode: 'aspectRatio', imageSizes: [], aspectRatios: ASPECT_RATIOS_STANDARD, resolutions: ['1K', '2K'], supportsNegativePrompt: false },
        { id: 'fal-ai/imagen4/preview', name: 'Imagen 4 Preview', description: 'Google Imagen 4 preview with up to 2K', credits: 15, badge: 'NEW', badgeColor: '#0EA5E9', tags: ['2K', 'Preview'], paramMode: 'aspectRatio', imageSizes: [], aspectRatios: ASPECT_RATIOS_STANDARD, resolutions: ['1K', '2K'], supportsNegativePrompt: false },
        { id: 'fal-ai/imagen4/preview/ultra', name: 'Imagen 4 Ultra', description: 'Google Imagen 4 Ultra — highest quality', credits: 20, badge: 'BEST', badgeColor: '#7C3AED', tags: ['Ultra Quality', '2K'], paramMode: 'aspectRatio', imageSizes: [], aspectRatios: ASPECT_RATIOS_STANDARD, resolutions: ['1K', '2K'], supportsNegativePrompt: false },
      ]
    },
    {
      id: 'seedream', name: 'Seedream', tagline: 'ByteDance',
      icon: 'S', iconBg: '#1D4ED8', iconUrl: '/assets/icons/seedream.png',
      tags: ['ByteDance', 'High Quality'],
      subModels: [
        { id: 'fal-ai/bytedance/seedream/v4/text-to-image', name: 'Seedream v4', description: 'ByteDance high-quality generation', credits: 6, tags: ['High Quality'], paramMode: 'imageSize', imageSizes: IMAGE_SIZES, aspectRatios: [], supportsNegativePrompt: false },
        { id: 'fal-ai/bytedance/seedream/v5/lite/text-to-image', name: 'Seedream v5 Lite', description: 'ByteDance v5 with 2K–3K resolution', credits: 8, badge: 'NEW', badgeColor: '#0EA5E9', tags: ['2K', 'Latest'], paramMode: 'imageSize', imageSizes: IMAGE_SIZES, aspectRatios: [], supportsNegativePrompt: false },
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
    '3:2':  { w: 21, h: 14 },
    '2:3':  { w: 14, h: 21 },
    '21:9': { w: 24, h: 10 },
  };

  currentAspectRatios = computed<AspectRatio[]>(() => {
    const m = this.selectedModel();
    if (!m || m.paramMode !== 'aspectRatio') return [];
    return m.aspectRatios.map(v => ({ value: v, ...(this.arDimMap[v] ?? { w: 18, h: 18 }) }));
  });

  selectedModel = signal<ImageModel | null>(this.groups[0].subModels[2]); // FLUX Pro 1.1 default

  prompt = '';
  negativePrompt = '';
  imageSize    = signal('square_hd');
  aspectRatio  = signal('1:1');
  style        = signal('');
  quality      = signal('high');
  background   = signal('auto');
  resolution   = signal('');

  // ── dynamic cost estimate ─────────────────────────────────────────
  costEstimate = computed(() => {
    const m = this.selectedModel();
    if (!m) return 0;

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
      if (u?.jobId === this.currentJobId) {
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
