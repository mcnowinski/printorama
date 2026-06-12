import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import { useAuth } from '../contexts/AuthContext'
import { Printer, Search } from 'lucide-react'

export default function Landing() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate('/manage', { replace: true })
  }, [user, navigate])

  if (loading) return null
  return (
    <div className="flex flex-col items-center gap-12 py-12">
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          Print-O-Rama
        </h1>
        <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">
          Ut Prosim Solidus
        </p>
      </div>

      <div className="grid w-full max-w-3xl gap-6 sm:grid-cols-2">
        <Card className="text-center">
          <CardHeader>
            <Printer className="mx-auto h-8 w-8 text-neutral-500" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Link to="/request">
              <Button className="w-full">Submit Request</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardHeader>
            <Search className="mx-auto h-8 w-8 text-neutral-500" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Link to="/status">
              <Button variant="outline" className="w-full">Check Status</Button>
            </Link>
          </CardContent>
        </Card>

        {/* <Card className="text-center">
          <CardHeader>
            <ClipboardList className="mx-auto h-8 w-8 text-neutral-500" />
            <CardTitle className="text-lg">Staff Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-neutral-500">
              Managers and administrators sign in to manage jobs and printers.
            </p>
            <Link to="/login">
              <Button variant="outline" className="w-full">Sign In</Button>
            </Link>
          </CardContent>
        </Card> */}
      </div>
    </div>
  )
}
