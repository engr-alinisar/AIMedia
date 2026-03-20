import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface VoiceCloneDto {
  id: string;
  name: string;
  description?: string;
  referenceText: string;
  createdAt: string;
  lastUsedAt: string;
}

@Injectable({ providedIn: 'root' })
export class VoiceCloneService {
  private base = `${environment.apiUrl}/api/voice-clones`;

  constructor(private http: HttpClient) {}

  list() {
    return this.http.get<VoiceCloneDto[]>(this.base);
  }

  create(name: string, description: string, referenceText: string, audioFile: File) {
    const fd = new FormData();
    fd.append('name', name);
    fd.append('description', description);
    fd.append('referenceText', referenceText);
    fd.append('file', audioFile);
    return this.http.post<VoiceCloneDto>(this.base, fd);
  }

  delete(id: string) {
    return this.http.delete(`${this.base}/${id}`);
  }
}
