import { Component, Input, Output, EventEmitter, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { ExploreItemDto } from '../../../core/models/models';

@Component({
  selector: 'app-explore-item-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="fixed inset-0 z-50 flex items-center justify-center p-4"
     (click)="onBackdropClick($event)">
  <!-- Backdrop -->
  <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>

  <!-- Modal -->
  <div class="modal-panel relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
       (click)="$event.stopPropagation()">

    <!-- Close button -->
    <button (click)="closed.emit()"
            class="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center transition-colors">
      <svg class="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
      </svg>
    </button>

    <!-- Media area -->
    <div class="bg-gray-100 flex-shrink-0" style="max-height: 55vh; overflow: hidden;">
      @if (isVideo()) {
        <video [src]="item!.outputUrl" class="w-full h-full object-contain" controls muted playsinline
               (loadeddata)="safePlay($event)"
               style="max-height: 55vh; display: block;"></video>
      } @else if (isAudio()) {
        <div class="flex flex-col items-center justify-center py-16 bg-gradient-to-br from-purple-50 to-purple-100">
          <div class="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mb-4">
            <svg class="w-10 h-10 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
            </svg>
          </div>
          <audio [src]="item!.outputUrl" controls class="w-64"></audio>
        </div>
      } @else if (isTranscription()) {
        <div class="flex flex-col items-center justify-center py-16 bg-gradient-to-br from-blue-50 to-blue-100">
          <div class="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center">
            <svg class="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>
        </div>
      } @else {
        <img [src]="item!.outputUrl" [alt]="item!.prompt || 'AI generated image'"
             class="w-full object-contain" style="max-height: 55vh; display: block;"/>
      }
    </div>

    <!-- Info area -->
    <div class="p-5 flex flex-col gap-3 overflow-y-auto">
      <!-- Badge + user row -->
      <div class="flex items-center justify-between gap-2">
        <span class="px-2.5 py-1 text-xs font-semibold rounded-full text-white"
              [style.background]="productColor()">{{ productLabel() }}</span>
        @if (item!.userDisplayName) {
          <span class="text-xs text-gray-400">by {{ item!.userDisplayName }}</span>
        }
      </div>

      <!-- Prompt -->
      @if (item!.prompt) {
        <p class="text-sm text-gray-700 leading-relaxed">{{ item!.prompt }}</p>
      } @else {
        <p class="text-sm text-gray-400 italic">{{ noPromptLabel() }}</p>
      }

      <!-- Try this button -->
      <button (click)="tryThis.emit(item!)"
              class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
              style="background:#7c3aed;">
        Try this yourself
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/>
        </svg>
      </button>
    </div>
  </div>
</div>
  `
})
export class ExploreItemModalComponent implements OnInit, OnDestroy {
  @Input() item!: ExploreItemDto;
  @Output() closed = new EventEmitter<void>();
  @Output() tryThis = new EventEmitter<ExploreItemDto>();

  ngOnInit() {
    document.body.style.overflow = 'hidden';
  }

  ngOnDestroy() {
    document.body.style.overflow = '';
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('fixed')) {
      this.closed.emit();
    }
  }

  isVideo(): boolean {
    return this.item?.product === 'ImageToVideo' || this.item?.product === 'TextToVideo';
  }

  isAudio(): boolean {
    return this.item?.product === 'Voice';
  }

  isTranscription(): boolean {
    return this.item?.product === 'Transcription';
  }

  productLabel(): string {
    const labels: Record<string, string> = {
      ImageGen: 'Image Gen', ImageToVideo: 'Img → Video', TextToVideo: 'Text → Video',
      Voice: 'Voice', Transcription: 'Transcript', BackgroundRemoval: 'BG Removal',
    };
    return labels[this.item?.product] ?? this.item?.product;
  }

  productColor(): string {
    const colors: Record<string, string> = {
      ImageGen: '#7C3AED', ImageToVideo: '#EF4444', TextToVideo: '#F97316',
      Voice: '#059669', Transcription: '#2563EB', BackgroundRemoval: '#0891B2',
    };
    return colors[this.item?.product] ?? '#6B7280';
  }

  noPromptLabel(): string {
    const labels: Record<string, string> = {
      Voice: 'Text-to-speech output', Transcription: 'Audio to Text output',
      BackgroundRemoval: 'Background removed', ImageToVideo: 'Image animated to video',
    };
    return labels[this.item?.product] ?? 'AI generated content';
  }

  safePlay(event: Event) {
    (event.target as HTMLVideoElement).play().catch(() => {});
  }
}
