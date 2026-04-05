import { NextResponse } from 'next/server'

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    )
  }
  if (error instanceof Error) {
    console.error('API Error:', error.message)
    return NextResponse.json(
      { error: '内部服务器错误', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
  console.error('Unknown error:', error)
  return NextResponse.json(
    { error: '内部服务器错误', code: 'INTERNAL_ERROR' },
    { status: 500 }
  )
}

// Common error factories
export const Errors = {
  badRequest: (message: string) => new AppError(message, 'BAD_REQUEST', 400),
  notFound: (message: string) => new AppError(message, 'NOT_FOUND', 404),
  unauthorized: (message: string) => new AppError(message, 'UNAUTHORIZED', 401),
  internal: (message: string) => new AppError(message, 'INTERNAL_ERROR', 500),
}
