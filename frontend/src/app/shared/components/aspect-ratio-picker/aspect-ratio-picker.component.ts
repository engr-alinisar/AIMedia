import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface AspectRatio { value: string; w: number; h: number; }

/** Standard presets — import alongside the component wherever needed */
export const ASPECT_RATIOS_169_916_11: AspectRatio[] = [
  { value: '16:9', w: 22, h: 13 },
  { value: '9:16', w: 13, h: 22 },
  { value: '1:1',  w: 18, h: 18 },
];

export const ASPECT_RATIOS_169_916: AspectRatio[] = [
  { value: '16:9', w: 22, h: 13 },
  { value: '9:16', w: 13, h: 22 },
];

export const ASPECT_RATIOS_AUTO_169_916: AspectRatio[] = [
  { value: 'auto', w: 18, h: 18 },
  { value: '16:9', w: 22, h: 13 },
  { value: '9:16', w: 13, h: 22 },
];

export const ASPECT_RATIOS_ALL: AspectRatio[] = [
  { value: '16:9', w: 22, h: 13 },
  { value: '9:16', w: 13, h: 22 },
  { value: '1:1',  w: 18, h: 18 },
  { value: '4:3',  w: 20, h: 15 },
];

@Component({
  selector: 'app-aspect-ratio-picker',
  standalone: true,
  host: { style: 'display: block' },
  imports: [CommonModule],
  template: `
@if (ratios.length > 0) {
  <div class="pb-2">
    <label class="form-label">Aspect Ratio</label>
    <div class="grid grid-cols-4 gap-2 md:grid-cols-5 lg:grid-cols-6">
      @for (ar of ratios; track ar.value) {
        <button type="button"
                class="w-full min-w-0 flex flex-col items-center gap-1 py-2 px-1.5 rounded-lg border transition-colors"
                [class.border-accent]="value === ar.value"
                [class.bg-accent-light]="value === ar.value"
                [class.border-border]="value !== ar.value"
                [class.bg-white]="value !== ar.value"
                (click)="select(ar.value)">
          <div class="flex items-center justify-center" style="width:24px;height:24px">
            <div class="rounded border transition-colors"
                 [class.border-accent]="value === ar.value"
                 [class.border-gray-400]="value !== ar.value"
                 [style.width.px]="ar.w"
                 [style.height.px]="ar.h"></div>
          </div>
          <span class="text-[10px] font-medium leading-none"
                [class.text-accent]="value === ar.value"
                [class.text-gray-500]="value !== ar.value">{{ ar.value }}</span>
        </button>
      }
    </div>
  </div>
}
  `
})
export class AspectRatioPickerComponent {
  @Input() ratios: AspectRatio[] = [];
  @Input() value: string = '16:9';
  @Output() valueChange = new EventEmitter<string>();

  select(v: string) {
    this.value = v;
    this.valueChange.emit(v);
  }
}
