import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

const NAV_ITEMS = [
  { to: '/', label: 'Portefeuille', end: true },
  { to: '/factures', label: 'Factures', end: false },
  { to: '/validations', label: 'File de validation', end: false },
  { to: '/securite', label: 'Sécurité', end: false },
]

export function Layout() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen">
      <header className="bg-primary text-primary-foreground shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
          <span className="text-lg font-bold tracking-tight">Kalonia</span>
          <nav className="flex gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'text-primary-foreground/75 hover:bg-primary-foreground/10 hover:text-primary-foreground',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-primary-foreground/85 hover:bg-primary-foreground/10 hover:text-primary-foreground"
            onClick={handleLogout}
          >
            Déconnexion
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-6">
        <Outlet />
      </main>
    </div>
  )
}
