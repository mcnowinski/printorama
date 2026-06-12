import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Layout } from './components/layout/Layout'
import Landing from './pages/Landing'
import Request from './pages/Request'
import Status from './pages/Status'
import StatusDetail from './pages/StatusDetail'
import Login from './pages/Login'
import Dashboard from './pages/manage/Dashboard'
import ManageJobDetail from './pages/manage/JobDetail'
import Users from './pages/manage/Users'
import Settings from './pages/manage/Settings'

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return
    if (!user || !profile) navigate('/login', { replace: true })
    else if (adminOnly && profile.role !== 'ADMINISTRATOR') navigate('/manage', { replace: true })
  }, [user, profile, loading, adminOnly, navigate])

  if (loading) return <div className="py-24 text-center text-neutral-500">Loading...</div>
  if (!user || !profile) return null
  if (adminOnly && profile.role !== 'ADMINISTRATOR') return null

  return <>{children}</>
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/request" element={<Request />} />
            <Route path="/status" element={<Status />} />
            <Route path="/status/:id" element={<StatusDetail />} />
            <Route path="/login" element={<Login />} />

            <Route path="/manage" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/manage/jobs/:id" element={
              <ProtectedRoute>
                <ManageJobDetail />
              </ProtectedRoute>
            } />
            <Route path="/manage/users" element={
              <ProtectedRoute adminOnly>
                <Users />
              </ProtectedRoute>
            } />
            <Route path="/manage/settings" element={
              <ProtectedRoute adminOnly>
                <Settings />
              </ProtectedRoute>
            } />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
