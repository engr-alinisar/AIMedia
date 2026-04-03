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
import { JobStatusComponent } from '../../shared/components/job-status/job-status.component';
import { type JobStatus } from '../../core/models/models';
import { ModelPickerComponent, type PickerModel, type PickerGroup } from '../../shared/components/model-picker/model-picker.component';

interface TranscriptionModel {
  id: string;
  name: string;
  description: string;
  creditsFlat: number;
  creditsPerMinute?: number;
  badge?: string;
  badgeColor?: string;
  tags: string[];
  hasLanguage?: boolean;
  hasDiarize?: boolean;
  hasTask?: boolean;       // transcribe / translate
  hasTagEvents?: boolean;  // ElevenLabs audio event tagging
}

interface TranscriptionGroup {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  iconBg: string;
  iconUrl?: string;
  tags: string[];
  subModels: TranscriptionModel[];
}

const WHISPER_LANGS = [
  { code: '', label: 'Auto-detect' },
  { code: 'en', label: 'English' }, { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },  { code: 'de', label: 'German' },
  { code: 'it', label: 'Italian' }, { code: 'pt', label: 'Portuguese' },
  { code: 'nl', label: 'Dutch' },   { code: 'pl', label: 'Polish' },
  { code: 'ru', label: 'Russian' }, { code: 'ja', label: 'Japanese' },
  { code: 'zh', label: 'Chinese' }, { code: 'ko', label: 'Korean' },
  { code: 'ar', label: 'Arabic' },  { code: 'hi', label: 'Hindi' },
  { code: 'tr', label: 'Turkish' }, { code: 'sv', label: 'Swedish' },
  { code: 'uk', label: 'Ukrainian' },
];

