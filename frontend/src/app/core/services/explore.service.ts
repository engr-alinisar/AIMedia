import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import type { ExploreItemDto, PagedResult } from '../models/models';

@Injectable({ providedIn: 'root' })
export class ExploreService {
  constructor(private http: HttpClient) {}

  getExplore(page = 1, pageSize = 20, zone?: string, myJobsOnly = false) {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (zone) params.set('zone', zone);
    if (myJobsOnly) params.set('myJobsOnly', 'true');
    return this.http.get<PagedResult<ExploreItemDto>>(`${environment.apiUrl}/api/explore?${params}`);
  }

  setVisibility(jobId: string, isPublic: boolean) {
    return this.http.patch(`${environment.apiUrl}/api/jobs/${jobId}/visibility`, { isPublic });
  }
}
