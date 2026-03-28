import { Component, signal, computed, inject, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { GenerationService } from '../../core/services/generation.service';
import { CreditsService } from '../../core/services/credits.service';
import { SignalRService } from '../../core/services/signalr.service';
import { AuthService } from '../../core/auth/auth.service';
import { LoginModalService } from '../../core/services/login-modal.service';
import { MediaPreviewComponent } from '../../shared/components/media-preview/media-preview.component';
import { JobStatusComponent } from '../../shared/components/job-status/job-status.component';
import type { JobStatus, GenerationResponse } from '../../core/models/models';

interface LocalJob {
  id: string;
  status: JobStatus;
  outputUrl: string | null;
  errorMessage: string | null;
  modelName: string;
  creditsReserved: number;
}

// ── Types ────────────────────────────────────────────────────────────────────

type InputMode =
  | 'single'        // one image upload
  | 'dual'          // two image uploads (try-on, product)
  | 'prompt-only'   // text prompt only (sepia-vintage uses image+prompt)
  | 'mask';         // image + mask + prompt (ideogram edit)

interface StudioModel {
  id: string;
  name: string;
  description: string;
  credits: number;
  badge?: string;
  badgeColor?: string;
  tags: string[];
  inputMode: InputMode;
  hasPrompt?: boolean;
  hasNegativePrompt?: boolean;
  hasMaskUrl?: boolean;
  hasRenderingSpeed?: boolean;
  hasImageSize?: boolean;
  hasBackgroundStyle?: boolean;
  hasMakeupStyle?: boolean;
  hasMakeupIntensity?: boolean;
  primaryLabel?: string;       // label for first upload
  secondaryLabel?: string;     // label for second upload
  promptPlaceholder?: string;
  // Example images for before/after preview
  exampleBefore?: string;
  exampleAfter?: string;
  examplePrompt?: string;
}

interface StudioCategory {
  id: string;
  name: string;
  icon: string;
  color: string;        // bg color for icon
  models: StudioModel[];
}

// ── Data ─────────────────────────────────────────────────────────────────────

const CATEGORIES: StudioCategory[] = [
  {
    id: 'background',
    name: 'Background',
    icon: '🖼️',
    color: 'bg-blue-100 text-blue-600',
    models: [
      {
        id: 'fal-ai/bria/background/remove',
        name: 'Remove BG — BRIA',
        description: 'Commercial-safe removal, licensed training data only',
        credits: 4, tags: ['Commercial', 'Licensed'],
        inputMode: 'single',
        exampleBefore: 'https://pub-4891498b804e4dad84f608251d64b64f.r2.dev/assets/examples/bria-remove-before.jpg',
        exampleAfter: 'https://pub-4891498b804e4dad84f608251d64b64f.r2.dev/assets/examples/bria-remove-after.png',
      },
      {
        id: 'fal-ai/bria/background/replace',
        name: 'Replace BG — BRIA',
        description: 'Swap background via text prompt or reference image',
        credits: 8, tags: ['Prompt', 'Reference'],
        inputMode: 'single',
        hasPrompt: true, hasNegativePrompt: true,
        promptPlaceholder: 'Describe the new background (e.g. "sunny beach at golden hour")…',
        exampleBefore: 'https://pub-4891498b804e4dad84f608251d64b64f.r2.dev/assets/examples/bria-replace-before.jpg',
        exampleAfter: 'https://pub-4891498b804e4dad84f608251d64b64f.r2.dev/assets/examples/bria-replace-after.jpg',
        examplePrompt: 'Bright sunny beach with waves',
      },
    ],
  },
  {
    id: 'edit',
    name: 'Photo Edit',
    icon: '✏️',
    color: 'bg-orange-100 text-orange-600',
    models: [
      {
        id: 'fal-ai/image-editing/object-removal',
        name: 'Object Removal',
        description: 'Remove any unwanted object or person; background auto-reconstructed',
        credits: 8, tags: ['Inpaint', 'Clean'],
        inputMode: 'single',
        hasPrompt: true,
        promptPlaceholder: 'Describe what to remove (e.g. "person in background", "power lines")…',
        exampleBefore: 'https://v3.fal.media/files/zebra/hAjCkcyly4gsS9-cptD3Y_image%20(20).png',
        exampleAfter: 'https://fal.media/files/monkey/3nTlgwVIOSeWJ8yDmvYr-_e09a6b8eb9264f76a33408e997a7447d.jpg',
        examplePrompt: 'background people',
      },
      {
        id: 'fal-ai/ideogram/v3/edit',
        name: 'Inpaint — Ideogram',
        description: 'Edit a masked region with a text prompt; preserves everything outside the mask',
        credits: 12, badge: 'Premium', badgeColor: 'bg-purple-100 text-purple-700',
        tags: ['Mask', 'Inpaint'],
        inputMode: 'mask',
        hasPrompt: true, hasMaskUrl: true, hasRenderingSpeed: true,
        promptPlaceholder: 'Describe what to place inside the masked area…',
        exampleBefore: 'https://v3.fal.media/files/panda/-LC_gNNV3wUHaGMQT3klE_output.png',
        exampleAfter: 'https://v3.fal.media/files/panda/xr7EI_0X5kM8fDOjjcMei_image.png',
        examplePrompt: 'Replace area with a bouquet of red roses',
      },
      {
        id: 'fal-ai/iclight-v2',
        name: 'Relight — IC-Light v2',
        description: 'Change scene lighting dramatically using a text description',
        credits: 25, badge: 'Premium', badgeColor: 'bg-purple-100 text-purple-700',
        tags: ['Lighting', 'Scene'],
        inputMode: 'single',
        hasPrompt: true, hasNegativePrompt: true, hasImageSize: true,
        promptPlaceholder: 'Describe the new lighting (e.g. "golden hour sunlight from the left")…',
        exampleBefore: 'https://storage.googleapis.com/falserverless/iclight-v2/bottle.png',
        exampleAfter: 'https://storage.googleapis.com/falserverless/iclight-v2/bottle.png',
        examplePrompt: 'Perfume bottle surrounded by lava in a volcano',
      },
    ],
  },
  {
    id: 'portrait',
    name: 'Portrait',
    icon: '👤',
    color: 'bg-pink-100 text-pink-600',
    models: [
      {
        id: 'fal-ai/image-apps-v2/headshot-photo',
        name: 'Pro Headshot',
        description: 'Turn any portrait into a polished professional headshot',
        credits: 8, tags: ['Business', 'Portrait'],
        inputMode: 'single',
        hasBackgroundStyle: true,
        exampleBefore: 'https://v3.fal.media/files/panda/oMob58qZJRtbDs5l45QKT_e3a1512c455d425fab2d62e07a51c506.png',
        exampleAfter: 'https://v3b.fal.media/files/b/penguin/n2f6ImUI9nJORdIibmpim_dfaeb84b0e894f62ae50ccaceb9704d3.png',
      },
      {
        id: 'fal-ai/image-apps-v2/makeup-application',
        name: 'Makeup Artist',
        description: 'Apply realistic makeup styles with adjustable intensity',
        credits: 8, tags: ['Beauty', 'Style'],
        inputMode: 'single',
        hasMakeupStyle: true, hasMakeupIntensity: true,
      },
    ],
  },
  {
    id: 'creative',
    name: 'Creative',
    icon: '🎨',
    color: 'bg-purple-100 text-purple-600',
    models: [
      {
        id: 'fal-ai/flux-2-lora-gallery/ballpoint-pen-sketch',
        name: 'Pen Sketch',
        description: 'Convert your photo into a ballpoint pen sketch artwork',
        credits: 6, tags: ['Art', 'Sketch'],
        inputMode: 'single',
        hasPrompt: true, hasImageSize: true,
        promptPlaceholder: 'Add a prompt to guide the style (e.g. "detailed portrait")…',
        exampleAfter: 'https://v3b.fal.media/files/b/lion/6Eq6ijrWRcWsa6ivqdlL1.png',
        examplePrompt: 'b4llp01nt portrait of a lion',
      },
      {
        id: 'fal-ai/flux-2-lora-gallery/digital-comic-art',
        name: 'Comic Art',
        description: 'Transform your photo into a digital comic book illustration',
        credits: 6, tags: ['Comic', 'Illustration'],
        inputMode: 'single',
        hasPrompt: true, hasImageSize: true,
        promptPlaceholder: 'Describe the comic scene…',
        exampleAfter: 'https://v3b.fal.media/files/b/tiger/9_onjLEABvvZl9r-R6w_w.png',
        examplePrompt: 'd1g1t4l superhero in action',
      },
      {
        id: 'fal-ai/flux-2-lora-gallery/sepia-vintage',
        name: 'Sepia Vintage',
        description: 'Generate a sepia-toned vintage photograph aesthetic from a prompt',
        credits: 6, tags: ['Vintage', 'Film'],
        inputMode: 'prompt-only',
        hasPrompt: true, hasImageSize: true,
        promptPlaceholder: 'Describe the vintage scene (e.g. "1920s street market in Paris")…',
        exampleAfter: 'https://v3b.fal.media/files/b/zebra/qOMZKBNStQgVkaKB9SLY4.png',
        examplePrompt: '1920s Parisian café, candlelight, film grain',
      },
    ],
  },
  {
    id: 'transform',
    name: 'Transform',
    icon: '✨',
    color: 'bg-green-100 text-green-600',
    models: [
      {
        id: 'fal-ai/flux-2-lora-gallery/face-to-full-portrait',
        name: 'Face → Full Portrait',
        description: 'Expand a cropped face photo into a complete full-body portrait',
        credits: 6, tags: ['Portrait', 'Expand'],
        inputMode: 'single',
        primaryLabel: 'Face Photo',
        hasPrompt: true, hasImageSize: true,
        promptPlaceholder: 'Describe outfit or setting (optional)…',
        exampleBefore: 'https://v3b.fal.media/files/b/elephant/XJPJL2v5pAOmx9LemHWAE.png',
        exampleAfter: 'https://v3b.fal.media/files/b/elephant/rlfpP4b6_PwqQK5F2pAKc.png',
      },
      {
        id: 'fal-ai/flux-2-lora-gallery/virtual-tryon',
        name: 'Virtual Try-On',
        description: 'Dress a person in any garment for a realistic try-on preview',
        credits: 6, tags: ['Fashion', 'Try-On'],
        inputMode: 'dual',
        primaryLabel: 'Person Photo',
        secondaryLabel: 'Garment Photo',
        hasPrompt: true, hasImageSize: true,
        promptPlaceholder: 'Describe the look (optional)…',
        exampleBefore: 'https://v3b.fal.media/files/b/koala/YlOtn9SjXGGH274eN1G5R.png',
        exampleAfter: 'https://v3b.fal.media/files/b/zebra/oFnSZ-nBbPgM-gXT0ApXy.png',
      },
      {
        id: 'fal-ai/qwen-image-edit-plus-lora-gallery/integrate-product',
        name: 'Product Integration',
        description: 'Seamlessly blend a product into any background scene',
        credits: 9, tags: ['E-commerce', 'Composite'],
        inputMode: 'single',
        primaryLabel: 'Product Image (white/clean background)',
        hasPrompt: true, hasImageSize: true,
        promptPlaceholder: 'Describe the integration (optional)…',
        exampleBefore: 'https://v3b.fal.media/files/b/koala/LFYeCtq2LB4s6IpmoI2iy_2fb7b46d1f3749db9f7bab679bc6c4f3.png',
        exampleAfter: 'https://v3b.fal.media/files/b/penguin/4_Bz95EOoETXJlfuWib3r.png',
      },
    ],
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-background-removal',
  standalone: true,
  imports: [CommonModule, FormsModule, MediaPreviewComponent, JobStatusComponent],
  template: `
<div class="flex flex-col lg:flex-row lg:h-full">

  <!-- ═══════════════════════════════════════════════════════ LEFT PANEL ══ -->
  <div class="w-full lg:w-[440px] lg:flex-shrink-0 border-b lg:border-b-0 lg:border-r border-border bg-white flex flex-col">

    <div class="px-5 py-4 border-b border-border">
      <h1 class="text-base font-semibold text-gray-900">Image Studio</h1>
      <p class="text-xs text-gray-400 mt-0.5">Background, edit, portrait & creative transforms</p>
    </div>

    <div class="flex-1 overflow-y-auto px-5 py-4 space-y-6">

      <!-- ── Primary image upload (always at top) ───────────── -->
      @if (!selectedModel() || selectedModel()!.inputMode !== 'prompt-only') {
        <div>
          <label class="form-label">{{ selectedModel()?.primaryLabel ?? 'Upload Image' }}</label>
          <div class="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-accent hover:bg-accent-light/30 transition-colors"
               (click)="fileInput.click()" (dragover)="$event.preventDefault()" (drop)="onDrop($event, 'primary')">
            @if (previewSrc()) {
              <img [src]="previewSrc()" class="mx-auto max-h-36 rounded object-contain mb-2"/>
              <p class="text-xs text-gray-500">{{ fileName() }}</p>
            } @else {
              <div class="flex flex-col items-center gap-1.5 py-2">
                <svg class="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                <p class="text-sm text-gray-500 font-medium">Click or drag to upload</p>
                <p class="text-xs text-gray-400">PNG, JPG, WebP — max 10 MB</p>
              </div>
            }
          </div>
          <input #fileInput type="file" class="hidden" accept="image/png,image/jpeg,image/webp,image/jpg"
                 (change)="onFileSelected($event, 'primary')"/>
        </div>
      }


      <!-- ── Model cards ─────────────────────────────────────── -->
      @if (selectedCategory()) {
        <div class="space-y-2">
          @for (m of selectedCategory()!.models; track m.id) {
            <div (click)="selectModel(m)"
              class="border rounded-xl p-3 cursor-pointer transition-all"
              [class.border-accent]="selectedModel()?.id === m.id"
              [class.bg-accent-light]="selectedModel()?.id === m.id"
              [class.border-border]="selectedModel()?.id !== m.id"
              [class.hover:border-accent]="selectedModel()?.id !== m.id">

              <div class="flex items-start justify-between gap-2">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <p class="text-sm font-semibold text-gray-900">{{ m.name }}</p>
                    @if (m.badge) {
                      <span class="px-1.5 py-0.5 text-[10px] font-medium rounded-full" [ngClass]="m.badgeColor">{{ m.badge }}</span>
                    }
                  </div>
                  <p class="text-xs text-gray-500 mt-0.5 leading-snug">{{ m.description }}</p>
                  <div class="flex flex-wrap gap-1 mt-1.5">
                    @for (tag of m.tags; track tag) {
                      <span class="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">{{ tag }}</span>
                    }
                  </div>
                </div>
                <div class="text-right flex-shrink-0">
                  <p class="text-sm font-bold text-accent">{{ m.credits }}</p>
                  <p class="text-[10px] text-gray-400">credits</p>
                </div>
              </div>

              <!-- Before / After example preview -->
              @if (selectedModel()?.id === m.id && (m.exampleBefore || m.exampleAfter)) {
                <div class="mt-3 pt-3 border-t border-border/60">
                  <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Example</p>
                  <div class="flex gap-2">
                    @if (m.exampleBefore) {
                      <div class="flex-1 min-w-0">
                        <p class="text-[10px] text-gray-400 mb-1">Before</p>
                        <img [src]="m.exampleBefore" alt="before" class="w-full h-24 object-cover rounded-lg"/>
                      </div>
                    }
                    @if (m.exampleAfter) {
                      <div class="flex-1 min-w-0">
                        <p class="text-[10px] text-gray-400 mb-1">After</p>
                        <img [src]="m.exampleAfter" alt="after" class="w-full h-24 object-cover rounded-lg"/>
                      </div>
                    }
                  </div>
                  @if (m.examplePrompt) {
                    <p class="mt-1.5 text-[10px] text-gray-400 italic">"{{ m.examplePrompt }}"</p>
                  }
                </div>
              }
            </div>
          }
        </div>
      }

      @if (!selectedModel()) {
        <div class="flex flex-col items-center py-8 text-center">
          <span class="text-3xl mb-2">👆</span>
          <p class="text-sm font-medium text-gray-600">Select a tool above to get started</p>
        </div>
      }

      <!-- ── Inputs (shown when model selected) ─────────────── -->
      @if (selectedModel()) {

        <!-- Secondary image upload (dual mode) -->
        @if (selectedModel()!.inputMode === 'dual') {
          <div>
            <label class="form-label">{{ selectedModel()!.secondaryLabel ?? 'Second Image' }}</label>
            <div class="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-accent hover:bg-accent-light/30 transition-colors"
                 (click)="fileInput2.click()" (dragover)="$event.preventDefault()" (drop)="onDrop($event, 'secondary')">
              @if (previewSrc2()) {
                <img [src]="previewSrc2()" class="mx-auto max-h-36 rounded object-contain mb-2"/>
                <p class="text-xs text-gray-500">{{ fileName2() }}</p>
              } @else {
                <div class="flex flex-col items-center gap-1.5 py-2">
                  <svg class="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                  <p class="text-sm text-gray-500 font-medium">Click or drag to upload</p>
                  <p class="text-xs text-gray-400">PNG, JPG, WebP — max 10 MB</p>
                </div>
              }
            </div>
            <input #fileInput2 type="file" class="hidden" accept="image/png,image/jpeg,image/webp,image/jpg"
                   (change)="onFileSelected($event, 'secondary')"/>
          </div>
        }

        <!-- Prompt -->
        @if (selectedModel()!.hasPrompt) {
          <div>
            <label class="form-label">Prompt</label>
            <textarea class="form-textarea h-24" [(ngModel)]="prompt"
              [placeholder]="selectedModel()!.promptPlaceholder ?? 'Describe what you want…'" maxlength="1000"></textarea>
          </div>
        }

        <!-- Mask URL (Ideogram Edit) -->
        @if (selectedModel()!.hasMaskUrl) {
          <div>
            <label class="form-label">Mask Image URL</label>
            <input type="url" class="form-input" [(ngModel)]="maskUrl"
              placeholder="https://… (must be same dimensions as the main image)"/>
            <p class="text-xs text-gray-400 mt-1">White = area to edit, black = preserve. Must match main image size exactly.</p>
          </div>
        }

        <!-- Negative Prompt -->
        @if (selectedModel()!.hasNegativePrompt) {
          <div>
            <label class="form-label">Negative Prompt <span class="text-gray-400 font-normal">(optional)</span></label>
            <input type="text" class="form-input" [(ngModel)]="negativePrompt"
              placeholder="Describe what to avoid…" maxlength="500"/>
          </div>
        }

        <!-- Rendering Speed (Ideogram) -->
        @if (selectedModel()!.hasRenderingSpeed) {
          <div>
            <label class="form-label">Rendering Speed</label>
            <div class="flex gap-2">
              @for (s of ['TURBO','BALANCED','QUALITY']; track s) {
                <button type="button" (click)="renderingSpeed = s"
                  class="flex-1 py-2 text-xs font-medium rounded-lg border transition-colors capitalize"
                  [class.border-accent]="renderingSpeed === s"
                  [class.bg-accent-light]="renderingSpeed === s"
                  [class.text-accent]="renderingSpeed === s"
                  [class.border-border]="renderingSpeed !== s"
                  [class.text-gray-600]="renderingSpeed !== s">
                  {{ s === 'TURBO' ? '⚡ Turbo' : s === 'BALANCED' ? '⚖️ Balanced' : '🎯 Quality' }}
                  <span class="block text-[10px] opacity-60 mt-0.5">
                    {{ s === 'TURBO' ? '6 cr' : s === 'BALANCED' ? '12 cr' : '18 cr' }}
                  </span>
                </button>
              }
            </div>
          </div>
        }

        <!-- Background Style (Headshot) -->
        @if (selectedModel()!.hasBackgroundStyle) {
          <div>
            <label class="form-label">Background Style</label>
            <div class="grid grid-cols-2 gap-2">
              @for (s of ['professional','corporate','clean','gradient']; track s) {
                <button type="button" (click)="backgroundStyle = s"
                  class="py-2 text-xs font-medium rounded-lg border transition-colors capitalize"
                  [class.border-accent]="backgroundStyle === s"
                  [class.bg-accent-light]="backgroundStyle === s"
                  [class.text-accent]="backgroundStyle === s"
                  [class.border-border]="backgroundStyle !== s"
                  [class.text-gray-600]="backgroundStyle !== s">{{ s }}</button>
              }
            </div>
          </div>
        }

        <!-- Makeup Style -->
        @if (selectedModel()!.hasMakeupStyle) {
          <div>
            <label class="form-label">Makeup Style</label>
            <select class="form-select" [(ngModel)]="makeupStyle">
              <option value="natural">Natural</option>
              <option value="glamorous">Glamorous</option>
              <option value="smoky_eyes">Smoky Eyes</option>
              <option value="bold_lips">Bold Lips</option>
              <option value="no_makeup">No Makeup</option>
              <option value="remove_makeup">Remove Makeup</option>
              <option value="dramatic">Dramatic</option>
              <option value="bridal">Bridal</option>
              <option value="professional">Professional</option>
              <option value="korean_style">Korean Style</option>
              <option value="artistic">Artistic</option>
            </select>
          </div>
        }

        <!-- Makeup Intensity -->
        @if (selectedModel()!.hasMakeupIntensity) {
          <div>
            <label class="form-label">Intensity</label>
            <div class="flex gap-2">
              @for (i of ['light','medium','heavy','dramatic']; track i) {
                <button type="button" (click)="makeupIntensity = i"
                  class="flex-1 py-2 text-xs font-medium rounded-lg border transition-colors capitalize"
                  [class.border-accent]="makeupIntensity === i"
                  [class.bg-accent-light]="makeupIntensity === i"
                  [class.text-accent]="makeupIntensity === i"
                  [class.border-border]="makeupIntensity !== i"
                  [class.text-gray-600]="makeupIntensity !== i">{{ i }}</button>
              }
            </div>
          </div>
        }

        <!-- Image Size (FLUX LoRA / ICLight) -->
        @if (selectedModel()!.hasImageSize) {
          <div>
            <label class="form-label">Output Size</label>
            <select class="form-select" [(ngModel)]="imageSize">
              <option value="square_hd">Square HD (1024×1024)</option>
              <option value="square">Square (512×512)</option>
              <option value="portrait_4_3">Portrait 4:3 (768×1024)</option>
              <option value="portrait_16_9">Portrait 16:9 (576×1024)</option>
              <option value="landscape_4_3">Landscape 4:3 (1024×768)</option>
              <option value="landscape_16_9">Landscape 16:9 (1024×576)</option>
            </select>
          </div>
        }

        <!-- Error -->
        @if (errorMsg()) {
          <div class="p-3 bg-red-50 border border-red-300 rounded-lg text-sm text-red-700">{{ errorMsg() }}</div>
        }
      }
    </div>

    <!-- ── Footer ──────────────────────────────────────────────── -->
    @if (selectedModel()) {
      <div class="px-5 py-4 border-t border-border space-y-3">
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-500">Cost</span>
          <span class="font-semibold"><span class="text-accent">{{ effectiveCredits() }}</span> credits</span>
        </div>
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
          <div>
            <p class="text-sm font-medium text-gray-700">Public visibility</p>
            <p class="text-xs text-gray-400">Show on the Explore page</p>
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
          <select [(ngModel)]="zone"
                  class="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent">
            <option value="">Zone (optional)</option>
            <option value="Cinematic">🎬 Cinematic</option>
            <option value="Character">🧑 Character</option>
            <option value="Viral">🔥 Viral</option>
            <option value="Dramatic">🎭 Dramatic</option>
            <option value="Cool">😎 Cool</option>
            <option value="Playful">🎮 Playful</option>
            <option value="Fantasy">🧙 Fantasy</option>
          </select>
        }
        <button type="button" (click)="generate()"
          class="w-full py-2.5 rounded-xl font-semibold text-sm transition-colors"
          [disabled]="!canGenerate() || isGenerating()"
          [class.bg-accent]="canGenerate() && !isGenerating()"
          [class.text-white]="canGenerate() && !isGenerating()"
          [class.hover:bg-accent/90]="canGenerate() && !isGenerating()"
          [class.bg-gray-100]="!canGenerate() || isGenerating()"
          [class.text-gray-400]="!canGenerate() || isGenerating()"
          [class.cursor-not-allowed]="!canGenerate() || isGenerating()">
          @if (isGenerating()) { Processing… } @else { Generate — {{ effectiveCredits() }} credits }
        </button>
      </div>
    }
  </div>

  <!-- ═══════════════════════════════════════════════════════ RIGHT PANEL ══ -->
  <div class="flex-1 flex flex-col min-h-0 bg-gray-50">
    <div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
      @if (jobs().length === 0) {
        <div class="flex flex-col items-center justify-center h-full min-h-[320px] text-center">
          <span class="text-5xl mb-4">🎨</span>
          <p class="text-gray-500 font-medium">Your Image Studio outputs will appear here</p>
          <p class="text-gray-400 text-sm mt-1">Pick a tool on the left and upload an image</p>
        </div>
      }
      @for (job of jobs(); track job.id) {
        <div class="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div class="px-4 py-3 flex items-center justify-between border-b border-border/60">
            <span class="text-sm font-medium text-gray-700">{{ job.modelName }}</span>
            <app-job-status [status]="job.status" />
          </div>
          @if (job.status === 'Completed' && job.outputUrl) {
            <app-media-preview [url]="job.outputUrl" product="BackgroundRemoval" />
          }
          @if (job.status === 'Failed' && job.errorMessage) {
            <div class="p-4 text-sm text-red-600">{{ job.errorMessage }}</div>
          }
        </div>
      }
    </div>
  </div>
</div>
`,
})
export class BackgroundRemovalComponent implements OnInit, OnDestroy {
  private gen    = inject(GenerationService);
  private credits = inject(CreditsService);
  private signalR = inject(SignalRService);
  private auth    = inject(AuthService);
  private loginModal = inject(LoginModalService);
  private route   = inject(ActivatedRoute);

  readonly categories = CATEGORIES;

  // ── Signals ────────────────────────────────────────────────
  selectedCategoryId = signal<string>('background');
  selectedModel      = signal<StudioModel | null>(null);
  previewSrc         = signal<string | null>(null);
  previewSrc2        = signal<string | null>(null);
  fileName           = signal<string>('');
  fileName2          = signal<string>('');
  isPublic           = signal(true);
  isGenerating       = signal(false);
  errorMsg           = signal<string | null>(null);
  jobs               = signal<LocalJob[]>([]);

  // Plain form fields
  prompt           = '';
  negativePrompt   = '';
  maskUrl          = '';
  backgroundStyle  = 'professional';
  makeupStyle      = 'natural';
  makeupIntensity  = 'medium';
  renderingSpeed   = 'BALANCED';
  imageSize        = 'portrait_4_3';
  zone             = '';

  selectedFile  = signal<File | null>(null);
  selectedFile2 = signal<File | null>(null);
  private pollInterval: any;
  private activeJobIds = new Set<string>();
  private currentJobId = '';

  // ── Computed ───────────────────────────────────────────────
  selectedCategory = computed(() =>
    this.categories.find(c => c.id === this.selectedCategoryId()) ?? null
  );

  effectiveCredits = computed(() => {
    const m = this.selectedModel();
    if (!m) return 0;
    if (m.hasRenderingSpeed) {
      return this.renderingSpeed === 'TURBO' ? 6 : this.renderingSpeed === 'QUALITY' ? 18 : 12;
    }
    return m.credits;
  });

  canGenerate = computed(() => {
    const m = this.selectedModel();
    if (!m) return false;
    if (m.inputMode === 'prompt-only') return !!this.prompt.trim();
    if (!this.selectedFile()) return false;
    if (m.inputMode === 'dual' && !this.selectedFile2()) return false;
    if (m.hasMaskUrl && !this.maskUrl.trim()) return false;
    return true;
  });

  // ── Lifecycle ──────────────────────────────────────────────
  ngOnInit() {
    this.startPolling();
    this.route.queryParams.subscribe(p => {
      if (p['model']) this.selectModelById(p['model']);
    });
  }

  ngOnDestroy() { clearInterval(this.pollInterval); }

  private startPolling() {
    let inFlight = new Set<string>();
    this.pollInterval = setInterval(() => {
      // Check SignalR signal first — only terminal states
      const u = this.signalR.latestUpdate();
      if (u && this.activeJobIds.has(u.jobId) && (u.status === 'Completed' || u.status === 'Failed')) {
        this.applyUpdate(u.jobId, u.status as JobStatus, u.outputUrl ?? null, u.errorMessage ?? null);
      }
      // HTTP fallback for active jobs not yet resolved
      for (const jobId of [...this.activeJobIds]) {
        if (inFlight.has(jobId)) continue;
        inFlight.add(jobId);
        this.gen.getJob(jobId).subscribe({
          next: j => {
            inFlight.delete(jobId);
            if (j.status === 'Completed' || j.status === 'Failed') {
              this.applyUpdate(j.id, j.status, j.outputUrl ?? null, j.errorMessage ?? null);
              this.signalR.publishUpdate({ jobId: j.id, status: j.status, outputUrl: j.outputUrl, creditsCharged: j.creditsCharged, errorMessage: j.errorMessage });
            }
          },
          error: () => inFlight.delete(jobId)
        });
      }
    }, 5000);
  }

  private applyUpdate(jobId: string, status: JobStatus, outputUrl: string | null, errorMessage: string | null) {
    this.jobs.update(list =>
      list.map(j => j.id === jobId ? { ...j, status, outputUrl, errorMessage } : j)
    );
    if (status === 'Completed' || status === 'Failed') {
      this.activeJobIds.delete(jobId);
      this.credits.loadBalance().subscribe();
      if (jobId === this.currentJobId) {
        this.isGenerating.set(false);
        this.currentJobId = '';
      }
    }
  }

  // ── Actions ────────────────────────────────────────────────
  selectCategory(id: string) {
    this.selectedCategoryId.set(id);
    this.selectedModel.set(null);
    this.resetInputs();
  }

  selectModel(m: StudioModel) {
    this.selectedModel.set(m);
    // Only reset params, keep the uploaded image so user doesn't have to re-upload when switching models
    this.prompt = '';
    this.negativePrompt = '';
    this.maskUrl = '';
    this.backgroundStyle = 'professional';
    this.makeupStyle = 'natural';
    this.makeupIntensity = 'medium';
    this.renderingSpeed = 'BALANCED';
    this.imageSize = 'portrait_4_3';
    this.errorMsg.set(null);
  }

  selectModelById(id: string) {
    for (const cat of this.categories) {
      const m = cat.models.find(x => x.id === id);
      if (m) { this.selectedCategoryId.set(cat.id); this.selectModel(m); return; }
    }
  }

  private resetInputs() {
    this.selectedFile.set(null);
    this.selectedFile2.set(null);
    this.previewSrc.set(null);
    this.previewSrc2.set(null);
    this.fileName.set('');
    this.fileName2.set('');
    this.prompt = '';
    this.negativePrompt = '';
    this.maskUrl = '';
    this.backgroundStyle = 'professional';
    this.makeupStyle = 'natural';
    this.makeupIntensity = 'medium';
    this.renderingSpeed = 'BALANCED';
    this.imageSize = 'portrait_4_3';
    this.errorMsg.set(null);
  }

  onFileSelected(event: Event, slot: 'primary' | 'secondary') {
    const input = event.target as HTMLInputElement;
    const f = input.files?.[0];
    if (f) this.setFile(f, slot);
    input.value = ''; // reset so same file can be re-selected
  }

  onDrop(event: DragEvent, slot: 'primary' | 'secondary') {
    event.preventDefault();
    const f = event.dataTransfer?.files?.[0];
    if (f) this.setFile(f, slot);
  }

  private setFile(f: File, slot: 'primary' | 'secondary') {
    if (f.size > 10 * 1024 * 1024) {
      this.errorMsg.set('File must be under 10 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      if (slot === 'primary') {
        this.selectedFile.set(f);
        this.previewSrc.set(e.target!.result as string);
        this.fileName.set(f.name);
      } else {
        this.selectedFile2.set(f);
        this.previewSrc2.set(e.target!.result as string);
        this.fileName2.set(f.name);
      }
    };
    reader.readAsDataURL(f);
    this.errorMsg.set(null);
  }

  generate() {
    if (!this.auth.isLoggedIn()) { this.loginModal.show(); return; }
    if (!this.canGenerate()) return;

    const m = this.selectedModel()!;
    this.isGenerating.set(true);
    this.errorMsg.set(null);
    this.jobs.set([]);  // clear previous result before each new generation

    const fd = new FormData();
    fd.append('modelId', m.id);
    fd.append('isPublic', String(this.isPublic()));
    if (this.zone) fd.append('zone', this.zone);
    if (this.selectedFile()) fd.append('file', this.selectedFile()!);
    if (this.selectedFile2()) fd.append('file', this.selectedFile2()!);   // backend reads Files[0] and Files[1]
    if (this.prompt) fd.append('prompt', this.prompt);
    if (this.negativePrompt) fd.append('negativePrompt', this.negativePrompt);
    if (this.maskUrl) fd.append('maskUrl', this.maskUrl);
    if (m.hasBackgroundStyle) fd.append('backgroundStyle', this.backgroundStyle);
    if (m.hasMakeupStyle) fd.append('makeupStyle', this.makeupStyle);
    if (m.hasMakeupIntensity) fd.append('makeupIntensity', this.makeupIntensity);
    if (m.hasRenderingSpeed) fd.append('renderingSpeed', this.renderingSpeed);
    if (m.hasImageSize) fd.append('imageSize', this.imageSize);

    this.gen.generateBackgroundRemoval(fd).subscribe({
      next: res => {
        this.currentJobId = res.jobId;
        this.activeJobIds.add(res.jobId);
        this.jobs.update(list => [{
          id: res.jobId, status: 'Queued' as JobStatus,
          outputUrl: null, errorMessage: null,
          modelName: m.name, creditsReserved: res.creditsReserved
        }, ...list]);
        this.signalR.trackJob(res.jobId, 'Image Studio');
        this.credits.reserveLocally(res.creditsReserved);
      },
      error: err => {
        this.isGenerating.set(false);
        this.errorMsg.set(err.error?.message ?? err.error?.error ?? 'Generation failed.');
      }
    });
  }
}
