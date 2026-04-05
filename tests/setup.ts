import { beforeAll, afterAll, afterEach, vi } from 'vitest'

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  },
}))

beforeAll(async () => {})

afterAll(async () => {})

afterEach(async () => {
  vi.clearAllMocks()
})
