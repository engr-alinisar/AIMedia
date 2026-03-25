import { Component, Input, Output, EventEmitter, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';

// ─── Shared Types ───────────────────────────────────────────────────────────

export interface PickerModel {
  id: string;
  name: string;
  description: string;
  creditsDisplay: string;   // e.g. "18 cr/s" or "5 credits"
  badge?: string;
  badgeColor?: string;
  tags: string[];
  audioBadge?: boolean;     // show 🔊 Audio badge
}

export interface PickerGroup {
  id: string;
  name: string;
  tagline: string;
  icon: string;             // single letter fallback when no iconUrl
  iconBg: string;           // background color for letter fallback
  iconUrl?: string;         // optional logo image URL (preferred over letter)
  groupTags: string[];      // feature tags shown in the group row
  badge?: string;
  badgeColor?: string;
  models: PickerModel[];
}

// ─── Component ──────────────────────────────────────────────────────────────

@Component({
  selector: 'app-model-picker',
  standalone: true,
  host: { style: 'display: block' },
  imports: [CommonModule],
  template: `
<div>
  <label class="form-label">Model</label>
  <button #modelBtn type="button"
          class="w-full flex items-center justify-between px-3 py-2.5 bg-white border border-border rounded-lg hover:border-accent transition-colors text-left"
          (click)="toggleDropdown()">
    <div class="flex items-center gap-2 min-w-0">
      @if (selectedEntry()?.group) {
        @if (selectedEntry()!.group!.iconUrl) {
          <img [src]="selectedEntry()!.group!.iconUrl" alt="" class="w-6 h-6 rounded-full flex-shrink-0 object-contain bg-white border border-gray-100 p-0.5">
        } @else {
          <div class="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-[10px]"
               [style.background]="selectedEntry()!.group!.iconBg">{{ selectedEntry()!.group!.icon }}</div>
        }
      } @else {
        <svg class="w-4 h-4 text-accent flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
        </svg>
      }
      <span class="text-sm font-medium text-gray-900 truncate">{{ selectedEntry() ? selectedEntry()!.model.name : 'Select a model' }}</span>
      @if (selectedEntry()?.model?.badge) {
        <span class="px-1.5 py-0.5 text-[10px] font-bold rounded flex-shrink-0"
              [style.background]="selectedEntry()!.model.badgeColor ?? '#7C3AED'"
              style="color:white">{{ selectedEntry()!.model.badge }}</span>
      }
    </div>
    <svg class="w-4 h-4 text-gray-400 flex-shrink-0 transition-transform" [class.rotate-180]="open()"
         fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
    </svg>
  </button>

  @if (open()) {
    <!-- Backdrop -->
    <div class="fixed inset-0 z-40" (click)="close()"></div>

    <!-- Main panel (fixed position — escapes overflow-y:auto clipping) -->
    <div class="fixed z-50 bg-white border border-border rounded-xl shadow-2xl overflow-y-auto"
         [style.top.px]="(rect()?.bottom ?? 0) + 4"
         [style.left.px]="rect()?.left ?? 0"
         [style.width.px]="rect()?.width ?? 380"
         style="max-height: 360px;">

      @if (groupsList().length > 0) {
        <!-- ── Grouped mode ── -->
        @for (group of groupsList(); track group.id) {
          <div class="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-gray-50 last:border-0"
               [class.bg-accent-light]="hovered()?.id === group.id"
               (mouseenter)="hasFlyoutSpace() && hovered.set(group)"
               (click)="onGroupClick(group)">
            @if (group.iconUrl) {
              <img [src]="group.iconUrl" alt="" class="w-9 h-9 rounded-full flex-shrink-0 object-contain bg-white border border-gray-100 p-1">
            } @else {
              <div class="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-sm"
                   [style.background]="group.iconBg">{{ group.icon }}</div>
            }
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-semibold text-gray-900">{{ group.name }}</span>
                @if (group.badge) {
                  <span class="px-1.5 py-0.5 text-[9px] font-bold rounded"
                        [style.background]="group.badgeColor" style="color:white">{{ group.badge }}</span>
                }
              </div>
              <p class="text-xs text-gray-500 mt-0.5">{{ group.tagline }}</p>
              <div class="flex gap-1 flex-wrap mt-1">
                @for (tag of group.groupTags; track tag) {
                  <span class="px-1.5 py-0.5 text-[9px] bg-gray-100 text-gray-600 rounded-full">{{ tag }}</span>
                }
              </div>
            </div>
            @if (group.models.length > 1) {
              <svg class="w-4 h-4 flex-shrink-0 transition-transform"
                   [class.rotate-90]="!hasFlyoutSpace() && hovered()?.id === group.id"
                   [class.text-accent]="hovered()?.id === group.id"
                   [class.text-gray-400]="hovered()?.id !== group.id"
                   fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            }
          </div>
          <!-- Mobile accordion -->
          @if (!hasFlyoutSpace() && hovered()?.id === group.id && group.models.length > 1) {
            @for (m of group.models; track m.id) {
              <div class="flex items-center gap-3 pl-14 pr-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors border-t border-gray-50"
                   [class.bg-accent-light]="currentId() === m.id"
                   (click)="selectModel(m.id)">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-sm font-medium text-gray-900">{{ m.name }}</span>
                    @if (m.badge) {
                      <span class="px-1.5 py-0.5 text-[9px] font-bold rounded"
                            [style.background]="m.badgeColor ?? '#7C3AED'" style="color:white">{{ m.badge }}</span>
                    }
                    @if (m.audioBadge) {
                      <span class="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-green-100 text-green-700">🔊</span>
                    }
                  </div>
                  <div class="flex gap-1 flex-wrap mt-0.5">
                    @for (tag of m.tags.slice(0,3); track tag) {
                      <span class="px-1.5 py-0.5 text-[9px] bg-gray-100 text-gray-600 rounded-full">{{ tag }}</span>
                    }
                    <span class="px-1.5 py-0.5 text-[9px] bg-accent-light text-accent rounded-full font-medium">{{ m.creditsDisplay }}</span>
                  </div>
                </div>
                @if (currentId() === m.id) {
                  <svg class="w-4 h-4 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                  </svg>
                }
              </div>
            }
          }
        }
      } @else {
        <!-- ── Flat mode ── -->
        @for (m of modelsList(); track m.id) {
          <div class="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
               [class.bg-accent-light]="currentId() === m.id"
               (click)="selectModel(m.id)">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-semibold text-gray-900">{{ m.name }}</span>
                @if (m.badge) {
                  <span class="px-1.5 py-0.5 text-[10px] font-bold rounded"
                        [style.background]="m.badgeColor ?? '#7C3AED'" style="color:white">{{ m.badge }}</span>
                }
                @if (m.audioBadge) {
                  <span class="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-green-100 text-green-700">🔊 Audio</span>
                }
              </div>
              <p class="text-xs text-gray-500 mt-0.5">{{ m.description }}</p>
              <div class="flex gap-1.5 flex-wrap mt-1">
                @for (tag of m.tags; track tag) {
                  <span class="px-2 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded-full">{{ tag }}</span>
                }
                <span class="px-2 py-0.5 text-[10px] bg-accent-light text-accent rounded-full font-medium">{{ m.creditsDisplay }}</span>
              </div>
            </div>
            @if (currentId() === m.id) {
              <svg class="w-4 h-4 text-accent flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
              </svg>
            }
          </div>
        }
      }
    </div>

    <!-- Desktop flyout (only in grouped mode when there's space) -->
    @if (hasFlyoutSpace() && hovered() && hovered()!.models.length > 1) {
      <div class="fixed z-50 bg-white border border-border rounded-xl shadow-2xl overflow-y-auto"
           [style.top.px]="(rect()?.bottom ?? 0) + 4"
           [style.left.px]="(rect()?.right ?? 0) + 8"
           style="width: 288px; max-height: 360px;">
        @for (m of hovered()!.models; track m.id) {
          <div class="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
               [class.bg-accent-light]="currentId() === m.id"
               (click)="selectModel(m.id)">
            @if (hovered()!.iconUrl) {
              <img [src]="hovered()!.iconUrl" alt="" class="w-8 h-8 rounded-full flex-shrink-0 object-contain bg-white border border-gray-100 p-1 mt-0.5">
            } @else {
              <div class="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-xs mt-0.5"
                   [style.background]="hovered()!.iconBg">{{ hovered()!.icon }}</div>
            }
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-sm font-semibold text-gray-900">{{ m.name }}</span>
                @if (m.badge) {
                  <span class="px-1.5 py-0.5 text-[9px] font-bold rounded"
                        [style.background]="m.badgeColor ?? '#7C3AED'" style="color:white">{{ m.badge }}</span>
                }
                @if (m.audioBadge) {
                  <span class="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-green-100 text-green-700">🔊 Audio</span>
                }
              </div>
              <p class="text-xs text-gray-500 mt-0.5 leading-snug">{{ m.description }}</p>
              <div class="flex gap-1 flex-wrap mt-1">
                @for (tag of m.tags; track tag) {
                  <span class="px-1.5 py-0.5 text-[9px] bg-gray-100 text-gray-600 rounded-full">{{ tag }}</span>
                }
                <span class="px-1.5 py-0.5 text-[9px] bg-accent-light text-accent rounded-full font-medium">{{ m.creditsDisplay }}</span>
              </div>
            </div>
            @if (currentId() === m.id) {
              <svg class="w-4 h-4 text-accent flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
              </svg>
            }
          </div>
        }
      </div>
    }
  }
</div>
  `
})
export class ModelPickerComponent {
  @ViewChild('modelBtn') modelBtn!: ElementRef<HTMLButtonElement>;

  // ── Inputs ──
  @Input() set groups(v: PickerGroup[]) { this._groups.set(v); }
  @Input() set models(v: PickerModel[]) { this._models.set(v); }
  @Input() set selectedId(v: string | null) { this._selectedId.set(v ?? null); }

  // ── Output ──
  @Output() modelSelect = new EventEmitter<string>();

  // ── Private signals ──
  private _groups = signal<PickerGroup[]>([]);
  private _models = signal<PickerModel[]>([]);
  private _selectedId = signal<string | null>(null);

  // ── Public computed (template-facing aliases) ──
  groupsList = computed(() => this._groups());
  modelsList = computed(() => this._models());
  currentId = computed(() => this._selectedId());

  selectedEntry = computed(() => {
    const id = this._selectedId();
    for (const g of this._groups()) {
      const m = g.models.find(m => m.id === id);
      if (m) return { model: m, group: g };
    }
    const m = this._models().find(m => m.id === id);
    return m ? { model: m, group: null } : null;
  });

  // ── Dropdown state ──
  open = signal(false);
  rect = signal<{ bottom: number; left: number; width: number; right: number; winW: number } | null>(null);
  hovered = signal<PickerGroup | null>(null);

  hasFlyoutSpace = computed(() => {
    const r = this.rect();
    return r ? (r.winW - r.right) >= 300 : false;
  });

  // ── Methods ──
  toggleDropdown() {
    if (!this.open()) {
      const r = this.modelBtn.nativeElement.getBoundingClientRect();
      this.rect.set({ bottom: r.bottom, left: r.left, width: r.width, right: r.right, winW: window.innerWidth });
      const current = this._groups().find(g => g.models.some(m => m.id === this._selectedId()));
      this.hovered.set(current ?? this._groups()[0] ?? null);
    }
    this.open.update(v => !v);
  }

  close() {
    this.open.set(false);
    this.hovered.set(null);
  }

  onGroupClick(group: PickerGroup) {
    if (group.models.length === 1) {
      this.selectModel(group.models[0].id);
    } else if (!this.hasFlyoutSpace()) {
      this.hovered.set(this.hovered()?.id === group.id ? null : group);
    }
  }

  selectModel(id: string) {
    this.modelSelect.emit(id);
    this.close();
  }
}
