import { Routes } from '@angular/router';
import { PublicShellComponent } from './layout/public-shell.component';

export const routes: Routes = [
  // Standalone public pages (no shell)
  { path: '',              loadComponent: () => import('./features/landing/landing.component').then(m => m.LandingComponent) },
  { path: 'auth/login',    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent) },
  { path: 'auth/register', loadComponent: () => import('./features/auth/register.component').then(m => m.RegisterComponent) },
  { path: 'verify-email',  loadComponent: () => import('./features/auth/verify-email.component').then(m => m.VerifyEmailComponent) },

  // All app pages — single shared shell
  {
    path: '',
    component: PublicShellComponent,
    children: [
      { path: 'explore',            loadComponent: () => import('./features/explore/explore.component').then(m => m.ExploreComponent) },
      { path: 'dashboard',          loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'text-to-image',      loadComponent: () => import('./features/image-gen/image-gen.component').then(m => m.ImageGenComponent) },
      { path: 'image-gen',          redirectTo: 'text-to-image', pathMatch: 'full' },
      { path: 'image-to-video',     loadComponent: () => import('./features/image-to-video/image-to-video.component').then(m => m.ImageToVideoComponent) },
      { path: 'text-to-video',      loadComponent: () => import('./features/text-to-video/text-to-video.component').then(m => m.TextToVideoComponent) },
      { path: 'voice',              loadComponent: () => import('./features/voice/voice.component').then(m => m.VoiceComponent) },
      { path: 'transcription',      loadComponent: () => import('./features/transcription/transcription.component').then(m => m.TranscriptionComponent) },
      { path: 'background-removal', loadComponent: () => import('./features/background-removal/background-removal.component').then(m => m.BackgroundRemovalComponent) },
      { path: 'jobs',               loadComponent: () => import('./features/jobs/jobs.component').then(m => m.JobsComponent) },
      { path: 'credits',            loadComponent: () => import('./features/credits/credits.component').then(m => m.CreditsComponent) },
      { path: 'profile',            loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent) },
      { path: 'faq',                loadComponent: () => import('./features/faq/faq.component').then(m => m.FaqComponent) },
      { path: 'contact',            loadComponent: () => import('./features/contact/contact.component').then(m => m.ContactComponent) },
    ]
  },

  { path: '**', redirectTo: '' }
];
