import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface ContactRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ContactService {
  constructor(private http: HttpClient) {}

  sendContactMessage(data: ContactRequest) {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/api/contact`, data);
  }
}
