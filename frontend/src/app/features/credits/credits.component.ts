import { Component, signal, computed, inject, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CreditsService } from '../../core/services/credits.service';
import type { CreditTransactionDto, PagedResult } from '../../core/models/models';

@Component({
  selector: 'app-credits',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    .page-btn {
      min-width: 2rem; height: 2rem;
      display: inline-flex; align-items: center; justify-content: center;
      border-radius: 0.5rem; font-size: 0.8125rem; font-weight: 500;
      border: 1px solid #e5e7eb; background: white; color: #374151;
      cursor: pointer; transition: all 0.15s; padding: 0 0.5rem;
    }
    .page-btn:hover:not(:disabled) { background: #f3f4f6; border-color: #d1d5db; }
    .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .page-btn.active {
      background: var(--color-accent, #7c3aed); border-color: var(--color-accent, #7c3aed);
      color: white;
    }
  `],
  template: `
<div class="p-4 sm:p-6 max-w-3xl mx-auto space-y-5 sm:space-y-6">
  <h1 class="text-xl font-semibold text-gray-900">Credits</h1>

  <!-- Payment status banners -->
  @if (paymentStatus() === 'success') {
    <div class="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm">
      <span class="text-lg">✅</span>
      <span>Payment successful! Your credits have been added to your account.</span>
    </div>
  }
  @if (paymentStatus() === 'cancel') {
    <div class="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm">
      <span class="text-lg">⚠️</span>
      <span>Payment was cancelled. No charges were made.</span>
    </div>
  }
  @if (paymentStatus() === 'error') {
    <div class="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
      <span class="text-lg">❌</span>
      <span>Payment capture failed. Please contact support if you were charged.</span>
    </div>
  }

  <!-- Low credits warning -->
  @if (credits.balance().balance > 0 && credits.balance().balance < 50) {
    <div class="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
      <span class="text-lg">⚠️</span>
      <div class="flex-1">
        <span class="font-semibold">Low credits — </span>
        <span>You only have {{ credits.balance().balance }} credits left. Top up to keep generating.</span>
      </div>
      <button class="text-xs font-semibold underline whitespace-nowrap" (click)="scrollToPacks()">Buy now</button>
    </div>
  }

  <!-- Balance card -->
  <div class="card p-5 sm:p-6" #balanceCard>
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm text-gray-500">Available Balance</p>
        <p class="text-3xl sm:text-4xl font-bold text-gray-900 mt-1">{{ credits.balance().balance }}</p>
        <p class="text-sm text-gray-400 mt-1">{{ credits.balance().reserved }} credits reserved for active jobs</p>
      </div>
      <div class="text-4xl sm:text-5xl">💳</div>
    </div>
  </div>

  <!-- Credit packs -->
  <div #packsSection>
    <h2 class="text-sm font-semibold text-gray-700 mb-3">Buy Credits</h2>
    <div class="grid grid-cols-3 gap-3 sm:gap-4">
      @for (pack of packs; track pack.id) {
        <div class="card p-3 sm:p-5 text-center hover:border-accent/50 hover:shadow-md transition-all" [class.border-accent]="pack.popular">
          @if (pack.popular) {
            <span class="inline-block px-2 py-0.5 text-[10px] font-bold bg-accent text-white rounded-full mb-2">POPULAR</span>
          }
          <p class="text-sm sm:text-lg font-bold text-gray-900">{{ pack.credits | number }} cr</p>
          <p class="text-xl sm:text-2xl font-bold text-accent mt-1">\${{ pack.price }}</p>
          <p class="hidden sm:block text-xs text-gray-400 mt-0.5">\${{ (pack.price / pack.credits * 100).toFixed(1) }}¢ per credit</p>
          <button
            class="btn-primary w-full mt-3 text-xs sm:text-sm py-1.5 sm:py-2"
            [disabled]="buying()"
            (click)="buyPack(pack.id)">
            {{ buying() === pack.id ? 'Redirecting...' : 'Buy Now' }}
          </button>
        </div>
      }
    </div>
    <p class="text-xs text-gray-400 text-center mt-3">1 credit = $0.01 USD · Secure checkout powered by PayPal</p>

    <!-- No refund notice -->
    <div class="flex items-start gap-2 mt-4 p-3 bg-gray-50 border border-gray-200 rounded-xl">
      <span class="text-sm mt-0.5">ℹ️</span>
      <p class="text-xs text-gray-500 leading-relaxed">
        <span class="font-semibold text-gray-600">No refund policy.</span>
        All credit purchases are final and non-refundable. We offer
        <span class="font-semibold">100 free credits</span> to every new account so you can try the platform before purchasing.
      </p>
    </div>
  </div>

  <!-- Transaction history -->
  <div>
    <div class="flex items-center justify-between mb-3">
      <div>
        <h2 class="text-sm font-semibold text-gray-700">Transaction History</h2>
        @if (transactions()) {
          <p class="text-xs text-gray-400 mt-0.5">{{ transactions()!.totalCount }} total</p>
        }
      </div>
      @if (!loading()) {
        <span class="text-xs text-gray-400">Page {{ page() }} of {{ transactions()?.totalPages ?? 1 }}</span>
      }
    </div>

    @if (loading()) {
      <div class="card p-8 text-center text-gray-400 text-sm">Loading...</div>
    } @else if ((transactions()?.items?.length ?? 0) === 0) {
      <div class="card p-8 text-center text-gray-400 text-sm">No transactions yet.</div>
    } @else {
      <div class="card divide-y divide-border">
        @for (tx of transactions()?.items; track tx.id) {
          <div class="flex items-center gap-3 px-4 py-3">
            <div class="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                 [class.bg-green-100]="tx.amount > 0"
                 [class.text-green-600]="tx.amount > 0"
                 [class.bg-red-50]="tx.amount <= 0"
                 [class.text-red-500]="tx.amount <= 0">
              {{ tx.amount > 0 ? '+' : '−' }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-gray-800 truncate">{{ tx.description }}</p>
              <p class="text-xs text-gray-400">{{ tx.createdAt | date:'MMM d, y · h:mm a' }}</p>
            </div>
            <div class="text-right flex-shrink-0">
              <p class="text-sm font-semibold" [class.text-green-600]="tx.amount > 0" [class.text-red-500]="tx.amount <= 0">
                {{ tx.amount > 0 ? '+' : '' }}{{ tx.amount }}
              </p>
              <p class="text-xs text-gray-400">{{ tx.balanceAfter }} bal</p>
            </div>
          </div>
        }
      </div>

      <!-- Pagination -->
      @if ((transactions()?.totalPages ?? 0) > 1) {
        <div class="flex flex-wrap items-center justify-center gap-1.5 mt-4">
          <button class="page-btn" (click)="loadPage(1)" [disabled]="page() === 1" title="First">«</button>
          <button class="page-btn" (click)="loadPage(page() - 1)" [disabled]="page() === 1" title="Previous">‹</button>

          @for (p of pageNumbers(); track p) {
            @if (p === -1) {
              <span class="px-1 text-gray-400 select-none">…</span>
            } @else {
              <button class="page-btn" [class.active]="p === page()" (click)="loadPage(p)">{{ p }}</button>
            }
          }

          <button class="page-btn" (click)="loadPage(page() + 1)" [disabled]="page() === transactions()?.totalPages" title="Next">›</button>
          <button class="page-btn" (click)="loadPage(transactions()!.totalPages)" [disabled]="page() === transactions()?.totalPages" title="Last">»</button>

          <div class="flex items-center gap-1.5 ml-3 pl-3 border-l border-gray-200">
            <span class="text-xs text-gray-500 whitespace-nowrap">Go to</span>
            <input #gotoInput type="number" [min]="1" [max]="transactions()?.totalPages"
                   class="w-14 text-center text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                   [placeholder]="page()"
                   (keydown.enter)="goToPage(gotoInput)" />
            <button class="page-btn" (click)="goToPage(gotoInput)">Go</button>
          </div>
        </div>

        <p class="text-center text-xs text-gray-400 mt-1">
          Showing {{ pageStart() }}–{{ pageEnd() }} of {{ transactions()?.totalCount }} transactions
        </p>
      }
    }
  </div>
</div>
  `
})
export class CreditsComponent implements OnInit {
  credits = inject(CreditsService);
  private route = inject(ActivatedRoute);

  @ViewChild('packsSection') packsSection?: ElementRef;

  scrollToPacks() {
    this.packsSection?.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  readonly PAGE_SIZE = 10;

  transactions = signal<PagedResult<CreditTransactionDto> | null>(null);
  loading = signal(true);
  page = signal(1);
  buying = signal<string | null>(null);
  paymentStatus = signal<'success' | 'cancel' | 'error' | null>(null);

  packs = [
    { id: 'starter', name: 'Starter', credits: 500,  price: 5,  popular: false },
    { id: 'popular', name: 'Popular', credits: 1200, price: 10, popular: true  },
    { id: 'pro',     name: 'Pro',     credits: 3000, price: 20, popular: false },
  ];

  pageNumbers = computed<number[]>(() => {
    const total = this.transactions()?.totalPages ?? 0;
    const cur = this.page();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: number[] = [1];
    if (cur > 3) pages.push(-1);
    const start = Math.max(2, cur - 1);
    const end = Math.min(total - 1, cur + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (cur < total - 2) pages.push(-1);
    pages.push(total);
    return pages;
  });

  pageStart = computed(() => {
    const r = this.transactions();
    if (!r) return 0;
    return (this.page() - 1) * this.PAGE_SIZE + 1;
  });

  pageEnd = computed(() => {
    const r = this.transactions();
    if (!r) return 0;
    return Math.min(this.page() * this.PAGE_SIZE, r.totalCount);
  });

  ngOnInit() {
    this.credits.loadBalance().subscribe();
    this.loadPage(1);
    this.handlePayPalReturn();
  }

  private handlePayPalReturn() {
    const params = this.route.snapshot.queryParamMap;
    const status = params.get('paypal');
    const orderId = params.get('token'); // PayPal appends ?token={orderId} to return URL

    if (status === 'cancel') {
      this.paymentStatus.set('cancel');
      return;
    }

    if (status === 'success' && orderId) {
      this.credits.capturePayPalOrder(orderId).subscribe({
        next: () => {
          this.paymentStatus.set('success');
          this.credits.loadBalance().subscribe();
          this.loadPage(1);
        },
        error: () => this.paymentStatus.set('error')
      });
    }
  }

  buyPack(packId: string) {
    if (this.buying()) return;
    this.buying.set(packId);

    this.credits.createPayPalOrder(packId).subscribe({
      next: ({ approvalUrl }) => {
        window.location.href = approvalUrl;
      },
      error: () => {
        this.buying.set(null);
        alert('Failed to initiate payment. Please try again.');
      }
    });
  }

  loadPage(p: number) {
    const total = this.transactions()?.totalPages ?? Infinity;
    if (p < 1 || p > total) return;
    this.loading.set(true);
    this.page.set(p);
    this.credits.getTransactions(p, this.PAGE_SIZE).subscribe({
      next: r => { this.transactions.set(r); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  goToPage(input: HTMLInputElement) {
    const p = parseInt(input.value, 10);
    const total = this.transactions()?.totalPages ?? 1;
    if (!isNaN(p) && p >= 1 && p <= total) this.loadPage(p);
    input.value = '';
    input.blur();
  }
}
