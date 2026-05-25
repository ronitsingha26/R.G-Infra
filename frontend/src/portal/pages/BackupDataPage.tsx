import { CalendarDays, DatabaseBackup, Download, FileSpreadsheet, FileText, IndianRupee, RefreshCw, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { api, type BackupDataset, type BackupFormat, type BackupSummary } from '../api'
import { usePortalToast } from '../toast'
import { inr, Input, PortalButton, PortalCard, Select } from '../ui'

const datasetOptions: { value: BackupDataset; label: string }[] = [
  { value: 'all', label: 'Complete Backup' },
  { value: 'clients', label: 'Client Data' },
  { value: 'payments', label: 'Payment History' },
  { value: 'dues', label: 'Due & Paid Status' },
  { value: 'schedules', label: 'Payment Dates' },
  { value: 'monthly', label: 'Monthly Profit' },
]

const formatOptions: { value: BackupFormat; label: string }[] = [
  { value: 'xls', label: 'Excel Workbook (.xls)' },
  { value: 'csv', label: 'CSV File (.csv)' },
]

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function BackupDataPage() {
  const toast = usePortalToast()
  const [summary, setSummary] = useState<BackupSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    dataset: 'all' as BackupDataset,
    format: 'xls' as BackupFormat,
    from_date: '',
    to_date: '',
  })

  const cards = useMemo(() => [
    { label: 'Clients', value: summary?.clients || 0, Icon: Users, tone: 'text-blue-600' },
    { label: 'Payments', value: summary?.payments || 0, Icon: FileText, tone: 'text-orange-600' },
    { label: 'Paid', value: inr(summary?.paid || 0), Icon: IndianRupee, tone: 'text-emerald-600' },
    { label: 'Due', value: inr(summary?.due || 0), Icon: CalendarDays, tone: 'text-red-600' },
  ], [summary])

  const loadSummary = async () => {
    setLoading(true)
    try {
      setSummary(await api.getBackupSummary())
    } catch (e) {
      toast.push({ tone: 'error', title: e instanceof Error ? e.message : 'Unable to load backup summary' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSummary()
  }, [])

  const downloadBackup = async (format?: BackupFormat, dataset?: BackupDataset) => {
    const finalFormat = format || filters.format
    const finalDataset = dataset || filters.dataset
    const key = `${finalDataset}-${finalFormat}`
    setDownloading(key)
    try {
      const file = await api.downloadBackup({
        ...filters,
        dataset: finalDataset,
        format: finalFormat,
      })
      saveBlob(file.blob, file.filename)
      toast.push({ tone: 'success', title: 'Backup downloaded' })
      loadSummary()
    } catch (e) {
      toast.push({ tone: 'error', title: e instanceof Error ? e.message : 'Backup download failed' })
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="space-y-6">
      <PortalCard>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-500 text-white shadow-[0_12px_28px_rgba(249,115,22,0.24)]">
              <DatabaseBackup className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-slate-900">Backup Data</div>
              <div className="text-sm font-semibold text-slate-500">Excel aur CSV export</div>
            </div>
          </div>
          <PortalButton variant="outline" onClick={loadSummary} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </PortalButton>
        </div>
      </PortalCard>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <PortalCard key={card.label}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{card.label}</div>
                <div className="mt-2 text-2xl font-extrabold text-slate-900">{card.value}</div>
              </div>
              <div className={`flex h-11 w-11 items-center justify-center rounded-lg bg-slate-50 ${card.tone}`}>
                <card.Icon className="h-5 w-5" />
              </div>
            </div>
          </PortalCard>
        ))}
      </div>

      <PortalCard>
        <div className="grid gap-4 lg:grid-cols-5">
          <Select
            label="Template"
            value={filters.dataset}
            onChange={(value) => setFilters((current) => ({ ...current, dataset: value as BackupDataset }))}
            options={datasetOptions}
          />
          <Select
            label="File Type"
            value={filters.format}
            onChange={(value) => setFilters((current) => ({ ...current, format: value as BackupFormat }))}
            options={formatOptions}
          />
          <Input
            label="From Date"
            type="date"
            value={filters.from_date}
            onChange={(value) => setFilters((current) => ({ ...current, from_date: value }))}
          />
          <Input
            label="To Date"
            type="date"
            value={filters.to_date}
            onChange={(value) => setFilters((current) => ({ ...current, to_date: value }))}
          />
          <div className="flex items-end">
            <PortalButton
              className="w-full"
              onClick={() => downloadBackup()}
              disabled={downloading === `${filters.dataset}-${filters.format}`}
            >
              {filters.format === 'xls' ? <FileSpreadsheet className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
              {downloading === `${filters.dataset}-${filters.format}` ? 'Exporting...' : 'Export'}
            </PortalButton>
          </div>
        </div>
      </PortalCard>

      <div className="grid gap-4 lg:grid-cols-2">
        {datasetOptions.filter((item) => item.value !== 'all').map((item) => (
          <PortalCard key={item.value}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-base font-extrabold text-slate-900">{item.label}</div>
                <div className="mt-1 text-xs font-bold text-slate-400 uppercase tracking-[0.12em]">Template</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <PortalButton
                  variant="outline"
                  className="px-3 py-2 text-xs"
                  onClick={() => downloadBackup('xls', item.value)}
                  disabled={downloading === `${item.value}-xls`}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Excel
                </PortalButton>
                <PortalButton
                  variant="outline"
                  className="px-3 py-2 text-xs"
                  onClick={() => downloadBackup('csv', item.value)}
                  disabled={downloading === `${item.value}-csv`}
                >
                  <Download className="h-3.5 w-3.5" />
                  CSV
                </PortalButton>
              </div>
            </div>
          </PortalCard>
        ))}
      </div>
    </div>
  )
}
