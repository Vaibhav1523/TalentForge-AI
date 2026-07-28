import { NextResponse } from 'next/server';

/**
 * Return a 400 Bad Request JSON response.
 */
export function api400(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

/**
 * Log error server-side and return a safe 500 JSON (no internal details to client).
 */
export function api500(
  message: string,
  logContext?: string,
  error?: unknown
): NextResponse {
  if (logContext && error !== undefined) {
    console.error(`[API] ${logContext}:`, error instanceof Error ? error.message : error);
  }
  return NextResponse.json(
    { error: message },
    { status: 500 }
  );
}
