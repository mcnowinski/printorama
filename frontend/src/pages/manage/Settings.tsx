import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table'
import { Plus, Trash2, Loader2, Pencil, ArrowLeft } from 'lucide-react'
import { Dialog, ConfirmDialog } from '../../components/ui/dialog'

const CATEGORIES = [
  { value: 'JOB_STATUS', label: 'Job Status' },
  { value: 'FILAMENT_TYPE', label: 'Filament Type' },
  { value: 'FILAMENT_COLOR', label: 'Filament Color' },
  { value: 'ACCEPTED_FILE_TYPE', label: 'Accepted File Type' },
]

const statusBadge: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
  ONLINE: 'success',
  OFFLINE: 'destructive',
} as any

export default function Settings() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  const [category, setCategory] = useState(CATEGORIES[0].value)
  const [options, setOptions] = useState<any[]>([])
  const [newLabel, setNewLabel] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editSort, setEditSort] = useState(0)
  const [optPage, setOptPage] = useState(0)
  const [optPageSize, setOptPageSize] = useState(20)

  const [printers, setPrinters] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [printerSaving, setPrinterSaving] = useState(false)
  const [printerError, setPrinterError] = useState<string | null>(null)
  const [printerForm, setPrinterForm] = useState({ name: '', brand: '', model: '', location: '', status: 'ONLINE', notes: '' })
  const [printerEditingId, setPrinterEditingId] = useState<string | null>(null)
  const [printerEdit, setPrinterEdit] = useState({ name: '', brand: '', model: '', location: '', status: 'ONLINE', notes: '' })
  const [deleteWarn, setDeleteWarn] = useState(false)
  const [confirmOptId, setConfirmOptId] = useState<string | null>(null)
  const [confirmPrinterId, setConfirmPrinterId] = useState<string | null>(null)
  const [printPage, setPrintPage] = useState(0)
  const [printPageSize, setPrintPageSize] = useState(20)

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
    setOptPage(0)
  }

  async function loadPrinters() {
    const { data, error } = await supabase.from('printers').select('*').order('name')
    if (error) console.error('Printers load failed:', error)
    setPrinters(data || [])
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
    setConfirmOptId(id)
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
    setPrinterError(null)
    const { error } = await supabase.from('printers').insert({
      name: printerForm.name,
      brand: printerForm.brand,
      model: printerForm.model,
      location: printerForm.location,
      status: printerForm.status,
      notes: printerForm.notes,
    })
    if (error) {
      setPrinterError(error.message.includes('duplicate') ? 'A printer with this name already exists.' : error.message)
      setPrinterSaving(false)
      return
    }
    setShowForm(false)
    setPrinterError(null)
    setPrinterForm({ name: '', brand: '', model: '', location: '', status: 'ONLINE', notes: '' })
    setPrinterSaving(false)
    loadPrinters()
  }

  function startPrinterEdit(p: any) {
    setPrinterEditingId(p.id)
    setPrinterEdit({ name: p.name, brand: p.brand || '', model: p.model || '', location: p.location || '', status: p.status, notes: p.notes || '' })
  }

  function cancelPrinterEdit() {
    setPrinterEditingId(null)
  }

  async function handleSavePrinterEdit() {
    if (!printerEditingId || !printerEdit.name.trim()) return
    await supabase.from('printers').update({
      name: printerEdit.name.trim(),
      brand: printerEdit.brand.trim(),
      model: printerEdit.model.trim(),
      location: printerEdit.location.trim(),
      status: printerEdit.status,
      notes: printerEdit.notes.trim(),
    }).eq('id', printerEditingId)
    setPrinterEditingId(null)
    loadPrinters()
  }

  async function handleDeletePrinter(id: string) {
    const { data: jobs } = await supabase.from('jobs').select('id').eq('printer_id', id).limit(1)
    if (jobs && jobs.length > 0) {
      setDeleteWarn(true)
      return
    }
    setConfirmPrinterId(id)
  }

  const optTotalPages = Math.max(1, Math.ceil(options.length / optPageSize))
  const safeOptPage = Math.min(optPage, optTotalPages - 1)
  const paginatedOptions = options.slice(safeOptPage * optPageSize, (safeOptPage + 1) * optPageSize)
  const printTotalPages = Math.max(1, Math.ceil(printers.length / printPageSize))
  const safePrintPage = Math.min(printPage, printTotalPages - 1)
  const paginatedPrinters = printers.slice(safePrintPage * printPageSize, (safePrintPage + 1) * printPageSize)

  if (!settings) return <div className="py-12 text-center text-neutral-500">Loading...</div>

  return (
    <>
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/manage')} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>
        <p className="mt-1 text-sm text-neutral-500">System configuration, printer management, and dropdown lists</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Printers</CardTitle>
              <CardDescription>Manage the printers.</CardDescription>
            </div>
            <Button onClick={() => setShowForm(!showForm)} size="sm">
              <Plus className="mr-2 h-4 w-4" /> Add Printer
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">

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
              {printerError && <p className="text-sm text-red-600">{printerError}</p>}
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
              {printers.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="py-8 text-center text-neutral-500">No printers yet.</TableCell></TableRow>
              ) : (
                paginatedPrinters.map((p) => (
                  printerEditingId === p.id ? (
                    <TableRow key={p.id}>
                      <TableCell><Input value={printerEdit.name} onChange={(e) => setPrinterEdit({ ...printerEdit, name: e.target.value })} className="h-8 w-32" /></TableCell>
                      <TableCell><Input value={printerEdit.brand} onChange={(e) => setPrinterEdit({ ...printerEdit, brand: e.target.value })} className="h-8 w-28" /></TableCell>
                      <TableCell><Input value={printerEdit.model} onChange={(e) => setPrinterEdit({ ...printerEdit, model: e.target.value })} className="h-8 w-28" /></TableCell>
                      <TableCell><Input value={printerEdit.location} onChange={(e) => setPrinterEdit({ ...printerEdit, location: e.target.value })} className="h-8 w-32" /></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <label className="flex items-center gap-1 text-xs"><input type="radio" name={`ps-${p.id}`} value="ONLINE" checked={printerEdit.status === 'ONLINE'} onChange={() => setPrinterEdit({ ...printerEdit, status: 'ONLINE' })} className="accent-neutral-900" /> Online</label>
                          <label className="flex items-center gap-1 text-xs"><input type="radio" name={`ps-${p.id}`} value="OFFLINE" checked={printerEdit.status === 'OFFLINE'} onChange={() => setPrinterEdit({ ...printerEdit, status: 'OFFLINE' })} className="accent-neutral-900" /> Offline</label>
                        </div>
                      </TableCell>
                      <TableCell><Input value={printerEdit.notes} onChange={(e) => setPrinterEdit({ ...printerEdit, notes: e.target.value })} className="h-8 w-32" /></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={handleSavePrinterEdit} className="text-xs">Save</Button>
                          <Button variant="ghost" size="sm" onClick={cancelPrinterEdit} className="text-xs">Cancel</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
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
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => startPrinterEdit(p)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeletePrinter(p.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                ))
              )}
            </TableBody>
          </Table>

          {printers.length > printPageSize && (
            <div className="flex items-center justify-between text-sm text-neutral-500 pt-4">
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <Select value={String(printPageSize)} onChange={(e) => { setPrintPageSize(Number(e.target.value)); setPrintPage(0) }} className="w-20 h-8 text-xs">
                  {[10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
                </Select>
              </div>
              <div className="flex items-center gap-4">
                <span>{safePrintPage * printPageSize + 1}–{Math.min((safePrintPage + 1) * printPageSize, printers.length)} of {printers.length}</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" disabled={safePrintPage === 0} onClick={() => setPrintPage(safePrintPage - 1)}>Prev</Button>
                  <Button variant="ghost" size="sm" disabled={safePrintPage >= printTotalPages - 1} onClick={() => setPrintPage(safePrintPage + 1)}>Next</Button>
                </div>
              </div>
            </div>
          )}
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
              {paginatedOptions.map((o) => (
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
                          <Button variant="ghost" size="sm" title="Edit option" onClick={() => startEdit(o.id, o.label, o.sort_order)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Delete option" onClick={() => handleDelete(o.id)}>
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

          {options.length > optPageSize && (
            <div className="flex items-center justify-between text-sm text-neutral-500">
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <Select value={String(optPageSize)} onChange={(e) => { setOptPageSize(Number(e.target.value)); setOptPage(0) }} className="w-20 h-8 text-xs">
                  {[10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
                </Select>
              </div>
              <div className="flex items-center gap-4">
                <span>{safeOptPage * optPageSize + 1}–{Math.min((safeOptPage + 1) * optPageSize, options.length)} of {options.length}</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" disabled={safeOptPage === 0} onClick={() => setOptPage(safeOptPage - 1)}>Prev</Button>
                  <Button variant="ghost" size="sm" disabled={safeOptPage >= optTotalPages - 1} onClick={() => setOptPage(safeOptPage + 1)}>Next</Button>
                </div>
              </div>
            </div>
          )}

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
      <Dialog open={deleteWarn} onClose={() => setDeleteWarn(false)} title="Cannot Delete Printer">
        <p>This printer has active jobs assigned to it and cannot be deleted.</p>
        <p className="mt-2">Mark it as <strong>Offline</strong> in the printer settings instead.</p>
      </Dialog>

      <ConfirmDialog
        open={confirmOptId !== null}
        onClose={() => setConfirmOptId(null)}
        onConfirm={async () => { if (confirmOptId) { await supabase.from('dropdown_options').delete().eq('id', confirmOptId); loadOptions() } }}
        title="Delete Option"
        message="Are you sure you want to delete this option?"
        confirmLabel="Delete"
      />

      <ConfirmDialog
        open={confirmPrinterId !== null}
        onClose={() => setConfirmPrinterId(null)}
        onConfirm={async () => { if (confirmPrinterId) { await supabase.from('printers').delete().eq('id', confirmPrinterId); loadPrinters() } }}
        title="Delete Printer"
        message="Are you sure you want to delete this printer?"
        confirmLabel="Delete"
      />
    </div>
    </>
  )
}
