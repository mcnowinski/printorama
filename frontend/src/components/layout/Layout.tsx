import { Outlet } from 'react-router-dom'
import { Header } from './Header'

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 dark:bg-neutral-950">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-neutral-200 py-4 text-center text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
        Print-O-Rama &mdash; Ut Prosim Solidus
      </footer>
    </div>
  )
}
