import '@testing-library/jest-dom'
import { vi } from 'vitest'

vi.stubGlobal('import.meta.env', {
  VITE_SUPABASE_URL: 'https://jinizatbimvmzizrdrsq.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'test-anon-key',
})
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { afterAll, afterEach, beforeAll } from 'vitest'

const supabaseUrl = 'https://jinizatbimvmzizrdrsq.supabase.co'

const handlers = [
  http.get(`${supabaseUrl}/rest/v1/system_settings`, () =>
    HttpResponse.json([{ id: '1', requests_open: true, max_jobs_per_day: 3, email_confirmation_required: false }])
  ),

  http.get(`${supabaseUrl}/rest/v1/dropdown_options`, ({ request }) => {
    const url = new URL(request.url)
    const category = url.searchParams.get('category')
    if (category === 'ACCEPTED_FILE_TYPE') {
      return HttpResponse.json([
        { id: '1', category: 'ACCEPTED_FILE_TYPE', label: 'stl', sort_order: 1 },
        { id: '2', category: 'ACCEPTED_FILE_TYPE', label: 'gcode', sort_order: 2 },
      ])
    }
    if (category === 'JOB_STATUS') {
      return HttpResponse.json([
        { id: '1', category: 'JOB_STATUS', label: 'RECEIVED', sort_order: 1 },
        { id: '2', category: 'JOB_STATUS', label: 'PRINTING', sort_order: 2 },
        { id: '3', category: 'JOB_STATUS', label: 'COMPLETE', sort_order: 3 },
      ])
    }
    if (category === 'JOB_TYPE' || category === 'eq.JOB_TYPE') {
      return HttpResponse.json([
        { id: '1', category: 'JOB_TYPE', label: '3D Printing', sort_order: 1 },
        { id: '2', category: 'JOB_TYPE', label: 'Laser Cut', sort_order: 2 },
      ])
    }
    return HttpResponse.json([])
  }),

  http.post(`${supabaseUrl}/rest/v1/job_queue`, () =>
    HttpResponse.json([{ id: 'test-job-id' }], { status: 201 })
  ),

  http.post(`${supabaseUrl}/storage/v1/object/job-files/*`, () =>
    HttpResponse.json({ Key: 'test-file.stl' }, { status: 200 })
  ),

  http.get(`${supabaseUrl}/rest/v1/printers`, () =>
    HttpResponse.json([
      { id: 'p1', name: 'Prusa MK4 #1', brand: 'Prusa', model: 'MK4', location: 'Lab 310', status: 'ONLINE', notes: '' },
      { id: 'p2', name: 'Bambu X1C', brand: 'Bambu Lab', model: 'X1C', location: 'Lab 312', status: 'OFFLINE', notes: 'Needs calibration' },
    ])
  ),

  http.post(`${supabaseUrl}/rest/v1/jobs`, () =>
    HttpResponse.json([{ id: 'new-job-id' }], { status: 201 })
  ),

  http.get(`${supabaseUrl}/rest/v1/jobs`, () =>
    HttpResponse.json([
      {
        id: 'j1', title: 'Test Print', student_name: 'Alice', student_email: 'alice@vt.edu',
        status: 'PRINTING', student_notes: null, file_url: null, printer_id: 'p1',
        submitted_at: '2026-06-15T10:00:00Z', created_at: '2026-06-15T10:00:00Z', updated_at: '2026-06-15T14:00:00Z',
        printers: { name: 'Prusa MK4 #1', status: 'ONLINE' },
      },
      {
        id: 'j2', title: 'Phone Case', student_name: 'Bob', student_email: 'bob@vt.edu',
        status: 'RECEIVED', student_notes: null, file_url: null, printer_id: null,
        submitted_at: '2026-06-16T08:00:00Z', created_at: '2026-06-16T08:00:00Z', updated_at: '2026-06-16T08:00:00Z',
        printers: null,
      },
    ])
  ),

  http.get(`${supabaseUrl}/rest/v1/job_queue`, () =>
    HttpResponse.json([
      {
        id: 'q1', title: 'My Part', student_name: 'Charlie', student_email: 'charlie@vt.edu',
        student_notes: 'Please use PETG', file_url: null,
        largest_dimension: 150, dimension_unit: 'mm',
        status: 'PENDING', job_id: null, original_filename: null,
        created_at: '2026-06-16T12:00:00Z', updated_at: '2026-06-16T12:00:00Z',
      },
    ])
  ),

  http.get(`${supabaseUrl}/rest/v1/users`, () =>
    HttpResponse.json([
      { id: 'u1', name: 'Admin', email: 'admin@vt.edu', role: 'ADMINISTRATOR' },
      { id: 'u2', name: 'Manager One', email: 'manager@vt.edu', role: 'MANAGER' },
    ])
  ),

  http.post(`${supabaseUrl}/functions/v1/admin-create-user`, () =>
    HttpResponse.json({ success: true }, { status: 200 })
  ),

  http.patch(`${supabaseUrl}/rest/v1/users`, () =>
    HttpResponse.json([{ id: 'u1' }], { status: 200 })
  ),

  http.delete(`${supabaseUrl}/rest/v1/users`, () =>
    HttpResponse.json(null, { status: 200 })
  ),

  http.post(`${supabaseUrl}/rest/v1/job_history`, () =>
    HttpResponse.json([{ id: 'hist-1' }], { status: 201 })
  ),
]

const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
