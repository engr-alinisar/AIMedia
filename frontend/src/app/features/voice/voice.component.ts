import { Component, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { GenerationService } from '../../core/services/generation.service';
import { CreditsService } from '../../core/services/credits.service';
import { SignalRService } from '../../core/services/signalr.service';
import { AuthService } from '../../core/auth/auth.service';
import { LoginModalService } from '../../core/services/login-modal.service';
import { ModelCatalogService } from '../../core/services/model-catalog.service';
import { VoiceCloneService, VoiceCloneDto } from '../../core/services/voice-clone.service';
import { CloneVoiceModalComponent } from '../../shared/components/clone-voice-modal/clone-voice-modal.component';
import { MediaPreviewComponent } from '../../shared/components/media-preview/media-preview.component';
import { JobStatusComponent } from '../../shared/components/job-status/job-status.component';
import { type JobStatus } from '../../core/models/models';
import { ModelPickerComponent, type PickerModel, type PickerGroup } from '../../shared/components/model-picker/model-picker.component';

interface VoiceOption { id: string; name: string; }

interface VoiceModel {
  id: string;
  name: string;
  description: string;
  creditsPerKChars: number;
  badge?: string;
  badgeColor?: string;
  tags: string[];
  requiresAudioSample?: boolean;
  voices?: VoiceOption[];
  hasSpeed?: boolean;
  hasStability?: boolean;
  hasSimilarityBoost?: boolean;
  hasVoiceStyle?: boolean;
  hasLanguageCode?: boolean;
  hasMiniMaxParams?: boolean;   // pitch, vol, emotion
}

interface VoiceGroup {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  iconBg: string;
  iconUrl?: string;
  tags: string[];
  badge?: string;
  subModels: VoiceModel[];
}

// ── Voice lists ─────────────────────────────────────────────────────────────
const KOKORO_EN_US: VoiceOption[] = [
  {id:'af_heart',name:'Heart (Female)'},{id:'af_alloy',name:'Alloy (Female)'},{id:'af_aoede',name:'Aoede (Female)'},
  {id:'af_bella',name:'Bella (Female)'},{id:'af_jessica',name:'Jessica (Female)'},{id:'af_kore',name:'Kore (Female)'},
  {id:'af_nicole',name:'Nicole (Female)'},{id:'af_nova',name:'Nova (Female)'},{id:'af_river',name:'River (Female)'},
  {id:'af_sarah',name:'Sarah (Female)'},{id:'af_sky',name:'Sky (Female)'},
  {id:'am_adam',name:'Adam (Male)'},{id:'am_echo',name:'Echo (Male)'},{id:'am_eric',name:'Eric (Male)'},
  {id:'am_fenrir',name:'Fenrir (Male)'},{id:'am_liam',name:'Liam (Male)'},{id:'am_michael',name:'Michael (Male)'},
  {id:'am_onyx',name:'Onyx (Male)'},{id:'am_puck',name:'Puck (Male)'},{id:'am_santa',name:'Santa (Male)'},
];
const KOKORO_EN_GB: VoiceOption[] = [
  {id:'bf_alice',name:'Alice (Female)'},{id:'bf_emma',name:'Emma (Female)'},{id:'bf_isabella',name:'Isabella (Female)'},
  {id:'bf_lily',name:'Lily (Female)'},{id:'bm_daniel',name:'Daniel (Male)'},{id:'bm_fable',name:'Fable (Male)'},
  {id:'bm_george',name:'George (Male)'},{id:'bm_lewis',name:'Lewis (Male)'},
];
const KOKORO_ES: VoiceOption[] = [
  {id:'ef_dora',name:'Dora (Female)'},{id:'em_alex',name:'Alex (Male)'},{id:'em_santa',name:'Santa (Male)'},
];
const KOKORO_FR: VoiceOption[] = [{id:'ff_siwis',name:'Siwis (Female)'}];
const KOKORO_JA: VoiceOption[] = [
  {id:'jf_alpha',name:'Alpha (Female)'},{id:'jf_gongitsune',name:'Gongitsune (Female)'},{id:'jf_nezumi',name:'Nezumi (Female)'},
  {id:'jf_tebukuro',name:'Tebukuro (Female)'},{id:'jm_kumo',name:'Kumo (Male)'},
];
const KOKORO_PT: VoiceOption[] = [
  {id:'pf_dora',name:'Dora (Female)'},{id:'pm_alex',name:'Alex (Male)'},{id:'pm_santa',name:'Santa (Male)'},
];
const KOKORO_HI: VoiceOption[] = [
  {id:'hf_alpha',name:'Alpha (Female)'},{id:'hf_beta',name:'Beta (Female)'},{id:'hm_omega',name:'Omega (Male)'},{id:'hm_psi',name:'Psi (Male)'},
];
const KOKORO_ZH: VoiceOption[] = [
  {id:'zf_xiaobei',name:'Xiaobei (Female)'},{id:'zf_xiaoni',name:'Xiaoni (Female)'},{id:'zf_xiaoxiao',name:'Xiaoxiao (Female)'},
  {id:'zf_xiaoyi',name:'Xiaoyi (Female)'},{id:'zm_yunjian',name:'Yunjian (Male)'},{id:'zm_yunxi',name:'Yunxi (Male)'},
  {id:'zm_yunxia',name:'Yunxia (Male)'},{id:'zm_yunyang',name:'Yunyang (Male)'},
];
const KOKORO_IT: VoiceOption[] = [{id:'if_sara',name:'Sara (Female)'},{id:'im_nicola',name:'Nicola (Male)'}];

const MINIMAX_VOICES: VoiceOption[] = [
  {id:'Wise_Woman',name:'Wise Woman (Female)'},{id:'Friendly_Person',name:'Friendly Person (Neutral)'},
  {id:'Inspirational_girl',name:'Inspirational Girl (Female)'},{id:'Deep_Voice_Man',name:'Deep Voice Man (Male)'},
  {id:'Calm_Woman',name:'Calm Woman (Female)'},{id:'Casual_Guy',name:'Casual Guy (Male)'},
  {id:'Lively_Girl',name:'Lively Girl (Female)'},{id:'Patient_Man',name:'Patient Man (Male)'},
  {id:'Young_Knight',name:'Young Knight (Male)'},{id:'Determined_Man',name:'Determined Man (Male)'},
  {id:'Lovely_Girl',name:'Lovely Girl (Female)'},{id:'Decent_Boy',name:'Decent Boy (Male)'},
  {id:'Imposing_Manner',name:'Imposing Manner (Male)'},{id:'Elegant_Man',name:'Elegant Man (Male)'},
  {id:'Abbess',name:'Abbess (Female)'},{id:'Sweet_Girl_2',name:'Sweet Girl (Female)'},
  {id:'Exuberant_Girl',name:'Exuberant Girl (Female)'},
];

const ELEVENLABS_VOICES: VoiceOption[] = [
  {id:'Aria',name:'Aria'},{id:'Roger',name:'Roger'},{id:'Sarah',name:'Sarah'},{id:'Laura',name:'Laura'},
  {id:'Charlie',name:'Charlie'},{id:'George',name:'George'},{id:'Callum',name:'Callum'},{id:'River',name:'River'},
  {id:'Liam',name:'Liam'},{id:'Charlotte',name:'Charlotte'},{id:'Alice',name:'Alice'},{id:'Matilda',name:'Matilda'},
  {id:'Will',name:'Will'},{id:'Jessica',name:'Jessica'},{id:'Eric',name:'Eric'},{id:'Chris',name:'Chris'},
  {id:'Brian',name:'Brian'},{id:'Daniel',name:'Daniel'},{id:'Lily',name:'Lily'},{id:'Bill',name:'Bill'},
];

@Component({
  selector: 'app-voice',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MediaPreviewComponent, JobStatusComponent, CloneVoiceModalComponent, ModelPickerComponent],
  template: `
<div class="flex flex-col lg:flex-row lg:h-full">
  <div class="w-full lg:w-[420px] lg:flex-shrink-0 border-b lg:border-b-0 lg:border-r border-border bg-white flex flex-col">
    <div class="px-5 py-4 border-b border-border">
      <h1 class="text-base font-semibold text-gray-900">Text to Audio</h1>
    </div>

    <div class="flex-1 overflow-y-auto px-5 py-4 space-y-5">

      <!-- Model dropdown -->
      <app-model-picker
        [groups]="pickerGroups()"
        [selectedId]="selectedModel()?.id ?? null"
        (modelSelect)="onModelSelect($event)" />

      <!-- Voice clone hint -->
      @if (!selectedModel()?.requiresAudioSample) {
        <div class="flex items-center gap-2.5 px-3 py-2.5 bg-green-50 border border-green-200 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
             (click)="selectModelById('fal-ai/f5-tts')">
          <span class="text-lg flex-shrink-0">🎤</span>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold text-green-800">Want to clone your own voice?</p>
            <p class="text-xs text-green-600">Select <strong>F5-TTS</strong> to upload a voice sample.</p>
          </div>
          <svg class="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
        </div>
      }

      <!-- Title -->
      <div>
        <label class="form-label">Title <span class="text-gray-400 font-normal">(optional)</span></label>
        <input type="text" class="form-input" [(ngModel)]="title"
          placeholder="e.g. My Meditation Audio..." maxlength="120" />
      </div>

      <!-- Text -->
      <div>
        <label class="form-label">Text</label>
        <textarea class="form-textarea h-40" [(ngModel)]="text" (ngModelChange)="onTextChange($event)"
          spellcheck="true" lang="en" autocorrect="on" autocapitalize="sentences"
          placeholder="Enter the text to convert to speech..." maxlength="5000"></textarea>
        <p class="text-right text-xs text-gray-400 mt-1">{{ text.length }}/5000</p>
      </div>

      <!-- Voice selector -->
      @if (!selectedModel()?.requiresAudioSample && selectedModel()?.voices?.length) {
        <div>
          <label class="form-label">Voice</label>
          <select class="form-select" [(ngModel)]="voiceId">
            @for (v of selectedModel()!.voices!; track v.id) {
              <option [value]="v.id">{{ v.name }}</option>
            }
          </select>
        </div>
      }

      <!-- Speed (Kokoro + ElevenLabs) -->
      @if (selectedModel()?.hasSpeed) {
        <div>
          <label class="form-label">Speed — <span class="text-accent font-semibold">{{ speed().toFixed(1) }}×</span></label>
          <input type="range" class="w-full accent-accent"
            [min]="selectedModel()?.hasStability ? 0.7 : 0.1"
            [max]="selectedModel()?.hasStability ? 1.2 : 5.0"
            step="0.1"
            [value]="speed()"
            (input)="speed.set(+$any($event.target).value)" />
          <div class="flex justify-between text-[10px] text-gray-400 mt-0.5">
            <span>{{ selectedModel()?.hasStability ? '0.7×' : '0.1×' }}</span>
            <span>Normal</span>
            <span>{{ selectedModel()?.hasStability ? '1.2×' : '5.0×' }}</span>
          </div>
        </div>
      }

      <!-- Stability -->
      @if (selectedModel()?.hasStability) {
        <div>
          <div>
            <label class="form-label">Stability — <span class="text-accent font-semibold">{{ stability().toFixed(2) }}</span></label>
            <input type="range" class="w-full accent-accent" min="0" max="1" step="0.05"
              [value]="stability()" (input)="stability.set(+$any($event.target).value)" />
            <div class="flex justify-between text-[10px] text-gray-400 mt-0.5">
              <span>More Variable</span><span>More Stable</span>
            </div>
          </div>
          @if (selectedModel()?.hasSimilarityBoost) {
            <div class="mt-4">
              <label class="form-label">Similarity Boost — <span class="text-accent font-semibold">{{ similarityBoost().toFixed(2) }}</span></label>
              <input type="range" class="w-full accent-accent" min="0" max="1" step="0.05"
                [value]="similarityBoost()" (input)="similarityBoost.set(+$any($event.target).value)" />
            </div>
          }
          @if (selectedModel()?.hasVoiceStyle) {
            <div class="mt-4">
              <label class="form-label">Style Exaggeration — <span class="text-accent font-semibold">{{ voiceStyle().toFixed(2) }}</span></label>
              <input type="range" class="w-full accent-accent" min="0" max="1" step="0.05"
                [value]="voiceStyle()" (input)="voiceStyle.set(+$any($event.target).value)" />
            </div>
          }
        </div>
      }

      <!-- Language Code (ElevenLabs Multilingual) -->
      @if (selectedModel()?.hasLanguageCode) {
        <div>
          <label class="form-label">Language Code <span class="text-gray-400 font-normal">(optional)</span></label>
          <input type="text" class="form-input" [(ngModel)]="languageCode"
            placeholder="e.g. en, es, fr, de, ja..." maxlength="5" />
          <p class="text-xs text-gray-400 mt-1">ISO 639-1 code to enforce a specific language.</p>
        </div>
      }

      <!-- MiniMax params: Pitch, Volume, Emotion -->
      @if (selectedModel()?.hasMiniMaxParams) {
        <div class="space-y-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
          <p class="text-xs font-semibold text-gray-600 uppercase tracking-wide">Voice Controls</p>
          <div>
            <label class="form-label">Pitch — <span class="text-accent font-semibold">{{ pitch() > 0 ? '+' : '' }}{{ pitch() }}</span></label>
            <input type="range" class="w-full accent-accent" min="-12" max="12" step="1"
              [value]="pitch()" (input)="pitch.set(+$any($event.target).value)" />
            <div class="flex justify-between text-[10px] text-gray-400 mt-0.5"><span>-12</span><span>0</span><span>+12</span></div>
          </div>
          <div>
            <label class="form-label">Volume — <span class="text-accent font-semibold">{{ vol().toFixed(1) }}</span></label>
            <input type="range" class="w-full accent-accent" min="0" max="10" step="0.5"
              [value]="vol()" (input)="vol.set(+$any($event.target).value)" />
            <div class="flex justify-between text-[10px] text-gray-400 mt-0.5"><span>0</span><span>1 (normal)</span><span>10</span></div>
          </div>
          <div>
            <label class="form-label">Emotion <span class="text-gray-400 font-normal">(optional)</span></label>
            <div class="flex flex-wrap gap-2">
              @for (e of ['','happy','sad','angry','fearful','disgusted','surprised','neutral']; track e) {
                <button type="button" (click)="emotion.set(e)"
                  class="px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors capitalize"
                  [class.border-accent]="emotion() === e"
                  [class.bg-accent-light]="emotion() === e"
                  [class.text-accent]="emotion() === e"
                  [class.border-border]="emotion() !== e"
                  [class.text-gray-600]="emotion() !== e">{{ e || 'Auto' }}</button>
              }
            </div>
          </div>
        </div>
      }


      <!-- Saved voice clones (F5-TTS) -->
      @if (selectedModel()?.requiresAudioSample) {
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="form-label mb-0">Your Voice Clones</label>
            <button type="button" (click)="openCloneModal()"
                    class="flex items-center gap-1.5 px-2.5 py-1 bg-accent text-white text-xs font-medium rounded-lg hover:bg-accent/90 transition-colors">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              Clone a Voice
            </button>
          </div>

          @if (loadingClones()) {
            <div class="flex items-center gap-2 py-4 text-gray-400 text-sm">
              <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Loading your voices...
            </div>
          } @else if (voiceClones().length === 0) {
            <div class="flex flex-col items-center py-6 border-2 border-dashed border-border rounded-xl text-center">
              <span class="text-2xl mb-1">🎤</span>
              <p class="text-sm font-medium text-gray-600">No voice clones yet</p>
              <p class="text-xs text-gray-400 mt-0.5">Click "+ Clone a Voice" above to get started</p>
            </div>
          } @else {
            <div class="space-y-2">
              @for (clone of voiceClones(); track clone.id) {
                <div (click)="selectClone(clone)"
                     class="flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors"
                     [class.border-accent]="selectedCloneId() === clone.id"
                     [class.bg-accent-light]="selectedCloneId() === clone.id"
                     [class.border-border]="selectedCloneId() !== clone.id">
                  <div class="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <span class="text-white text-sm font-bold">{{ clone.name[0].toUpperCase() }}</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-gray-900 truncate">{{ clone.name }}</p>
                    @if (clone.description) {
                      <p class="text-xs text-gray-500 truncate">{{ clone.description }}</p>
                    } @else {
                      <p class="text-xs text-gray-400">{{ (clone.referenceText ?? '').slice(0, 40) }}...</p>
                    }
                  </div>
                  @if (selectedCloneId() === clone.id) {
                    <svg class="w-4 h-4 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                    </svg>
                  }
                  <button type="button" (click)="deleteClone(clone.id, $event)"
                          class="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
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
        <div class="text-right">
          <div class="font-semibold text-gray-900">
            <span class="text-accent">{{ costEstimate() }}</span> credits total
          </div>
          <div class="text-xs text-gray-400">
            {{ selectedModel()?.creditsPerKChars ?? 4 }} credits / 1K chars
          </div>
        </div>
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
        <!-- Zone -->
        <select [(ngModel)]="zone"
                class="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent">
          <option value="">Zone (optional)</option>
          <option value="Narration">🎙️ Narration</option>
          <option value="Podcast">🎧 Podcast</option>
          <option value="Character Voice">🎭 Character Voice</option>
          <option value="Storytelling">📖 Storytelling</option>
          <option value="Kids">🧒 Kids</option>
          <option value="Meditation">🧘 Meditation</option>
          <option value="News">📰 News</option>
          <option value="Entertainment">🎉 Entertainment</option>
        </select>

      }

      <button class="btn-primary w-full" (click)="generate()" [disabled]="!canGenerate()">
        @if (generating()) { <span class="animate-spin mr-1">⟳</span> Generating... }
        @else { 🎙️ Generate Voice }
      </button>
    </div>
  </div>

  <!-- Right panel -->
  <div class="flex-1 p-4 lg:p-6 flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-medium text-gray-600">Audio Output</h2>
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
          <p class="text-sm font-medium text-accent">Generating your audio...</p>
          <p class="text-xs text-accent/70">Usually takes 10–30 seconds. You can navigate away — results will be in <a routerLink="/jobs" class="underline">My Jobs</a>.</p>
        </div>
      </div>
    }
    <div class="h-[200px] sm:h-[280px] lg:h-auto lg:flex-1 lg:min-h-0 card overflow-hidden">
      <app-media-preview [url]="outputUrl()" product="Voice"/>
    </div>
  </div>
</div>

@if (showCloneModal()) {
  <app-clone-voice-modal
    (cancel)="showCloneModal.set(false)"
    (created)="onCloneCreated($event)"/>
}
  `
})
export class VoiceComponent implements OnInit, OnDestroy {
  private gen = inject(GenerationService);
  private credits = inject(CreditsService);
  private auth = inject(AuthService);
  private loginModal = inject(LoginModalService);
  private modelCatalog = inject(ModelCatalogService);
  private signalR = inject(SignalRService);
  private voiceCloneSvc = inject(VoiceCloneService);
  private route = inject(ActivatedRoute);
  catalog = this.modelCatalog.catalog;
  pricingById = computed(() => new Map(this.catalog().map(item => [item.id, item.displayPrice])));

