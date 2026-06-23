import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import Users from '../pages/manage/Users'

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

function renderUsers() {
  return render(
    <BrowserRouter>
      <Users />
    </BrowserRouter>
  )
}

describe('User Management', () => {
  beforeEach(() => {
    renderUsers()
  })

  it('renders the heading', () => {
    expect(screen.getByText('User Management')).toBeInTheDocument()
  })

  it('shows the Add User button', () => {
    expect(screen.getByText('Add User')).toBeInTheDocument()
  })

  it('displays users from the database', async () => {
    expect(await screen.findByText('Admin')).toBeInTheDocument()
    expect(await screen.findByText('Manager One')).toBeInTheDocument()
  })

  it('shows the add user form when button is clicked', async () => {
    const user = userEvent.setup()
    await user.click(screen.getByText('Add User'))
    expect(screen.getByPlaceholderText('Name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
  })

  it('can add a new user', async () => {
    const user = userEvent.setup()
    await user.click(screen.getByText('Add User'))

    await user.type(screen.getByPlaceholderText('Name'), 'New Manager')
    await user.type(screen.getByPlaceholderText('Email'), 'new@vt.edu')
    await user.type(screen.getByPlaceholderText('Password'), 'temp123')

    await user.click(screen.getByText('Create'))

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Name')).not.toBeInTheDocument()
    })
  })

  it('shows edit icons for each user', async () => {
    const pencils = await screen.findAllByRole('button', { name: /edit user/i })
    expect(pencils.length).toBeGreaterThanOrEqual(2)
  })

  it('shows delete icons for each user', async () => {
    const trash = await screen.findAllByRole('button', { name: /delete user/i })
    expect(trash.length).toBeGreaterThanOrEqual(2)
  })
})
