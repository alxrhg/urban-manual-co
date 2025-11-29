/**
 * Security Audit Logging
 *
 * Tracks security-relevant events for compliance and monitoring.
 */

import { logger } from '@/lib/logging';

/**
 * Audit event types
 */
export enum AuditEventType {
  // Authentication
  LOGIN_SUCCESS = 'auth.login.success',
  LOGIN_FAILURE = 'auth.login.failure',
  LOGOUT = 'auth.logout',
  PASSWORD_CHANGE = 'auth.password.change',
  PASSWORD_RESET_REQUEST = 'auth.password.reset_request',
  PASSWORD_RESET_COMPLETE = 'auth.password.reset_complete',
  MFA_ENABLED = 'auth.mfa.enabled',
  MFA_DISABLED = 'auth.mfa.disabled',
  SESSION_EXPIRED = 'auth.session.expired',
  SESSION_REVOKED = 'auth.session.revoked',

  // Account
  ACCOUNT_CREATED = 'account.created',
  ACCOUNT_UPDATED = 'account.updated',
  ACCOUNT_DELETED = 'account.deleted',
  EMAIL_CHANGED = 'account.email.changed',
  EMAIL_VERIFIED = 'account.email.verified',
  PROFILE_UPDATED = 'account.profile.updated',

  // Data access
  DATA_EXPORTED = 'data.exported',
  DATA_DELETED = 'data.deleted',
  PRIVACY_SETTINGS_CHANGED = 'data.privacy.changed',

  // Security
  SUSPICIOUS_ACTIVITY = 'security.suspicious',
  RATE_LIMIT_EXCEEDED = 'security.rate_limit',
  INVALID_TOKEN = 'security.invalid_token',
  CSRF_VIOLATION = 'security.csrf_violation',
  XSS_ATTEMPT = 'security.xss_attempt',
  PERMISSION_DENIED = 'security.permission_denied',

  // Admin
  ADMIN_ACCESS = 'admin.access',
  ADMIN_ACTION = 'admin.action',
  USER_IMPERSONATION = 'admin.impersonation',
  SYSTEM_CONFIG_CHANGED = 'admin.config.changed',
}

/**
 * Audit event severity
 */
export enum AuditSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Audit event data
 */
export interface AuditEvent {
  /** Event type */
  type: AuditEventType;
  /** Event severity */
  severity: AuditSeverity;
  /** User ID (if authenticated) */
  userId?: string;
  /** User email (for logging) */
  userEmail?: string;
  /** IP address */
  ipAddress?: string;
  /** User agent */
  userAgent?: string;
  /** Event-specific details */
  details?: Record<string, unknown>;
  /** Timestamp */
  timestamp: Date;
  /** Request ID for correlation */
  requestId?: string;
  /** Session ID */
  sessionId?: string;
  /** Resource affected */
  resource?: {
    type: string;
    id: string;
  };
  /** Outcome */
  outcome: 'success' | 'failure' | 'blocked';
}

/**
 * Audit logger configuration
 */
interface AuditLoggerConfig {
  /** Whether to log to console */
  console?: boolean;
  /** Whether to send to external service */
  external?: boolean;
  /** External service endpoint */
  endpoint?: string;
  /** Minimum severity to log */
  minSeverity?: AuditSeverity;
}

const defaultConfig: AuditLoggerConfig = {
  console: process.env.NODE_ENV === 'development',
  external: process.env.NODE_ENV === 'production',
  minSeverity: AuditSeverity.INFO,
};

/**
 * Severity levels for comparison
 */
const severityLevels: Record<AuditSeverity, number> = {
  [AuditSeverity.INFO]: 0,
  [AuditSeverity.WARNING]: 1,
  [AuditSeverity.ERROR]: 2,
  [AuditSeverity.CRITICAL]: 3,
};

/**
 * Main audit logging function
 */
export async function logAuditEvent(
  event: Omit<AuditEvent, 'timestamp'>,
  config: AuditLoggerConfig = defaultConfig
): Promise<void> {
  const fullEvent: AuditEvent = {
    ...event,
    timestamp: new Date(),
  };

  // Check minimum severity
  const minLevel = severityLevels[config.minSeverity || AuditSeverity.INFO];
  const eventLevel = severityLevels[event.severity];
  if (eventLevel < minLevel) return;

  // Console logging
  if (config.console) {
    const logContext = {
      module: 'audit',
      userId: event.userId,
      extra: {
        ...event.details,
        outcome: event.outcome,
        resource: event.resource,
      },
    };

    if (event.severity === AuditSeverity.CRITICAL) {
      logger.fatal(`[AUDIT] ${event.type}`, undefined, logContext);
    } else if (event.severity === AuditSeverity.ERROR) {
      logger.error(`[AUDIT] ${event.type}`, undefined, logContext);
    } else if (event.severity === AuditSeverity.WARNING) {
      logger.warn(`[AUDIT] ${event.type}`, logContext);
    } else {
      logger.info(`[AUDIT] ${event.type}`, logContext);
    }
  }

  // External logging (e.g., to Supabase audit table or external service)
  if (config.external) {
    try {
      // Store in database or send to external service
      await storeAuditEvent(fullEvent);
    } catch (error) {
      logger.error('Failed to store audit event', error as Error, {
        module: 'audit',
        extra: { eventType: event.type },
      });
    }
  }
}

