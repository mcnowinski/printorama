import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Select } from '../../components/ui/select'
import { UserPlus, Loader2, Pencil } from 'lucide-react'

export default function Users() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'MANAGER' })
  const [inviting, setInviting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editRole, setEditRole] = useState('')

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

  async function handleInvite() {
    setInviting(true)
    await supabase.functions.invoke('admin-create-user', { body: inviteForm })
    setShowInvite(false)
    setInviteForm({ name: '', email: '', role: 'MANAGER' })
    setInviting(false)
    loadUsers()
  }

  function startEdit(u: any) {
    setEditingId(u.id)
    setEditName(u.name)
    setEditEmail(u.email)
    setEditRole(u.role)
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function handleSaveEdit() {
    if (!editingId || !editName.trim() || !editEmail.trim()) return
    await supabase.from('users').update({
      name: editName.trim(),
      email: editEmail.trim(),
      role: editRole,
    }).eq('id', editingId)
    setEditingId(null)
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">User Management</h1>
        <Button onClick={() => setShowInvite(!showInvite)}>
          <UserPlus className="mr-2 h-4 w-4" /> Invite User
        </Button>
      </div>

      {showInvite && (
        <Card>
          <CardHeader>
            <CardTitle>Invite New User</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <Input placeholder="Name" value={inviteForm.name} onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })} />
              <Input placeholder="Email" type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} />
              <Select value={inviteForm.role} onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}>
                <option value="MANAGER">Manager</option>
                <option value="ADMINISTRATOR">Administrator</option>
              </Select>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={handleInvite} disabled={inviting || !inviteForm.name || !inviteForm.email}>
                {inviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Invite
              </Button>
              <Button variant="ghost" onClick={() => setShowInvite(false)}>Cancel</Button>
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
                  {editingId === u.id ? (
                    <>
                      <TableCell><Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 max-w-40" /></TableCell>
                      <TableCell><Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="h-8 max-w-56" /></TableCell>
                      <TableCell>
                        <Select value={editRole} onChange={(e) => setEditRole(e.target.value)} className="w-32">
                          <option value="MANAGER">Manager</option>
                          <option value="ADMINISTRATOR">Admin</option>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={handleSaveEdit} className="text-xs">Save</Button>
                          <Button variant="ghost" size="sm" onClick={cancelEdit} className="text-xs">Cancel</Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === 'ADMINISTRATOR' ? 'info' : 'secondary'}>{u.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => startEdit(u)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(u.id)}
                            disabled={isLastAdmin(u.id)}
                            title={isLastAdmin(u.id) ? 'Cannot remove the last administrator' : 'Remove user'}
                          >
                            <span className="text-red-500 text-lg leading-none">&times;</span>
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
