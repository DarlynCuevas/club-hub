import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export default function RoleRedirect() {
  const { role } = useAuth()

  if (!role) return null

  switch (role) {
    case 'player':
      return <Navigate to="/dashboard/player" replace />
    case 'parent':
      return <Navigate to="/dashboard/parent" replace />
    case 'coach':
      return <Navigate to="/teams" replace />
    default:
      return <Navigate to="/" replace />
  }
}
