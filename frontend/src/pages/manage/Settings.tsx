import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table'
import { Plus, Trash2, Loader2, Pencil } from 'lucide-react'

const CATEGORIES = [
  { value: 'JOB_STATUS', label: 'Job Status' },
  { value: 'FILAMENT_TYPE', label: 'Filament Type' },
  { value: 'FILAMENT_COLOR', label: 'Filament Color' },
]

const statusBadge: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
  ONLINE: 'success',
  OFFLINE: 'destructive',
} as any

export default function Settings() {
  const [settings, setSettings] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  const [category, setCategory] = useState(CATEGORIES[0].value)
  const [options, setOptions] = useState<any[]>([])
  const [newLabel, setNewLabel] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editSort, setEditSort] = useState(0)

  const [printers, setPrinters] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [printerSaving, setPrinterSaving] = useState(false)
  const [printerForm, setPrinterForm] = useState({ name: '', brand: '', model: '', location: '', status: 'ONLINE', notes: '' })

  useEffect(() => {
    supabase.from('system_settings').select('*').limit(1).single().then(({ data }) => {
      if (data) setSettings(data)
    })
    loadPrinters()
  }, [])

  useEffect(() => {
    loadOptions()
  }, [category])

  async function loadOptions() {
    const { data } = await supabase
      .from('dropdown_options')
      .select('*')
      .eq('category', category)
      .order('sort_order')

    setOptions(data || [])
  }

  async function loadPrinters() {
    supabase.from('printers').select('*').order('name').then(({ data }) => {
      setPrinters(data || [])
    })
  }

  async function handleSave() {
    if (!settings) return
    setSaving(true)
    await supabase.from('system_settings').update(settings).eq('id', settings.id)
    setSaving(false)
  }

  async function handleAdd() {
    if (!newLabel.trim()) return
    setAdding(true)

    const maxOrder = options.reduce((max, o) => Math.max(max, o.sort_order), 0)
    await supabase.from('dropdown_options').insert({
      category,
      label: newLabel.trim(),
      sort_order: maxOrder + 1,
    })

    setNewLabel('')
    setAdding(false)
    loadOptions()
  }

  async function handleDelete(id: string) {
    await supabase.from('dropdown_options').delete().eq('id', id)
    loadOptions()
  }

  function startEdit(id: string, label: string, sortOrder: number) {
    setEditingId(id)
    setEditLabel(label)
    setEditSort(sortOrder)
  }

  async function handleSaveEdit(id: string) {
    if (!editLabel.trim()) return
    await supabase.from('dropdown_options').update({ label: editLabel.trim(), sort_order: editSort }).eq('id', id)
    setEditingId(null)
    loadOptions()
  }

  function cancelEdit() {
    setEditingId(null)
    setEditLabel('')
    setEditSort(0)
  }

  async function handleAddPrinter() {
    setPrinterSaving(true)
    await supabase.from('printers').insert({
      name: printerForm.name,
      brand: printerForm.brand,
      model: printerForm.model,
      location: printerForm.location,
      status: printerForm.status,
      notes: printerForm.notes,
    })
    setShowForm(false)
    setPrinterForm({ name: '', brand: '', model: '', location: '', status: 'ONLINE', notes: '' })
    setPrinterSaving(false)
    loadPrinters()
  }

  async function handleDeletePrinter(id: string) {
    if (!confirm('Delete this printer?')) return
    await supabase.from('printers').delete().eq('id', id)
    loadPrinters()
  }

  if (!settings) return <div className="py-12 text-center text-neutral-500">Loading...</div>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-neutral-500">System configuration, printer management, and dropdown lists</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Printers</CardTitle>
          <CardDescription>Manage the 3D printer fleet.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={() => setShowForm(!showForm)} size="sm">
            <Plus className="mr-2 h-4 w-4" /> Add Printer
          </Button>

          {showForm && (
            <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
              <div className="space-y-2">
                <Label>Printer Name</Label>
                <Input value={printerForm.name} onChange={(e) => setPrinterForm({ ...printerForm, name: e.target.value })} placeholder="Prusa MK4 #1" />
              </div>
              <div className="space-y-2">
                <Label>Brand</Label>
                <Input value={printerForm.brand} onChange={(e) => setPrinterForm({ ...printerForm, brand: e.target.value })} placeholder="Prusa" />
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Input value={printerForm.model} onChange={(e) => setPrinterForm({ ...printerForm, model: e.target.value })} placeholder="MK4" />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={printerForm.location} onChange={(e) => setPrinterForm({ ...printerForm, location: e.target.value })} placeholder="Lab 310, Shelf A" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="printerStatus"
                      value="ONLINE"
                      checked={printerForm.status === 'ONLINE'}
                      onChange={(e) => setPrinterForm({ ...printerForm, status: e.target.value })}
                      className="accent-neutral-900"
                    />
                    <span className="text-sm">Online</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="printerStatus"
                      value="OFFLINE"
                      checked={printerForm.status === 'OFFLINE'}
                      onChange={(e) => setPrinterForm({ ...printerForm, status: e.target.value })}
                      className="accent-neutral-900"
                    />
                    <span className="text-sm">Offline</span>
                  </label>
                </div>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Notes</Label>
                <Input value={printerForm.notes} onChange={(e) => setPrinterForm({ ...printerForm, notes: e.target.value })} placeholder="Calibration needed, etc." />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={handleAddPrinter} disabled={printerSaving || !printerForm.name}>
                  {printerSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Printer
                </Button>
                <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {printers.map((p) => (
                <TableRow key={p.id} className={p.status === 'OFFLINE' ? 'opacity-50' : ''}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.brand}</TableCell>
                  <TableCell>{p.model}</TableCell>
                  <TableCell>{p.location}</TableCell>
                  <TableCell>
                    <Badge variant={(statusBadge[p.status] || 'default') as any}>{p.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-neutral-500 max-w-48 truncate">{p.notes || '—'}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => handleDeletePrinter(p.id)}>Remove</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Job Submissions</CardTitle>
          <CardDescription>Control how students submit print jobs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Job Requests Open</Label>
              <p className="text-sm text-neutral-500">Allow students to submit new print jobs.</p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={settings.requests_open}
                onChange={(e) => setSettings({ ...settings, requests_open: e.target.checked })}
              />
              <div className="h-6 w-11 rounded-full bg-neutral-300 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-neutral-900 peer-checked:after:translate-x-full dark:bg-neutral-700 peer-checked:dark:bg-neutral-100" />
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Email Confirmation Required</Label>
              <p className="text-sm text-neutral-500">Students must click a confirmation link in their email before the job is queued.</p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={settings.email_confirmation_required}
                onChange={(e) => setSettings({ ...settings, email_confirmation_required: e.target.checked })}
              />
              <div className="h-6 w-11 rounded-full bg-neutral-300 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-neutral-900 peer-checked:after:translate-x-full dark:bg-neutral-700 peer-checked:dark:bg-neutral-100" />
            </label>
          </div>

          <div>
            <Label className="text-base">Max Jobs Per Day Per Email</Label>
            <p className="text-sm text-neutral-500">Limit the number of submissions from a single email address per day.</p>
            <input
              type="number"
              min={1}
              max={20}
              className="mt-2 w-24 rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"
              value={settings.max_jobs_per_day}
              onChange={(e) => setSettings({ ...settings, max_jobs_per_day: parseInt(e.target.value) || 1 })}
            />
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Options</CardTitle>
          <CardDescription>Manage the options available in dropdown selectors throughout the site.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-64">
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </Select>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Sort Order</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {options.map((o) => (
                <TableRow key={o.id}>
                  {editingId === o.id ? (
                    <>
                      <TableCell>
                        <Input
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          className="h-8 max-w-48"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={editSort}
                          onChange={(e) => setEditSort(parseInt(e.target.value) || 0)}
                          className="h-8 w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleSaveEdit(o.id)} className="text-xs">Save</Button>
                          <Button variant="ghost" size="sm" onClick={cancelEdit} className="text-xs">Cancel</Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="font-medium">{o.label}</TableCell>
                      <TableCell>{o.sort_order}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => startEdit(o.id, o.label, o.sort_order)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(o.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex gap-2">
            <Input
              placeholder="New option label..."
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="max-w-sm"
            />
            <Button onClick={handleAdd} disabled={adding || !newLabel.trim()}>
              {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Plus className="mr-2 h-4 w-4" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
