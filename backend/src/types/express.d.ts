export interface AuthContext {
  userId: string;
  organizationId: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      auth?: AuthContext;
      rawBody?: Buffer;
    }
  }
}

export {};
