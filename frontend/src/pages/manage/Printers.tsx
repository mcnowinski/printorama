import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select } from '../../components/ui/select'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent } from '../../components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table'
import { Plus, Loader2 } from 'lucide-react'

export default function ManagePrinters() {
  const [printers, setPrinters] = useState<any[]>([])
  const [brands, setBrands] = useState<any[]>([])
  const [models, setModels] = useState<any[]>([])
  const [statusOptions, setStatusOptions] = useState<{ label: string }[]>([])
  const [locationOptions, setLocationOptions] = useState<{ label: string }[]>([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({ name: '', brandId: '', modelId: '', location: '', status: 'IDLE' })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    supabase.from('printers').select('*, printer_brands(name), printer_models(name)').order('name').then(({ data }) => {
      setPrinters(data || [])
    })
    supabase.from('printer_brands').select('*').order('sort_order').then(({ data }) => {
      setBrands(data || [])
    })
    supabase.from('dropdown_options').select('label').eq('category', 'PRINTER_STATUS').order('sort_order').then(({ data }) => {
      setStatusOptions(data || [])
    })
    supabase.from('dropdown_options').select('label').eq('category', 'PRINTER_LOCATION').order('sort_order').then(({ data }) => {
      setLocationOptions(data || [])
    })
  }

  async function loadModels(brandId: string) {
    const { data } = await supabase.from('printer_models').select('*').eq('brand_id', brandId).order('name')
    setModels(data || [])
  }

  async function handleAdd() {
    setSaving(true)
    const { error } = await supabase.from('printers').insert({
      name: form.name,
      brand_id: form.brandId,
      model_id: form.modelId,
      location: form.location,
      status: form.status,
    })
    if (!error) {
      setShowForm(false)
      setForm({ name: '', brandId: '', modelId: '', location: '', status: 'IDLE' })
      loadData()
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this printer?')) return
    await supabase.from('printers').delete().eq('id', id)
    loadData()
  }

  const statusBadge: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
    IDLE: 'success',
    PRINTING: 'info',
    OFFLINE: 'destructive',
    MAINTENANCE: 'warning',
  } as any

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Printers</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" /> Add Printer
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Printer Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Prusa MK4 #1" />
              </div>
              <div className="space-y-2">
                <Label>Brand</Label>
                <Select value={form.brandId} onChange={(e) => { setForm({ ...form, brandId: e.target.value, modelId: '' }); loadModels(e.target.value) }}>
                  <option value="">Select brand</option>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Select value={form.modelId} onChange={(e) => setForm({ ...form, modelId: e.target.value })} disabled={!form.brandId}>
                  <option value="">Select model</option>
                  {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Select value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}>
                  <option value="">Select location</option>
                  {locationOptions.map((l) => <option key={l.label} value={l.label}>{l.label}</option>)}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {statusOptions.map((s) => <option key={s.label} value={s.label}>{s.label}</option>)}
                </Select>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={handleAdd} disabled={saving || !form.name || !form.brandId || !form.modelId}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Printer
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {printers.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{p.printer_brands?.name}</TableCell>
                <TableCell>{p.printer_models?.name}</TableCell>
                <TableCell>{p.location}</TableCell>
                <TableCell>
                  <Badge variant={(statusBadge[p.status] || 'default') as any}>{p.status}</Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)}>Remove</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
