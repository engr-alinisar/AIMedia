import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CreditsService } from '../../core/services/credits.service';
import type { CreditTransactionDto, PagedResult } from '../../core/models/models';

@Component({
  selector: 'app-credits',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="p-6 max-w-3xl mx-auto space-y-6">
  <h1 class="text-xl font-semibold text-gray-900">Credits</h1>

  <!-- Balance card -->
  <div class="card p-6">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm text-gray-500">Available Balance</p>
        <p class="text-4xl font-bold text-gray-900 mt-1">{{ credits.balance().balance }}</p>
        <p class="text-sm text-gray-400 mt-1">{{ credits.balance().reserved }} credits reserved for active jobs</p>
      </div>
      <div class="text-5xl">💳</div>
    </div>
  </div>

  <!-- Credit packs -->
  <div>
    <h2 class="text-sm font-semibold text-gray-700 mb-3">Buy Credits</h2>
    <div class="grid grid-cols-3 gap-4">
      @for (pack of packs; track pack.name) {
        <div class="card p-5 text-center hover:border-accent/50 hover:shadow-md transition-all cursor-pointer" [class.border-accent]="pack.popular">
          @if (pack.popular) {
            <span class="inline-block px-2 py-0.5 text-[10px] font-bold bg-accent text-white rounded-full mb-2">POPULAR</span>
          }
          <p class="text-lg font-bold text-gray-900">{{ pack.credits | number }} credits</p>
          <p class="text-2xl font-bold text-accent mt-1">\${{ pack.price }}</p>
          <p class="text-xs text-gray-400 mt-0.5">\${{ (pack.price / pack.credits * 100).toFixed(1) }}¢ per credit</p>
          <button class="btn-primary w-full mt-4 text-sm py-2">Buy Now</button>
        </div>
      }
    </div>
    <p class="text-xs text-gray-400 text-center mt-3">1 credit = $0.01 USD · Secure checkout powered by Stripe</p>
  </div>

  <!-- Transaction history -->
  <div>
    <h2 class="text-sm font-semibold text-gray-700 mb-3">Transaction History</h2>
    @if (loading()) {
      <div class="card p-8 text-center text-gray-400 text-sm">Loading...</div>
    } @else if ((transactions()?.items?.length ?? 0) === 0) {
      <div class="card p-8 text-center text-gray-400 text-sm">No transactions yet.</div>
    } @else {
      <div class="card divide-y divide-border">
        @for (tx of transactions()?.items; track tx.id) {
          <div class="flex items-center gap-3 px-4 py-3">
            <span [class]="tx.amount > 0 ? 'text-green-500' : 'text-red-400'" class="text-lg font-bold w-6 text-center">
              {{ tx.amount > 0 ? '+' : '' }}
            </span>
            <div class="flex-1">
              <p class="text-sm text-gray-800">{{ tx.description }}</p>
              <p class="text-xs text-gray-400">{{ tx.createdAt | date:'medium' }}</p>
            </div>
            <span [class]="tx.amount > 0 ? 'text-green-600' : 'text-red-500'" class="text-sm font-semibold">
              {{ tx.amount > 0 ? '+' : '' }}{{ tx.amount }}
            </span>
            <span class="text-xs text-gray-400 w-16 text-right">{{ tx.balanceAfter }} bal</span>
          </div>
        }
      </div>
    }
  </div>
</div>
  `
})
export class CreditsComponent implements OnInit {
  credits = inject(CreditsService);
  transactions = signal<PagedResult<CreditTransactionDto> | null>(null);
  loading = signal(true);

  packs = [
    { name: 'Starter', credits: 500,  price: 5,  popular: false },
    { name: 'Popular', credits: 1200, price: 10, popular: true  },
    { name: 'Pro',     credits: 3000, price: 20, popular: false },
  ];

  ngOnInit() {
    this.credits.loadBalance().subscribe();
    this.credits.getTransactions().subscribe({ next: r => { this.transactions.set(r); this.loading.set(false); }, error: () => this.loading.set(false) });
  }
}
