import { Component, signal, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VoiceCloneService, VoiceCloneDto } from '../../../core/services/voice-clone.service';

type AudioTab = 'upload' | 'record';
type RecordState = 'idle' | 'recording' | 'recorded';

@Component({
  selector: 'app-clone-voice-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<!-- Backdrop -->
<div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" (click)="onBackdropClick($event)">
  <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">

    <!-- Header -->
    <div class="px-6 pt-6 pb-4 border-b border-gray-100">
      <h2 class="text-lg font-bold text-gray-900">Clone a Voice</h2>
      <p class="text-sm text-gray-500 mt-0.5">Provide a clear audio sample and its transcript to create your cloned voice.</p>
    </div>

    <div class="px-6 py-5 space-y-5">

      <!-- Voice Name -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">
          Voice Name <span class="text-red-500">*</span>
        </label>
        <input type="text" [(ngModel)]="voiceName" maxlength="60"
               class="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
               placeholder="e.g. My Voice, John Narrator"/>
      </div>

      <!-- Description -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">
          Description <span class="text-xs text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea [(ngModel)]="description" rows="2" maxlength="200"
                  class="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors resize-none"
                  placeholder="What is this voice for?"></textarea>
      </div>

      <!-- Audio Sample -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">
          Audio Sample <span class="text-red-500">*</span>
          <span class="font-normal text-gray-400 ml-1">— upload a file or record with your mic</span>
        </label>

        <!-- Tab toggle -->
        <div class="grid grid-cols-2 gap-3 mb-3">
          <button type="button" (click)="audioTab = 'upload'"
                  class="flex flex-col items-center gap-1.5 py-3 px-4 border-2 rounded-xl transition-colors"
                  [class.border-accent]="audioTab === 'upload'"
                  [class.bg-accent-light]="audioTab === 'upload'"
                  [class.border-gray-200]="audioTab !== 'upload'">
            <svg class="w-5 h-5" [class.text-accent]="audioTab === 'upload'" [class.text-gray-400]="audioTab !== 'upload'"
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
            </svg>
            <span class="text-xs font-medium" [class.text-accent]="audioTab === 'upload'" [class.text-gray-600]="audioTab !== 'upload'">Upload File</span>
            <span class="text-[10px] text-gray-400">MP3, WAV, M4A, OGG</span>
          </button>

          <button type="button" (click)="audioTab = 'record'"
                  class="flex flex-col items-center gap-1.5 py-3 px-4 border-2 rounded-xl transition-colors"
                  [class.border-accent]="audioTab === 'record'"
                  [class.bg-accent-light]="audioTab === 'record'"
                  [class.border-gray-200]="audioTab !== 'record'">
            <svg class="w-5 h-5" [class.text-accent]="audioTab === 'record'" [class.text-gray-400]="audioTab !== 'record'"
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/>
            </svg>
            <span class="text-xs font-medium" [class.text-accent]="audioTab === 'record'" [class.text-gray-600]="audioTab !== 'record'">Record Audio</span>
            <span class="text-[10px] text-gray-400">Use your microphone</span>
          </button>
        </div>

        <!-- Upload tab -->
        @if (audioTab === 'upload') {
          @if (!audioFile()) {
            <label class="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-accent hover:bg-accent-light/30 transition-colors">
              <input type="file" class="hidden" accept="audio/*" (change)="onFileSelected($event)">
              <svg class="w-7 h-7 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
              </svg>
              <span class="text-sm font-medium text-gray-600">Drop your audio file here, or browse</span>
              <span class="text-xs text-gray-400 mt-0.5">MP3, WAV, M4A, OGG — up to 25MB</span>
            </label>
          } @else {
            <div class="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
              <svg class="w-7 h-7 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
              </svg>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-green-800 truncate">{{ audioFile()!.name }}</p>
                <p class="text-xs text-green-600">{{ formatBytes(audioFile()!.size) }}</p>
              </div>
              <button type="button" (click)="clearAudio()" class="p-1 hover:bg-green-100 rounded text-green-600">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          }
        }

        <!-- Record tab -->
        @if (audioTab === 'record') {
          <div class="flex flex-col items-center gap-3 py-4 border-2 border-dashed border-gray-200 rounded-xl">
            @if (recordState === 'idle') {
              <button type="button" (click)="startRecording()"
                      class="flex items-center gap-2 px-5 py-2.5 bg-red-500 text-white rounded-full text-sm font-medium hover:bg-red-600 transition-colors">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="8"/>
                </svg>
                Start Recording
              </button>
              <p class="text-xs text-gray-400">Click to start recording from your microphone</p>
            } @else if (recordState === 'recording') {
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
                <span class="text-sm font-medium text-red-600">Recording... {{ recordingTime() }}s</span>
              </div>
              <button type="button" (click)="stopRecording()"
                      class="flex items-center gap-2 px-5 py-2.5 bg-gray-700 text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="4" y="4" width="16" height="16" rx="2"/>
                </svg>
                Stop Recording
              </button>
            } @else if (recordState === 'recorded') {
              <div class="flex items-center gap-3 w-full px-4">
                <svg class="w-6 h-6 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <div class="flex-1">
                  <p class="text-sm font-medium text-gray-800">Recording captured ({{ recordingTime() }}s)</p>
                  <audio [src]="recordedAudioUrl()!" controls class="w-full mt-1 h-8"></audio>
                </div>
                <button type="button" (click)="resetRecording()" class="text-xs text-gray-500 hover:text-red-500 underline">Re-record</button>
              </div>
            }

            @if (recordError()) {
              <p class="text-xs text-red-600">{{ recordError() }}</p>
            }
          </div>
        }
      </div>

      <!-- Reference Text -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">
          Reference Text <span class="text-red-500">*</span>
        </label>

        <!-- Info box -->
        <div class="flex gap-2.5 p-3 bg-blue-50 border border-blue-200 rounded-lg mb-2">
          <svg class="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <div class="text-xs text-blue-700 space-y-1">
            <p class="font-semibold">Reference Text must match your audio exactly</p>
            <p>Type the <strong>exact words</strong> you speak in your recording — word for word, punctuation included. The AI uses the audio + text together to learn your voice. A mismatch will produce incorrect or robotic output.</p>
            <p class="italic">Example: if you recorded "Hello, my name is Alex and I love building great software." — paste that exact sentence here.</p>
          </div>
        </div>

        <textarea [(ngModel)]="referenceText" rows="3" maxlength="500" spellcheck="true"
                  class="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors resize-none"
                  placeholder="Type exactly what is spoken in your audio sample..."></textarea>
        <p class="text-xs text-gray-400 mt-0.5">Paste the exact transcript of your audio. This helps the AI align the voice style accurately.</p>
      </div>

      <!-- Tips -->
      <div class="p-3.5 bg-yellow-50 border border-yellow-200 rounded-xl">
        <p class="text-xs font-semibold text-yellow-800 mb-1.5">Tips for best results</p>
        <ul class="text-xs text-yellow-700 space-y-1 list-disc list-inside">
          <li>Use a clear, quiet recording with minimal background noise</li>
          <li>Speak for at least 10–30 seconds naturally</li>
          <li>The Reference Text must match <strong>exactly</strong> what you say</li>
          <li>Avoid whispering, shouting, or long pauses</li>
        </ul>
      </div>

      <!-- Error -->
      @if (error()) {
        <div class="p-3 bg-red-50 border border-red-300 rounded-lg text-sm text-red-700">{{ error() }}</div>
      }
    </div>

    <!-- Footer -->
    <div class="px-6 pb-6 flex items-center gap-3">
      <button type="button" (click)="submit()" [disabled]="saving()"
              class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-accent text-white rounded-xl font-medium text-sm hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
        @if (saving()) {
          <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          Uploading & saving...
        } @else {
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line stroke-linecap="round" stroke-linejoin="round" stroke-width="2" x1="12" y1="19" x2="12" y2="23"/>
            <line stroke-linecap="round" stroke-linejoin="round" stroke-width="2" x1="8" y1="23" x2="16" y2="23"/>
          </svg>
          Clone Voice
        }
      </button>
      <button type="button" (click)="cancel.emit()"
              class="px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
        Cancel
      </button>
    </div>

  </div>
</div>
  `
})
export class CloneVoiceModalComponent {
  private voiceCloneSvc = inject(VoiceCloneService);

  cancel = output<void>();
  created = output<VoiceCloneDto>();

  // Form fields
  voiceName = '';
  description = '';
  referenceText = '';

  // Audio
  audioTab: AudioTab = 'upload';
  audioFile = signal<File | null>(null);

  // Recording
  recordState: RecordState = 'idle';
  recordingTime = signal(0);
  recordedAudioUrl = signal<string | null>(null);
  recordError = signal<string | null>(null);

  private mediaRecorder?: MediaRecorder;
  private recordedChunks: Blob[] = [];
  private recordTimerInterval?: ReturnType<typeof setInterval>;

  saving = signal(false);
  error = signal<string | null>(null);

  onBackdropClick(e: MouseEvent) {
    if ((e.target as HTMLElement) === e.currentTarget) this.cancel.emit();
  }

  onFileSelected(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.error.set(null);
    this.audioFile.set(file);
  }

  clearAudio() {
    this.audioFile.set(null);
  }

  async startRecording() {
    this.recordError.set(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.recordedChunks = [];
      this.mediaRecorder = new MediaRecorder(stream);
      this.mediaRecorder.ondataavailable = e => { if (e.data.size > 0) this.recordedChunks.push(e.data); };
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        const file = new File([blob], 'recording.webm', { type: 'audio/webm' });
        this.audioFile.set(file);
        this.recordedAudioUrl.set(URL.createObjectURL(blob));
        this.recordState = 'recorded';
        stream.getTracks().forEach(t => t.stop());
      };
      this.mediaRecorder.start();
      this.recordState = 'recording';
      this.recordingTime.set(0);
      this.recordTimerInterval = setInterval(() => this.recordingTime.update(t => t + 1), 1000);
    } catch {
      this.recordError.set('Microphone access denied. Please allow microphone permission.');
    }
  }

  stopRecording() {
    clearInterval(this.recordTimerInterval);
    this.mediaRecorder?.stop();
  }

  resetRecording() {
    this.recordState = 'idle';
    this.audioFile.set(null);
    this.recordedAudioUrl.set(null);
    this.recordingTime.set(0);
    this.recordedChunks = [];
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  submit() {
    this.error.set(null);

    if (!this.voiceName.trim()) { this.error.set('Voice name is required.'); return; }
    if (!this.audioFile()) { this.error.set('Please upload or record an audio sample.'); return; }
    if (!this.referenceText.trim()) { this.error.set('Reference text is required.'); return; }

    this.saving.set(true);
    this.voiceCloneSvc.create(
      this.voiceName.trim(),
      this.description.trim(),
      this.referenceText.trim(),
      this.audioFile()!
    ).subscribe({
      next: clone => {
        this.saving.set(false);
        this.created.emit(clone);
      },
      error: err => {
        this.saving.set(false);
        this.error.set(err.error?.error ?? 'Failed to save voice clone. Please try again.');
      }
    });
  }
}
