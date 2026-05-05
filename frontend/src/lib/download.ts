export function downloadTextFile(filename: string, content: string, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  a.click()
  URL.revokeObjectURL(url)
}

export function printHtmlDocument(title: string, bodyHtml: string) {
  const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1200')
  if (!w) return false
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title>
    <style>
      body{font-family:system-ui,sans-serif;padding:24px;color:#0f172a;max-width:720px;margin:0 auto;}
      table{width:100%;border-collapse:collapse;margin-top:16px;}
      th,td{border:1px solid #e2e8f0;padding:8px;text-align:left;font-size:13px;}
      th{background:#f8fafc;}
      .total{font-weight:700;font-size:15px;margin-top:16px;}
    </style></head><body>${bodyHtml}</body></html>`)
  w.document.close()
  w.focus()
  w.print()
  return true
}
