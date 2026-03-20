import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { ShellComponent } from './layout/shell.component';

export const routes: Routes = [
  { path: 'auth/login',    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent) },
  { path: 'auth/register', loadComponent: () => import('./features/auth/register.component').then(m => m.RegisterComponent) },
  { path: 'verify-email',  loadComponent: () => import('./features/auth/verify-email.component').then(m => m.VerifyEmailComponent) },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '',                   redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',          loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'image-gen',          loadComponent: () => import('./features/image-gen/image-gen.component').then(m => m.ImageGenComponent) },
      { path: 'image-to-video',     loadComponent: () => import('./features/image-to-video/image-to-video.component').then(m => m.ImageToVideoComponent) },
      { path: 'text-to-video',      loadComponent: () => import('./features/text-to-video/text-to-video.component').then(m => m.TextToVideoComponent) },
      { path: 'voice',              loadComponent: () => import('./features/voice/voice.component').then(m => m.VoiceComponent) },
      { path: 'transcription',      loadComponent: () => import('./features/transcription/transcription.component').then(m => m.TranscriptionComponent) },
      { path: 'background-removal', loadComponent: () => import('./features/background-removal/background-removal.component').then(m => m.BackgroundRemovalComponent) },
      { path: 'jobs',               loadComponent: () => import('./features/jobs/jobs.component').then(m => m.JobsComponent) },
      { path: 'credits',            loadComponent: () => import('./features/credits/credits.component').then(m => m.CreditsComponent) },
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
