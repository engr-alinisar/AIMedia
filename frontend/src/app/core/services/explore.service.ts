import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import type { ExploreItemDto, PagedResult } from '../models/models';

@Injectable({ providedIn: 'root' })
export class ExploreService {
  constructor(private http: HttpClient) {}

  getExplore(page = 1, pageSize = 20, product?: string) {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (product) params.set('product', product);
    return this.http.get<PagedResult<ExploreItemDto>>(`${environment.apiUrl}/api/explore?${params}`);
  }
}
