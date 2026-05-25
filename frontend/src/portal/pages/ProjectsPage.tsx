/**
 * R.G INFRA CRM — Projects / Property Management Page
 * Manages: Properties → Apartments → Flats → Infrastructure → Client Allocation
 * Full CRUD for properties, apartments & flats, inline infrastructure editing
 *
 * REDESIGNED: Table-based layout matching Clients page format.
 * - Properties in a table, expandable to show apartments sub-table
 * - Apartments expandable to show flats in table format
 * - Filter buttons (All / Booked / Available) per apartment
 * - Clickable client names → navigate to client profile
 * - Summary popup with overall + per-property breakdown
 * - Simplified UI for aged clients (larger fonts, bigger targets)
 */

import {
  BarChart3, Building2, ChevronDown, ChevronRight, Download, Edit, Home,
  Plus, Search, Trash2, Upload, Users, Briefcase, X, FileSpreadsheet,
  CheckCircle2, AlertCircle, Loader2
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type Apartment, type BulkUploadResult, type BulkUploadBookingResult, type Flat, type Property, type SheetInfo } from '../api'
import { usePortalStore } from '../store'
import { usePortalToast } from '../toast'
import { EmptyState, Input, Modal, PortalButton, PortalCard } from '../ui'

type FlatFilter = 'all' | 'booked' | 'available'

