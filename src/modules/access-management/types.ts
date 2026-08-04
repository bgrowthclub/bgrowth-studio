export interface MemberSummary {
  id: string;
  email: string;
  fullName: string | null;
  hasUsedTrial: boolean | null;
  createdAt: string;
  lastSignInAt: string | null;
}

export type GrantScope = 'all' | 'specific';
export type GrantStatus = 'active' | 'expired' | 'revoked';

export interface AccessGrant {
  id: string;
  scope: GrantScope;
  product: { id: string; name: string; slug: string } | null;
  expiresAt: string | null;
  note: string | null;
  grantedBy: string | null;
  createdAt: string;
  revokedAt: string | null;
  status: GrantStatus;
}

export interface CreateGrantInput {
  userId: string;
  scope: GrantScope;
  productId?: string;
  expiresAt?: string;
  note?: string;
}

export interface WorkspaceOption {
  productId: string;
  slug: string;
  name: string;
}
