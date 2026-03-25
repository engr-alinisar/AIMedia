import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-resolution-picker',
  standalone: true,
  host: { style: 'display: block' },
  imports: [CommonModule],
  template: `
@if (resolutions.length > 0) {
  <div>
    <label class="form-label">Resolution</label>
    <div class="flex gap-2 flex-wrap">
      @for (r of resolutions; track r) {
        <button type="button"
                class="flex-1 py-2 text-sm font-medium rounded-lg border transition-colors"
                [class.border-accent]="value === r"
                [class.bg-accent-light]="value === r"
                [class.text-accent]="value === r"
                [class.border-border]="value !== r"
                [class.text-gray-600]="value !== r"
                (click)="select(r)">
          {{ r.toUpperCase() }}
          @if (premiumResolutions.includes(r)) {
            <span class="ml-1 text-[10px] text-gray-400">+credits</span>
          }
        </button>
      }
    </div>
  </div>
}
  `
})
export class ResolutionPickerComponent {
  @Input() resolutions: string[] = [];
  @Input() value: string = '';
  /** Resolutions that show a "+credits" badge to indicate higher cost */
  @Input() premiumResolutions: string[] = [];
  @Output() valueChange = new EventEmitter<string>();

  select(r: string) {
    this.value = r;
    this.valueChange.emit(r);
  }
}
