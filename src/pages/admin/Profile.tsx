import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import {
  User,
  LogOut,
  Settings,
  HelpCircle,
  Shield,
  ChevronRight,
  Calendar,
} from 'lucide-react'
import { UserRole } from '@/types'
import LanguageSwitcher from '@/components/ui/language'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useState as useReactState } from 'react'

export default function Profile() {
  const { t } = useTranslation()
  const { user, role, setRole, logout, clubId } = useAuth()
  const navigate = useNavigate()
  const [club, setClub] = useState<{ name: string, logo_url?: string, primary_color?: string } | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editLogo, setEditLogo] = useState('')
  const [editColor, setEditColor] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function fetchClub() {
      if (!clubId) return

        const { data, error } = await supabase
          .from('clubs')
          .select('name, logo_url, primary_color')
          .eq('id', clubId)
          .maybeSingle()
        if (!error && data) setClub(data)
        if (data) {
          setEditName(data.name || '')
          setEditLogo(data.logo_url || '')
          setEditColor(data.primary_color || '')
        }
    }

    fetchClub()
  }, [clubId])

    const handleEditClub = async () => {
      setSaving(true)
      const { error } = await supabase
        .from('clubs')
        .update({ name: editName, logo_url: editLogo, primary_color: editColor })
        .eq('id', clubId)
      setSaving(false)
      if (!error) {
        setClub({ ...club, name: editName, logo_url: editLogo, primary_color: editColor })
        setEditOpen(false)
      }
    }
  const handleLogout = () => {
    logout()
    navigate('/')
  }

  // Role switcher for demo purposes
  const roles: UserRole[] = ['parent', 'coach', 'player']
  const canManageEvents =
    role === 'super_admin' || role === 'coach'

  const [accountOpen, setAccountOpen] = useReactState(false)
  const menuItems = [
    ...(canManageEvents
      ? [
        {
          icon: Calendar,
          label: 'Manage events',
          action: () => navigate('/admin/events'),
        },
      ]
      : []),
    {
      icon: Settings,
      label: 'Account Settings',
      action: () => setAccountOpen((v) => !v),
    },
    { icon: Shield, label: 'Privacy', action: () => { } },
    { icon: HelpCircle, label: 'Help & Support', action: () => { } },
  ];


  return (
    <div className="px-4 pt-6 pb-6 space-y-6">
      {/* Profile Header */}
      <Card className="shadow-card">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                {club?.logo_url ? (
                  <img src={club.logo_url} alt="Club logo" className="w-12 h-12 object-contain" />
                ) : (
                  <User className="w-8 h-8 text-primary" />
                )}
              </div>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-foreground">
                {user?.firstName} {user?.lastName}
              </h1>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="capitalize">
                  {role}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {club?.name || ''}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

        {/* Modal Editar Club */}
        {role === 'super_admin' && (
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar club</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nombre del club</label>
                  <input
                    className="w-full border rounded px-3 py-2"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Logo (URL)</label>
                  <input
                    className="w-full border rounded px-3 py-2"
                    value={editLogo}
                    onChange={e => setEditLogo(e.target.value)}
                  />
                  {editLogo && (
                    <img src={editLogo} alt="Preview" className="mt-2 w-16 h-16 object-contain" />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Color principal</label>
                  <input
                    className="w-full border rounded px-3 py-2"
                    value={editColor}
                    onChange={e => setEditColor(e.target.value)}
                    placeholder="#123456"
                  />
                </div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={handleEditClub} disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar'}
                  </Button>
                  <Button variant="outline" onClick={() => setEditOpen(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      {/* Role Switcher (Demo) */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          {t('profile.demoSwitchRole')}
        </h2>
        <Card className="shadow-card">
          <CardContent className="p-2">
            <div className="flex gap-2">
              {roles.map((r) => (
                <Button
                  key={r}
                  variant={role === r ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setRole(r)}
                  className="flex-1 capitalize"
                >
                  {t(`roles.${r}`)}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Language */}
      <Card className="shadow-card">
        <CardContent className="p-4 space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {t('profile.language')}
          </h2>
          <LanguageSwitcher />
        </CardContent>
      </Card>

      {/* Menu Items */}
      <Card className="shadow-card">
        <CardContent className="p-0 divide-y divide-border">
          {menuItems.map((item) => (
            <div key={item.label}>
              <button
                onClick={item.action}
                className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
              >
                <item.icon className="w-5 h-5 text-muted-foreground" />
                <span className="flex-1 font-medium text-foreground">
                  {item.label}
                </span>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
              {/* Account Settings dropdown */}
              {item.label === 'Account Settings' && accountOpen && role === 'super_admin' && (
                <div className="bg-muted/10 p-4">
                  <Button variant="outline" onClick={() => setEditOpen(true)}>
                    Editar club
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Logout */}
      <Button
        variant="outline"
        className="w-full h-12 text-destructive hover:text-destructive hover:bg-destructive/5"
        onClick={handleLogout}
      >
        <LogOut className="w-5 h-5 mr-2" />
        {t('profile.signOut')}
      </Button>

      {/* App Version */}
      <p className="text-center text-xs text-muted-foreground">
        {t('profile.version', { version: '1.0.0' })}
      </p>
    </div>
  )
}