/**
 * Store audit event (to be implemented with actual storage)
 */
async function storeAuditEvent(event: AuditEvent): Promise<void> {
  // TODO: Implement storage to Supabase or external service
  // For now, we'll just log that we would store it
  if (process.env.NODE_ENV === 'development') {
    console.log('[AUDIT STORE]', JSON.stringify(event, null, 2));
  }
}

/**
 * Helper functions for common audit events
 */
export const audit = {
  loginSuccess: (
    userId: string,
    options?: Partial<AuditEvent>
  ) =>
    logAuditEvent({
      type: AuditEventType.LOGIN_SUCCESS,
      severity: AuditSeverity.INFO,
      userId,
      outcome: 'success',
      ...options,
    }),

  loginFailure: (
    email: string,
    reason: string,
    options?: Partial<AuditEvent>
  ) =>
    logAuditEvent({
      type: AuditEventType.LOGIN_FAILURE,
      severity: AuditSeverity.WARNING,
      userEmail: email,
      outcome: 'failure',
      details: { reason },
      ...options,
    }),

  logout: (userId: string, options?: Partial<AuditEvent>) =>
    logAuditEvent({
      type: AuditEventType.LOGOUT,
      severity: AuditSeverity.INFO,
      userId,
      outcome: 'success',
      ...options,
    }),

  passwordChange: (userId: string, options?: Partial<AuditEvent>) =>
    logAuditEvent({
      type: AuditEventType.PASSWORD_CHANGE,
      severity: AuditSeverity.INFO,
      userId,
      outcome: 'success',
      ...options,
    }),

  suspiciousActivity: (
    reason: string,
    options?: Partial<AuditEvent>
  ) =>
    logAuditEvent({
      type: AuditEventType.SUSPICIOUS_ACTIVITY,
      severity: AuditSeverity.WARNING,
      outcome: 'blocked',
      details: { reason },
      ...options,
    }),

  rateLimitExceeded: (
    identifier: string,
    endpoint: string,
    options?: Partial<AuditEvent>
  ) =>
    logAuditEvent({
      type: AuditEventType.RATE_LIMIT_EXCEEDED,
      severity: AuditSeverity.WARNING,
      outcome: 'blocked',
      details: { identifier, endpoint },
      ...options,
    }),

  csrfViolation: (options?: Partial<AuditEvent>) =>
    logAuditEvent({
      type: AuditEventType.CSRF_VIOLATION,
      severity: AuditSeverity.ERROR,
      outcome: 'blocked',
      ...options,
    }),

  permissionDenied: (
    userId: string,
    resource: string,
    action: string,
    options?: Partial<AuditEvent>
  ) =>
    logAuditEvent({
      type: AuditEventType.PERMISSION_DENIED,
      severity: AuditSeverity.WARNING,
      userId,
      outcome: 'blocked',
      details: { resource, action },
      ...options,
    }),

  adminAccess: (
    adminId: string,
    action: string,
    options?: Partial<AuditEvent>
  ) =>
    logAuditEvent({
      type: AuditEventType.ADMIN_ACCESS,
      severity: AuditSeverity.INFO,
      userId: adminId,
      outcome: 'success',
      details: { action },
      ...options,
    }),

  dataExported: (userId: string, options?: Partial<AuditEvent>) =>
    logAuditEvent({
      type: AuditEventType.DATA_EXPORTED,
      severity: AuditSeverity.INFO,
      userId,
      outcome: 'success',
      ...options,
    }),

  accountDeleted: (userId: string, options?: Partial<AuditEvent>) =>
    logAuditEvent({
      type: AuditEventType.ACCOUNT_DELETED,
      severity: AuditSeverity.WARNING,
      userId,
      outcome: 'success',
      ...options,
    }),
};

/**
 * Extract request context for audit logging
 */
export function getAuditContext(request: Request): Partial<AuditEvent> {
  const headers = request.headers;

  return {
    ipAddress:
      headers.get('cf-connecting-ip') ||
      headers.get('x-real-ip') ||
      headers.get('x-forwarded-for')?.split(',')[0] ||
      'unknown',
    userAgent: headers.get('user-agent') || 'unknown',
    requestId: headers.get('x-request-id') || undefined,
  };
}
