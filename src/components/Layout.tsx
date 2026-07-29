import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/', label: 'Portefeuille', end: true },
  { to: '/validations', label: 'File de validation', end: false },
]

export function Layout() {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
          <span className="font-semibold">Dashboard agence IA</span>
          <nav className="flex gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-6">
        <Outlet />
      </main>
    </div>
  )
}
