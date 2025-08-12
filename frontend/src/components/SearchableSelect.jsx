import { useEffect, useMemo, useRef, useState } from 'react'

export default function SearchableSelect({ label, value, onChange, options, disabled, placeholder }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef(null)

  useEffect(() => {
    setQuery(value || '')
  }, [value])

  useEffect(() => {
    function onClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const filtered = useMemo(() => {
    const q = (query || '').toLowerCase()
    const list = (options || []).filter(opt => opt.toLowerCase().includes(q))
    return list.slice(0, 100)
  }, [options, query])

  const selectValue = (val) => {
    onChange?.(val)
    setQuery(val)
    setOpen(false)
  }

  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      )}
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-white/50 border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent backdrop-blur-sm"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-20 mt-1 w-full max-h-60 overflow-auto bg-white/90 backdrop-blur-md border border-white/50 rounded-xl shadow-lg">
          {filtered.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => selectValue(opt)}
              className={`w-full text-left px-3 py-2 hover:bg-white/70 ${opt === value ? 'bg-blue-50/70 font-medium' : ''}`}
            >
              {opt}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-500">No results</div>
          )}
        </div>
      )}
    </div>
  )
}


