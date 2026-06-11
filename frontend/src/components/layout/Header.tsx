import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Printer } from 'lucide-react'
import { Button } from '../ui/button'

export function Header() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-white/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold">
          <Printer className="h-6 w-6" />
          Print-O-Rama
        </Link>
        <nav className="flex items-center gap-4">
          {user ? (
            <>
              <span className="text-sm text-neutral-400">{profile?.name}</span>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                Sign Out
              </Button>
            </>
          ) : (
            <Link to="/login">
              <Button variant="default" size="sm">Sign In</Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
