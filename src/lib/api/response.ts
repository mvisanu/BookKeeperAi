import { NextResponse } from 'next/server'

export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status })
}

export function apiError(
  message: string,
  code: string,
  status = 400
): NextResponse {
  return NextResponse.json({ error: message, code }, { status })
}
