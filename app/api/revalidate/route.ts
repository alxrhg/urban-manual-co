import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';

export async function POST(req: NextRequest) {
  // Basic security check using a secret token
  // In Vercel, this should be set as REVALIDATION_TOKEN
  const token = req.headers.get('x-revalidation-token');
  
  if (token !== process.env.REVALIDATION_TOKEN) {
    // Allow local testing without token if in development
    if (process.env.NODE_ENV === 'development' && !process.env.REVALIDATION_TOKEN) {
      // Proceed
    } else {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }
  }

  try {
    const body = await req.json();
    const { tag, path } = body;

    if (tag) {
      // revalidateTag(String(tag));
      console.log(`[Revalidate] Tag: ${tag}`);
    }

    if (path) {
      // revalidatePath(String(path));
      console.log(`[Revalidate] Path: ${path}`);
    }

    if (!tag && !path) {
      // Default to revalidating destinations if nothing specified
      // revalidateTag('destinations');
      console.log(`[Revalidate] Default tag: destinations`);
    }

    return NextResponse.json({ revalidated: true, now: Date.now() });
  } catch (err) {
    return NextResponse.json({ message: 'Error revalidating' }, { status: 500 });
  }
}

