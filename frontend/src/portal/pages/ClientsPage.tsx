/**
 * R.G INFRA CRM — Clients Page
 * Phase 1 Onboarding: Name, Phone, Email, Address, Purchase Date
 * Property: Apartment → Flat (cascade select, availability check)
 * Infrastructure: Parking, Extra Parking
 */

import { Plus, Search, Building2, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type Client, type Apartment, type Flat, type Property } from '../api'
import { usePortalStore } from '../store'
import { usePortalToast } from '../toast'
import { EmptyState, inr, Input, Select, Modal, PortalButton, PortalCard, Textarea } from '../ui'

const emptyForm = {
  name: '', phone: '', email: '', address: '', pan_number: '', aadhaar_number: '', purchase_date: '',
  property_id: '', apartment_id: '', flat_id: '',
  flat_price: '', gst_percent: '',
  booking_amount: '', booking_percentage: '',
  parking_allotment: false, parking_slot_no: '',
  extra_parking_allotment: false, 
  extra_parkings: [{ type: 'car' as 'bike' | 'car', count: '1', slot: '', charge: '' }],
}

function parkingCodeFromFlat(flatNumber?: string | number | null, prefix = 'P') {
  const normalized = String(flatNumber ?? '').trim().replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  return normalized ? `${prefix}${normalized}` : ''
}

function normalizePan(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10)
}

function normalizeAadhaar(value: string) {
  return value.replace(/\D/g, '').slice(0, 12)
}

