import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { ModelDto } from '../models/models';

@Injectable({ providedIn: 'root' })
export class ModelsService {
  private http = inject(HttpClient);

  getModels(product: string): Observable<ModelDto[]> {
    return this.http.get<ModelDto[]>(`${environment.apiUrl}/api/models?product=${product}`);
  }
}
