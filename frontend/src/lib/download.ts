export async function downloadFile(url: string, title: string, studentName: string, submittedAt: string) {
  const ext = url.split('.').pop() || ''
  const date = new Date(submittedAt)
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  const filename = `${title}_${studentName.replace(/\s+/g, '_')}_${dateStr}.${ext}`

  const resp = await fetch(url)
  const blob = await resp.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}
