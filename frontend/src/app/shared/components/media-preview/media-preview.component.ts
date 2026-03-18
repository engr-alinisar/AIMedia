import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { ProductType } from '../../../core/models/models';

@Component({
  selector: 'app-media-preview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full h-full flex items-center justify-center bg-gray-50 rounded-xl overflow-hidden">
      @if (!url) {
        <div class="text-center text-gray-400">
          <div class="text-4xl mb-2">{{ placeholder }}</div>
          <p class="text-sm">Output will appear here</p>
        </div>
      } @else if (isVideo) {
        <video [src]="url" controls class="max-w-full max-h-full rounded-lg shadow-md" autoplay></video>
      } @else if (isAudio) {
        <div class="w-full px-6">
          <audio [src]="url" controls class="w-full"></audio>
        </div>
      } @else {
        <img [src]="url" alt="Generated output" class="max-w-full max-h-full rounded-lg shadow-md object-contain"/>
      }
    </div>
  `
})
export class MediaPreviewComponent {
  @Input() url?: string;
  @Input() product?: ProductType;

  get isVideo() { return this.product === 'ImageToVideo' || this.product === 'TextToVideo'; }
  get isAudio() { return this.product === 'Voice' || this.product === 'Transcription'; }

  get placeholder() {
    const map: Record<string, string> = {
      ImageGen: '🖼️', ImageToVideo: '🎬', TextToVideo: '🎥',
      Voice: '🔊', Transcription: '📝', BackgroundRemoval: '✂️'
    };
    return map[this.product ?? ''] ?? '🎨';
  }
}
