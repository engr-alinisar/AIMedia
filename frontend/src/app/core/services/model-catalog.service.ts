import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface ModelCatalogItemDto {
  id: string;
  name: string;
  description: string;
  product: string;
  tier: string;
  creditsBase: number;
  creditsPerSecond: number;
  displayPrice: string;
}

@Injectable({ providedIn: 'root' })
export class ModelCatalogService {
  private http = inject(HttpClient);

  private _catalog = signal<ModelCatalogItemDto[]>([]);
  readonly catalog = this._catalog.asReadonly();

  private loaded = false;
  private loading = false;

  loadAll() {
    if (this.loaded || this.loading) return;
    this.loading = true;

    this.http.get<ModelCatalogItemDto[]>(`${environment.apiUrl}/api/models/catalog`).subscribe({
      next: items => {
        this._catalog.set(items);
        this.loaded = true;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
