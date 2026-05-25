import { useEffect, useState } from 'react'
import { usePortalAuth } from '../auth'
import { usePortalToast } from '../toast'
import { Input, PortalButton, PortalCard } from '../ui'

export function SettingsPage() {
  const { user, logout, updateProfile, changePassword } = usePortalAuth()
  const toast = usePortalToast()
  const [profile, setProfile] = useState({ name: '', email: '' })
  const [profileSaving, setProfileSaving] = useState(false)
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setProfile({ name: user?.name || '', email: user?.email || '' })
  }, [user])

  const canSaveProfile =
    profile.name.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim()) &&
    (profile.name.trim() !== (user?.name || '') || profile.email.trim() !== (user?.email || ''))

  const canChange = pw.current.trim().length >= 2 && pw.next.trim().length >= 4 && pw.next === pw.confirm

  const handleProfile = async () => {
    if (!canSaveProfile) return
    setProfileSaving(true)
    try {
      await updateProfile({ name: profile.name.trim(), email: profile.email.trim() })
      toast.push({ tone: 'success', title: 'Profile updated successfully' })
    } catch (e) {
      toast.push({ tone: 'error', title: e instanceof Error ? e.message : 'Failed to update profile' })
    } finally {
      setProfileSaving(false)
    }
  }

  const handlePw = async () => {
    if (!canChange) return
    setSaving(true)
    try {
      await changePassword(pw.current, pw.next)
      toast.push({ tone: 'success', title: 'Password changed successfully' })
      setPw({ current: '', next: '', confirm: '' })
    } catch (e) { toast.push({ tone: 'error', title: e instanceof Error ? e.message : 'Failed' }) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <PortalCard>
        <div className="text-2xl font-extrabold text-slate-900">Settings</div>
        <div className="text-sm text-slate-500">Manage your account</div>
      </PortalCard>

      <PortalCard>
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-lg font-extrabold text-slate-900">My Profile</div>
            <div className="text-xs font-semibold text-slate-400">Forgot password temporary password isi email par jayega</div>
          </div>
          <PortalButton
            variant="outline"
            className="px-3 py-2 text-xs"
            onClick={() => setProfile({ name: user?.name || '', email: user?.email || '' })}
            disabled={!canSaveProfile || profileSaving}
          >
            Reset
          </PortalButton>
        </div>
        <div className="grid gap-4 text-sm">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
            <span className="text-slate-500 font-semibold">User ID</span>
            <span className="text-slate-900 font-bold">{user?.userId || '—'}</span>
          </div>
          <Input label="Name" value={profile.name} onChange={v => setProfile(s => ({ ...s, name: v }))} required />
          <Input label="Email ID" value={profile.email} onChange={v => setProfile(s => ({ ...s, email: v }))} type="email" required />
          {profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim()) && (
            <div className="-mt-2 text-xs font-semibold text-red-500">Valid email ID required hai</div>
          )}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
            <span className="text-slate-500 font-semibold">Role</span>
            <span className="text-slate-900 font-bold capitalize">{user?.role || '—'}</span>
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <PortalButton onClick={handleProfile} disabled={!canSaveProfile || profileSaving}>
            {profileSaving ? 'Saving...' : 'Save Profile'}
          </PortalButton>
        </div>
      </PortalCard>

      <PortalCard>
        <div className="text-lg font-extrabold text-slate-900 mb-1">Change Password</div>
        <div className="text-xs text-slate-400 mb-4">Minimum 4 characters for new password</div>
        <div className="grid gap-4">
          <Input label="Current Password" value={pw.current} onChange={v => setPw(s => ({ ...s, current: v }))} type="password" />
          <Input label="New Password" value={pw.next} onChange={v => setPw(s => ({ ...s, next: v }))} type="password" />
          <Input label="Confirm Password" value={pw.confirm} onChange={v => setPw(s => ({ ...s, confirm: v }))} type="password" />
        </div>
        {pw.next && pw.confirm && pw.next !== pw.confirm && (
          <div className="mt-2 text-xs font-semibold text-red-500">Passwords don't match</div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <PortalButton variant="outline" onClick={() => setPw({ current: '', next: '', confirm: '' })}>Reset</PortalButton>
          <PortalButton onClick={handlePw} disabled={!canChange || saving}>{saving ? 'Saving...' : 'Change Password'}</PortalButton>
        </div>
      </PortalCard>

      <PortalCard className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-bold text-slate-900">Logout</div>
          <div className="text-xs text-slate-400">Signed in as {user?.userId || 'admin'}</div>
        </div>
        <PortalButton variant="danger" onClick={logout}>Logout</PortalButton>
      </PortalCard>
    </div>
  )
}
