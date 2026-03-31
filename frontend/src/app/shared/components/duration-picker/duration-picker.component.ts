import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-duration-picker',
  standalone: true,
  host: { style: 'display: block' },
  imports: [CommonModule],
  template: `
@if (durations.length > 1) {
  <div>
    <label class="form-label">Duration</label>
    <div class="slider-wrap">
      <div class="slider-track" (click)="onTrackClick($event)">
        <div class="slider-fill" [style.width.%]="fillPercent"></div>
        <div class="slider-thumb" [style.left.%]="fillPercent"
             (mousedown)="onDragStart($event)" (touchstart)="onDragStart($event)"></div>
      </div>
      <div class="slider-labels">
        @for (d of durations; track d; let i = $index) {
          <button type="button" class="slider-label"
                  [class.slider-label--active]="d === value"
                  [style.left.%]="(i / (durations.length - 1)) * 100"
                  (click)="select(d)">
            {{ d }}s
          </button>
        }
      </div>
    </div>
  </div>
} @else if (durations.length === 1) {
  <div>
    <label class="form-label">Duration</label>
    <div class="single-value">{{ durations[0] }}s</div>
  </div>
}
  `,
  styles: [`
    .slider-wrap {
      padding: 12px 0 8px;
      user-select: none;
    }
    .slider-track {
      position: relative;
      height: 6px;
      border-radius: 3px;
      background: #e5e7eb;
      cursor: pointer;
    }
    .slider-fill {
      position: absolute;
      left: 0; top: 0; bottom: 0;
      border-radius: 3px;
      background: var(--color-accent, #6366f1);
      pointer-events: none;
    }
    .slider-thumb {
      position: absolute;
      top: 50%;
      width: 18px; height: 18px;
      border-radius: 50%;
      background: var(--color-accent, #6366f1);
      box-shadow: 0 1px 4px rgba(0,0,0,0.2);
      transform: translate(-50%, -50%);
      cursor: grab;
      z-index: 2;
      transition: transform 0.12s ease;
    }
    .slider-thumb:hover {
      transform: translate(-50%, -50%) scale(1.15);
    }
    .slider-thumb:active {
      cursor: grabbing;
      transform: translate(-50%, -50%) scale(1.2);
    }
    .slider-labels {
      position: relative;
      height: 22px;
      margin-top: 8px;
    }
    .slider-label {
      position: absolute;
      transform: translateX(-50%);
      font-size: 11px;
      color: #9ca3af;
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
    }
    .slider-label:hover {
      color: #6b7280;
    }
    .slider-label--active {
      color: var(--color-accent, #6366f1);
      font-weight: 700;
      font-size: 13px;
    }
    .single-value {
      display: inline-flex;
      align-items: center;
      padding: 6px 16px;
      border-radius: 8px;
      background: var(--color-accent-light, #eef2ff);
      color: var(--color-accent, #6366f1);
      font-size: 14px;
      font-weight: 600;
    }
  `]
})
export class DurationPickerComponent implements OnChanges {
  @Input() durations: number[] = [];
  @Input() value: number = 5;
  @Output() valueChange = new EventEmitter<number>();

  fillPercent = 0;
  private dragging = false;
  private trackEl: HTMLElement | null = null;

  ngOnChanges() {
    if (!this.durations.includes(this.value) && this.durations.length > 0) {
      this.value = this.durations[0];
      this.valueChange.emit(this.value);
    }
    this.updateFill();
  }

  select(d: number) {
    this.value = d;
    this.updateFill();
    this.valueChange.emit(d);
  }

  onTrackClick(event: MouseEvent) {
    this.trackEl = event.currentTarget as HTMLElement;
    this.setFromPointer(event.clientX);
  }

  onDragStart(event: MouseEvent | TouchEvent) {
    event.preventDefault();
    this.dragging = true;
    this.trackEl = (event.target as HTMLElement).parentElement;

    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!this.dragging) return;
      const clientX = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX;
      this.setFromPointer(clientX);
    };
    const onEnd = () => {
      this.dragging = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onMove);
    document.addEventListener('touchend', onEnd);
  }

  private setFromPointer(clientX: number) {
    if (!this.trackEl || this.durations.length < 2) return;
    const rect = this.trackEl.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const idx = Math.round(ratio * (this.durations.length - 1));
    const d = this.durations[idx];
    if (d !== this.value) {
      this.select(d);
    }
  }

  private updateFill() {
    const idx = this.durations.indexOf(this.value);
    this.fillPercent = this.durations.length > 1
      ? (idx / (this.durations.length - 1)) * 100
      : 0;
  }
}
