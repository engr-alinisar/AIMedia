import { Component, signal, computed, inject, OnInit, OnDestroy, ViewChildren, QueryList, ElementRef } from '@angular/core';
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
import { type JobStatus } from '../../core/models/models';
import { ResolutionPickerComponent } from '../../shared/components/resolution-picker/resolution-picker.component';
import { AspectRatioPickerComponent, type AspectRatio,
         ASPECT_RATIOS_169_916_11, ASPECT_RATIOS_169_916,
         ASPECT_RATIOS_AUTO_169_916 } from '../../shared/components/aspect-ratio-picker/aspect-ratio-picker.component';
import { DurationPickerComponent } from '../../shared/components/duration-picker/duration-picker.component';
import { ModelPickerComponent, type PickerGroup, type PickerModel } from '../../shared/components/model-picker/model-picker.component';

interface VideoModel {
  id: string;
  name: string;
  description: string;
  creditsPerSec: number;
  badge?: string;
  badgeColor?: string;
  tags: string[];
  durations: number[];
  resolutions: string[];
  supportsMultiShot: boolean;
  supportsAudio: boolean;
  hasAudio: boolean;
  aspectRatios: AspectRatio[];
  endFrameRequired?: boolean;   // needs first_frame_url + last_frame_url (Veo 3.1 Fast)
  supportsEndFrame?: boolean;   // optional end_image_url (Kling v3)
  supportsNegativePrompt?: boolean;
  supportsCfgScale?: boolean;
  supportsMultiPrompt?: boolean;
  supportsElements?: boolean;
  audioTiers?: { noAudio: number; audio: number };
}

interface ModelGroup {
  id: string;
  name: string;
  tagline: string;
  icon: string;        // letter fallback
  iconBg: string;      // background for letter fallback
  iconUrl?: string;    // brand logo URL (preferred)
  tags: string[];
  badge?: string;
  badgeColor?: string;
  subModels: VideoModel[];
}

