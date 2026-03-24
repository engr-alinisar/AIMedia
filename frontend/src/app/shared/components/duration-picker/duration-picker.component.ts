import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-duration-picker',
  standalone: true,
  host: { style: 'display: block' },
  imports: [CommonModule],
  template: `
@if (durations.length > 0) {
  <div>
    <label class="form-label">Duration</label>
    <div class="flex gap-2">
      @for (d of durations; track d) {
        <button type="button"
                class="flex-1 py-2 text-sm font-medium rounded-lg border transition-colors"
                [class.border-accent]="value === d"
                [class.bg-accent-light]="value === d"
                [class.text-accent]="value === d"
                [class.border-border]="value !== d"
                [class.text-gray-600]="value !== d"
                (click)="select(d)">
          {{ d }}s
        </button>
      }
    </div>
  </div>
}
  `
})
export class DurationPickerComponent {
  @Input() durations: number[] = [];
  @Input() value: number = 5;
  @Output() valueChange = new EventEmitter<number>();

  select(d: number) {
    this.value = d;
    this.valueChange.emit(d);
  }
}
