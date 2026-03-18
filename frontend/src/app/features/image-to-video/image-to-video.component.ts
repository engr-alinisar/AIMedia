import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GenerationService } from '../../core/services/generation.service';
import { CreditsService } from '../../core/services/credits.service';

interface VideoModel {
  id: string;
  name: string;
  description: string;
  creditsPerSec: number;
  badge?: string;
  badgeColor?: string;
  tags: string[];
}

@Component({
  selector: 'app-image-to-video',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="flex h-full">
  <!-- Left panel -->
  <div class="w-[420px] flex-shrink-0 border-r border-border bg-white flex flex-col overflow-y-auto">
    <div class="px-5 py-4 border-b border-border">
      <h1 class="text-base font-semibold text-gray-900">Image to Video</h1>
    </div>

    <div class="flex-1 px-5 py-4 space-y-5">

      <!-- Model dropdown -->
      <div>
        <label class="form-label">Model</label>
        <div class="relative">
          <!-- Trigger -->
          <button type="button"
                  class="w-full flex items-center justify-between px-3 py-2.5 bg-white border border-border rounded-lg hover:border-accent transition-colors text-left"
                  (click)="dropdownOpen.set(!dropdownOpen())">
            <div class="flex items-center gap-2 min-w-0">
              <svg class="w-4 h-4 text-accent flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              </svg>
              <span class="text-sm font-medium text-gray-900 truncate">{{ selectedModel()?.name ?? 'Select a model' }}</span>
              @if (selectedModel()?.badge) {
                <span class="px-1.5 py-0.5 text-[10px] font-bold rounded flex-shrink-0"
                      [style.background]="selectedModel()!.badgeColor ?? '#7C3AED'"
                      style="color:white">{{ selectedModel()!.badge }}</span>
              }
            </div>
            <svg class="w-4 h-4 text-gray-400 flex-shrink-0 transition-transform" [class.rotate-180]="dropdownOpen()"
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>

          <!-- Dropdown panel -->
          @if (dropdownOpen()) {
            <div class="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-xl shadow-xl z-50 overflow-hidden max-h-80 overflow-y-auto">
              @for (m of models; track m.id) {
                <div (click)="selectModel(m)"
                     class="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                     [class.bg-accent-light]="selectedModel()?.id === m.id">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="text-sm font-semibold text-gray-900">{{ m.name }}</span>
                      @if (m.badge) {
                        <span class="px-1.5 py-0.5 text-[10px] font-bold rounded"
                              [style.background]="m.badgeColor ?? '#7C3AED'"
                              style="color:white">{{ m.badge }}</span>
                      }
                    </div>
                    <p class="text-xs text-gray-500 mt-0.5">{{ m.description }}</p>
                    <div class="flex gap-1.5 flex-wrap mt-1.5">
                      @for (tag of m.tags; track tag) {
                        <span class="px-2 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded-full">{{ tag }}</span>
                      }
                      <span class="px-2 py-0.5 text-[10px] bg-accent-light text-accent rounded-full font-medium">{{ m.creditsPerSec }} cr/s</span>
                    </div>
                  </div>
                  @if (selectedModel()?.id === m.id) {
                    <svg class="w-4 h-4 text-accent flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                    </svg>
                  }
                </div>
              }
            </div>
          }
        </div>
      </div>

      <!-- Image upload -->
      <div>
        <label class="form-label">Upload Image</label>
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

      <!-- Prompt -->
      <div>
        <label class="form-label">Prompt <span class="text-gray-400 font-normal">(optional)</span></label>
        <textarea class="form-textarea h-24" [(ngModel)]="prompt"
          placeholder="Describe the motion or scene...&#10;Longer prompts work best."
          maxlength="2500"></textarea>
        <p class="text-right text-xs text-gray-400 mt-1">{{ prompt.length }}/2500</p>
      </div>

      <!-- Duration -->
      <div>
        <label class="form-label">Duration: <span class="text-accent font-semibold">{{ duration }}s</span></label>
        <input type="range" [(ngModel)]="duration" min="3" max="10" step="1"
               class="w-full accent-accent" (ngModelChange)="onDurationChange()"/>
        <div class="flex justify-between text-xs text-gray-400 mt-0.5">
          <span>3s</span><span>10s</span>
        </div>
      </div>

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
      <button class="btn-primary w-full" (click)="generate()"
              [disabled]="(!imageUrl() && !selectedFile()) || generating() || !selectedModel()">
        @if (generating()) { <span class="animate-spin mr-1">⟳</span> Submitting... }
        @else { ✨ Generate }
      </button>
    </div>
  </div>

  <!-- Right panel -->
  <div class="flex-1 p-10 flex flex-col items-center justify-center text-center gap-4 text-gray-400">
    <div class="text-6xl">🎬</div>
    <p class="text-base font-medium text-gray-600">How it works</p>
    <div class="max-w-xs space-y-3 text-sm text-left">
      <div class="flex gap-3 items-start">
        <span class="w-6 h-6 rounded-full bg-accent text-white text-xs flex items-center justify-center flex-shrink-0">1</span>
        <span>Select a model, upload an image and set your prompt &amp; duration</span>
      </div>
      <div class="flex gap-3 items-start">
        <span class="w-6 h-6 rounded-full bg-accent text-white text-xs flex items-center justify-center flex-shrink-0">2</span>
        <span>Hit Generate — your job is submitted to the AI model</span>
      </div>
      <div class="flex gap-3 items-start">
        <span class="w-6 h-6 rounded-full bg-accent text-white text-xs flex items-center justify-center flex-shrink-0">3</span>
        <span>You'll be redirected to <strong>My Jobs</strong> — results appear there in 1–3 minutes</span>
      </div>
      <div class="flex gap-3 items-start">
        <span class="w-6 h-6 rounded-full bg-accent text-white text-xs flex items-center justify-center flex-shrink-0">4</span>
        <span>View and download your video once complete</span>
      </div>
    </div>
  </div>
</div>
  `
})
export class ImageToVideoComponent implements OnInit, OnDestroy {
  private gen = inject(GenerationService);
  private credits = inject(CreditsService);
  private router = inject(Router);

  models: VideoModel[] = [
    {
      id: 'fal-ai/kling-video/v3/pro/image-to-video',
      name: 'Kling v3 Pro',
      description: 'Longer, consistent, cinematic AI video generation.',
      creditsPerSec: 18,
      badge: 'HOT',
      badgeColor: '#EF4444',
      tags: ['Multi-Shot', 'Cinematic']
    },
    {
      id: 'fal-ai/kling-video/v2.1/pro/image-to-video',
      name: 'Kling v2.1 Pro',
      description: 'Balanced realism and speed with End Frame support.',
      creditsPerSec: 14,
      tags: ['End Frame', 'Realistic']
    },
    {
      id: 'fal-ai/kling-video/v1.6/pro/image-to-video',
      name: 'Kling v1.6 Pro',
      description: 'Reliable motion with strong prompt adherence.',
      creditsPerSec: 10,
      tags: ['End Frame']
    },
    {
      id: 'fal-ai/minimax/video-01/image-to-video',
      name: 'Hailuo AI (MiniMax)',
      description: 'Master precise motion control with consistent characters.',
      creditsPerSec: 16,
      badge: 'NEW',
      badgeColor: '#7C3AED',
      tags: ['Character Consistency']
    },
    {
      id: 'fal-ai/veo3/image-to-video',
      name: 'Google Veo 3',
      description: 'Cinematic realism with synchronized audio generation.',
      creditsPerSec: 30,
      tags: ['Audio Support', 'Ultra Quality']
    },
    {
      id: 'fal-ai/wan/v2.2-a14b/image-to-video',
      name: 'WAN 2.2',
      description: 'Fast open-source model, great for quick previews.',
      creditsPerSec: 5,
      tags: ['Open Source', 'Fast']
    }
  ];

  selectedModel = signal<VideoModel | null>(this.models[0]);
  dropdownOpen = signal(false);

  imageUrl = signal<string>('');
  previewSrc = signal<string>('');
  prompt = '';
  duration = 5;

  generating = signal(false);
  errorMsg = signal<string | undefined>(undefined);
  selectedFile = signal<File | null>(null);

  costEstimate = signal(this.models[0].creditsPerSec * 5);

  ngOnInit() {
    document.addEventListener('click', this.onDocumentClick);
  }

  private onDocumentClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.relative')) this.dropdownOpen.set(false);
  };

  selectModel(m: VideoModel) {
    this.selectedModel.set(m);
    this.dropdownOpen.set(false);
    this.updateCost();
  }

  onDurationChange() { this.updateCost(); }

  private updateCost() {
    const m = this.selectedModel();
    this.costEstimate.set(m ? m.creditsPerSec * this.duration : 0);
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

  private loadFile(file: File) {
    this.selectedFile.set(file);
    const reader = new FileReader();
    reader.onload = e => this.previewSrc.set(e.target?.result as string);
    reader.readAsDataURL(file);
    this.imageUrl.set('');
  }

  generate() {
    if ((!this.imageUrl() && !this.selectedFile()) || this.generating() || !this.selectedModel()) return;
    this.generating.set(true);
    this.errorMsg.set(undefined);

    const submit = (imageUrl: string) => {
      this.gen.generateImageToVideo({
        imageUrl,
        modelId: this.selectedModel()!.id,
        prompt: this.prompt || undefined,
        durationSeconds: this.duration
      }).subscribe({
        next: res => {
          this.credits.reserveLocally(res.creditsReserved);
          this.router.navigate(['/jobs'], { queryParams: { submitted: '1' } });
        },
        error: err => {
          this.generating.set(false);
          this.errorMsg.set(err.error?.error ?? err.error?.detail ?? 'Generation failed.');
        }
      });
    };

    if (this.selectedFile()) {
      this.gen.uploadFile(this.selectedFile()!).subscribe({
        next: res => { this.imageUrl.set(res.url); submit(res.url); },
        error: err => {
          this.generating.set(false);
          this.errorMsg.set(err.error?.error ?? 'Upload failed.');
        }
      });
    } else {
      submit(this.imageUrl());
    }
  }

  ngOnDestroy() {
    document.removeEventListener('click', this.onDocumentClick);
  }
}