@Component({
  selector: 'app-image-to-video',
  standalone: true,
  imports: [CommonModule, FormsModule, MediaPreviewComponent, JobStatusComponent, AspectRatioPickerComponent, DurationPickerComponent, ResolutionPickerComponent, ModelPickerComponent],
  template: `
<div class="flex flex-col lg:flex-row lg:h-full">
  <!-- Left panel -->
  <div class="w-full lg:w-[420px] lg:flex-shrink-0 border-b lg:border-b-0 lg:border-r border-border bg-white flex flex-col">
    <div class="px-5 py-4 border-b border-border">
      <h1 class="text-base font-semibold text-gray-900">Image to Video</h1>
    </div>

    <div class="flex-1 px-5 py-4 space-y-5 overflow-y-auto">

      <!-- Model dropdown -->
      <app-model-picker
        [groups]="pickerGroups()"
        [selectedId]="selectedModel()?.id ?? null"
        (modelSelect)="onModelSelect($event)" />

      <!-- Image upload -->
      <div>
        <label class="form-label">Upload Image <span class="text-red-500">*</span></label>
        <div class="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer
                    hover:border-accent hover:bg-accent-light/30 transition-colors"
             (click)="fileInput.click()"
             (dragover)="$event.preventDefault()"
             (drop)="onDrop($event)">
          @if (previewSrc()) {
            <img [src]="previewSrc()" class="mx-auto max-h-40 rounded object-contain mb-2"/>
            <p class="text-xs text-gray-400">Click to change</p>
          } @else {
            <div class="text-gray-400">
              <div class="text-3xl mb-2">📁</div>
              <p class="text-sm">Click or drag to upload</p>
              <p class="text-xs text-gray-400 mt-1">JPG, PNG, WEBP up to 20MB</p>
            </div>
          }
          <input #fileInput type="file" accept="image/*" class="hidden" (change)="onFile($event)"/>
        </div>
      </div>

      <!-- End Frame (required — shown at top level only for Veo 3.1 Fast) -->
      @if (selectedModel()?.endFrameRequired) {
        <div>
          <label class="form-label">End Frame <span class="text-red-500">*</span></label>
          <p class="text-xs text-gray-400 mb-2">Upload the last frame — the video will animate between start and end.</p>
          <div class="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer
                      hover:border-accent hover:bg-accent-light/30 transition-colors"
               (click)="endFileInput.click()"
               (dragover)="$event.preventDefault()"
               (drop)="onEndDrop($event)">
            @if (endPreviewSrc()) {
              <img [src]="endPreviewSrc()" class="mx-auto max-h-32 rounded object-contain mb-1"/>
              <p class="text-xs text-gray-400">Click to change</p>
            } @else {
              <div class="text-gray-400">
                <div class="text-2xl mb-1">🎬</div>
                <p class="text-sm">Upload end frame</p>
                <p class="text-xs text-gray-400 mt-0.5">JPG, PNG, WEBP</p>
              </div>
            }
            <input #endFileInput type="file" accept="image/*" class="hidden" (change)="onEndFile($event)"/>
          </div>
        </div>
      }

      <!-- Multi-Shot toggle (before prompt so user sees which input is needed) -->
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

      <!-- Prompt / Multi-Prompt -->
      @if (selectedModel()?.supportsMultiPrompt && multiShot()) {
        <div>
          <label class="form-label">Multi-Prompt Segments <span class="text-red-500">*</span></label>
          <p class="text-xs text-gray-400 mb-2">Each segment gets roughly equal time. {{ duration() }}s ÷ {{ multiPrompts().length }} segments ≈ {{ (duration() / multiPrompts().length) | number:'1.0-1' }}s each.</p>
          @for (seg of multiPrompts(); track $index) {
            <div class="flex gap-2 mb-2">
              <div class="flex items-center justify-center w-6 h-6 rounded-full bg-accent/10 text-accent text-xs font-bold flex-shrink-0 mt-1">{{ $index + 1 }}</div>
              <textarea class="form-textarea h-16 flex-1" [ngModel]="seg"
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
        <div>
          <label class="form-label">Prompt <span class="text-red-500">*</span></label>
          <textarea class="form-textarea h-24" [ngModel]="prompt()"
            (ngModelChange)="prompt.set($event)"
            spellcheck="true" lang="en" autocorrect="on" autocapitalize="sentences"
            placeholder="Describe the motion or scene...&#10;Longer, multi-shot prompts work best."
            maxlength="2500"></textarea>
          <p class="text-right text-xs text-gray-400 mt-1">{{ prompt().length }}/2500</p>
        </div>
      }

      <!-- Aspect Ratio -->
      <app-aspect-ratio-picker
        [ratios]="selectedModel()?.aspectRatios ?? []"
        [value]="aspectRatio()"
        (valueChange)="aspectRatio.set($event)" />

      <!-- Duration -->
      <app-duration-picker
        [durations]="availableDurations()"
        [value]="duration()"
        (valueChange)="duration.set($event)" />

      <!-- Resolution -->
      <app-resolution-picker
        [resolutions]="selectedModel()?.resolutions ?? []"
        [value]="resolution()"
        [premiumResolutions]="['1080p','768P','4k']"
        (valueChange)="resolution.set($event)" />

      <!-- Generate Audio toggle -->
      @if (selectedModel()?.supportsAudio) {
        <div class="flex items-start justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
          <div>
            <p class="text-sm font-medium text-gray-700">Generate Audio</p>
            <p class="text-xs text-gray-400 mt-0.5">Native audio with voice & sound effects</p>
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

      <!-- Advanced options -->
      @if (selectedModel()?.supportsNegativePrompt || selectedModel()?.supportsCfgScale || selectedModel()?.supportsEndFrame || selectedModel()?.supportsElements) {
        <button type="button" (click)="showAdvanced.update(v => !v)"
                class="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors">
          <svg class="w-3.5 h-3.5 transition-transform" [class.rotate-90]="showAdvanced()" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
          Advanced Options
        </button>
        @if (showAdvanced()) {
          <div class="space-y-4 pl-1">

            <!-- End Frame (optional — Kling v3) -->
            @if (selectedModel()?.supportsEndFrame && !selectedModel()?.endFrameRequired) {
              <div>
                <label class="form-label">End Frame <span class="text-gray-400 font-normal">(optional)</span></label>
                <p class="text-xs text-gray-400 mb-2">Upload the last frame — the video will animate between start and end.</p>
                <div class="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer
                            hover:border-accent hover:bg-accent-light/30 transition-colors"
                     (click)="endFileInput.click()"
                     (dragover)="$event.preventDefault()"
                     (drop)="onEndDrop($event)">
                  @if (endPreviewSrc()) {
                    <img [src]="endPreviewSrc()" class="mx-auto max-h-32 rounded object-contain mb-1"/>
                    <p class="text-xs text-gray-400">Click to change</p>
                  } @else {
                    <div class="text-gray-400">
                      <div class="text-2xl mb-1">🎬</div>
                      <p class="text-sm">Upload end frame</p>
                      <p class="text-xs text-gray-400 mt-0.5">JPG, PNG, WEBP</p>
                    </div>
                  }
                  <input #endFileInput type="file" accept="image/*" class="hidden" (change)="onEndFile($event)"/>
                </div>
              </div>
            }

            <!-- Elements (characters/objects) -->
            @if (selectedModel()?.supportsElements) {
              <div>
                <label class="form-label">Elements <span class="text-gray-400 font-normal">(optional)</span></label>
                <p class="text-xs text-gray-400 mb-2">Add characters or objects. Reference in prompt as &#64;Element1, &#64;Element2, etc.</p>
                @for (el of elements(); track elIdx; let elIdx = $index) {
                  <div class="mb-3 p-3 rounded-lg border border-border bg-surface/50">
                    <div class="flex items-center justify-between mb-2">
                      <div class="flex items-center gap-2">
                        <div class="flex items-center justify-center w-6 h-6 rounded-full bg-orange-50 text-orange-500 text-xs font-bold flex-shrink-0">{{ elIdx + 1 }}</div>
                        <span class="text-sm font-medium text-text">&#64;Element{{ elIdx + 1 }}</span>
                      </div>
                      <button type="button" (click)="removeElement(elIdx)"
                              class="w-6 h-6 rounded-full bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors flex-shrink-0">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>
                    <!-- Frontal Image -->
                    <div class="mb-2">
                      <label class="text-xs text-gray-400 mb-1 block">Frontal Image <span class="text-red-500">*</span></label>
                      <div class="flex items-center gap-2">
                        @if (el.frontalPreview) {
                          <img [src]="el.frontalPreview" class="w-12 h-12 rounded-lg object-cover border border-border"/>
                          <button type="button" (click)="frontalInputs.toArray()[elIdx]?.nativeElement?.click()"
                                  class="text-xs text-accent hover:underline">Change</button>
                        } @else {
                          <div class="w-12 h-12 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-gray-300 cursor-pointer hover:border-accent transition-colors"
                               (click)="frontalInputs.toArray()[elIdx]?.nativeElement?.click()">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                            </svg>
                          </div>
                          <span class="text-xs text-gray-400">Upload frontal view</span>
                        }
                        <input #frontalInput type="file" accept="image/*" class="hidden" (change)="onFrontalFile($event, elIdx)"/>
                      </div>
                    </div>
                    <!-- Reference Images -->
                    <div>
                      <label class="text-xs text-gray-400 mb-1 block">Reference Images <span class="text-red-500">*</span> <span class="text-gray-500">(1 or more)</span></label>
                      <div class="flex items-center gap-2 flex-wrap">
                        @for (ref of el.refPreviews; track refIdx; let refIdx = $index) {
                          <div class="relative">
                            <img [src]="ref" class="w-10 h-10 rounded-lg object-cover border border-border"/>
                            <button type="button" (click)="removeRefImage(refIdx, elIdx)"
                                    class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[8px] leading-none">✕</button>
                          </div>
                        }
                        @if (el.refPreviews.length < 5) {
                          <div class="w-10 h-10 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-gray-300 cursor-pointer hover:border-accent transition-colors"
                               (click)="refInputs.toArray()[elIdx]?.nativeElement?.click()">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                            </svg>
                          </div>
                        }
                        <input #refInput type="file" accept="image/*" multiple class="hidden" (change)="onRefFiles($event, elIdx)"/>
                      </div>
                    </div>
                  </div>
                }
                @if (elements().length < 4) {
                  <button type="button" (click)="addElement()"
                          class="text-xs text-accent font-medium hover:underline">+ Add element</button>
                }
              </div>
            }

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
                  [ngModel]="cfgScale()" (ngModelChange)="cfgScale.set($event)"/>
                <div class="flex justify-between text-[10px] text-gray-400 mt-0.5">
                  <span>Creative</span><span>Strict</span>
                </div>
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
              [disabled]="(!imageUrl() && !selectedFile()) || generating() || !selectedModel() || !hasValidPrompt()">
        @if (generating()) { <span class="animate-spin mr-1">⟳</span> Generating... }
        @else { ✨ Generate }
      </button>
    </div>
  </div>

  <!-- Right panel — output area -->
  <div class="flex-1 p-4 lg:p-6 flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-medium text-gray-600">Video Output</h2>
      <div class="flex items-center gap-3">
        @if (jobStatus()) {
          <app-job-status [status]="jobStatus()!"/>
        }
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

    <!-- Processing status banner -->
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
      <app-media-preview [url]="outputUrl()" product="ImageToVideo"/>
    </div>
  </div>
</div>
  `
})
export class ImageToVideoComponent implements OnInit, OnDestroy {
  @ViewChildren('frontalInput') frontalInputs!: QueryList<ElementRef<HTMLInputElement>>;
  @ViewChildren('refInput') refInputs!: QueryList<ElementRef<HTMLInputElement>>;

