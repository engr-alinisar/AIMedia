import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { JobStatus } from '../../../core/models/models';

@Component({
  selector: 'app-job-status',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="status-badge status-badge--{{ status.toLowerCase() }}">
      @if (status === 'Queued')     { <span class="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse inline-block"></span> Queued }
      @if (status === 'Processing') { <span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse inline-block"></span> Processing }
      @if (status === 'Completed')  { ✓ Completed }
      @if (status === 'Failed')     { ✕ Failed }
      @if (status === 'Cancelled')  { — Cancelled }
    </span>
  `
})
export class JobStatusComponent {
  @Input() status: JobStatus = 'Queued';
}
