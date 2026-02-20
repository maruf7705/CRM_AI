export type Role = "OWNER" | "ADMIN" | "AGENT" | "VIEWER";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  phone?: string;
  emailVerified: boolean;
}

export interface AuthOrganization {
  id: string;
  name: string;
  slug: string;
  role: Role;
}

export interface AuthPayload {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  org: AuthOrganization;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  organizationId: string;
  role: Role;
}