@Component({
  selector: 'app-transcription',
  standalone: true,
  imports: [CommonModule, FormsModule, JobStatusComponent, ModelPickerComponent],
  template: `
<div class="flex flex-col lg:flex-row lg:h-full">

  <!-- Left panel -->
  <div class="w-full lg:w-[420px] lg:flex-shrink-0 border-b lg:border-b-0 lg:border-r border-border bg-white flex flex-col">
    <div class="px-5 py-4 border-b border-border">
      <h1 class="text-base font-semibold text-gray-900">Audio to Text</h1>
    </div>

    <div class="flex-1 overflow-y-auto px-5 py-4 space-y-5">

      <!-- Model picker -->
      <app-model-picker
        [groups]="pickerGroups()"
        [selectedId]="selectedModel()?.id ?? null"
        (modelSelect)="onModelSelect($event)" />

      <!-- File upload -->
      <div>
        <label class="form-label">Audio / Video File</label>
        <div class="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-accent hover:bg-accent-light/30 transition-colors"
             (click)="fileInput.click()">
          @if (fileName()) {
            <div class="text-sm text-gray-700 font-medium">📎 {{ fileName() }}</div>
            <p class="text-xs text-gray-400 mt-1">Click to change</p>
          } @else {
            <div class="text-gray-400">
              <div class="text-3xl mb-2">🎵</div>
              <p class="text-sm font-medium text-gray-600">Click to upload audio or video</p>
              <p class="text-xs text-gray-400 mt-1">MP3, MP4, WAV, M4A, WebM, OGG</p>
            </div>
          }
          <input #fileInput type="file" accept="audio/*,video/*" class="hidden" (change)="onFile($event)"/>
        </div>
      </div>

      <!-- Or URL -->
      <div>
        <label class="form-label">Or Audio URL</label>
        <input type="url" class="form-input" [(ngModel)]="audioUrl" placeholder="https://..."/>
      </div>

      <!-- Language (Whisper, Wizper, ElevenLabs) -->
      @if (selectedModel()?.hasLanguage) {
        <div>
          <label class="form-label">Language</label>
          <select class="form-select" [(ngModel)]="language">
            @for (l of whisperLangs; track l.code) {
              <option [value]="l.code">{{ l.label }}</option>
            }
          </select>
        </div>
      }

      <!-- Task — Whisper / Wizper -->
      @if (selectedModel()?.hasTask) {
        <div>
          <label class="form-label">Task</label>
          <div class="flex gap-2">
            @for (t of ['transcribe','translate']; track t) {
              <button type="button" (click)="task = t"
                class="flex-1 py-2 text-sm font-medium rounded-lg border transition-colors capitalize"
                [class.border-accent]="task === t"
                [class.bg-accent-light]="task === t"
                [class.text-accent]="task === t"
                [class.border-border]="task !== t"
                [class.text-gray-600]="task !== t">{{ t }}</button>
            }
          </div>
          @if (task === 'translate') {
            <p class="text-xs text-gray-400 mt-1">Translates audio into English text.</p>
          }
        </div>
      }

      <!-- Diarize (Whisper, ElevenLabs) -->
      @if (selectedModel()?.hasDiarize) {
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
          <div>
            <p class="text-sm font-medium text-gray-700">Speaker Diarization</p>
            <p class="text-xs text-gray-400">Label who said what in the transcript</p>
          </div>
          <button type="button" (click)="diarize = !diarize"
                  class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                  [class.bg-accent]="diarize"
                  [class.bg-gray-300]="!diarize">
            <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                  [class.translate-x-6]="diarize"
                  [class.translate-x-1]="!diarize"></span>
          </button>
        </div>
      }

      <!-- Tag Audio Events (ElevenLabs) -->
      @if (selectedModel()?.hasTagEvents) {
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
          <div>
            <p class="text-sm font-medium text-gray-700">Tag Audio Events</p>
            <p class="text-xs text-gray-400">Mark laughter, applause, music, etc.</p>
          </div>
          <button type="button" (click)="tagAudioEvents = !tagAudioEvents"
                  class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                  [class.bg-accent]="tagAudioEvents"
                  [class.bg-gray-300]="!tagAudioEvents">
            <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                  [class.translate-x-6]="tagAudioEvents"
                  [class.translate-x-1]="!tagAudioEvents"></span>
          </button>
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
        <div class="text-right">
          <div class="font-semibold text-gray-900">
            <span class="text-accent">{{ estimatedCredits() }}</span>
            {{ selectedModel()?.creditsPerMinute ? 'credits total' : 'credits / job' }}
          </div>
          @if (selectedModel()?.creditsPerMinute) {
            <div class="text-xs text-gray-400">
              {{ selectedModel()?.creditsPerMinute }} credits / min
              @if (audioDurationLabel()) { <span> • {{ audioDurationLabel() }}</span> }
            </div>
          }
        </div>
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
      <button class="btn-primary w-full" (click)="generate()"
              [disabled]="(!audioFile && !audioUrl.trim()) || generating() || !selectedModel()">
        @if (generating()) { <span class="animate-spin mr-1">⟳</span> Transcribing... }
        @else { 📝 Transcribe }
      </button>
    </div>
  </div>

  <!-- Right panel -->
  <div class="flex-1 p-4 lg:p-6 flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-medium text-gray-600">Transcript</h2>
      <div class="flex items-center gap-2">
        @if (jobStatus()) { <app-job-status [status]="jobStatus()!"/> }
        @if (transcript()) {
          <button type="button" (click)="copyTranscript()"
                  class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
            {{ copied() ? '✓ Copied' : '📋 Copy' }}
          </button>
          <a [href]="downloadUrl()" download="transcript.txt"
             class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors">
            ⬇ Download
          </a>
        }
      </div>
    </div>

    @if (generating() && !transcript()) {
      <div class="flex items-center gap-3 px-4 py-3 bg-accent-light border border-accent/20 rounded-xl">
        <svg class="w-5 h-5 text-accent animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <div>
          <p class="text-sm font-medium text-accent">Transcribing your audio...</p>
          <p class="text-xs text-accent/70">Usually takes 10–60 seconds. You can navigate away — results will be in <a href="/jobs" class="underline">My Jobs</a>.</p>
        </div>
      </div>
    }

    @if (transcript()) {
      <div class="flex-1 lg:min-h-0 card p-5 overflow-y-auto">
        <pre class="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">{{ transcript() }}</pre>
      </div>
    } @else if (!generating()) {
      <div class="flex-1 card flex items-center justify-center text-gray-400 min-h-[280px]">
        <div class="text-center">
          <div class="text-4xl mb-2">📝</div>
          <p class="text-sm">Transcript will appear here</p>
        </div>
      </div>
    }
  </div>
</div>
  `
})
export class TranscriptionComponent implements OnInit, OnDestroy {
  private gen = inject(GenerationService);
  private credits = inject(CreditsService);
  private auth = inject(AuthService);
  private loginModal = inject(LoginModalService);
  private modelCatalog = inject(ModelCatalogService);
  private signalR = inject(SignalRService);
  private route = inject(ActivatedRoute);
  catalog = this.modelCatalog.catalog;
  pricingById = computed(() => new Map(this.catalog().map(item => [item.id, item.displayPrice])));

