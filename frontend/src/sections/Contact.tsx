import { motion } from 'framer-motion'
import { Mail, MapPin, Phone, Clock, Map } from 'lucide-react'
import { useMemo, useState } from 'react'
import { SectionHeading } from '../components/SectionHeading'

type FormState = {
  name: string
  phone: string
  email: string
  projectType: string
  message: string
}

const projectTypes = [
  'Residential',
  'Commercial',
  'Industrial',
  'Infrastructure',
  'Renovation & Interiors',
  'Architecture & Planning',
] as const

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
}

function isPhone(v: string) {
  const digits = v.replace(/\D/g, '')
  return digits.length >= 10 && digits.length <= 13
}

export function Contact() {
  const [form, setForm] = useState<FormState>({
    name: '',
    phone: '',
    email: '',
    projectType: '',
    message: '',
  })
  const [touched, setTouched] = useState<Record<keyof FormState, boolean>>({
    name: false,
    phone: false,
    email: false,
    projectType: false,
    message: false,
  })

  const errors = useMemo(() => {
    return {
      name: form.name.trim().length < 2 ? 'Please enter your name.' : '',
      phone: !isPhone(form.phone) ? 'Please enter a valid phone number.' : '',
      email: !isEmail(form.email) ? 'Please enter a valid email.' : '',
      projectType: form.projectType ? '' : 'Please select a project type.',
      message:
        form.message.trim().length < 10
          ? 'Please add a short project message.'
          : '',
    }
  }, [form])

  const hasErrors = Object.values(errors).some(Boolean)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched({
      name: true,
      phone: true,
      email: true,
      projectType: true,
      message: true,
    })
    if (hasErrors) return
    try {
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          email: form.email,
          project_type: form.projectType,
          message: form.message,
        }),
      })
      alert('Thanks! We received your enquiry. Our team will contact you shortly.')
      setForm({ name: '', phone: '', email: '', projectType: '', message: '' })
      setTouched({ name: false, phone: false, email: false, projectType: false, message: false })
    } catch {
      alert('Something went wrong. Please try again or call us directly.')
    }
  }

  const inputBase =
    'mt-2 w-full rounded-xl border bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none ring-orange-500/35 transition focus:ring-2'

  return (
    <section id="contact" className="relative py-24 sm:py-28">
      <div className="container-page">
        <SectionHeading
          kicker="CONTACT"
          title="Let’s Build Something Great"
          subtitle="Share your project details and we’ll get back with a consultation and quote."
        />

        <div className="mt-14 grid gap-10 lg:grid-cols-2 lg:items-start">
          <motion.form
            onSubmit={onSubmit}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl border border-white/10 bg-white/5 p-7 backdrop-blur"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <label className="text-sm font-semibold text-white/80">
                  Name
                </label>
                <input
                  value={form.name}
                  onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className={[
                    inputBase,
                    'border-white/10',
                    touched.name && errors.name ? 'border-orange-400/60' : '',
                  ].join(' ')}
                  placeholder="Your full name"
                />
                {touched.name && errors.name && (
                  <p className="mt-2 text-xs font-semibold text-orange-200">
                    {errors.name}
                  </p>
                )}
              </div>

              <div className="sm:col-span-1">
                <label className="text-sm font-semibold text-white/80">
                  Phone
                </label>
                <input
                  value={form.phone}
                  onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className={[
                    inputBase,
                    'border-white/10',
                    touched.phone && errors.phone ? 'border-orange-400/60' : '',
                  ].join(' ')}
                  placeholder="+91 98765 43210"
                />
                {touched.phone && errors.phone && (
                  <p className="mt-2 text-xs font-semibold text-orange-200">
                    {errors.phone}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4">
              <label className="text-sm font-semibold text-white/80">
                Email
              </label>
              <input
                value={form.email}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className={[
                  inputBase,
                  'border-white/10',
                  touched.email && errors.email ? 'border-orange-400/60' : '',
                ].join(' ')}
                placeholder="you@company.com"
              />
              {touched.email && errors.email && (
                <p className="mt-2 text-xs font-semibold text-orange-200">
                  {errors.email}
                </p>
              )}
            </div>

            <div className="mt-4">
              <label className="text-sm font-semibold text-white/80">
                Project Type
              </label>
              <select
                value={form.projectType}
                onBlur={() => setTouched((t) => ({ ...t, projectType: true }))}
                onChange={(e) =>
                  setForm((f) => ({ ...f, projectType: e.target.value }))
                }
                className={[
                  inputBase,
                  'border-white/10',
                  touched.projectType && errors.projectType
                    ? 'border-orange-400/60'
                    : '',
                ].join(' ')}
              >
                <option value="">Select a project type</option>
                {projectTypes.map((t) => (
                  <option key={t} value={t} className="bg-slate-950">
                    {t}
                  </option>
                ))}
              </select>
              {touched.projectType && errors.projectType && (
                <p className="mt-2 text-xs font-semibold text-orange-200">
                  {errors.projectType}
                </p>
              )}
            </div>

            <div className="mt-4">
              <label className="text-sm font-semibold text-white/80">
                Message
              </label>
              <textarea
                value={form.message}
                onBlur={() => setTouched((t) => ({ ...t, message: true }))}
                onChange={(e) =>
                  setForm((f) => ({ ...f, message: e.target.value }))
                }
                rows={5}
                className={[
                  inputBase,
                  'resize-none border-white/10',
                  touched.message && errors.message ? 'border-orange-400/60' : '',
                ].join(' ')}
                placeholder="Tell us about location, size, timeline, and budget range…"
              />
              {touched.message && errors.message && (
                <p className="mt-2 text-xs font-semibold text-orange-200">
                  {errors.message}
                </p>
              )}
            </div>

            <div className="mt-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="btn btn-primary w-full hover:shadow-glow"
              >
                Send Enquiry
              </motion.button>
              <p className="mt-3 text-center text-xs text-white/55">
                We typically respond within 24 hours.
              </p>
            </div>
          </motion.form>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
            className="space-y-6"
          >
            <div className="rounded-2xl border border-white/10 bg-white/5 p-7 backdrop-blur">
              <h3 className="font-heading text-lg font-extrabold text-white">
                Contact Details
              </h3>
              <div className="mt-5 space-y-4 text-sm text-white/80">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 text-orange-400" />
                  <div>
                    <div className="font-semibold text-white/90">Address</div>
                    123 Builder Street, Patna, Bihar — 800001
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-5 w-5 text-orange-400" />
                  <div>
                    <div className="font-semibold text-white/90">Phone</div>
                    +91 98765 43210
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-5 w-5 text-orange-400" />
                  <div>
                    <div className="font-semibold text-white/90">Email</div>
                    info@abcconstruction.in
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-5 w-5 text-orange-400" />
                  <div>
                    <div className="font-semibold text-white/90">Hours</div>
                    Mon–Sat, 9AM–6PM
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                <div className="text-sm font-semibold text-white/85">
                  Map (placeholder)
                </div>
                <Map className="h-5 w-5 text-orange-400/80" />
              </div>
              <div className="flex h-64 items-center justify-center bg-gradient-to-br from-white/5 to-white/0">
                <div className="text-center">
                  <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                    <Map className="h-6 w-6 text-white/70" />
                  </div>
                  <p className="mt-3 text-xs font-semibold text-white/60">
                    Google Maps embed can be added here.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

