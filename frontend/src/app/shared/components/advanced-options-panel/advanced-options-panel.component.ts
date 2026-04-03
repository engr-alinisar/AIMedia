import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-advanced-options-panel',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
template: `
<div class="mt-4 rounded-xl border border-border bg-white overflow-hidden">
  <button type="button"
          class="w-full flex items-center justify-between px-4 py-3 bg-gray-50 text-left"
          (click)="toggle()">
    <div>
      <p class="text-sm font-medium text-gray-900">{{ title }}</p>
      @if (subtitle) {
        <p class="text-xs text-gray-400">{{ subtitle }}</p>
      }
    </div>
    <svg class="w-4 h-4 text-gray-400 transition-transform duration-200"
         [class.rotate-180]="open"
         fill="none"
         stroke="currentColor"
         viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
    </svg>
  </button>

  @if (open) {
    <div class="p-4 space-y-4 bg-white">
      <ng-content />
    </div>
  }
</div>
`
})
export class AdvancedOptionsPanelComponent {
  @Input() title = 'Additional Settings';
  @Input() subtitle = '';
  @Input() open = false;
  @Output() openChange = new EventEmitter<boolean>();

  toggle() {
    this.openChange.emit(!this.open);
  }
}