  readonly whisperLangs = WHISPER_LANGS;

  groups: TranscriptionGroup[] = [
    {
      id: 'whisper', name: 'Whisper', tagline: 'OpenAI Whisper',
      icon: 'W', iconBg: '#7C3AED', iconUrl: undefined,
      tags: ['Open Source', 'Free'],
      subModels: [
        { id: 'fal-ai/whisper', name: 'Whisper Large v3', description: 'OpenAI Whisper large — accurate, multi-language, speaker diarization', creditsFlat: 10, creditsPerMinute: 3, tags: ['Multi-language', 'Diarization'], hasLanguage: true, hasDiarize: true, hasTask: true },
        { id: 'fal-ai/wizper',  name: 'Wizper',           description: 'Optimised Whisper with smart segment merging',                        creditsFlat: 10, creditsPerMinute: 10, tags: ['Fast', 'Segment Merge'],  hasLanguage: true, hasTask: true },
      ]
    },
    {
      id: 'elevenlabs', name: 'ElevenLabs', tagline: 'Scribe',
      icon: 'E', iconBg: '#1A1A1A', iconUrl: undefined,
      tags: ['Premium', 'Speaker ID'],
      subModels: [
        { id: 'fal-ai/elevenlabs/speech-to-text/scribe-v2', name: 'Scribe v2', description: 'Latest ElevenLabs — word-level timestamps, 99 languages, audio event tagging', creditsFlat: 22, creditsPerMinute: 1, badge: 'NEW', badgeColor: '#0EA5E9', tags: ['99 Languages', 'Word Timestamps', 'Speaker ID'], hasLanguage: true, hasDiarize: true, hasTagEvents: true },
        { id: 'fal-ai/elevenlabs/speech-to-text',           name: 'Scribe v1', description: 'ElevenLabs premium transcription with speaker diarization',                    creditsFlat: 18, creditsPerMinute: 5, tags: ['99 Languages', 'Speaker ID'], hasLanguage: true, hasDiarize: true, hasTagEvents: true },
      ]
    },
  ];

  allModels = computed(() => this.groups.flatMap(g => g.subModels));

  pickerGroups = computed<PickerGroup[]>(() =>
    this.groups.map(g => ({
      id: g.id,
      name: g.name,
      tagline: g.tagline,
      icon: g.icon,
      iconBg: g.iconBg,
      iconUrl: g.iconUrl,
      groupTags: g.tags,
      models: g.subModels.map(m => ({
        id: m.id,
        name: m.name,
        description: m.description,
        creditsDisplay: this.pricingById().get(m.id) ?? (m.creditsPerMinute ? `${m.creditsPerMinute} cr/min` : `${m.creditsFlat} cr`),
        badge: m.badge,
        badgeColor: m.badgeColor,
        tags: m.tags,
      } satisfies PickerModel))
    } satisfies PickerGroup))
  );

  selectedModel = signal<TranscriptionModel | null>(this.groups[0].subModels[0]);

  audioUrl  = '';
  audioFile: File | null = null;
  fileName  = signal('');
  audioDurationSeconds = signal<number | null>(null);

  language       = '';
  task           = 'transcribe';
  diarize        = false;
  tagAudioEvents = true;

  generating  = signal(false);
  jobStatus   = signal<JobStatus | null>(null);
  transcript  = signal<string | undefined>(undefined);
  errorMsg    = signal<string | undefined>(undefined);
  isPublic    = signal(true);
  zone        = '';
  copied      = signal(false);

  estimatedCredits = computed(() => {
    const model = this.selectedModel();
    if (!model) return 0;
    if (!model.creditsPerMinute) return model.creditsFlat ?? 0;

    const durationSeconds = this.audioDurationSeconds();
    if (!durationSeconds || durationSeconds <= 0) return model.creditsPerMinute;

    return Math.max(1, Math.round((durationSeconds / 60) * model.creditsPerMinute));
  });

  audioDurationLabel = computed(() => {
    const durationSeconds = this.audioDurationSeconds();
    if (!durationSeconds || durationSeconds <= 0) return '';

    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  });

  downloadUrl = computed(() => {
    const t = this.transcript();
    if (!t) return '#';
    return URL.createObjectURL(new Blob([t], { type: 'text/plain' }));
  });

  private currentJobId: string | null = null;
  private pollInterval?: ReturnType<typeof setInterval>;