  private gen = inject(GenerationService);
  private credits = inject(CreditsService);
  private auth = inject(AuthService);
  private loginModal = inject(LoginModalService);
  private signalR = inject(SignalRService);
  private route = inject(ActivatedRoute);

  modelGroups: ModelGroup[] = [
    {
      id: 'kling',
      name: 'Kling',
      tagline: 'Motion quality leader',
      icon: 'K', iconBg: '#F97316', iconUrl: '/assets/icons/kling.png', tags: ['Multi-Shot', 'Audio', 'End Frame'],
      badge: 'HOT',
      badgeColor: '#EF4444',
      subModels: [
        {
          id: 'fal-ai/kling-video/v3/pro/image-to-video',
          name: 'Kling v3 Pro',
          description: 'Multi-shot, audio, end frame, 3–15s.',
          creditsPerSec: 22,
          badge: 'HOT',
          badgeColor: '#EF4444',
          tags: ['Multi-Shot', 'Audio', 'End Frame', '3–15s'],
          durations: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
          resolutions: [],
          supportsMultiShot: true,
          supportsAudio: true,
          hasAudio: false,
          aspectRatios: ASPECT_RATIOS_169_916_11,
          supportsEndFrame: true,
          supportsNegativePrompt: true,
          supportsCfgScale: true,
          supportsMultiPrompt: true,
          supportsElements: true,
          audioTiers: { noAudio: 17, audio: 25 },
        },
        {
          id: 'fal-ai/kling-video/o3/standard/image-to-video',
          name: 'Kling o3',
          description: 'New architecture — multi-shot, audio, end frame, 3–15s.',
          creditsPerSec: 13,
          badge: 'NEW',
          badgeColor: '#7C3AED',
          tags: ['Multi-Shot', 'Audio', 'End Frame', '3–15s'],
          durations: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
          resolutions: [],
          supportsMultiShot: true,
          supportsAudio: true,
          hasAudio: false,
          aspectRatios: ASPECT_RATIOS_169_916_11,
          supportsEndFrame: true,
          supportsMultiPrompt: true,
          audioTiers: { noAudio: 13, audio: 17 },
        },
        {
          id: 'fal-ai/kling-video/v2.6/pro/image-to-video',
          name: 'Kling v2.6 Pro',
          description: 'Improved realism with audio and end frame.',
          creditsPerSec: 14,
          tags: ['Audio', 'End Frame', '5–10s'],
          durations: [5, 10],
          resolutions: [],
          supportsMultiShot: false,
          supportsAudio: true,
          hasAudio: false,
          aspectRatios: ASPECT_RATIOS_169_916_11,
        },
        {
          id: 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video',
          name: 'Kling v2.5 Turbo',
          description: 'Fastest Kling — end frame, 5–10s.',
          creditsPerSec: 11,
          badge: 'FAST',
          badgeColor: '#2563EB',
          tags: ['Fast', 'End Frame', '5–10s'],
          durations: [5, 10],
          resolutions: [],
          supportsMultiShot: false,
          supportsAudio: false,
          hasAudio: false,
          aspectRatios: ASPECT_RATIOS_169_916_11,
          supportsEndFrame: true,
          supportsNegativePrompt: true,
          supportsCfgScale: true,
        },
      ],
    },
    {
      id: 'hailuo',
      name: 'Hailuo',
      tagline: 'Character consistency expert',
      icon: 'H', iconBg: '#10B981', iconUrl: '/assets/icons/hailuo.png', tags: ['Character AI', 'Pro Quality'],
      badge: 'NEW',
      badgeColor: '#059669',
      subModels: [
        {
          id: 'fal-ai/minimax/hailuo-2.3/pro/image-to-video',
          name: 'Hailuo 2.3 Pro',
          description: 'Latest MiniMax Pro — highest quality character consistency.',
          creditsPerSec: 20,
          badge: 'NEW',
          badgeColor: '#059669',
          tags: ['Pro', 'Character Consistency'],
          durations: [],
          resolutions: [],
          supportsMultiShot: false,
          supportsAudio: false,
          hasAudio: false,
          aspectRatios: [],
        },
        {
          id: 'fal-ai/minimax/hailuo-02/standard/image-to-video',
          name: 'Hailuo 2.0',
          description: 'Dual-resolution image-to-video with end frame.',
          creditsPerSec: 9,
          tags: ['End Frame', '512P / 768P'],
          durations: [6, 10],
          resolutions: ['512P', '768P'],
          supportsMultiShot: false,
          supportsAudio: false,
          hasAudio: false,
          aspectRatios: [],
        },
      ],
    },
    {
      id: 'veo',
      name: 'Google Veo',
      tagline: 'Cinematic realism with audio',
      icon: 'G', iconBg: '#4285F4', iconUrl: '/assets/icons/veo.png', tags: ['Audio', 'Ultra Quality', '4K'],
      subModels: [
        {
          id: 'fal-ai/veo3.1/image-to-video',
          name: 'Veo 3.1',
          description: 'Latest Google Veo — audio + up to 4K resolution.',
          creditsPerSec: 35,
          badge: 'NEW',
          badgeColor: '#1a73e8',
          tags: ['Audio', 'Up to 4K'],
          durations: [4, 6, 8],
          resolutions: ['720p', '1080p', '4k'],
          supportsMultiShot: false,
          supportsAudio: true,
          hasAudio: false,
          aspectRatios: ASPECT_RATIOS_AUTO_169_916,
        },
        {
          id: 'fal-ai/veo3.1/fast/first-last-frame-to-video',
          name: 'Veo 3.1 Fast',
          description: 'Animate between a first & last frame with audio.',
          creditsPerSec: 20,
          badge: 'FAST',
          badgeColor: '#2563EB',
          tags: ['First+Last Frame', 'Audio', 'Up to 4K'],
          durations: [4, 6, 8],
          resolutions: ['720p', '1080p', '4k'],
          supportsMultiShot: false,
          supportsAudio: true,
          hasAudio: false,
          aspectRatios: ASPECT_RATIOS_AUTO_169_916,
          endFrameRequired: true,
        },
        {
          id: 'fal-ai/veo3/fast',
          name: 'Veo 3 Fast',
          description: 'Speed-optimised Veo 3 with audio — lower cost.',
          creditsPerSec: 20,
          badge: 'FAST',
          badgeColor: '#2563EB',
          tags: ['Audio', 'Fast', '720p / 1080p'],
          durations: [4, 6, 8],
          resolutions: ['720p', '1080p'],
          supportsMultiShot: false,
          supportsAudio: true,
          hasAudio: false,
          aspectRatios: ASPECT_RATIOS_AUTO_169_916,
        },
        {
          id: 'fal-ai/veo3/image-to-video',
          name: 'Veo 3',
          description: 'Cinematic realism with synchronized audio.',
          creditsPerSec: 30,
          tags: ['Audio', '720p / 1080p'],
          durations: [4, 6, 8],
          resolutions: ['720p', '1080p'],
          supportsMultiShot: false,
          supportsAudio: true,
          hasAudio: false,
          aspectRatios: ASPECT_RATIOS_AUTO_169_916,
        },
      ],
    },
    {
      id: 'wan',
      name: 'WAN',
      tagline: 'Fast open-source generation',
      icon: 'W', iconBg: '#8B5CF6', iconUrl: '/assets/icons/wan.png', tags: ['Open Source', 'Fast'],
      subModels: [
        {
          id: 'fal-ai/wan/v2.2-a14b/image-to-video',
          name: 'WAN 2.2',
          description: 'Fast open-source model, great for quick previews.',
          creditsPerSec: 5,
          tags: ['Open Source', 'Fast'],
          durations: [5],
          resolutions: [],
          supportsMultiShot: false,
          supportsAudio: false,
          hasAudio: false,
          aspectRatios: ASPECT_RATIOS_169_916_11,
        },
      ],
    },
  ];

