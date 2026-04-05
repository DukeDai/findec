import nodemailer from 'nodemailer'

const RATE_LIMIT_MS = 60 * 60 * 1000

const lastEmailSent: Map<string, Date> = new Map()

const getTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.example.com'
  const port = parseInt(process.env.SMTP_PORT || '587')
  const secure = port === 465

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  })
}

export interface AlertEmail {
  alertId?: string
  to: string
  symbol: string
  alertType: string
  currentPrice: number
  threshold: string
  triggeredAt: Date
  targetUrl?: string
}

export function canSendEmail(alertId: string): boolean {
  const lastSent = lastEmailSent.get(alertId)
  if (!lastSent) {
    return true
  }
  const now = new Date()
  return now.getTime() - lastSent.getTime() >= RATE_LIMIT_MS
}

export function recordEmailSent(alertId: string): void {
  lastEmailSent.set(alertId, new Date())
}

export function getTimeUntilNextEmail(alertId: string): number {
  const lastSent = lastEmailSent.get(alertId)
  if (!lastSent) {
    return 0
  }
  const now = new Date()
  const elapsed = now.getTime() - lastSent.getTime()
  return Math.max(0, RATE_LIMIT_MS - elapsed)
}

export async function sendAlertEmail(alert: AlertEmail): Promise<boolean> {
  if (alert.alertId && !canSendEmail(alert.alertId)) {
    const minutesLeft = Math.ceil(getTimeUntilNextEmail(alert.alertId) / (60 * 1000))
    console.warn(`Rate limited: Email for alert ${alert.alertId} can be sent in ${minutesLeft} minutes`)
    return false
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_FROM) {
    console.warn('Email not configured: SMTP_USER or SMTP_FROM not set')
    return false
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <div style="background: #dc2626; color: white; padding: 16px; border-radius: 6px 6px 0 0;">
        <h2 style="margin: 0; font-size: 20px;">FinDec 价格预警通知</h2>
      </div>
      <div style="padding: 20px; background: #fafafa;">
        <p style="margin: 0 0 16px 0; color: #333;"><strong>股票代码:</strong> ${alert.symbol}</p>
        <p style="margin: 0 0 16px 0; color: #333;"><strong>预警类型:</strong> ${getAlertTypeName(alert.alertType)}</p>
        <p style="margin: 0 0 16px 0; color: #333;"><strong>当前价格:</strong> <span style="color: #dc2626; font-size: 18px; font-weight: bold;">$${alert.currentPrice.toFixed(2)}</span></p>
        <p style="margin: 0 0 16px 0; color: #333;"><strong>触发条件:</strong> ${alert.threshold}</p>
        <p style="margin: 0 0 16px 0; color: #666; font-size: 14px;"><strong>触发时间:</strong> ${alert.triggeredAt.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</p>
        ${alert.targetUrl ? `<p style="margin: 16px 0 0 0;"><a href="${alert.targetUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">查看详情 →</a></p>` : ''}
      </div>
      <div style="padding: 16px; background: #f0f0f0; border-radius: 0 0 6px 6px; font-size: 12px; color: #666; text-align: center;">
        此邮件由 FinDec 美股量化分析平台自动发送
      </div>
    </div>
  `

  const text = `
FinDec 价格预警通知

股票代码: ${alert.symbol}
预警类型: ${getAlertTypeName(alert.alertType)}
当前价格: $${alert.currentPrice.toFixed(2)}
触发条件: ${alert.threshold}
触发时间: ${alert.triggeredAt.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
${alert.targetUrl ? `查看详情: ${alert.targetUrl}` : ''}

此邮件由 FinDec 美股量化分析平台自动发送
  `

  try {
    const transporter = getTransporter()
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: alert.to,
      subject: `[FinDec 预警] ${alert.symbol} 价格变动`,
      text,
      html,
    })

    if (alert.alertId) {
      recordEmailSent(alert.alertId)
    }

    console.log(`Alert email sent successfully to ${alert.to} for ${alert.symbol}`)
    return true
  } catch (error) {
    console.error('Failed to send alert email:', error)
    return false
  }
}

export async function sendTestEmail(to: string): Promise<boolean> {
  if (!process.env.SMTP_USER || !process.env.SMTP_FROM) {
    console.warn('Email not configured: SMTP_USER or SMTP_FROM not set')
    return false
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <div style="background: #2563eb; color: white; padding: 16px; border-radius: 6px 6px 0 0;">
        <h2 style="margin: 0; font-size: 20px;">FinDec 邮件测试</h2>
      </div>
      <div style="padding: 20px; background: #fafafa;">
        <p style="margin: 0; color: #333;">这是一封测试邮件，用于验证您的邮件配置是否正确。</p>
        <p style="margin: 16px 0 0 0; color: #666;">如果您收到此邮件，说明邮件服务配置成功！</p>
      </div>
      <div style="padding: 16px; background: #f0f0f0; border-radius: 0 0 6px 6px; font-size: 12px; color: #666; text-align: center;">
        FinDec 美股量化分析平台
      </div>
    </div>
  `

  try {
    const transporter = getTransporter()
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject: '[FinDec] 邮件配置测试',
      text: '这是一封测试邮件，用于验证您的邮件配置是否正确。如果您收到此邮件，说明邮件服务配置成功！',
      html,
    })
    console.log(`Test email sent successfully to ${to}`)
    return true
  } catch (error) {
    console.error('Failed to send test email:', error)
    return false
  }
}

function getAlertTypeName(type: string): string {
  const typeNames: Record<string, string> = {
    price: '价格预警',
    indicator: '指标预警',
    factor: '因子预警',
    risk: '风险预警',
    portfolio: '组合预警',
  }
  return typeNames[type] || type
}
