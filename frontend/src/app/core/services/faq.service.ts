import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import type { FaqItemDto } from '../models/models';

@Injectable({ providedIn: 'root' })
export class FaqService {
  constructor(private http: HttpClient) {}

  getFaq() {
    return this.http.get<FaqItemDto[]>(`${environment.apiUrl}/api/faq`);
  }
}
