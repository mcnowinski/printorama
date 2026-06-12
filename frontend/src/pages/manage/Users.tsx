import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Select } from '../../components/ui/select'
import { UserPlus, Loader2, Pencil, Trash2, ArrowLeft, Copy, Sparkles } from 'lucide-react'

export default function Users() {
  const navigate = useNavigate()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '', role: 'MANAGER' })
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  const adminCount = users.filter((u) => u.role === 'ADMINISTRATOR').length

  async function loadUsers() {
    setLoading(true)
    const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false })
    setUsers(data || [])
    setLoading(false)
  }

  async function handleCreate() {
    if (!createForm.name || !createForm.email || !createForm.password) return
    setCreating(true)
    const { data, error } = await supabase.functions.invoke('admin-create-user', { body: createForm })
    if (error || data?.error) {
      console.error('Create user failed:', error || data?.error)
      setCreating(false)
      return
    }
    setShowCreate(false)
    setCreateForm({ name: '', email: '', password: '', role: 'MANAGER' })
    setCreating(false)
    loadUsers()
  }

  async function handleDelete(userId: string) {
    if (adminCount <= 1 && users.find((u) => u.id === userId)?.role === 'ADMINISTRATOR') {
      alert('Cannot remove the last administrator. Promote another user to admin first.')
      return
    }
    if (!confirm('Remove this user?')) return
    await supabase.from('users').delete().eq('id', userId)
    loadUsers()
  }

  const isLastAdmin = (userId: string) => {
    return adminCount <= 1 && users.find((u) => u.id === userId)?.role === 'ADMINISTRATOR'
  }

  function handleCopy() {
    navigator.clipboard.writeText(createForm.password)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function generatePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*'
    let pwd = ''
    for (let i = 0; i < 16; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length))
    setCreateForm({ ...createForm, password: pwd })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/manage')} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold">User Management</h1>
        </div>
        {!showCreate && (
          <Button onClick={() => setShowCreate(true)}>
            <UserPlus className="mr-2 h-4 w-4" /> Create User
          </Button>
        )}
      </div>

      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Create User</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <Input placeholder="Name" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} />
              <Input placeholder="Email" type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} />
              <div className="relative flex-1">
                <Input placeholder="Password" type="text" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} className={createForm.password ? 'pr-9' : 'pr-9'} />
                {createForm.password ? (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Copy className="h-4 w-4 cursor-pointer text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300" onClick={handleCopy} />
                    {copied && (
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-neutral-900 px-2 py-1 text-xs text-white dark:bg-neutral-100 dark:text-neutral-900">
                        Copied!
                      </span>
                    )}
                  </div>
                ) : (
                  <Sparkles className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 cursor-pointer text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300" onClick={() => generatePassword()} />
                )}
              </div>
              <Select value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}>
                <option value="MANAGER">Manager</option>
                <option value="ADMINISTRATOR">Administrator</option>
              </Select>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={handleCreate} disabled={creating || !createForm.name || !createForm.email || !createForm.password}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create
              </Button>
              <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : users.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-neutral-500">No users yet.</TableCell></TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === 'ADMINISTRATOR' ? 'info' : 'secondary'}>{u.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/manage/profile/${u.id}`)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(u.id)} disabled={isLastAdmin(u.id)} title={isLastAdmin(u.id) ? 'Cannot remove the last administrator' : 'Remove user'}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                    </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
