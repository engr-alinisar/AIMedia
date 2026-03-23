import { Component, computed, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FaqService } from '../../core/services/faq.service';
import type { FaqItemDto } from '../../core/models/models';

interface FaqGroup {
  category: string;
  items: FaqItemDto[];
}

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    .faq-item {
      border: 1px solid #e5e7eb;
      border-radius: 0.75rem;
      overflow: hidden;
      transition: box-shadow 0.15s;
    }
    .faq-item:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .faq-question {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      width: 100%;
      padding: 1rem 1.25rem;
      text-align: left;
      background: white;
      border: none;
      cursor: pointer;
      font-size: 0.9375rem;
      font-weight: 500;
      color: #111827;
      transition: background 0.15s;
    }
    .faq-question:hover { background: #f9fafb; }
    .faq-answer {
      padding: 0 1.25rem 1rem;
      font-size: 0.9rem;
      color: #4b5563;
      line-height: 1.65;
      background: white;
      border-top: 1px solid #f3f4f6;
    }
    .chevron {
      flex-shrink: 0;
      width: 1.25rem;
      height: 1.25rem;
      color: #9ca3af;
      transition: transform 0.2s;
    }
    .chevron.open { transform: rotate(180deg); }
    .search-input {
      width: 100%;
      padding: 0.625rem 1rem 0.625rem 2.75rem;
      border: 1px solid #e5e7eb;
      border-radius: 0.75rem;
      font-size: 0.9375rem;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
      background: white;
    }
    .search-input:focus {
      border-color: #7c3aed;
      box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
    }
  `],
  template: `
<div class="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
  <div>
    <h1 class="text-xl font-semibold text-gray-900">Frequently Asked Questions</h1>
    <p class="text-sm text-gray-500 mt-1">Find answers to common questions about credits, payments, and AI models.</p>
  </div>

  <!-- Search -->
  <div class="relative">
    <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
         fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
    </svg>
    <input class="search-input"
           type="text"
           placeholder="Search questions..."
           [(ngModel)]="searchQuery"
           (ngModelChange)="onSearchChange($event)" />
  </div>

  <!-- Loading -->
  @if (loading()) {
    <div class="flex justify-center py-12">
      <div class="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
    </div>
  }

  <!-- Error -->
  @if (error()) {
    <div class="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
      <span class="text-lg">&#10060;</span>
      <span>Failed to load FAQ. Please refresh the page.</span>
    </div>
  }

  <!-- No results -->
  @if (!loading() && !error() && filteredGroups().length === 0 && searchTerm().length > 0) {
    <div class="text-center py-12 text-gray-400">
      <div class="text-4xl mb-3">&#128269;</div>
      <p class="font-medium text-gray-600">No results found</p>
      <p class="text-sm mt-1">Try a different search term.</p>
    </div>
  }

  <!-- FAQ Groups -->
  @for (group of filteredGroups(); track group.category) {
    <section class="space-y-2">
      <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-widest px-1">{{ group.category }}</h2>
      <div class="space-y-2">
        @for (item of group.items; track item.id) {
          <div class="faq-item">
            <button class="faq-question" (click)="toggle(item.id)">
              <span>{{ item.question }}</span>
              <svg class="chevron" [class.open]="isOpen(item.id)"
                   fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
            @if (isOpen(item.id)) {
              <div class="faq-answer">{{ item.answer }}</div>
            }
          </div>
        }
      </div>
    </section>
  }
</div>
  `
})
export class FaqComponent implements OnInit {
  private faqService = inject(FaqService);
  private destroyRef = inject(DestroyRef);

  loading = signal(true);
  error = signal(false);
  private allItems = signal<FaqItemDto[]>([]);
  searchTerm = signal('');
  searchQuery = '';
  private openIds = signal<Set<number>>(new Set());

  filteredGroups = computed<FaqGroup[]>(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const items = term
      ? this.allItems().filter(
          i => i.question.toLowerCase().includes(term) || i.answer.toLowerCase().includes(term)
        )
      : this.allItems();

    const map = new Map<string, FaqItemDto[]>();
    for (const item of items) {
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category)!.push(item);
    }

    return Array.from(map.entries()).map(([category, groupItems]) => ({ category, items: groupItems }));
  });

  onSearchChange(value: string) {
    this.searchTerm.set(value);
  }

  toggle(id: number) {
    this.openIds.update(set => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  isOpen(id: number): boolean {
    return this.openIds().has(id);
  }

  ngOnInit() {
    this.faqService.getFaq()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: items => {
          this.allItems.set(items);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        }
      });
  }
}
