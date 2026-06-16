import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Dashboard from '../pages/manage/Dashboard'

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1' },
    profile: { id: 'u1', name: 'Admin', email: 'admin@vt.edu', role: 'ADMINISTRATOR' },
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

function renderDashboard() {
  return render(
    <BrowserRouter>
      <Dashboard />
    </BrowserRouter>
  )
}

describe('Dashboard', () => {
  beforeEach(() => {
    renderDashboard()
  })

  it('shows the dashboard heading', () => {
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('shows admin management links', () => {
    expect(screen.getByText('User Management')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('shows the job list heading', () => {
    expect(screen.getByText('Job List')).toBeInTheDocument()
  })

  it('displays job titles from the jobs table', async () => {
    expect(await screen.findByText('Test Print')).toBeInTheDocument()
    expect(await screen.findByText('Phone Case')).toBeInTheDocument()
  })

  it('displays pending queue items', async () => {
    expect(await screen.findByText('My Part')).toBeInTheDocument()
    const pending = await screen.findAllByText('PENDING')
    expect(pending.length).toBeGreaterThan(0)
  })

  it('shows Add Job button', () => {
    expect(screen.getByText('Add Job')).toBeInTheDocument()
  })
})