  get allModels(): VideoModel[] {
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
        creditsDisplay: `${m.creditsPerSec} cr/s`,
        badge: m.badge,
        badgeColor: m.badgeColor,
        tags: m.tags,
        audioBadge: m.supportsAudio || m.hasAudio,
      } satisfies PickerModel)),
    } satisfies PickerGroup))
  );

  selectedModel = signal<VideoModel | null>(this.modelGroups[0].subModels[0]);

  imageUrl = signal<string>('');
  previewSrc = signal<string>('');
  // End frame (for Veo 3.1 Fast)
  endImageUrl = signal<string>('');
  endPreviewSrc = signal<string>('');
  selectedEndFile = signal<File | null>(null);

  prompt = signal('');
  duration = signal(5);
  resolution = signal<string>('720p');
  multiShot = signal(false);
  generateAudio = signal(true);
  aspectRatio = signal('16:9');
  negativePrompt = '';
  cfgScale = signal(0.5);
  multiPrompts = signal<string[]>(['', '']);
  elements = signal<{
    frontalFile: File | null; frontalPreview: string;
    refFiles: File[]; refPreviews: string[];
  }[]>([]);
  showAdvanced = signal(false);

  generating = signal(false);
  jobStatus = signal<JobStatus | null>(null);
  outputUrl = signal<string | undefined>(undefined);
  errorMsg = signal<string | undefined>(undefined);
  selectedFile = signal<File | null>(null);
  isPublic = signal(true);
  zone = '';

  // Filter durations so each multi-prompt segment gets at least 3s
  availableDurations = computed(() => {
    const m = this.selectedModel();
    if (!m) return [];
    const all = m.durations;
    if (!m.supportsMultiPrompt || !this.multiShot()) return all;
    const minDuration = this.multiPrompts().length * 3;
    const filtered = all.filter(d => d >= minDuration);
    return filtered.length > 0 ? filtered : [all[all.length - 1]];
  });

  hasValidPrompt = computed(() => {
    const m = this.selectedModel();
    if (!m) return false;
    if (m.supportsMultiPrompt && this.multiShot()) {
      // At least 2 segments with non-empty text
      const filled = this.multiPrompts().filter(p => p.trim().length > 0);
      return filled.length >= 2;
    }
    return this.prompt().trim().length > 0;
  });

  costEstimate = computed(() => {
    const m = this.selectedModel();
    if (!m) return 0;
    const dur = m.durations.length > 0 ? this.duration() : 6;
    const res = this.resolution();
    const resMultiplier = m.resolutions.length > 0
      ? (res === '4k' ? 2 : (res === '1080p' || res === '768P') ? 1.5 : 1)
      : 1;
    // Tiered audio pricing
    const crPerSec = m.audioTiers
      ? (this.generateAudio() ? m.audioTiers.audio : m.audioTiers.noAudio)
      : m.creditsPerSec;
    return Math.ceil(crPerSec * dur * resMultiplier);
  });

  private currentJobId: string | null = null;
  private pollInterval?: ReturnType<typeof setInterval>;

  ngOnInit() {
    const qp = this.route.snapshot.queryParams;
    if (qp['model']) {
      const m = this.allModels.find(x => x.id === qp['model']);
      if (m) this.selectModel(m);
    }
    // Restore multi-prompt segments from explore
    if (qp['multiPrompts']) {
      try {
        const segments: string[] = JSON.parse(qp['multiPrompts']);
        if (segments.length >= 2) {
          this.multiShot.set(true);
          this.multiPrompts.set(segments);
          this.clampDuration();
        }
      } catch { /* ignore parse errors */ }
    }
    if (qp['prompt']) this.prompt.set(qp['prompt']);
    // Show output from explore
    if (qp['outputUrl']) this.outputUrl.set(qp['outputUrl']);
  }

  onModelSelect(id: string) {
    const m = this.allModels.find(x => x.id === id);
    if (m) this.selectModel(m);
  }

  selectModel(m: VideoModel) {
    this.selectedModel.set(m);
    this.duration.set(m.durations[0] ?? 6);
    this.resolution.set(m.resolutions[0] ?? '720p');
    if (!m.supportsMultiShot) this.multiShot.set(false);
    if (!m.supportsAudio) this.generateAudio.set(true);
    this.aspectRatio.set(m.aspectRatios[0]?.value ?? '16:9');
    this.showAdvanced.set(false);
    this.negativePrompt = '';
    this.cfgScale.set(0.5);
    this.multiPrompts.set(['', '']);
    this.elements.set([]);
    if (!m.endFrameRequired && !m.supportsEndFrame) {
      this.endImageUrl.set('');
      this.endPreviewSrc.set('');
      this.selectedEndFile.set(null);
    }
  }

  setDuration(d: number) {
    this.duration.set(d);
  }

  onFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.loadFile(file);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) this.loadFile(file);
  }

  addPromptSegment() {
    this.multiPrompts.update(p => [...p, '']);
    this.clampDuration();
  }

  removePromptSegment(i: number) {
    this.multiPrompts.update(p => p.filter((_, idx) => idx !== i));
  }

  /** Ensure selected duration is still valid after segment count changes */
  clampDuration() {
    // Use setTimeout so availableDurations recomputes first
    setTimeout(() => {
      const avail = this.availableDurations();
      if (avail.length > 0 && !avail.includes(this.duration())) {
        this.duration.set(avail[0]);
      }
    });
  }

  updatePromptSegment(i: number, val: string) {
    this.multiPrompts.update(p => p.map((v, idx) => idx === i ? val : v));
  }

  addElement() {
    if (this.elements().length >= 4) return;
    this.elements.update(e => [...e, { frontalFile: null, frontalPreview: '', refFiles: [], refPreviews: [] }]);
  }

  removeElement(i: number) {
    this.elements.update(e => e.filter((_, idx) => idx !== i));
  }

  onFrontalFile(event: Event, elIndex: number) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      this.elements.update(arr => arr.map((el, idx) =>
        idx === elIndex ? { ...el, frontalFile: file, frontalPreview: e.target?.result as string } : el));
    };
    reader.readAsDataURL(file);
  }

  onRefFiles(event: Event, elIndex: number) {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    if (!files.length) return;
    let loaded = 0;
    const previews: string[] = [];
    files.forEach((file, fi) => {
      const reader = new FileReader();
      reader.onload = e => {
        previews[fi] = e.target?.result as string;
        loaded++;
        if (loaded === files.length) {
          this.elements.update(arr => arr.map((el, idx) =>
            idx === elIndex ? {
              ...el,
              refFiles: [...el.refFiles, ...files],
              refPreviews: [...el.refPreviews, ...previews]
            } : el));
        }
      };
      reader.readAsDataURL(file);
    });
  }

  removeRefImage(refIndex: number, elIndex: number) {
    this.elements.update(arr => arr.map((el, idx) =>
      idx === elIndex ? {
        ...el,
        refFiles: el.refFiles.filter((_, ri) => ri !== refIndex),
        refPreviews: el.refPreviews.filter((_, ri) => ri !== refIndex)
      } : el));
  }

  private loadFile(file: File) {
    this.selectedFile.set(file);
    const reader = new FileReader();
    reader.onload = e => this.previewSrc.set(e.target?.result as string);
    reader.readAsDataURL(file);
    this.imageUrl.set('');
  }

  onEndFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.loadEndFile(file);
  }

  onEndDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) this.loadEndFile(file);
  }

  private loadEndFile(file: File) {
    this.selectedEndFile.set(file);
    const reader = new FileReader();
    reader.onload = e => this.endPreviewSrc.set(e.target?.result as string);
    reader.readAsDataURL(file);
    this.endImageUrl.set('');
  }

  generate() {
    if (!this.auth.isLoggedIn()) { this.loginModal.show(); return; }
    if ((!this.imageUrl() && !this.selectedFile()) || this.generating() || !this.selectedModel() || !this.hasValidPrompt()) return;
    const m = this.selectedModel()!;
    if (m.endFrameRequired && !this.endImageUrl() && !this.selectedEndFile()) {
      this.errorMsg.set('Please upload an end frame image for this model.');
      return;
    }

    this.generating.set(true);
    this.jobStatus.set('Queued');
    this.outputUrl.set(undefined);
    this.errorMsg.set(undefined);

    const multiPromptsClean = m.supportsMultiPrompt && this.multiShot()
      ? this.multiPrompts().filter(p => p.trim()) : [];

    const submitWithUrls = (imageUrl: string, endImageUrl?: string,
        elementPayload?: { imageUrl: string; referenceImages: string[] }[]) => {
      this.gen.generateImageToVideo({
        imageUrl,
        endImageUrl: (m.endFrameRequired || m.supportsEndFrame) ? endImageUrl : undefined,
        modelId: m.id,
        prompt: multiPromptsClean.length > 0 ? undefined : (this.prompt() || undefined),
        multiPrompts: multiPromptsClean.length > 0 ? multiPromptsClean : undefined,
        durationSeconds: m.durations.length > 0 ? this.duration() : 6,
        resolution: m.resolutions.length > 0 ? this.resolution() : undefined,
        multiShot: m.supportsMultiShot ? this.multiShot() : undefined,
        generateAudio: m.supportsAudio ? this.generateAudio() : undefined,
        aspectRatio: m.aspectRatios.length ? this.aspectRatio() : undefined,
        isPublic: this.isPublic(),
        zone: this.zone || undefined,
        negativePrompt: m.supportsNegativePrompt && this.negativePrompt.trim() ? this.negativePrompt.trim() : undefined,
        cfgScale: m.supportsCfgScale ? this.cfgScale() : undefined,
        elements: elementPayload?.length ? elementPayload : undefined,
      }).subscribe({
        next: res => {
          this.currentJobId = res.jobId;
          this.credits.reserveLocally(res.creditsReserved);
          this.signalR.trackJob(res.jobId, 'ImageToVideo');
          this.startFallback();
        },
        error: err => {
          this.generating.set(false);
          this.jobStatus.set('Failed');
          this.errorMsg.set(err.error?.error ?? err.error?.detail ?? 'Generation failed.');
        }
      });
    };

    // Upload all element files (frontal + references per element), then callback
    const uploadElements = (cb: (payload: { imageUrl: string; referenceImages: string[] }[]) => void) => {
      const els = this.elements().filter(e => e.frontalFile && e.refFiles.length > 0);
      if (els.length === 0) { cb([]); return; }
      const results: { imageUrl: string; referenceImages: string[] }[] = [];
      const uploadNextElement = (i: number) => {
        if (i >= els.length) { cb(results); return; }
        const el = els[i];
        // Upload frontal first
        this.gen.uploadFile(el.frontalFile!).subscribe({
          next: frontalRes => {
            // Then upload all reference images
            const refUrls: string[] = [];
            const uploadNextRef = (ri: number) => {
              if (ri >= el.refFiles.length) {
                results.push({ imageUrl: frontalRes.url, referenceImages: refUrls });
                uploadNextElement(i + 1);
                return;
              }
              this.gen.uploadFile(el.refFiles[ri]).subscribe({
                next: refRes => { refUrls.push(refRes.url); uploadNextRef(ri + 1); },
                error: () => uploadNextRef(ri + 1) // skip failed ref uploads
              });
            };
            uploadNextRef(0);
          },
          error: () => uploadNextElement(i + 1) // skip element if frontal fails
        });
      };
      uploadNextElement(0);
    };

    const submitWithMainImage = (imageUrl: string) => {
      if ((m.endFrameRequired || m.supportsEndFrame) && this.selectedEndFile()) {
        this.gen.uploadFile(this.selectedEndFile()!).subscribe({
          next: endRes => uploadElements(elUrls => submitWithUrls(imageUrl, endRes.url, elUrls)),
          error: err => {
            this.generating.set(false);
            this.jobStatus.set('Failed');
            this.errorMsg.set(err.error?.error ?? 'End frame upload failed.');
          }
        });
      } else {
        uploadElements(elUrls => submitWithUrls(imageUrl, this.endImageUrl() || undefined, elUrls));
      }
    };

    if (this.selectedFile()) {
      this.gen.uploadFile(this.selectedFile()!).subscribe({
        next: res => { this.imageUrl.set(res.url); submitWithMainImage(res.url); },
        error: err => {
          this.generating.set(false);
          this.jobStatus.set('Failed');
          this.errorMsg.set(err.error?.error ?? 'Upload failed.');
        }
      });
    } else {
      submitWithMainImage(this.imageUrl());
    }
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
    if (status === 'Completed') {
      this.outputUrl.set(url);
      this.credits.loadBalance().subscribe();
    } else {
      this.errorMsg.set(err ?? 'Generation failed.');
      this.credits.loadBalance().subscribe();
    }
  }

  ngOnDestroy() {
    clearInterval(this.pollInterval);
  }
}