  ngOnInit() {
    this.modelCatalog.loadAll();
    const qp = this.route.snapshot.queryParams;
    if (qp['model']) {
      const m = this.allModels().find(x => x.id === qp['model']);
      if (m) this.selectModel(m);
    }
    if (qp['outputUrl']) {
      fetch(qp['outputUrl'])
        .then(r => r.text())
        .then(text => this.transcript.set(text))
        .catch(() => this.transcript.set('(could not load transcript)'));
    }
  }

  onModelSelect(id: string) {
    const m = this.allModels().find(x => x.id === id);
    if (m) this.selectModel(m);
  }

  selectModel(m: TranscriptionModel) {
    this.selectedModel.set(m);
    this.language = '';
    this.task = 'transcribe';
    this.diarize = false;
    this.tagAudioEvents = true;
  }

  onFile(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) {
      this.audioFile = f;
      this.audioUrl = '';
      this.fileName.set(f.name);
      void this.loadAudioDuration(f);
    }
  }

  copyTranscript() {
    const t = this.transcript();
    if (!t) return;
    navigator.clipboard.writeText(t).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  generate() {
    if (!this.auth.isLoggedIn()) { this.loginModal.show(); return; }
    if ((!this.audioFile && !this.audioUrl.trim()) || this.generating() || !this.selectedModel()) return;

    this.generating.set(true);
    this.jobStatus.set('Queued');
    this.transcript.set(undefined);
    this.errorMsg.set(undefined);

    const m = this.selectedModel()!;
    const fd = new FormData();
    if (this.audioFile) fd.append('file', this.audioFile);
    else fd.append('audioUrl', this.audioUrl);
    fd.append('modelId', m.id);
    if (this.audioDurationSeconds()) fd.append('durationSeconds', String(this.audioDurationSeconds()));
    fd.append('isPublic', String(this.isPublic()));
    if (this.zone) fd.append('zone', this.zone);
    if (m.hasLanguage && this.language) fd.append('language', this.language);
    if (m.hasDiarize)    fd.append('diarize', String(this.diarize));
    if (m.hasTask)       fd.append('task', this.task);
    if (m.hasTagEvents)  fd.append('tagAudioEvents', String(this.tagAudioEvents));

    this.gen.generateTranscription(fd).subscribe({
      next: res => {
        this.currentJobId = res.jobId;
        this.credits.reserveLocally(res.creditsReserved);
        this.signalR.trackJob(res.jobId, 'Transcription');
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
    this.pollInterval = setInterval(() => {
      const u = this.signalR.latestUpdate();
      if (u?.jobId === this.currentJobId && (u.status === 'Completed' || u.status === 'Failed')) {
        this.apply(u.status as JobStatus, u.outputUrl, u.errorMessage);
        clearInterval(this.pollInterval);
        return;
      }
      if (!this.currentJobId) return;
      this.gen.getJob(this.currentJobId).subscribe({
        next: j => {
          if (j.status === 'Completed' || j.status === 'Failed') {
            this.apply(j.status, j.outputUrl, j.errorMessage);
            clearInterval(this.pollInterval);
          }
        },
        error: () => {}
      });
    }, 5000);
  }

  private apply(status: JobStatus, url?: string, err?: string) {
    this.jobStatus.set(status);
    this.generating.set(false);
    if (status === 'Completed') {
      if (url) {
        fetch(url)
          .then(r => r.text())
          .then(text => this.transcript.set(text))
          .catch(() => this.transcript.set('(could not load transcript)'));
      } else {
        this.transcript.set('(no transcript returned)');
      }
      this.credits.loadBalance().subscribe();
    } else {
      this.errorMsg.set(err ?? 'Failed.');
      this.credits.loadBalance().subscribe();
    }
  }

  private async loadAudioDuration(file: File) {
    this.audioDurationSeconds.set(null);

    try {
      const duration = await this.readDuration(file);
      this.audioDurationSeconds.set(Math.max(1, Math.round(duration)));
    } catch {
      this.audioDurationSeconds.set(null);
    }
  }

  private readDuration(file: File): Promise<number> {
    return new Promise((resolve, reject) => {
      const media = document.createElement(file.type.startsWith('video/') ? 'video' : 'audio');
      const objectUrl = URL.createObjectURL(file);
      media.preload = 'metadata';
      media.src = objectUrl;

      media.onloadedmetadata = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(media.duration);
      };

      media.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to read media duration.'));
      };
    });
  }

  ngOnDestroy() { clearInterval(this.pollInterval); }
}
