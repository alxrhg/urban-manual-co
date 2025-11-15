/**
 * QStash Signature Verification Middleware
 * 
 * Verifies incoming QStash webhook requests using signature validation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';

const receiver = new Receiver({
  currentSigningKey: process.env.UPSTASH_QSTASH_CURRENT_SIGNING_KEY || '',
  nextSigningKey: process.env.UPSTASH_QSTASH_NEXT_SIGNING_KEY || '',
});

export interface QStashVerifiedRequest extends NextRequest {
  isQStashVerified: boolean;
}

/**
 * Verify QStash signature
 * Returns true if the request is from QStash, false otherwise
 */
export async function verifyQStashSignature(
  request: NextRequest,
  body: string
): Promise<boolean> {
  try {
    const signature = request.headers.get('upstash-signature');
    
    if (!signature) {
      console.warn('Missing upstash-signature header');
      return false;
    }

    // Verify the signature
    const isValid = await receiver.verify({
      signature,
      body,
    });

    return isValid;
  } catch (error) {
    console.error('QStash signature verification failed:', error);
    return false;
  }
}

/**
 * Middleware to protect QStash endpoints
 * Returns 401 if signature verification fails
 */
export async function requireQStashSignature(
  request: NextRequest,
  handler: (request: NextRequest, body: any) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const bodyText = await request.text();
    const isValid = await verifyQStashSignature(request, bodyText);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid QStash signature' },
        { status: 401 }
      );
    }

    // Parse body and pass to handler
    let body;
    try {
      body = JSON.parse(bodyText);
    } catch {
      body = {};
    }

    return await handler(request, body);
  } catch (error) {
    console.error('QStash middleware error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
