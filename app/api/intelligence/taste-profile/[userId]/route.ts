import { NextRequest, NextResponse } from 'next/server';
import { tasteProfileEvolutionService } from '@/services/intelligence/taste-profile-evolution';
import { withErrorHandling, createValidationError } from '@/lib/errors';

/**
 * GET /api/intelligence/taste-profile/:userId
 * Get taste profile evolution for a user
 */
export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) => {
  const resolvedParams = await params;
  const userId = resolvedParams.userId;

  const profile = await tasteProfileEvolutionService.getTasteProfile(userId);

  if (!profile) {
    throw createValidationError('Profile not found');
  }

  return NextResponse.json(profile);
});

/**
 * POST /api/intelligence/taste-profile/:userId/update
 * Update taste profile with new interactions
 */
export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) => {
  const resolvedParams = await params;
  const userId = resolvedParams.userId;

  const { interactions } = await request.json();

  if (!interactions || !Array.isArray(interactions)) {
    throw createValidationError('interactions array is required');
  }

  await tasteProfileEvolutionService.updateTasteProfile(userId, interactions);

  return NextResponse.json({ status: 'success' });
});