export function ClientsPage() {
  const store = usePortalStore()
  const toast = usePortalToast()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [propertyFilter, setPropertyFilter] = useState('')
  const [apartmentFilter, setApartmentFilter] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)

  const formatNumber = (value: number) => {
    if (!Number.isFinite(value)) return ''
    return String(Math.round(value * 100) / 100)
  }

  const [properties, setProperties] = useState<Property[]>([])
  const [apartments, setApartments] = useState<Apartment[]>([])
  const [allFlats, setAllFlats] = useState<Flat[]>([])

  useEffect(() => {
    api.getProperties().then(setProperties).catch(() => {})
    api.getApartments().then(setApartments).catch(() => {})
    api.getFlats().then(setAllFlats).catch(() => {})
  }, [])

  const availableApartments = apartments.filter((a) => !form.property_id || a.property_id === Number(form.property_id))
  const availableFlats = allFlats.filter((f) => f.apartment_id === Number(form.apartment_id) && f.is_available && (!f.status || f.status === 'available'))
  const selectedFlat = allFlats.find((f) => f.id === Number(form.flat_id))

  useEffect(() => {
    if (!selectedFlat) return
    const primaryParking = parkingCodeFromFlat(selectedFlat.flat_number)
    const extraParking = parkingCodeFromFlat(selectedFlat.flat_number, 'EP')

    setForm((current) => {
      let next = current
      if (current.parking_allotment && current.parking_slot_no !== primaryParking) {
        next = { ...next, parking_slot_no: primaryParking }
      }
      if (current.extra_parking_allotment) {
        next = {
          ...next,
          extra_parkings: next.extra_parkings.map((p, i) => 
            i === 0 && !p.slot ? { ...p, slot: extraParking } : p
          )
        }
      }
      return next
    })
  }, [selectedFlat, form.parking_allotment, form.extra_parking_allotment])

  const propertyOptions = Array.from(new Set(store.clients.map((c) => c.property_name).filter(Boolean))) as string[]
  const apartmentOptions = Array.from(new Set(store.clients.map((c) => c.apartment_name).filter(Boolean))) as string[]

  const filteredClients = store.clients.filter((c) => {
    const q = search.toLowerCase()
    if (propertyFilter && c.property_name !== propertyFilter) return false
    if (apartmentFilter && c.apartment_name !== apartmentFilter) return false
    return (
      !q ||
      c.name?.toLowerCase().includes(q) ||
      c.unique_client_id?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.apartment_name?.toLowerCase().includes(q) ||
      c.flat_number?.toLowerCase().includes(q) ||
      c.company_name?.toLowerCase().includes(q) ||
      c.contact_person?.toLowerCase().includes(q)
    )
  })

  const handleAdd = async () => {
    if (!form.name.trim() || !form.flat_id) {
      toast.push({ tone: 'error', title: 'Name and Flat are required' })
      return
    }
    setSaving(true)
    try {
      await api.createClient({
        name: form.name,
        phone: form.phone,
        email: form.email,
        address: form.address,
        pan_number: form.pan_number || undefined,
        aadhaar_number: form.aadhaar_number || undefined,
        purchase_date: form.purchase_date || undefined,
        flat_id: Number(form.flat_id),
        flat_price: form.flat_price ? Number(form.flat_price) : undefined,
        gst_percent: form.gst_percent ? Number(form.gst_percent) : undefined,
        booking_amount: form.booking_amount ? Number(form.booking_amount) : undefined,
        booking_percentage: form.booking_percentage ? Number(form.booking_percentage) : undefined,
        parking_allotment: form.parking_allotment,
        parking_slot_no: form.parking_slot_no || undefined,
        extra_parking_allotment: form.extra_parking_allotment,
        extra_vehicle_type: form.extra_parking_allotment ? form.extra_parkings.map(p => p.type).join(', ') : undefined,
        extra_parking_count: form.extra_parking_allotment ? form.extra_parkings.reduce((sum, p) => sum + (Number(p.count) || 0), 0) : undefined,
        extra_parking_slot_no: form.extra_parking_allotment ? form.extra_parkings.map(p => p.slot).filter(Boolean).join(', ') : undefined,
        extra_parking_charge: form.extra_parking_allotment ? form.extra_parkings.reduce((sum, p) => sum + (Number(p.charge) || 0), 0) : undefined,
      } as any)
      toast.push({ tone: 'success', title: 'Client onboarded successfully' })
      setShowAdd(false)
      setForm({ ...emptyForm })
      store.refreshClients()
      store.refreshDashboard()
      api.getFlats().then(setAllFlats).catch(() => {})
    } catch (e) {
      toast.push({ tone: 'error', title: e instanceof Error ? e.message : 'Failed to add client' })
    } finally {
      setSaving(false)
    }
  }

  const displayName = (c: Client) => c.name || c.company_name || '—'

  return (
    <div className="space-y-6">
      <PortalCard>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-2xl font-extrabold text-slate-900">Clients</div>
            <div className="text-sm text-slate-500">{store.clients.length} total clients</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search clients..."
                className="rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 outline-none ring-orange-400/40 focus:ring-2 w-56"
              />
            </div>
            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-orange-400/40 focus:ring-2 w-48"
            >
              <option value="">All Properties</option>
              {propertyOptions.map((propertyName) => <option key={propertyName} value={propertyName}>{propertyName}</option>)}
            </select>
            <select
              value={apartmentFilter}
              onChange={(e) => setApartmentFilter(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-orange-400/40 focus:ring-2 w-48"
            >
              <option value="">All Apartments</option>
              {apartmentOptions.map((apartmentName) => <option key={apartmentName} value={apartmentName}>{apartmentName}</option>)}
            </select>
            <PortalButton onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4" /> Add Client
            </PortalButton>
          </div>
        </div>
      </PortalCard>

      {filteredClients.length === 0 ? (
        <EmptyState title="No clients found" sub="Add your first client to get started" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Client ID</th>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Phone</th>
                  <th className="px-5 py-3">Apartment</th>
                  <th className="px-5 py-3">Flat</th>
                  <th className="px-5 py-3 text-right">Total Amount</th>
                  <th className="px-5 py-3 text-right">Paid</th>
                  <th className="px-5 py-3 text-right">Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClients.map((c) => (
                  <tr key={c.id} onClick={() => navigate(`/portal/clients/${c.id}`)} className="cursor-pointer hover:bg-orange-50/50 transition text-slate-700">
                    <td className="px-5 py-4 text-xs font-mono text-orange-600 font-bold">{c.unique_client_id || '—'}</td>
                    <td className="px-5 py-4 font-bold text-slate-900">{displayName(c)}</td>
                    <td className="px-5 py-4">{c.phone || '—'}</td>
                    <td className="px-5 py-4">{c.apartment_name || '—'}</td>
                    <td className="px-5 py-4">{c.flat_number || '—'}</td>
                    <td className="px-5 py-4 text-right font-semibold">{inr(c.total_amount)}</td>
                    <td className="px-5 py-4 text-right text-emerald-600 font-semibold">{inr(c.total_paid)}</td>
                    <td className="px-5 py-4 text-right font-bold" style={{ color: (c.total_due || 0) > 0 ? '#dc2626' : '#059669' }}>{inr(c.total_due)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Onboard New Client" wide closeOnBackdropClick={false}>
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <User className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-bold text-slate-700">Client Details</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Client Name" value={form.name} onChange={(v) => setForm((s) => ({ ...s, name: v }))} required />
            <Input label="Phone" value={form.phone} onChange={(v) => setForm((s) => ({ ...s, phone: v }))} />
            <Input label="Email" value={form.email} onChange={(v) => setForm((s) => ({ ...s, email: v }))} type="email" />
            <Input
              label="PAN"
              value={form.pan_number}
              onChange={(v) => setForm((s) => ({ ...s, pan_number: normalizePan(v) }))}
              placeholder="10 characters"
            />
            <Input
              label="Aadhaar"
              value={form.aadhaar_number}
              onChange={(v) => setForm((s) => ({ ...s, aadhaar_number: normalizeAadhaar(v) }))}
              placeholder="12 digits"
            />
            <Input label="Purchase Date" value={form.purchase_date} onChange={(v) => setForm((s) => ({ ...s, purchase_date: v }))} type="date" />
          </div>
          <div className="mt-3">
            <Textarea label="Address" value={form.address} onChange={(v) => setForm((s) => ({ ...s, address: v }))} rows={2} />
          </div>
        </div>

        <div className="mb-5 border-t border-slate-100 pt-5">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-bold text-slate-700">Property Details</span>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Select
              label="Property"
              value={form.property_id}
              onChange={(v) => setForm((s) => ({ ...s, property_id: v, apartment_id: '', flat_id: '' }))}
              options={properties.map((p) => ({ value: String(p.id), label: p.name }))}
              placeholder="Select Property..."
            />
            <Select
              label="Apartment"
              value={form.apartment_id}
              onChange={(v) => setForm((s) => ({ ...s, apartment_id: v, flat_id: '' }))}
              options={availableApartments.map((a) => ({ value: String(a.id), label: a.name }))}
              placeholder={!form.property_id ? 'Select property first' : 'Select Apartment...'}
              required
            />
            <Select
              label="Flat Number"
              value={form.flat_id}
              onChange={(v) => {
                const nextFlat = allFlats.find((flat) => String(flat.id) === v)
                const primaryParking = parkingCodeFromFlat(nextFlat?.flat_number)
                const extraParking = parkingCodeFromFlat(nextFlat?.flat_number, 'EP')
                setForm((s) => ({
                  ...s,
                  flat_id: v,
                  parking_slot_no: s.parking_allotment ? primaryParking : '',
                  extra_parkings: s.extra_parking_allotment ? s.extra_parkings.map((p, i) => i === 0 ? { ...p, slot: extraParking } : p) : s.extra_parkings,
                }))
              }}
              options={availableFlats.map((f) => ({
                value: String(f.id),
                label: `${f.flat_number} — ${f.flat_type || ''} Floor ${f.floor || '—'}, Block ${f.block || '—'} (${f.sbu_area || 0} sqft)`,
              }))}
              placeholder={!form.apartment_id ? 'Select apartment first' : availableFlats.length === 0 ? 'No available flats' : 'Select Flat...'}
              required
            />
          </div>

          {form.flat_id && (() => {
            const flatInfo = allFlats.find((flat) => flat.id === Number(form.flat_id))
            if (!flatInfo) return null
            return (
              <div className="mt-3 rounded-xl bg-orange-50 border border-orange-200 p-3">
                <div className="text-xs font-bold text-orange-700 mb-1">Selected Flat Info</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-700">
                  <div><span className="font-semibold">Flat:</span> {flatInfo.flat_number}</div>
                  <div><span className="font-semibold">Type:</span> {flatInfo.flat_type || '—'}</div>
                  <div><span className="font-semibold">Floor:</span> {flatInfo.floor || '—'}</div>
                  <div><span className="font-semibold">Block:</span> {flatInfo.block || '—'}</div>
                  {flatInfo.carpet_area ? <div><span className="font-semibold">Carpet:</span> {flatInfo.carpet_area} sqft</div> : null}
                  <div><span className="font-semibold">SBU Area:</span> {flatInfo.sbu_area || '—'} sqft</div>
                  {flatInfo.undivided_share ? <div><span className="font-semibold">Undivided Share:</span> {flatInfo.undivided_share}</div> : null}
                </div>
              </div>
            )
          })()}

          {/* Flat Price & GST — entered during onboarding */}
          {form.flat_id && (() => {
            const flatPriceNum = Number(form.flat_price || 0)
            const gstPctNum = Number(form.gst_percent || 0)
            const gstAmount = flatPriceNum * (gstPctNum / 100)
            const totalWithGst = flatPriceNum + gstAmount
            return (
              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-bold text-blue-800">💰 Flat Pricing</span>
                  <span className="text-xs text-blue-500">(Enter price and GST for this flat)</span>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Flat Price (₹)"
                    value={form.flat_price}
                    onChange={(v) => setForm((s) => ({ ...s, flat_price: v }))}
                    type="number"
                    placeholder="e.g. 7500000"
                    required
                  />
                  <Input
                    label="GST (%)"
                    value={form.gst_percent}
                    onChange={(v) => setForm((s) => ({ ...s, gst_percent: v }))}
                    type="number"
                    placeholder="e.g. 5"
                  />
                </div>
                {flatPriceNum > 0 && (
                  <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                    <div className="rounded-lg bg-white border border-blue-200 p-3">
                      <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Flat Amount</div>
                      <div className="font-extrabold text-slate-900">{inr(flatPriceNum)}</div>
                    </div>
                    <div className="rounded-lg bg-white border border-orange-200 p-3">
                      <div className="text-xs font-bold uppercase tracking-wide text-slate-400">GST Amount ({gstPctNum}%)</div>
                      <div className="font-extrabold text-orange-600">{inr(gstAmount)}</div>
                    </div>
                    <div className="rounded-lg bg-white border border-emerald-200 p-3">
                      <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Total with GST</div>
                      <div className="font-extrabold text-emerald-600">{inr(totalWithGst)}</div>
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          <div className="mt-3 grid gap-3 max-w-md sm:grid-cols-2">
            <Input
              label="Booking Percentage (%)"
              value={form.booking_percentage}
              onChange={(v) => {
                if (!v) return setForm((s) => ({ ...s, booking_percentage: '', booking_amount: '' }))
                const pct = Number(v)
                const flatPrice = Number(form.flat_price || 0)
                if (Number.isNaN(pct) || flatPrice === 0) return setForm((s) => ({ ...s, booking_percentage: v }))
                const amount = (flatPrice * pct) / 100
                setForm((s) => ({ ...s, booking_percentage: v, booking_amount: formatNumber(amount) }))
              }}
              type="number"
              placeholder="e.g. 10"
            />
            <Input
              label="Booking Amount (₹)"
              value={form.booking_amount}
              onChange={(v) => {
                if (!v) return setForm((s) => ({ ...s, booking_amount: '', booking_percentage: '' }))
                const amt = Number(v)
                const flatPrice = Number(form.flat_price || 0)
                if (Number.isNaN(amt) || flatPrice === 0) {
                  return setForm((s) => ({ ...s, booking_amount: v }))
                }
                const pct = (amt / flatPrice) * 100
                setForm((s) => ({ ...s, booking_amount: v, booking_percentage: formatNumber(pct) }))
              }}
              type="number"
            />
          </div>
        </div>

        <div className="mb-5 border-t border-slate-100 pt-5">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-bold text-slate-700">Parking Details</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-slate-600">Primary Parking Allotment</label>
              <div className="mt-1.5 flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="parking"
                    checked={form.parking_allotment === true}
                    onChange={() => setForm((s) => ({ ...s, parking_allotment: true, parking_slot_no: selectedFlat ? parkingCodeFromFlat(selectedFlat.flat_number) : s.parking_slot_no }))}
                    className="accent-orange-500"
                  />
                  <span className="text-sm text-slate-700">Yes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="parking"
                    checked={form.parking_allotment === false}
                    onChange={() => setForm((s) => ({ ...s, parking_allotment: false, parking_slot_no: '', extra_parking_allotment: false }))}
                    className="accent-orange-500"
                  />
                  <span className="text-sm text-slate-700">No</span>
                </label>
              </div>
            </div>
            {form.parking_allotment && (
              <Input label="Primary Parking Slot No" value={form.parking_slot_no} onChange={(v) => setForm((s) => ({ ...s, parking_slot_no: v }))} placeholder="e.g. P101" />
            )}
            {form.parking_allotment && (
              <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-slate-700">Extra Parking</div>
                    <div className="text-xs text-slate-500">Optional additional parking beyond the primary slot.</div>
                  </div>
                <div className="flex items-center gap-2 cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={form.extra_parking_allotment === true}
                    onChange={(e) => setForm((s) => ({
                      ...s,
                      extra_parking_allotment: e.target.checked,
                    }))}
                    className="h-4 w-4 accent-orange-500"
                  />
                  <span className="text-sm font-semibold text-slate-700">Allocate extra parking</span>
                </div>
              </div>
              {form.extra_parking_allotment && (
                <div className="mt-4 space-y-4">
                  {form.extra_parkings.map((parking, idx) => (
                    <div key={idx} className="relative rounded-xl border border-slate-200 bg-white p-3 pt-4 shadow-sm">
                      {form.extra_parkings.length > 1 && (
                        <button
                          onClick={() => setForm(s => ({ ...s, extra_parkings: s.extra_parkings.filter((_, i) => i !== idx) }))}
                          className="absolute right-2 top-2 text-slate-400 hover:text-red-500"
                          title="Remove parking"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </button>
                      )}
                      
                      <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Type of Vehicle</label>
                        <div className="mt-2 flex items-center gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`extra_vehicle_type_${idx}`}
                              checked={parking.type === 'bike'}
                              onChange={() => setForm(s => {
                                const newP = [...s.extra_parkings];
                                newP[idx].type = 'bike';
                                return { ...s, extra_parkings: newP };
                              })}
                              className="accent-orange-500"
                            />
                            <span className="text-sm text-slate-700">🏍️ Bike</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`extra_vehicle_type_${idx}`}
                              checked={parking.type === 'car'}
                              onChange={() => setForm(s => {
                                const newP = [...s.extra_parkings];
                                newP[idx].type = 'car';
                                return { ...s, extra_parkings: newP };
                              })}
                              className="accent-orange-500"
                            />
                            <span className="text-sm text-slate-700">🚗 Car</span>
                          </label>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <Input 
                          label="No. of Parking" 
                          value={parking.count} 
                          onChange={(v) => setForm(s => {
                            const newP = [...s.extra_parkings];
                            newP[idx].count = v;
                            return { ...s, extra_parkings: newP };
                          })} 
                          type="number" 
                          placeholder="e.g. 1" 
                        />
                        <Input 
                          label="Parking Slot No" 
                          value={parking.slot} 
                          onChange={(v) => setForm(s => {
                            const newP = [...s.extra_parkings];
                            newP[idx].slot = v;
                            return { ...s, extra_parkings: newP };
                          })} 
                          placeholder="e.g. EP101" 
                        />
                        <Input 
                          label="Additional Charge (₹)" 
                          value={parking.charge} 
                          onChange={(v) => setForm(s => {
                            const newP = [...s.extra_parkings];
                            newP[idx].charge = v;
                            return { ...s, extra_parkings: newP };
                          })} 
                          type="number" 
                          placeholder="e.g. 250000" 
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => setForm(s => ({
                      ...s,
                      extra_parkings: [...s.extra_parkings, { type: 'car', count: '1', slot: '', charge: '' }]
                    }))}
                    className="flex items-center gap-1 text-sm font-semibold text-orange-600 hover:text-orange-700 hover:underline"
                  >
                    <Plus className="h-4 w-4" /> Add Parking
                  </button>
                </div>
              )}
            </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <PortalButton variant="outline" onClick={() => setShowAdd(false)}>Cancel</PortalButton>
          <PortalButton onClick={handleAdd} disabled={saving || !form.name.trim() || !form.flat_id}>
            {saving ? 'Saving...' : 'Onboard Client'}
          </PortalButton>
        </div>
      </Modal>
    </div>
  )
}