import { NextRequest, NextResponse } from 'next/server'
import { listAccounts, createAccount, getAccount } from '@/lib/paper-trade'
import { createLogger } from '@/lib/logger'

const logger = createLogger('paper-trading-api')

export async function GET() {
  try {
    const accounts = await listAccounts()
    return NextResponse.json(accounts)
  } catch (error) {
    logger.error('Failed to list paper accounts', error)
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, initialCash } = body

    if (!name || typeof initialCash !== 'number' || initialCash <= 0) {
      return NextResponse.json({ error: 'name and positive initialCash are required' }, { status: 400 })
    }

    const account = await createAccount(name, initialCash)
    const summary = await getAccount(account.id)
    return NextResponse.json(summary, { status: 201 })
  } catch (error) {
    logger.error('Failed to create paper account', error)
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }
}
