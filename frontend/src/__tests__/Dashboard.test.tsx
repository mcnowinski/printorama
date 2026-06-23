import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

  it('opens the Add Job form when clicking the button', async () => {
    const user = userEvent.setup()
    const buttons = screen.getAllByText('Add Job')
    await user.click(buttons[0])
    expect(screen.getByPlaceholderText('My Job')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Jane Doe')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('jane@doe.com')).toBeInTheDocument()
  })

  it('submits a new job with filled fields', async () => {
    const user = userEvent.setup()
    const openBtn = screen.getAllByText('Add Job')
    await user.click(openBtn[0])

    await user.type(screen.getByPlaceholderText('My Job'), 'Test Manual Job')
    await user.type(screen.getByPlaceholderText('Jane Doe'), 'Charlie')
    await user.type(screen.getByPlaceholderText('jane@doe.com'), 'charlie@vt.edu')

    const submitBtns = screen.getAllByText('Add Job')
    await user.click(submitBtns[submitBtns.length - 1])

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('My Job')).not.toBeInTheDocument()
    })
  })

  it('shows job type options in the Add Job form', async () => {
    const user = userEvent.setup()
    const buttons = screen.getAllByText('Add Job')
    await user.click(buttons[0])
    expect(await screen.findByText('3D Printing')).toBeInTheDocument()
    expect(await screen.findByText('Laser Cut')).toBeInTheDocument()
  })
})
