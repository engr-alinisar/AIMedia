import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { CreditBalanceDto, CreditTransactionDto, PagedResult } from '../models/models';

@Injectable({ providedIn: 'root' })
export class CreditsService {
  private _balance = signal<CreditBalanceDto>({ balance: 0, reserved: 0, total: 0 });
  readonly balance = this._balance.asReadonly();

  constructor(private http: HttpClient) {}

  loadBalance() {
    return this.http.get<CreditBalanceDto>(`${environment.apiUrl}/api/credits/balance`)
      .pipe(tap(b => this._balance.set(b)));
  }

  getTransactions(page = 1, pageSize = 20) {
    return this.http.get<PagedResult<CreditTransactionDto>>(
      `${environment.apiUrl}/api/credits/transactions?page=${page}&pageSize=${pageSize}`
    );
  }

  createPayPalOrder(packId: string) {
    return this.http.post<{ approvalUrl: string }>(
      `${environment.apiUrl}/api/payments/paypal/create-order`,
      { packId }
    );
  }

  capturePayPalOrder(orderId: string) {
    return this.http.post<{ success: boolean; message: string }>(
      `${environment.apiUrl}/api/payments/paypal/capture/${orderId}`,
      {}
    );
  }

  deductLocally(amount: number) {
    const b = this._balance();
    this._balance.set({ ...b, balance: b.balance - amount, reserved: b.reserved - amount });
  }

  reserveLocally(amount: number) {
    this._balance.update(b => ({ ...b, reserved: b.reserved + amount }));
  }
}