  // ── model groups ──────────────────────────────────────────────────
  groups: VoiceGroup[] = [
    {
      id: 'kokoro', name: 'Kokoro', tagline: 'Open Source TTS',
      icon: 'K', iconBg: '#7C3AED', iconUrl: '/assets/icons/kokoro.png',
      tags: ['Open Source', 'Free'],
      subModels: [
        { id: 'fal-ai/kokoro/american-english',   name: 'American English',   description: '20 voices — female & male US accents', creditsPerKChars: 4, tags: ['20 Voices', 'Free'], hasSpeed: true, voices: KOKORO_EN_US },
        { id: 'fal-ai/kokoro/british-english',    name: 'British English',    description: '8 voices — British accents',           creditsPerKChars: 4, tags: ['8 Voices', 'Free'],  hasSpeed: true, voices: KOKORO_EN_GB },
        { id: 'fal-ai/kokoro/spanish',            name: 'Spanish',            description: '3 Spanish language voices',            creditsPerKChars: 4, tags: ['3 Voices', 'Free'],  hasSpeed: true, voices: KOKORO_ES },
        { id: 'fal-ai/kokoro/french',             name: 'French',             description: '1 French language voice',             creditsPerKChars: 4, tags: ['1 Voice', 'Free'],   hasSpeed: true, voices: KOKORO_FR },
        { id: 'fal-ai/kokoro/japanese',           name: 'Japanese',           description: '5 Japanese language voices',          creditsPerKChars: 4, tags: ['5 Voices', 'Free'],  hasSpeed: true, voices: KOKORO_JA },
        { id: 'fal-ai/kokoro/brazilian-portuguese', name: 'Brazilian Portuguese', description: '3 Brazilian Portuguese voices',   creditsPerKChars: 4, tags: ['3 Voices', 'Free'],  hasSpeed: true, voices: KOKORO_PT },
        { id: 'fal-ai/kokoro/hindi',              name: 'Hindi',              description: '4 Hindi language voices',             creditsPerKChars: 4, tags: ['4 Voices', 'Free'],  hasSpeed: true, voices: KOKORO_HI },
        { id: 'fal-ai/kokoro/mandarin-chinese',   name: 'Mandarin Chinese',   description: '8 Mandarin Chinese voices',           creditsPerKChars: 4, tags: ['8 Voices', 'Free'],  hasSpeed: true, voices: KOKORO_ZH },
        { id: 'fal-ai/kokoro/italian',            name: 'Italian',            description: '2 Italian language voices',           creditsPerKChars: 4, tags: ['2 Voices', 'Free'],  hasSpeed: true, voices: KOKORO_IT },
      ]
    },
    {
      id: 'elevenlabs', name: 'ElevenLabs', tagline: 'Professional TTS',
      icon: 'E', iconBg: '#1A1A1A', iconUrl: undefined,
      tags: ['Professional', 'Expressive'],
      subModels: [
        { id: 'fal-ai/elevenlabs/tts/eleven-v3',        name: 'Eleven v3',          description: 'Latest ElevenLabs — superior expressiveness', creditsPerKChars: 15, badge: 'NEW', badgeColor: '#0EA5E9', tags: ['Latest', 'Expressive'], hasSpeed: true, hasStability: true, voices: ELEVENLABS_VOICES },
        { id: 'fal-ai/elevenlabs/tts/turbo-v2.5',       name: 'Turbo v2.5',         description: 'Fast ElevenLabs with high quality',           creditsPerKChars: 8, tags: ['Fast', 'High Quality'], hasSpeed: true, hasStability: true, hasSimilarityBoost: true, hasVoiceStyle: true, voices: ELEVENLABS_VOICES },
        { id: 'fal-ai/elevenlabs/tts/multilingual-v2',  name: 'Multilingual v2',    description: '29 languages with natural speech',            creditsPerKChars: 15, tags: ['29 Languages', 'Multilingual'], hasSpeed: true, hasStability: true, hasSimilarityBoost: true, hasVoiceStyle: true, hasLanguageCode: true, voices: ELEVENLABS_VOICES },
      ]
    },
    {
      id: 'minimax', name: 'MiniMax', tagline: 'MiniMax Speech',
      icon: 'M', iconBg: '#059669', iconUrl: '/assets/icons/minimax.svg',
      tags: ['HD Quality', 'Expressive'],
      subModels: [
        { id: 'fal-ai/minimax/speech-2.8-hd',            name: 'Speech 2.8 HD',    description: 'Latest MiniMax HD — emotion, pitch & volume control', creditsPerKChars: 15, badge: 'NEW', badgeColor: '#0EA5E9', tags: ['Latest', 'HD'], hasMiniMaxParams: true, hasSpeed: true, voices: MINIMAX_VOICES },
      ]
    },
    {
      id: 'f5tts', name: 'F5-TTS', tagline: 'Voice Cloning',
      icon: 'F', iconBg: '#059669', iconUrl: '/assets/icons/f5tts.svg',
      tags: ['Voice Cloning', 'Custom'],
      subModels: [
        { id: 'fal-ai/f5-tts', name: 'F5-TTS', description: 'Clone any voice from a 15–30s audio sample', creditsPerKChars: 15, badge: 'CLONE', badgeColor: '#059669', tags: ['Voice Cloning', 'Custom Voice'], requiresAudioSample: true },
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
        creditsDisplay: this.pricingById().get(m.id) ?? `${m.creditsPerKChars} cr/1K chars`,
        badge: m.badge,
        badgeColor: m.badgeColor,
        tags: m.tags,
      } satisfies PickerModel))
    } satisfies PickerGroup))
  );

  costEstimate = computed(() => {
    const model = this.selectedModel();
    if (!model) return 0;

    const charCount = Math.max(1, this.textLength());
    const units = Math.ceil(charCount / 1000);
    return model.creditsPerKChars * units;
  });

  allModels = computed(() => this.groups.flatMap(g => g.subModels));

  selectedModel = signal<VoiceModel | null>(this.groups[0].subModels[0]);

  text         = '';
  private textLength = signal(0);
  voiceId      = 'af_heart';
  languageCode = '';

  speed           = signal(1.0);
  stability       = signal(0.5);
  similarityBoost = signal(0.75);
  voiceStyle      = signal(0.0);
  pitch           = signal(0);
  vol             = signal(1.0);
  emotion         = signal('');

  title = '';

  generating  = signal(false);
  jobStatus   = signal<JobStatus | null>(null);
  outputUrl   = signal<string | undefined>(undefined);
  errorMsg    = signal<string | undefined>(undefined);
  isPublic    = signal(true);
  zone        = '';

  showCloneModal  = signal(false);
  voiceClones     = signal<VoiceCloneDto[]>([]);
  loadingClones   = signal(false);
  selectedCloneId = signal<string | null>(null);

  private currentJobId: string | null = null;
  private pollInterval?: ReturnType<typeof setInterval>;

  canGenerate() {
    const m = this.selectedModel();
    if (!this.generating() && !m) return false;
    if (this.generating()) return false;
    if (m?.requiresAudioSample && !this.selectedCloneId()) return false;
    if (!this.text.trim()) return false;
    return true;
  }

  ngOnInit() {
    this.modelCatalog.loadAll();
    const qp = this.route.snapshot.queryParams;
    if (qp['prompt']) this.text = qp['prompt'];
    this.textLength.set(this.text.length);
    if (qp['model']) this.selectModelById(qp['model']);
  }

  onModelSelect(id: string) { this.selectModelById(id); }

  onTextChange(value: string) {
    this.textLength.set(value.length);
  }

  selectModelById(id: string) {
    const m = this.allModels().find(x => x.id === id);
    if (m) this.selectModel(m);
  }

  selectModel(m: VoiceModel) {
    this.selectedModel.set(m);
    this.voiceId = m.voices?.[0]?.id ?? 'af_heart';
    this.speed.set(1.0);
    this.stability.set(0.5);
    this.similarityBoost.set(0.75);
    this.voiceStyle.set(0.0);
    this.pitch.set(0);
    this.vol.set(1.0);
    this.emotion.set('');
    this.languageCode = '';
    if (m.requiresAudioSample && this.auth.isLoggedIn()) this.loadClones();
  }

  loadClones() {
    this.loadingClones.set(true);
    this.voiceCloneSvc.list().subscribe({
      next: clones => { this.voiceClones.set(clones); this.loadingClones.set(false); },
      error: () => this.loadingClones.set(false)
    });
  }

  openCloneModal() {
    if (!this.auth.isLoggedIn()) {
      this.loginModal.show();
      return;
    }

    this.showCloneModal.set(true);
  }

  selectClone(clone: VoiceCloneDto) { this.selectedCloneId.set(clone.id); }

  onCloneCreated(clone: VoiceCloneDto) {
    this.voiceClones.update(list => [clone, ...list]);
    this.selectedCloneId.set(clone.id);
    this.showCloneModal.set(false);
  }

  deleteClone(id: string, e: MouseEvent) {
    e.stopPropagation();
    if (!confirm('Delete this voice clone?')) return;
    this.voiceCloneSvc.delete(id).subscribe({
      next: () => {
        this.voiceClones.update(list => list.filter(c => c.id !== id));
        if (this.selectedCloneId() === id) this.selectedCloneId.set(null);
      }
    });
  }

  generate() {
    if (!this.auth.isLoggedIn()) { this.loginModal.show(); return; }
    if (!this.canGenerate()) return;
    this.generating.set(true);
    this.jobStatus.set('Queued');
    this.outputUrl.set(undefined);
    this.errorMsg.set(undefined);
    const m = this.selectedModel()!;

    this.gen.generateVoice({
      text:             this.text,
      modelId:          m.id,
      voiceId:          m.requiresAudioSample ? undefined : this.voiceId,
      voiceCloneId:     m.requiresAudioSample ? (this.selectedCloneId() ?? undefined) : undefined,
      isPublic:         this.isPublic(),
      zone:             this.zone || undefined,
      title:            this.title.trim() || undefined,
      speed:            m.hasSpeed ? this.speed() : undefined,
      stability:        m.hasStability ? this.stability() : undefined,
      similarityBoost:  m.hasSimilarityBoost ? this.similarityBoost() : undefined,
      voiceStyle:       m.hasVoiceStyle ? this.voiceStyle() : undefined,
      languageCode:     m.hasLanguageCode && this.languageCode ? this.languageCode : undefined,
      pitch:            m.hasMiniMaxParams && this.pitch() !== 0 ? this.pitch() : undefined,
      vol:              m.hasMiniMaxParams && this.vol() !== 1.0 ? this.vol() : undefined,
      emotion:          m.hasMiniMaxParams && this.emotion() ? this.emotion() : undefined,
    }).subscribe({
      next: res => {
        this.currentJobId = res.jobId;
        this.credits.reserveLocally(res.creditsReserved);
        this.signalR.trackJob(res.jobId, 'Voice');
        this.startFallback();
      },
      error: err => { this.generating.set(false); this.jobStatus.set('Failed'); this.errorMsg.set(err.error?.error ?? 'Failed.'); }
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
