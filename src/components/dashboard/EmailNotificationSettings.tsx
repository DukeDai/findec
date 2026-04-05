'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { AlertCircle, Check, Mail, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UserEmailConfig {
  email: string | null
  emailAlertsEnabled: boolean
  lastEmailSentAt: string | null
}

export function EmailNotificationSettings() {
  const [config, setConfig] = useState<UserEmailConfig>({
    email: null,
    emailAlertsEnabled: false,
    lastEmailSentAt: null,
  })
  const [emailInput, setEmailInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/user-config')
      if (res.ok) {
        const data = await res.json()
        setConfig({
          email: data.email || null,
          emailAlertsEnabled: data.emailAlertsEnabled || false,
          lastEmailSentAt: data.lastEmailSentAt || null,
        })
        if (data.email) {
          setEmailInput(data.email)
        }
      }
    } catch (error) {
      console.error('Failed to load config:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async () => {
    if (emailInput && !isValidEmail(emailInput)) {
      setMessage({ type: 'error', text: '请输入有效的邮箱地址' })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch('/api/user-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailInput || null,
          emailAlertsEnabled: config.emailAlertsEnabled,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setConfig({
          email: data.email || null,
          emailAlertsEnabled: data.emailAlertsEnabled || false,
          lastEmailSentAt: config.lastEmailSentAt,
        })
        setMessage({ type: 'success', text: '设置已保存' })
      } else {
        const error = await res.json()
        setMessage({ type: 'error', text: error.error || '保存失败' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '保存失败' })
    } finally {
      setSaving(false)
    }
  }

  const toggleEmailAlerts = async (enabled: boolean) => {
    if (enabled && !config.email) {
      setMessage({ type: 'error', text: '请先设置邮箱地址' })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch('/api/user-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailAlertsEnabled: enabled }),
      })

      if (res.ok) {
        const data = await res.json()
        setConfig(prev => ({
          ...prev,
          emailAlertsEnabled: data.emailAlertsEnabled || false,
        }))
        setMessage({ type: 'success', text: enabled ? '邮件通知已启用' : '邮件通知已禁用' })
      } else {
        const error = await res.json()
        setMessage({ type: 'error', text: error.error || '更新失败' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '更新失败' })
    } finally {
      setSaving(false)
    }
  }

  const sendTestEmail = async () => {
    if (!emailInput || !isValidEmail(emailInput)) {
      setMessage({ type: 'error', text: '请输入有效的邮箱地址' })
      return
    }

    setTesting(true)
    setMessage(null)

    try {
      const res = await fetch('/api/user-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          email: emailInput,
        }),
      })

      if (res.ok) {
        setMessage({ type: 'success', text: '测试邮件已发送，请查收' })
      } else {
        const error = await res.json()
        setMessage({ type: 'error', text: error.error || '发送失败，请检查SMTP配置' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '发送失败' })
    } finally {
      setTesting(false)
    }
  }

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          邮件通知设置
        </CardTitle>
        <CardDescription>
          配置邮件通知，当预警触发时自动发送邮件提醒
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!smtpConfigured && (
          <div className="flex items-start gap-2 rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <p className="font-medium">SMTP 未配置</p>
              <p className="text-yellow-700">
                请在环境变量中配置 SMTP 设置后才能发送邮件。
                需要设置：SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
              </p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            通知邮箱
          </label>
          <div className="flex gap-2">
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              disabled={loading}
            />
            <Button
              variant="outline"
              onClick={sendTestEmail}
              disabled={testing || loading || !emailInput}
            >
              {testing ? '发送中...' : '发送测试邮件'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            当预警触发时，系统将发送邮件到此地址
          </p>
        </div>

        <div className="flex items-center justify-between space-y-0">
          <div className="space-y-0.5">
            <label htmlFor="email-alerts" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              启用邮件通知
            </label>
            <p className="text-xs text-muted-foreground">
              预警触发时自动发送邮件通知
            </p>
          </div>
          <Switch
            id="email-alerts"
            checked={config.emailAlertsEnabled}
            onCheckedChange={toggleEmailAlerts}
            disabled={saving || !config.email}
          />
        </div>

        {config.lastEmailSentAt && (
          <div className="text-xs text-muted-foreground">
            上次发送时间: {new Date(config.lastEmailSentAt).toLocaleString('zh-CN')}
          </div>
        )}

        {message && (
          <div
            className={`flex items-center gap-2 rounded-md p-3 text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
            }`}
          >
            {message.type === 'success' ? (
              <Check className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            {message.text}
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={saveConfig} disabled={saving || loading}>
            {saving ? '保存中...' : '保存设置'}
          </Button>
        </div>

        <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1 font-medium mb-2">
            <Settings className="h-3 w-3" />
            SMTP 配置说明
          </div>
          <ul className="space-y-1">
            <li>SMTP_HOST: SMTP 服务器地址 (如 smtp.gmail.com)</li>
            <li>SMTP_PORT: 端口号 (通常是 587 或 465)</li>
            <li>SMTP_USER: 邮箱用户名</li>
            <li>SMTP_PASS: 邮箱密码或应用专用密码</li>
            <li>SMTP_FROM: 发件人地址</li>
          </ul>
          <p className="mt-2">
            支持 Gmail、SendGrid、AWS SES 等兼容 SMTP 的服务
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
