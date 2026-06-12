import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Label } from '../../components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { ArrowLeft, Loader2, Copy, Sparkles } from 'lucide-react'

export default function Profile() {
  const { id } = useParams()
  const { user: self, profile: selfProfile } = useAuth()
  const navigate = useNavigate()
  const isAdminView = id && id !== self?.id

  const [targetProfile, setTargetProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('MANAGER')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [resetPwd, setResetPwd] = useState('')
  const [resetCopied, setResetCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (isAdminView && id) {
      supabase.from('users').select('*').eq('id', id).single().then(({ data }) => {
        if (data) {
          setTargetProfile(data)
          setName(data.name)
          setEmail(data.email)
          setRole(data.role)
        }
        setLoading(false)
      })
    } else if (selfProfile) {
      setName(selfProfile.name)
      setEmail(selfProfile.email)
      setLoading(false)
    } else {
      setLoading(false)
    }
  }, [id, selfProfile, isAdminView])

  function generateResetPwd() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*'
    let pwd = ''
    for (let i = 0; i < 16; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length))
    setResetPwd(pwd)
  }

  function handleCopyReset() {
    navigator.clipboard.writeText(resetPwd)
    setResetCopied(true)
    setTimeout(() => setResetCopied(false), 1500)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    if (isAdminView && id) {
      const updates: any = {}
      if (name !== targetProfile.name) updates.name = name.trim()
      if (email !== targetProfile.email) updates.email = email.trim()
      if (role !== targetProfile.role) updates.role = role

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase.from('users').update(updates).eq('id', id)
        if (error) {
          setMessage({ type: 'error', text: error.message })
          setSaving(false)
          return
        }
      }

      if (resetPwd) {
        const { data, error } = await supabase.functions.invoke('admin-reset-password', {
          body: { userId: id, password: resetPwd },
        })
        if (error || data?.error) {
          setMessage({ type: 'error', text: error || data?.error })
          setSaving(false)
          return
        }
        setResetPwd('')
      }
    } else {
      if (name !== selfProfile?.name) {
        const { error } = await supabase.from('users').update({ name: name.trim() }).eq('id', self?.id)
        if (error) {
          setMessage({ type: 'error', text: error.message })
          setSaving(false)
          return
        }
      }

      if (currentPassword && newPassword) {
        const { error } = await supabase.auth.updateUser({ password: newPassword })
        if (error) {
          setMessage({ type: 'error', text: error.message })
          setSaving(false)
          return
        }
        setCurrentPassword('')
        setNewPassword('')
      }
    }

    setMessage({ type: 'success', text: 'Saved.' })
    setSaving(false)
  }

  if (loading) return <div className="py-24 text-center text-neutral-500">Loading...</div>

  const displayName = isAdminView ? (targetProfile?.name || 'User') : 'Profile'

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(isAdminView ? '/manage/users' : '/manage')} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold">{displayName}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isAdminView ? 'Edit User' : 'Account'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              {isAdminView ? (
                <Input value={email} onChange={(e) => setEmail(e.target.value)} />
              ) : (
                <Input value={email} disabled className="text-neutral-500" />
              )}
            </div>

            {isAdminView && (
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMINISTRATOR">Administrator</option>
                </Select>
              </div>
            )}

            {isAdminView ? (
              <>
                <hr className="border-neutral-200 dark:border-neutral-800" />
                <div className="space-y-2">
                  <Label>Reset password</Label>
                  <div className="relative">
                    <Input type="text" value={resetPwd} onChange={(e) => setResetPwd(e.target.value)} placeholder="Leave blank to keep same" className="pr-9" />
                    {resetPwd ? (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Copy className="h-4 w-4 cursor-pointer text-neutral-400 hover:text-neutral-600" onClick={handleCopyReset} />
                        {resetCopied && (
                          <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-neutral-900 px-2 py-1 text-xs text-white dark:bg-neutral-100 dark:text-neutral-900">Copied!</span>
                        )}
                      </div>
                    ) : (
                      <Sparkles className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 cursor-pointer text-neutral-400 hover:text-neutral-600" onClick={generateResetPwd} />
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <hr className="border-neutral-200 dark:border-neutral-800" />
                <div className="space-y-2">
                  <Label>Current password</Label>
                  <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Leave blank to keep same" />
                </div>
                <div className="space-y-2">
                  <Label>New password</Label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Leave blank to keep same" />
                </div>
              </>
            )}

            {message && (
              <p className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{message.text}</p>
            )}

            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