export function ProjectsPage() {
  const store = usePortalStore()
  const toast = usePortalToast()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  // Data
  const [properties, setProperties] = useState<Property[]>([])
  const [apartments, setApartments] = useState<Apartment[]>([])
  const [allFlats, setAllFlats] = useState<Flat[]>([])
  const [loading, setLoading] = useState(true)

  // Expanded state for table rows
  const [expandedProp, setExpandedProp] = useState<number | null>(null)
  const [expandedApt, setExpandedApt] = useState<number | null>(null)

  // Filter state per apartment
  const [aptFilters, setAptFilters] = useState<Record<number, FlatFilter>>({})

  // Summary modal
  const [showSummary, setShowSummary] = useState(false)

  // Bulk upload state
  const [bulkUploadModal, setBulkUploadModal] = useState<{ open: boolean; aptId: number; aptName: string; mode: 'flat_details' | 'booking_status' }>({ open: false, aptId: 0, aptName: '', mode: 'flat_details' })
  const [bulkStep, setBulkStep] = useState<'select' | 'preview' | 'uploading' | 'results'>('select')
  const [bulkFile, setBulkFile] = useState<File | null>(null)
  const [bulkSheets, setBulkSheets] = useState<SheetInfo[]>([])
  const [bulkParsing, setBulkParsing] = useState(false)
  const [bulkResult, setBulkResult] = useState<BulkUploadResult | BulkUploadBookingResult | null>(null)
  const [bulkUploading, setBulkUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Modals
  const [propModal, setPropModal] = useState<{ open: boolean; editing?: Property }>({ open: false })
  const [aptModal, setAptModal] = useState<{ open: boolean; propId: number; editing?: Apartment }>({ open: false, propId: 0 })
  const [flatModal, setFlatModal] = useState<{ open: boolean; aptId: number; editing?: Flat }>({ open: false, aptId: 0 })

  const emptyPropForm = { name: '', address: '', land_north: '', land_south: '', land_east: '', land_west: '' }
  const emptyAptForm = {
    name: '', total_flats: '', numbering_pattern: '', parking_slots: '', electricity_details: '', transformer_details: '', water_connection_details: '',
    floor_north: '', floor_south: '', floor_east: '', floor_west: ''
  }
  const [propForm, setPropForm] = useState(emptyPropForm)
  const [aptForm, setAptForm] = useState({
    ...emptyAptForm
  })
  const [flatForm, setFlatForm] = useState({
    flat_number: '', flat_type: '', floor: '', block: '',
    carpet_area: '', balcony_area: '', terrace_area: '',
    built_up_area: '', sbu_area: '', undivided_share: '',
  })
  const [saving, setSaving] = useState(false)
  const formatCurrency = (amount: number) => `₹${Math.round(amount || 0).toLocaleString('en-IN')}`

  const loadData = async () => {
    try {
      setLoading(true)
      const [props, apts, flats] = await Promise.all([
        api.getProperties().catch(() => [] as Property[]),
        api.getApartments(),
        api.getFlats()
      ])
      setProperties(props)
      setApartments(apts)
      setAllFlats(flats)
    } catch {
      toast.push({ tone: 'error', title: 'Failed to load data' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  // Helpers
  const getAptsForProp = (propId: number) => apartments.filter(a => a.property_id === propId)
  const getFlatsForApt = (aptId: number) => allFlats.filter(f => f.apartment_id === aptId)
  const getClientForFlat = (flatId: number) => store.clients.find(c => c.flat_id === flatId)

  // Stats
  const totalFlats = allFlats.length
  const bookedFlats = allFlats.filter(f => !f.is_available).length
  const availableFlats = totalFlats - bookedFlats

  // Per-property stats helper
  const getPropertyStats = (propId: number) => {
    const apts = getAptsForProp(propId)
    const aptIds = apts.map(a => a.id)
    const propFlats = allFlats.filter(f => aptIds.includes(f.apartment_id))
    const booked = propFlats.filter(f => !f.is_available).length
    return { apartments: apts.length, totalFlats: propFlats.length, booked, available: propFlats.length - booked }
  }

  // Per-apartment stats helper
  const getAptStats = (aptId: number) => {
    const flats = getFlatsForApt(aptId)
    const booked = flats.filter(f => !f.is_available).length
    return { totalFlats: flats.length, booked, available: flats.length - booked }
  }

  // Get filtered flats for an apartment
  const getFilteredFlats = (aptId: number) => {
    const flats = getFlatsForApt(aptId)
    const filter = aptFilters[aptId] || 'all'
    if (filter === 'booked') return flats.filter(f => !f.is_available)
    if (filter === 'available') return flats.filter(f => f.is_available)
    return flats
  }

  // Set filter for an apartment
  const setAptFilter = (aptId: number, filter: FlatFilter) => {
    setAptFilters(prev => ({ ...prev, [aptId]: filter }))
  }

  // ─── Property CRUD ─────────────────────────────────────
  const openAddProp = () => { setPropForm(emptyPropForm); setPropModal({ open: true }) }
  const openEditProp = (prop: Property) => {
    setPropForm({
      name: prop.name,
      address: prop.address || '',
      land_north: prop.land_north || '',
      land_south: prop.land_south || '',
      land_east: prop.land_east || '',
      land_west: prop.land_west || '',
    })
    setPropModal({ open: true, editing: prop })
  }

  const handleSaveProp = async () => {
    if (!propForm.name.trim()) return
    setSaving(true)
    try {
      if (propModal.editing) {
        await api.updateProperty(propModal.editing.id, propForm)
        toast.push({ tone: 'success', title: 'Property updated' })
      } else {
        await api.createProperty(propForm)
        toast.push({ tone: 'success', title: 'Property added' })
      }
      setPropModal({ open: false })
      loadData()
    } catch (e) { toast.push({ tone: 'error', title: e instanceof Error ? e.message : 'Failed' }) }
    finally { setSaving(false) }
  }

  const handleDeleteProp = async (prop: Property) => {
    if (!confirm(`Delete "${prop.name}"? All apartments and flats inside will also be deleted.`)) return
    try {
      await api.deleteProperty(prop.id)
      toast.push({ tone: 'success', title: 'Property deleted' })
      loadData()
    } catch (e) { toast.push({ tone: 'error', title: e instanceof Error ? e.message : 'Failed' }) }
  }

  // ─── Apartment CRUD ─────────────────────────────────────
  const openAddApt = (propId: number) => {
    setAptForm(emptyAptForm)
    setAptModal({ open: true, propId })
  }
  const openEditApt = (apt: Apartment) => {
    setAptForm({
      name: apt.name,
      total_flats: String(apt.total_flats || ''),
      numbering_pattern: apt.numbering_pattern || '',
      parking_slots: String(apt.parking_slots || ''),
      electricity_details: apt.electricity_details || '',
      transformer_details: apt.transformer_details || '',
      water_connection_details: apt.water_connection_details || '',
      floor_north: apt.floor_north || '',
      floor_south: apt.floor_south || '',
      floor_east: apt.floor_east || '',
      floor_west: apt.floor_west || '',
    })
    setAptModal({ open: true, propId: apt.property_id || 0, editing: apt })
  }

  const handleSaveApt = async () => {
    if (!aptForm.name.trim()) return
    setSaving(true)
    try {
      const payload = {
        name: aptForm.name,
        property_id: aptModal.propId || undefined,
        total_flats: aptForm.total_flats ? Number(aptForm.total_flats) : undefined,
        numbering_pattern: aptForm.numbering_pattern || undefined,
        parking_slots: aptForm.parking_slots ? Number(aptForm.parking_slots) : undefined,
        electricity_details: aptForm.electricity_details || undefined,
        transformer_details: aptForm.transformer_details || undefined,
        water_connection_details: aptForm.water_connection_details || undefined,
        floor_north: aptForm.floor_north || undefined,
        floor_south: aptForm.floor_south || undefined,
        floor_east: aptForm.floor_east || undefined,
        floor_west: aptForm.floor_west || undefined,
      }

      if (aptModal.editing) {
        await api.updateApartment(aptModal.editing.id, payload)
        toast.push({ tone: 'success', title: 'Apartment updated' })
      } else {
        await api.createApartment(payload)
        toast.push({ tone: 'success', title: 'Apartment & Flats auto-generated' })
      }
      setAptModal({ open: false, propId: 0 })
      loadData()
    } catch (e) { toast.push({ tone: 'error', title: e instanceof Error ? e.message : 'Failed' }) }
    finally { setSaving(false) }
  }

  const handleDeleteApt = async (apt: Apartment) => {
    if (!confirm(`Delete "${apt.name}"? All flats inside will also be deleted.`)) return
    try {
      await api.deleteApartment(apt.id)
      toast.push({ tone: 'success', title: 'Apartment deleted' })
      loadData()
    } catch (e) { toast.push({ tone: 'error', title: e instanceof Error ? e.message : 'Failed' }) }
  }

  // ─── Flat CRUD ──────────────────────────────────────────
  const openAddFlat = (aptId: number) => {
    setFlatForm({
      flat_number: '', flat_type: '', floor: '', block: '',
      carpet_area: '', balcony_area: '', terrace_area: '',
      built_up_area: '', sbu_area: '', undivided_share: '',
    })
    setFlatModal({ open: true, aptId })
  }
  const openEditFlat = (flat: Flat) => {
    setFlatForm({
      flat_number: flat.flat_number,
      flat_type: flat.flat_type || '',
      floor: flat.floor || '',
      block: flat.block || '',
      carpet_area: String(flat.carpet_area || ''),
      balcony_area: String(flat.balcony_area || ''),
      terrace_area: String(flat.terrace_area || ''),
      built_up_area: String(flat.built_up_area || ''),
      sbu_area: String(flat.sbu_area || ''),
      undivided_share: String(flat.undivided_share || ''),
    })
    setFlatModal({ open: true, aptId: flat.apartment_id, editing: flat })
  }

  const handleSaveFlat = async () => {
    if (!flatForm.flat_number.trim()) return
    setSaving(true)
    try {
      const data: Partial<Flat> = {
        apartment_id: flatModal.aptId,
        flat_number: flatForm.flat_number,
        flat_type: flatForm.flat_type || undefined,
        floor: flatForm.floor || undefined,
        block: flatForm.block || undefined,
        carpet_area: flatForm.carpet_area ? Number(flatForm.carpet_area) : undefined,
        balcony_area: flatForm.balcony_area ? Number(flatForm.balcony_area) : undefined,
        terrace_area: flatForm.terrace_area ? Number(flatForm.terrace_area) : undefined,
        built_up_area: flatForm.built_up_area ? Number(flatForm.built_up_area) : undefined,
        sbu_area: flatForm.sbu_area ? Number(flatForm.sbu_area) : undefined,
        undivided_share: flatForm.undivided_share ? Number(flatForm.undivided_share) : undefined,
        is_available: flatModal.editing ? flatModal.editing.is_available : true,
      }
      if (flatModal.editing) {
        await api.updateFlat(flatModal.editing.id, data)
        toast.push({ tone: 'success', title: 'Flat updated' })
      } else {
        await api.createFlat(data)
        toast.push({ tone: 'success', title: 'Flat added' })
      }
      setFlatModal({ open: false, aptId: 0 })
      loadData()
    } catch (e) { toast.push({ tone: 'error', title: e instanceof Error ? e.message : 'Failed' }) }
    finally { setSaving(false) }
  }

  const handleDeleteFlat = async (flat: Flat) => {
    if (!confirm(`Delete Flat ${flat.flat_number}?`)) return
    try {
      await api.deleteFlat(flat.id)
      toast.push({ tone: 'success', title: 'Flat deleted' })
      loadData()
      store.refreshClients()
    } catch (e) { toast.push({ tone: 'error', title: e instanceof Error ? e.message : 'Failed' }) }
  }

  // ─── Bulk Upload Handlers ──────────────────────────────────
  const openBulkUpload = (aptId: number, aptName: string, mode: 'flat_details' | 'booking_status') => {
    setBulkUploadModal({ open: true, aptId, aptName, mode })
    setBulkStep('select')
    setBulkFile(null)
    setBulkSheets([])
    setBulkResult(null)
    setBulkUploading(false)
    setBulkParsing(false)
  }

  const closeBulkUpload = () => {
    setBulkUploadModal({ open: false, aptId: 0, aptName: '', mode: 'flat_details' })
    setBulkStep('select')
    setBulkFile(null)
    setBulkSheets([])
    setBulkResult(null)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate extension
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
      toast.push({ tone: 'error', title: 'Only .xlsx, .xls, .csv files allowed' })
      return
    }
    // Validate size (50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.push({ tone: 'error', title: 'File too large. Max 50MB.' })
      return
    }

    setBulkFile(file)
    setBulkParsing(true)

    try {
      const result = await api.parseHeaders(file)
      setBulkSheets(result.sheets)
      setBulkStep('preview')
    } catch (err) {
      toast.push({ tone: 'error', title: err instanceof Error ? err.message : 'Failed to parse file' })
    } finally {
      setBulkParsing(false)
    }
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleBulkUpload = async () => {
    if (!bulkFile || !bulkUploadModal.aptId) return
    setBulkUploading(true)
    setBulkStep('uploading')

    try {
      let result: BulkUploadResult | BulkUploadBookingResult
      if (bulkUploadModal.mode === 'flat_details') {
        result = await api.bulkUploadFlatDetails(bulkUploadModal.aptId, bulkFile)
      } else {
        result = await api.bulkUploadBookingStatus(bulkUploadModal.aptId, bulkFile)
      }
      setBulkResult(result)
      setBulkStep('results')
      loadData()
      store.refreshClients()
      toast.push({ tone: 'success', title: 'Bulk upload completed!' })
    } catch (err) {
      toast.push({ tone: 'error', title: err instanceof Error ? err.message : 'Upload failed' })
      setBulkStep('preview')
    } finally {
      setBulkUploading(false)
    }
  }

  const handleDownloadTemplate = async (aptId: number) => {
    try {
      const { blob, filename } = await api.downloadFlatTemplate(aptId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      toast.push({ tone: 'success', title: 'Template downloaded' })
    } catch (err) {
      toast.push({ tone: 'error', title: 'Failed to download template' })
    }
  }

  const filteredProperties = properties.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || (p.address || '').toLowerCase().includes(search.toLowerCase()))

  if (loading) return <div className="flex items-center justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-400 border-t-transparent" /></div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <PortalCard>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-2xl font-extrabold text-slate-900">Projects & Properties</div>
            <div className="text-sm text-slate-500">Manage properties, apartments, flats & infrastructure</div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none ring-orange-400/40 focus:ring-2 w-48" />
            </div>
            <PortalButton variant="outline" onClick={() => setShowSummary(true)}>
              <BarChart3 className="h-4 w-4" /> Summary
            </PortalButton>
            <PortalButton onClick={openAddProp}><Plus className="h-4 w-4" /> Add Property</PortalButton>
          </div>
        </div>
      </PortalCard>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <PortalCard>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-orange-50 flex items-center justify-center"><Briefcase className="h-6 w-6 text-orange-500" /></div>
            <div><div className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Properties</div><div className="text-2xl font-extrabold text-slate-900">{properties.length}</div></div>
          </div>
        </PortalCard>
        <PortalCard>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center"><Building2 className="h-6 w-6 text-blue-500" /></div>
            <div><div className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Apartments</div><div className="text-2xl font-extrabold text-slate-900">{apartments.length}</div></div>
          </div>
        </PortalCard>
        <PortalCard>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center"><Users className="h-6 w-6 text-emerald-500" /></div>
            <div><div className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Booked Flats</div><div className="text-2xl font-extrabold text-emerald-600">{bookedFlats}</div></div>
          </div>
        </PortalCard>
        <PortalCard>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center"><Home className="h-6 w-6 text-amber-500" /></div>
            <div><div className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Available Flats</div><div className="text-2xl font-extrabold text-amber-600">{availableFlats}</div></div>
          </div>
        </PortalCard>
      </div>

      {/* ─── PROPERTIES TABLE ─── */}
      {filteredProperties.length === 0 ? <EmptyState title="No properties found" sub="Add your first property to get started" /> : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5 w-8"></th>
                  <th className="px-5 py-3.5">Property Name</th>
                  <th className="px-5 py-3.5">Address</th>
                  <th className="px-5 py-3.5 text-center">Apartments</th>
                  <th className="px-5 py-3.5 text-center">Total Flats</th>
                  <th className="px-5 py-3.5 text-center">Booked</th>
                  <th className="px-5 py-3.5 text-center">Available</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProperties.map(prop => {
                  const stats = getPropertyStats(prop.id)
                  const isPropExpanded = expandedProp === prop.id
                  const apts = getAptsForProp(prop.id)

                  return (
                    <>
                      {/* Property Row */}
                      <tr
                        key={prop.id}
                        className="cursor-pointer hover:bg-orange-50/50 transition text-slate-700"
                        onClick={() => setExpandedProp(isPropExpanded ? null : prop.id)}
                      >
                        <td className="px-5 py-4">
                          {isPropExpanded
                            ? <ChevronDown className="h-5 w-5 text-orange-500" />
                            : <ChevronRight className="h-5 w-5 text-slate-400" />
                          }
                        </td>
                        <td className="px-5 py-4 font-bold text-slate-900 text-base">{prop.name}</td>
                        <td className="px-5 py-4 text-slate-600">{prop.address || '—'}</td>
                        <td className="px-5 py-4 text-center">
                          <span className="inline-flex items-center justify-center h-8 min-w-[2rem] rounded-lg bg-blue-50 text-blue-700 font-bold text-sm px-2">{stats.apartments}</span>
                        </td>
                        <td className="px-5 py-4 text-center font-semibold text-slate-900">{stats.totalFlats}</td>
                        <td className="px-5 py-4 text-center">
                          <span className="inline-flex items-center justify-center h-8 min-w-[2rem] rounded-lg bg-red-50 text-red-700 font-bold text-sm px-2">{stats.booked}</span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="inline-flex items-center justify-center h-8 min-w-[2rem] rounded-lg bg-emerald-50 text-emerald-700 font-bold text-sm px-2">{stats.available}</span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={(e) => { e.stopPropagation(); openEditProp(prop) }} className="p-2 rounded-lg hover:bg-orange-50 text-slate-400 hover:text-orange-500 transition" title="Edit Property">
                              <Edit className="h-4 w-4" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteProp(prop) }} className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition" title="Delete Property">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded: Apartments Sub-Table */}
                      {isPropExpanded && (
                        <tr key={`${prop.id}-expanded`}>
                          <td colSpan={8} className="p-0">
                            <div className="bg-slate-50/70 border-t border-b border-slate-200 px-6 py-5">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-5 w-5 text-orange-500" />
                                  <span className="text-sm font-bold text-slate-700">Apartments in {prop.name}</span>
                                  <span className="text-xs text-slate-400">({apts.length} apartments)</span>
                                </div>
                                <PortalButton onClick={() => openAddApt(prop.id)} className="!py-2 !px-4 !text-sm">
                                  <Plus className="h-4 w-4" /> Add Apartment
                                </PortalButton>
                              </div>

                              {apts.length === 0 ? (
                                <div className="text-sm text-slate-400 text-center py-6 bg-white rounded-xl border border-slate-200">No apartments added yet</div>
                              ) : (
                                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                                  <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                      <tr>
                                        <th className="px-4 py-3 w-8"></th>
                                        <th className="px-4 py-3">Apartment Name</th>
                                        <th className="px-4 py-3 text-center">Total Flats</th>
                                        <th className="px-4 py-3 text-center">Booked</th>
                                        <th className="px-4 py-3 text-center">Available</th>
                                        <th className="px-4 py-3 text-center">Parking Slots</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {apts.map(apt => {
                                        const aptStats = getAptStats(apt.id)
                                        const isAptExpanded = expandedApt === apt.id
                                        const currentFilter = aptFilters[apt.id] || 'all'
                                        const filteredFlats = getFilteredFlats(apt.id)

                                        return (
                                          <>
                                            {/* Apartment Row */}
                                            <tr
                                              key={apt.id}
                                              className="cursor-pointer hover:bg-orange-50/30 transition text-slate-700"
                                              onClick={() => setExpandedApt(isAptExpanded ? null : apt.id)}
                                            >
                                              <td className="px-4 py-3.5">
                                                {isAptExpanded
                                                  ? <ChevronDown className="h-4 w-4 text-orange-500" />
                                                  : <ChevronRight className="h-4 w-4 text-slate-400" />
                                                }
                                              </td>
                                              <td className="px-4 py-3.5 font-bold text-slate-900">{apt.name}</td>
                                              <td className="px-4 py-3.5 text-center font-semibold">{aptStats.totalFlats}</td>
                                              <td className="px-4 py-3.5 text-center">
                                                <span className="inline-flex items-center justify-center h-7 min-w-[1.75rem] rounded-md bg-red-50 text-red-700 font-bold text-xs px-1.5">{aptStats.booked}</span>
                                              </td>
                                              <td className="px-4 py-3.5 text-center">
                                                <span className="inline-flex items-center justify-center h-7 min-w-[1.75rem] rounded-md bg-emerald-50 text-emerald-700 font-bold text-xs px-1.5">{aptStats.available}</span>
                                              </td>
                                              <td className="px-4 py-3.5 text-center text-slate-600">{apt.parking_slots || 0}</td>
                                              <td className="px-4 py-3.5 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                  <button onClick={(e) => { e.stopPropagation(); openEditApt(apt) }} className="p-1.5 rounded-lg hover:bg-orange-50 text-slate-400 hover:text-orange-500 transition" title="Edit Apartment">
                                                    <Edit className="h-4 w-4" />
                                                  </button>
                                                  <button onClick={(e) => { e.stopPropagation(); handleDeleteApt(apt) }} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition" title="Delete Apartment">
                                                    <Trash2 className="h-4 w-4" />
                                                  </button>
                                                </div>
                                              </td>
                                            </tr>

                                            {/* Expanded: Flats Sub-Table */}
                                            {isAptExpanded && (
                                              <tr key={`${apt.id}-flats`}>
                                                <td colSpan={7} className="p-0">
                                                  <div className="bg-white border-t border-slate-100 px-5 py-4">
                                                    {/* Filter Buttons + Add Flat */}
                                                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                                                      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                                                        <button
                                                          onClick={(e) => { e.stopPropagation(); setAptFilter(apt.id, 'all') }}
                                                          className={`px-4 py-2 rounded-lg text-sm font-bold transition ${currentFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                                        >
                                                          All ({getFlatsForApt(apt.id).length})
                                                        </button>
                                                        <button
                                                          onClick={(e) => { e.stopPropagation(); setAptFilter(apt.id, 'booked') }}
                                                          className={`px-4 py-2 rounded-lg text-sm font-bold transition ${currentFilter === 'booked' ? 'bg-red-500 text-white shadow-sm' : 'text-slate-500 hover:text-red-600'}`}
                                                        >
                                                          Booked ({aptStats.booked})
                                                        </button>
                                                        <button
                                                          onClick={(e) => { e.stopPropagation(); setAptFilter(apt.id, 'available') }}
                                                          className={`px-4 py-2 rounded-lg text-sm font-bold transition ${currentFilter === 'available' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-emerald-600'}`}
                                                        >
                                                          Available ({aptStats.available})
                                                        </button>
                                                      </div>
                                                      <div className="flex items-center gap-2 flex-wrap">
                                                        <PortalButton onClick={() => openAddFlat(apt.id)} variant="outline" className="!py-1.5 !px-3 !text-xs">
                                                          <Plus className="h-3.5 w-3.5" /> Add Flat
                                                        </PortalButton>
                                                        <PortalButton variant="outline" className="!py-1.5 !px-3 !text-xs" onClick={() => openBulkUpload(apt.id, apt.name, 'flat_details')}>
                                                          <Upload className="h-3.5 w-3.5" /> Upload Flat Details
                                                        </PortalButton>
                                                        <PortalButton variant="outline" className="!py-1.5 !px-3 !text-xs" onClick={() => openBulkUpload(apt.id, apt.name, 'booking_status')}>
                                                          <Upload className="h-3.5 w-3.5" /> Upload Booking Status
                                                        </PortalButton>
                                                        <PortalButton variant="outline" className="!py-1.5 !px-3 !text-xs" onClick={() => handleDownloadTemplate(apt.id)}>
                                                          <Download className="h-3.5 w-3.5" /> Template
                                                        </PortalButton>
                                                      </div>
                                                    </div>

                                                    {/* Flats Table */}
                                                    {filteredFlats.length === 0 ? (
                                                      <div className="text-sm text-slate-400 text-center py-6 border border-slate-100 rounded-xl">
                                                        {currentFilter === 'all' ? 'No flats found' : `No ${currentFilter} flats`}
                                                      </div>
                                                    ) : (
                                                      <div className="overflow-hidden rounded-xl border border-slate-200">
                                                        <table className="w-full text-left text-sm">
                                                          <thead className="bg-slate-50/80 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                            <tr>
                                                              <th className="px-4 py-2.5">Flat No</th>
                                                              <th className="px-4 py-2.5">Type</th>
                                                              <th className="px-4 py-2.5">Floor</th>
                                                              <th className="px-4 py-2.5">Block</th>
                                                              <th className="px-4 py-2.5 text-center">SBU Area</th>
                                                              <th className="px-4 py-2.5 text-center">Status</th>
                                                              <th className="px-4 py-2.5">Client Name</th>
                                                              <th className="px-4 py-2.5 text-right">Flat Price</th>
                                                              <th className="px-4 py-2.5 text-right">Actions</th>
                                                            </tr>
                                                          </thead>
                                                          <tbody className="divide-y divide-slate-50">
                                                            {filteredFlats.map(flat => {
                                                              const client = getClientForFlat(flat.id)
                                                              return (
                                                                <tr key={flat.id} className="hover:bg-slate-50/50 transition text-slate-700">
                                                                  <td className="px-4 py-3 font-bold text-slate-900">
                                                                    {flat.flat_number}
                                                                  </td>
                                                                  <td className="px-4 py-3 text-slate-600">{flat.flat_type || '—'}</td>
                                                                  <td className="px-4 py-3 text-slate-600">{flat.floor || '—'}</td>
                                                                  <td className="px-4 py-3 text-slate-600">{flat.block || '—'}</td>
                                                                  <td className="px-4 py-3 text-center text-slate-600">{flat.sbu_area || '—'}</td>
                                                                  <td className="px-4 py-3 text-center">
                                                                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${flat.is_available ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                                      {flat.is_available ? '✅ Available' : '🔴 Booked'}
                                                                    </span>
                                                                  </td>
                                                                  <td className="px-4 py-3">
                                                                    {client ? (
                                                                      <button
                                                                        onClick={(e) => { e.stopPropagation(); navigate(`/portal/clients/${client.id}`) }}
                                                                        className="text-orange-600 font-bold hover:text-orange-700 hover:underline transition text-sm"
                                                                        title={`View ${client.name}'s profile`}
                                                                      >
                                                                        {client.name}
                                                                      </button>
                                                                    ) : (
                                                                      <span className="text-slate-400">—</span>
                                                                    )}
                                                                  </td>
                                                                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                                                                    {Number(flat.total_amount || 0) > 0 ? formatCurrency(Number(flat.total_amount)) : '—'}
                                                                  </td>
                                                                  <td className="px-4 py-3 text-right">
                                                                    <div className="flex items-center justify-end gap-1">
                                                                      <button onClick={(e) => { e.stopPropagation(); openEditFlat(flat) }} className="p-1.5 rounded-lg hover:bg-orange-50 text-slate-400 hover:text-orange-500 transition" title="Edit Flat">
                                                                        <Edit className="h-3.5 w-3.5" />
                                                                      </button>
                                                                      <button onClick={(e) => { e.stopPropagation(); handleDeleteFlat(flat) }} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition" title="Delete Flat">
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                      </button>
                                                                    </div>
                                                                  </td>
                                                                </tr>
                                                              )
                                                            })}
                                                          </tbody>
                                                        </table>
                                                      </div>
                                                    )}
                                                  </div>
                                                </td>
                                              </tr>
                                            )}
                                          </>
                                        )
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Summary Popup Modal ─── */}
      <Modal open={showSummary} onClose={() => setShowSummary(false)} title="📊 Overall Summary" wide>
        <div className="space-y-6">
          {/* Overall Stats Grid */}
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
            <div className="rounded-xl bg-orange-50 border border-orange-200 p-4 text-center">
              <div className="text-xs font-bold uppercase tracking-wide text-orange-600 mb-1">Properties</div>
              <div className="text-3xl font-extrabold text-orange-700">{properties.length}</div>
            </div>
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-center">
              <div className="text-xs font-bold uppercase tracking-wide text-blue-600 mb-1">Apartments</div>
              <div className="text-3xl font-extrabold text-blue-700">{apartments.length}</div>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-center">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1">Total Flats</div>
              <div className="text-3xl font-extrabold text-slate-800">{totalFlats}</div>
            </div>
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-center">
              <div className="text-xs font-bold uppercase tracking-wide text-red-600 mb-1">Booked</div>
              <div className="text-3xl font-extrabold text-red-700">{bookedFlats}</div>
            </div>
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center">
              <div className="text-xs font-bold uppercase tracking-wide text-emerald-600 mb-1">Available</div>
              <div className="text-3xl font-extrabold text-emerald-700">{availableFlats}</div>
            </div>
            <div className="rounded-xl bg-purple-50 border border-purple-200 p-4 text-center">
              <div className="text-xs font-bold uppercase tracking-wide text-purple-600 mb-1">Occupancy</div>
              <div className="text-3xl font-extrabold text-purple-700">{totalFlats > 0 ? Math.round((bookedFlats / totalFlats) * 100) : 0}%</div>
            </div>
          </div>

          {/* Per-Property Breakdown */}
          <div>
            <div className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Property-wise Breakdown</div>
            <div className="space-y-3">
              {properties.map(prop => {
                const pStats = getPropertyStats(prop.id)
                const occupancy = pStats.totalFlats > 0 ? Math.round((pStats.booked / pStats.totalFlats) * 100) : 0
                return (
                  <div key={prop.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-bold text-slate-900 text-base">{prop.name}</div>
                        <div className="text-xs text-slate-500">{prop.address || 'No address'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-400 font-semibold">Occupancy</div>
                        <div className="text-lg font-extrabold text-slate-900">{occupancy}%</div>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden mb-3">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-500"
                        style={{ width: `${occupancy}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-4 gap-3 text-center text-xs">
                      <div>
                        <div className="font-bold text-blue-600">{pStats.apartments}</div>
                        <div className="text-slate-500">Apartments</div>
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">{pStats.totalFlats}</div>
                        <div className="text-slate-500">Total Flats</div>
                      </div>
                      <div>
                        <div className="font-bold text-red-600">{pStats.booked}</div>
                        <div className="text-slate-500">Booked</div>
                      </div>
                      <div>
                        <div className="font-bold text-emerald-600">{pStats.available}</div>
                        <div className="text-slate-500">Available</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <PortalButton variant="outline" onClick={() => setShowSummary(false)}>Close</PortalButton>
          </div>
        </div>
      </Modal>

      {/* ─── Add/Edit Property Modal ─── */}
      <Modal open={propModal.open} onClose={() => setPropModal({ open: false })} title={propModal.editing ? 'Edit Property' : 'Add New Property'} closeOnBackdropClick={false}>
        <div className="space-y-4">
          <Input label="Property Name" value={propForm.name} onChange={(v) => setPropForm(s => ({...s, name: v}))} required placeholder="e.g. RG Residency" />
          <Input label="Address" value={propForm.address} onChange={(v) => setPropForm(s => ({...s, address: v}))} placeholder="Property Location" />
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Land Boundaries</div>
            <div className="grid gap-3 md:grid-cols-2">
              <Input label="North" value={propForm.land_north} onChange={(v) => setPropForm(s => ({...s, land_north: v}))} placeholder="North side detail" />
              <Input label="South" value={propForm.land_south} onChange={(v) => setPropForm(s => ({...s, land_south: v}))} placeholder="South side detail" />
              <Input label="East" value={propForm.land_east} onChange={(v) => setPropForm(s => ({...s, land_east: v}))} placeholder="East side detail" />
              <Input label="West" value={propForm.land_west} onChange={(v) => setPropForm(s => ({...s, land_west: v}))} placeholder="West side detail" />
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <PortalButton variant="outline" onClick={() => setPropModal({ open: false })}>Cancel</PortalButton>
          <PortalButton onClick={handleSaveProp} disabled={saving || !propForm.name.trim()}>
            {saving ? 'Saving...' : propModal.editing ? 'Update' : 'Add Property'}
          </PortalButton>
        </div>
      </Modal>

      {/* ─── Add/Edit Apartment Modal ─── */}
      <Modal open={aptModal.open} onClose={() => setAptModal({ open: false, propId: 0 })} title={aptModal.editing ? 'Edit Apartment' : 'Add New Apartment'} wide closeOnBackdropClick={false}>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Apartment Name" value={aptForm.name} onChange={(v) => setAptForm(s => ({...s, name: v}))} required placeholder="e.g. Tower A" />
          <Input label="Total Flats" value={aptForm.total_flats} onChange={(v) => setAptForm(s => ({...s, total_flats: v, parking_slots: s.parking_slots || (v ? String(Number(v) * 2) : '') }))} type="number" placeholder="e.g. 50" />
          <Input label="Numbering Pattern" value={aptForm.numbering_pattern} onChange={(v) => setAptForm(s => ({...s, numbering_pattern: v}))} placeholder="e.g. 101" />
          <Input label="Total Parking Slots" value={aptForm.parking_slots} onChange={(v) => setAptForm(s => ({...s, parking_slots: v}))} type="number" placeholder="e.g. 60" />
          <Input label="Electricity Details" value={aptForm.electricity_details} onChange={(v) => setAptForm(s => ({...s, electricity_details: v}))} placeholder="e.g. WBSEDCL" />
          <Input label="Transformer Details" value={aptForm.transformer_details} onChange={(v) => setAptForm(s => ({...s, transformer_details: v}))} placeholder="e.g. 500kVA" />
          <div className="md:col-span-2">
            <Input label="Water Connection Details" value={aptForm.water_connection_details} onChange={(v) => setAptForm(s => ({...s, water_connection_details: v}))} placeholder="e.g. Municipal + borewell supply" />
          </div>
          <div className="md:col-span-2">
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Floor Boundaries for Demand Letter</div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="North" value={aptForm.floor_north} onChange={(v) => setAptForm(s => ({...s, floor_north: v}))} placeholder="e.g. Flat No. 903" />
              <Input label="South" value={aptForm.floor_south} onChange={(v) => setAptForm(s => ({...s, floor_south: v}))} placeholder="e.g. Side Setback" />
              <Input label="East" value={aptForm.floor_east} onChange={(v) => setAptForm(s => ({...s, floor_east: v}))} placeholder="e.g. Rear Setback" />
              <Input label="West" value={aptForm.floor_west} onChange={(v) => setAptForm(s => ({...s, floor_west: v}))} placeholder="e.g. Pool and Garden area" />
            </div>
          </div>
        </div>
        {!aptModal.editing && (
          <div className="mt-4 text-xs text-amber-700 bg-amber-50 p-3 rounded-lg">
            <strong>Note:</strong> We will automatically generate {aptForm.total_flats || '0'} flats starting from {aptForm.numbering_pattern || '1'}. You can edit individual flat details later.
          </div>
        )}
        <div className="mt-3 text-xs text-slate-500">
          Parking slots default to roughly 2 per flat so you can keep one primary slot per flat and still have extra paid parking available.
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <PortalButton variant="outline" onClick={() => setAptModal({ open: false, propId: 0 })}>Cancel</PortalButton>
          <PortalButton onClick={handleSaveApt} disabled={saving || !aptForm.name.trim()}>
            {saving ? 'Saving...' : aptModal.editing ? 'Update' : 'Add Apartment'}
          </PortalButton>
        </div>
      </Modal>

      {/* ─── Add/Edit Flat Modal ─── */}
      <Modal open={flatModal.open} onClose={() => setFlatModal({ open: false, aptId: 0 })} title={flatModal.editing ? 'Edit Flat' : 'Add New Flat'} wide closeOnBackdropClick={false}>
        <div className="grid gap-4 md:grid-cols-3">
          <Input label="Flat Number" value={flatForm.flat_number} onChange={(v) => setFlatForm(s => ({ ...s, flat_number: v }))} required placeholder="e.g. 101" />
          <Input label="Type" value={flatForm.flat_type} onChange={(v) => setFlatForm(s => ({ ...s, flat_type: v }))} placeholder="e.g. 3BHK, EWS, LIG" />
          <Input label="Floor" value={flatForm.floor} onChange={(v) => setFlatForm(s => ({ ...s, floor: v }))} placeholder="e.g. 1st" />
          <Input label="Block" value={flatForm.block} onChange={(v) => setFlatForm(s => ({ ...s, block: v }))} placeholder="e.g. A" />
          <Input label="Carpet Area (sqft)" value={flatForm.carpet_area} onChange={(v) => setFlatForm(s => ({ ...s, carpet_area: v }))} type="number" placeholder="e.g. 353" />
          <Input label="Balcony (sqft)" value={flatForm.balcony_area} onChange={(v) => setFlatForm(s => ({ ...s, balcony_area: v }))} type="number" placeholder="e.g. 53" />
          <Input label="Terrace (sqft)" value={flatForm.terrace_area} onChange={(v) => setFlatForm(s => ({ ...s, terrace_area: v }))} type="number" placeholder="e.g. 0" />
          <Input label="Built Up Area (sqft)" value={flatForm.built_up_area} onChange={(v) => setFlatForm(s => ({ ...s, built_up_area: v }))} type="number" placeholder="e.g. 450" />
          <Input label="Super Built Up Area (sqft)" value={flatForm.sbu_area} onChange={(v) => setFlatForm(s => ({ ...s, sbu_area: v }))} type="number" placeholder="e.g. 563" />
          <Input label="Undivided Share of Land" value={flatForm.undivided_share} onChange={(v) => setFlatForm(s => ({ ...s, undivided_share: v }))} type="number" placeholder="e.g. 141" />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <PortalButton variant="outline" onClick={() => setFlatModal({ open: false, aptId: 0 })}>Cancel</PortalButton>
          <PortalButton onClick={handleSaveFlat} disabled={saving || !flatForm.flat_number.trim()}>
            {saving ? 'Saving...' : flatModal.editing ? 'Update Flat' : 'Add Flat'}
          </PortalButton>
        </div>
      </Modal>

      {/* ─── Bulk Upload Modal ─── */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFileSelect}
      />
      <Modal
        open={bulkUploadModal.open}
        onClose={closeBulkUpload}
        title={`📤 ${bulkUploadModal.mode === 'flat_details' ? 'Upload Flat Details' : 'Upload Booking Status'} — ${bulkUploadModal.aptName}`}
        wide
        closeOnBackdropClick={false}
      >
        {/* Step 1: File Select */}
        {bulkStep === 'select' && (
          <div className="text-center py-8">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-orange-50 flex items-center justify-center mb-4">
              <FileSpreadsheet className="h-8 w-8 text-orange-500" />
            </div>
            <div className="text-lg font-bold text-slate-900 mb-2">
              {bulkUploadModal.mode === 'flat_details' ? 'Upload Flat Details Excel' : 'Upload Booking Status Excel'}
            </div>
            <div className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
              {bulkUploadModal.mode === 'flat_details'
                ? 'Upload an Excel file with flat details (Flat No, Type, Floor, Area details). Flat Amount and GST columns can be blank.'
                : 'Upload an Excel file with booking status (Flat No, Booking Status, Customer Name).'
              }
            </div>
            <div className="text-xs text-slate-400 mb-4">Supported: .xlsx, .xls, .csv • Max 50MB</div>
            <PortalButton onClick={() => fileInputRef.current?.click()} disabled={bulkParsing}>
              {bulkParsing ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Parsing...</>
              ) : (
                <><Upload className="h-4 w-4" /> Select File</>
              )}
            </PortalButton>
          </div>
        )}

        {/* Step 2: Preview with Auto-Mapping */}
        {bulkStep === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <div className="text-sm font-bold text-emerald-800">File parsed: {bulkFile?.name}</div>
                <div className="text-xs text-emerald-600">{bulkSheets.length} sheet(s) detected</div>
              </div>
            </div>

            {bulkSheets.map((sheet, idx) => (
              <div key={idx} className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-slate-900">{sheet.sheetName}</span>
                    <span className="ml-2 text-xs text-slate-400">Block: {sheet.blockName} • {sheet.totalRows} rows</span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-md ${sheet.sheetType === 'flat_details' ? 'bg-blue-100 text-blue-700' : sheet.sheetType === 'booking_status' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'}`}>
                    {sheet.sheetType === 'flat_details' ? 'Flat Details' : sheet.sheetType === 'booking_status' ? 'Booking Status' : 'Unknown'}
                  </span>
                </div>

                {/* Auto-Mapping Table */}
                <div className="px-4 py-3">
                  <div className="text-xs font-bold text-slate-500 uppercase mb-2">Column Mapping (Auto-detected)</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="px-3 py-2 text-left text-slate-500">Excel Column</th>
                          <th className="px-3 py-2 text-left text-slate-500">→ Maps To</th>
                          <th className="px-3 py-2 text-left text-slate-500">Confidence</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {sheet.headers.map((h, hi) => {
                          const mapping = sheet.autoMappings[h]
                          return (
                            <tr key={hi} className={mapping ? '' : 'opacity-50'}>
                              <td className="px-3 py-2 font-semibold text-slate-800">{h}</td>
                              <td className="px-3 py-2 text-slate-600">{mapping ? mapping.systemField.replace(/_/g, ' ') : '— skip —'}</td>
                              <td className="px-3 py-2">
                                {mapping && (
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${mapping.confidence === 'HIGH' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {mapping.confidence}
                                  </span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Sample Data Preview */}
                {sheet.sampleRows.length > 0 && (
                  <div className="px-4 py-3 border-t border-slate-100">
                    <div className="text-xs font-bold text-slate-500 uppercase mb-2">Sample Data (first {sheet.sampleRows.length} rows)</div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-50">
                            {sheet.headers.map((h, hi) => <th key={hi} className="px-2 py-1.5 text-left text-slate-500 whitespace-nowrap">{h}</th>)}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {sheet.sampleRows.map((row, ri) => (
                            <tr key={ri}>
                              {sheet.headers.map((h, hi) => <td key={hi} className="px-2 py-1.5 text-slate-700 whitespace-nowrap">{String(row[h] ?? '')}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div className="flex justify-end gap-2 pt-2">
              <PortalButton variant="outline" onClick={() => { setBulkStep('select'); setBulkFile(null); setBulkSheets([]) }}>Back</PortalButton>
              <PortalButton onClick={handleBulkUpload} disabled={bulkSheets.length === 0}>
                <Upload className="h-4 w-4" /> Confirm & Upload
              </PortalButton>
            </div>
          </div>
        )}

        {/* Step 3: Uploading */}
        {bulkStep === 'uploading' && (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto mb-4" />
            <div className="text-lg font-bold text-slate-900 mb-2">Processing Upload...</div>
            <div className="text-sm text-slate-500">Please wait while we process your Excel file.</div>
          </div>
        )}

        {/* Step 4: Results */}
        {bulkStep === 'results' && bulkResult && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
              <div>
                <div className="text-base font-bold text-emerald-800">Upload Complete!</div>
                <div className="text-sm text-emerald-600">Successfully processed {bulkResult.totalProcessed} rows</div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
              {'totalInserted' in bulkResult && (
                <>
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-center">
                    <div className="text-2xl font-extrabold text-emerald-700">{bulkResult.totalInserted}</div>
                    <div className="text-xs font-bold text-emerald-600">Inserted</div>
                  </div>
                  <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-center">
                    <div className="text-2xl font-extrabold text-blue-700">{bulkResult.totalUpdated}</div>
                    <div className="text-xs font-bold text-blue-600">Updated</div>
                  </div>
                </>
              )}
              {'totalBooked' in bulkResult && (
                <>
                  <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-center">
                    <div className="text-2xl font-extrabold text-red-700">{bulkResult.totalBooked}</div>
                    <div className="text-xs font-bold text-red-600">Booked</div>
                  </div>
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-center">
                    <div className="text-2xl font-extrabold text-emerald-700">{bulkResult.totalAvailable}</div>
                    <div className="text-xs font-bold text-emerald-600">Available</div>
                  </div>
                </>
              )}
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-center">
                <div className="text-2xl font-extrabold text-amber-700">{bulkResult.totalSkipped}</div>
                <div className="text-xs font-bold text-amber-600">Skipped</div>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-center">
                <div className="text-2xl font-extrabold text-slate-700">{bulkResult.totalProcessed}</div>
                <div className="text-xs font-bold text-slate-600">Total</div>
              </div>
            </div>

            {/* Per-Sheet Breakdown */}
            {bulkResult.sheets && bulkResult.sheets.length > 0 && (
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase mb-2">Per-Sheet Breakdown</div>
                <div className="space-y-2">
                  {bulkResult.sheets.map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white">
                      <div>
                        <span className="text-sm font-bold text-slate-900">{s.sheetName}</span>
                        <span className="ml-2 text-xs text-slate-400">{s.blockName} • {s.totalRows} rows</span>
                      </div>
                      <div className="flex gap-3 text-xs">
                        {'inserted' in s && <span className="text-emerald-600 font-bold">+{s.inserted} new</span>}
                        {'updated' in s && <span className="text-blue-600 font-bold">{s.updated} updated</span>}
                        {'booked' in s && <span className="text-red-600 font-bold">{(s as { booked: number }).booked} booked</span>}
                        {'available' in s && <span className="text-emerald-600 font-bold">{(s as { available: number }).available} available</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Errors */}
            {bulkResult.errors && bulkResult.errors.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-xs font-bold text-red-600 uppercase">Errors ({bulkResult.errors.length})</span>
                </div>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-red-200 bg-red-50">
                  {bulkResult.errors.map((err, i) => (
                    <div key={i} className="px-3 py-2 text-xs text-red-700 border-b border-red-100 last:border-0">
                      <span className="font-bold">{err.sheet} Row {err.row}:</span> {err.error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <PortalButton onClick={closeBulkUpload}>Done</PortalButton>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
