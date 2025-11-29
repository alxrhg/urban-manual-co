/**
 * Account Recovery Utilities
 *
 * Secure account recovery flow with:
 * - Email verification
 * - Security questions (optional)
 * - Recovery codes
 * - Rate limiting
 */

import { createHash, randomBytes } from 'crypto';

/**
 * Recovery method types
 */
export enum RecoveryMethod {
  EMAIL = 'email',
  RECOVERY_CODE = 'recovery_code',
  SECURITY_QUESTION = 'security_question',
}

/**
 * Recovery request status
 */
export enum RecoveryStatus {
  PENDING = 'pending',
  EMAIL_SENT = 'email_sent',
  VERIFIED = 'verified',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  FAILED = 'failed',
}

/**
 * Recovery request data
 */
export interface RecoveryRequest {
  id: string;
  userId: string;
  email: string;
  method: RecoveryMethod;
  status: RecoveryStatus;
  token: string;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Recovery code set
 */
export interface RecoveryCodes {
  codes: string[];
  createdAt: Date;
  usedCodes: string[];
}

/**
 * Generate a secure recovery token
 */
export function generateRecoveryToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('hex');
  const hash = hashToken(token);
  return { token, hash };
}

/**
 * Hash a token for storage
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Verify a token against its hash
 */
export function verifyToken(token: string, hash: string): boolean {
  const tokenHash = hashToken(token);
  return tokenHash === hash;
}

/**
 * Generate recovery codes
 */
export function generateRecoveryCodes(count = 10): string[] {
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric code
    const code = randomBytes(4)
      .toString('hex')
      .toUpperCase()
      .match(/.{4}/g)!
      .join('-'); // Format: XXXX-XXXX
    codes.push(code);
  }

  return codes;
}

/**
 * Hash recovery codes for storage
 */
export function hashRecoveryCodes(codes: string[]): string[] {
  return codes.map((code) => hashToken(code.replace(/-/g, '').toLowerCase()));
}

/**
 * Verify a recovery code
 */
export function verifyRecoveryCode(
  inputCode: string,
  hashedCodes: string[]
): { valid: boolean; index: number } {
  const normalizedInput = inputCode.replace(/-/g, '').toLowerCase();
  const inputHash = hashToken(normalizedInput);

  const index = hashedCodes.findIndex((hash) => hash === inputHash);
  return {
    valid: index !== -1,
    index,
  };
}

/**
 * Create a recovery request
 */
export function createRecoveryRequest(
  userId: string,
  email: string,
  method: RecoveryMethod,
  options: {
    expiresInMinutes?: number;
    maxAttempts?: number;
    ipAddress?: string;
    userAgent?: string;
  } = {}
): RecoveryRequest {
  const {
    expiresInMinutes = 30,
    maxAttempts = 3,
    ipAddress,
    userAgent,
  } = options;

  const { token, hash } = generateRecoveryToken();
  const now = new Date();

  return {
    id: randomBytes(16).toString('hex'),
    userId,
    email,
    method,
    status: RecoveryStatus.PENDING,
    token,
    tokenHash: hash,
    createdAt: now,
    expiresAt: new Date(now.getTime() + expiresInMinutes * 60 * 1000),
    attempts: 0,
    maxAttempts,
    ipAddress,
    userAgent,
  };
}

/**
 * Check if recovery request is valid
 */
export function isRecoveryRequestValid(request: RecoveryRequest): {
  valid: boolean;
  reason?: string;
} {
  const now = new Date();

  if (request.status === RecoveryStatus.COMPLETED) {
    return { valid: false, reason: 'Request already completed' };
  }

  if (request.status === RecoveryStatus.EXPIRED) {
    return { valid: false, reason: 'Request expired' };
  }

  if (request.status === RecoveryStatus.FAILED) {
    return { valid: false, reason: 'Request failed' };
  }

  if (now > request.expiresAt) {
    return { valid: false, reason: 'Request expired' };
  }

  if (request.attempts >= request.maxAttempts) {
    return { valid: false, reason: 'Maximum attempts exceeded' };
  }

  return { valid: true };
}

/**
 * Validate security question answer
 */
export function validateSecurityAnswer(
  userAnswer: string,
  storedAnswerHash: string
): boolean {
  // Normalize the answer (lowercase, trim, remove extra spaces)
  const normalized = userAnswer.toLowerCase().trim().replace(/\s+/g, ' ');
  const answerHash = hashToken(normalized);
  return answerHash === storedAnswerHash;
}

/**
 * Hash security answer for storage
 */
export function hashSecurityAnswer(answer: string): string {
  const normalized = answer.toLowerCase().trim().replace(/\s+/g, ' ');
  return hashToken(normalized);
}

/**
 * Generate recovery email content
 */
export function generateRecoveryEmailContent(
  token: string,
  baseUrl: string
): { subject: string; html: string; text: string } {
  const recoveryUrl = `${baseUrl}/auth/recover?token=${token}`;

  return {
    subject: 'Reset your Urban Manual password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a;">Reset your password</h1>
        <p>You requested to reset your password. Click the button below to continue:</p>
        <a href="${recoveryUrl}" style="
          display: inline-block;
          padding: 12px 24px;
          background-color: #1a1a1a;
          color: #ffffff;
          text-decoration: none;
          border-radius: 8px;
          margin: 16px 0;
        ">Reset Password</a>
        <p style="color: #666;">Or copy and paste this link: ${recoveryUrl}</p>
        <p style="color: #666; font-size: 14px;">
          This link will expire in 30 minutes. If you didn't request this, you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">Urban Manual</p>
      </div>
    `,
    text: `
Reset your password

You requested to reset your password. Visit this link to continue:
${recoveryUrl}

This link will expire in 30 minutes. If you didn't request this, you can safely ignore this email.

Urban Manual
    `.trim(),
  };
}

/**
 * Security questions list
 */
export const SECURITY_QUESTIONS = [
  'What was the name of your first pet?',
  'What city were you born in?',
  'What is your mother\'s maiden name?',
  'What was the name of your elementary school?',
  'What was your childhood nickname?',
  'What is the name of the street you grew up on?',
  'What was your first car?',
  'What is your favorite movie?',
  'What is the middle name of your oldest sibling?',
  'In what city did your parents meet?',
] as const;

export type SecurityQuestion = (typeof SECURITY_QUESTIONS)[number];
