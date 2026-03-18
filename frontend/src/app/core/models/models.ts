export type ModelTier = 'Free' | 'Standard' | 'Premium';
export type JobStatus = 'Queued' | 'Processing' | 'Completed' | 'Failed' | 'Cancelled';
export type ProductType = 'ImageGen' | 'ImageToVideo' | 'TextToVideo' | 'Voice' | 'Transcription' | 'BackgroundRemoval';
export type SubscriptionPlan = 'Free' | 'Starter' | 'Creator' | 'Pro';

export interface User {
  id: string;
  email: string;
  fullName?: string;
  creditBalance: number;
  reservedCredits: number;
  plan: SubscriptionPlan;
  createdAt: string;
  isEmailVerified: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface GenerationResponse {
  jobId: string;
  creditsReserved: number;
  estimatedSeconds: number;
}

export interface JobDto {
  id: string;
  product: ProductType;
  tier: ModelTier;
  status: JobStatus;
  creditsReserved: number;
  creditsCharged: number;
  outputUrl?: string;
  errorMessage?: string;
  durationSeconds: number;
  createdAt: string;
  completedAt?: string;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreditBalanceDto {
  balance: number;
  reserved: number;
  total: number;
}

export interface CreditTransactionDto {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string;
  jobId?: string;
  createdAt: string;
}

export interface VoiceCloneDto {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string;
}

export interface JobStatusUpdate {
  jobId: string;
  status: JobStatus;
  outputUrl?: string;
  creditsCharged: number;
  errorMessage?: string;
}

export interface ModelDto {
  id: string;
  name: string;
  description: string;
  creditsBase: number;
  creditsPerSecond: number;
  tier: string;
}

// Credit costs mirrored from CreditCalculator.cs
export const CREDIT_COSTS: Record<ProductType, Record<ModelTier, number>> = {
  ImageGen:          { Free: 5,  Standard: 8,  Premium: 11 },
  ImageToVideo:      { Free: 5,  Standard: 18, Premium: 30 }, // per second
  TextToVideo:       { Free: 5,  Standard: 18, Premium: 30 }, // per second
  Voice:             { Free: 4,  Standard: 18, Premium: 18 },
  Transcription:     { Free: 10, Standard: 10, Premium: 18 },
  BackgroundRemoval: { Free: 3,  Standard: 3,  Premium: 3  }
};

export function estimateCredits(product: ProductType, tier: ModelTier, duration = 5): number {
  const base = CREDIT_COSTS[product]?.[tier] ?? 0;
  if (product === 'ImageToVideo' || product === 'TextToVideo') return base * duration;
  return base;
}
