import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendTestEmail } from '@/lib/realtime/email-notifier'

const USER_CONFIG_KEY = 'default'

export async function GET() {
  try {
    const config = await prisma.userConfig.findUnique({
      where: { key: USER_CONFIG_KEY },
    })

    if (!config) {
      return NextResponse.json({
        email: null,
        emailAlertsEnabled: false,
      })
    }

    return NextResponse.json({
      email: config.email,
      emailAlertsEnabled: config.emailAlertsEnabled,
      lastEmailSentAt: config.lastEmailSentAt,
    })
  } catch (error) {
    console.error('Error fetching user config:', error)
    return NextResponse.json(
      { error: '获取配置失败', code: 'FETCH_CONFIG_FAILED' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, emailAlertsEnabled } = body

    const existing = await prisma.userConfig.findUnique({
      where: { key: USER_CONFIG_KEY },
    })

    let config
    if (existing) {
      config = await prisma.userConfig.update({
        where: { key: USER_CONFIG_KEY },
        data: {
          email: email ?? existing.email,
          emailAlertsEnabled: emailAlertsEnabled ?? existing.emailAlertsEnabled,
        },
      })
    } else {
      config = await prisma.userConfig.create({
        data: {
          key: USER_CONFIG_KEY,
          value: '{}',
          email: email || null,
          emailAlertsEnabled: emailAlertsEnabled ?? false,
        },
      })
    }

    return NextResponse.json({
      email: config.email,
      emailAlertsEnabled: config.emailAlertsEnabled,
    })
  } catch (error) {
    console.error('Error updating user config:', error)
    return NextResponse.json(
      { error: '更新配置失败', code: 'UPDATE_CONFIG_FAILED' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, emailAlertsEnabled } = body

    const existing = await prisma.userConfig.findUnique({
      where: { key: USER_CONFIG_KEY },
    })

    if (!existing) {
      return NextResponse.json(
        { error: '配置不存在', code: 'CONFIG_NOT_FOUND' },
        { status: 404 }
      )
    }

    const config = await prisma.userConfig.update({
      where: { key: USER_CONFIG_KEY },
      data: {
        ...(email !== undefined && { email }),
        ...(emailAlertsEnabled !== undefined && { emailAlertsEnabled }),
      },
    })

    return NextResponse.json({
      email: config.email,
      emailAlertsEnabled: config.emailAlertsEnabled,
    })
  } catch (error) {
    console.error('Error patching user config:', error)
    return NextResponse.json(
      { error: '更新配置失败', code: 'UPDATE_CONFIG_FAILED' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, email } = body

    if (action === 'test') {
      if (!email) {
        return NextResponse.json(
          { error: '邮箱地址不能为空', code: 'EMAIL_REQUIRED' },
          { status: 400 }
        )
      }

      const success = await sendTestEmail(email)

      if (success) {
        return NextResponse.json({ success: true, message: '测试邮件已发送' })
      }

      return NextResponse.json(
        { success: false, error: '邮件发送失败，请检查SMTP配置' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: '未知操作', code: 'UNKNOWN_ACTION' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error in user config PUT:', error)
    return NextResponse.json(
      { error: '操作失败', code: 'ACTION_FAILED' },
      { status: 500 }
    )
  }
}
