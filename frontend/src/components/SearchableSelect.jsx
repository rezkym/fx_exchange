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
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 transition-colors duration-300">{label}</label>
      )}
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-white/50 dark:bg-slate-700/40 border border-white/30 dark:border-slate-600/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-indigo-400/50 focus:border-transparent backdrop-blur-sm text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 transition-colors duration-300"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-20 mt-1 w-full max-h-60 overflow-auto bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-white/50 dark:border-slate-600/50 rounded-xl shadow-lg dark:shadow-slate-900/40 transition-colors duration-300">
          {filtered.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => selectValue(opt)}
              className={`w-full text-left px-3 py-2 hover:bg-gradient-to-r hover:from-blue-100/80 hover:to-purple-100/80 dark:hover:from-slate-700/80 dark:hover:to-slate-600/80 transition-all duration-150 ${
                opt === value 
                  ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 dark:from-indigo-500/30 dark:to-purple-500/30 font-medium text-blue-900 dark:text-indigo-200' 
                  : 'text-gray-700 dark:text-slate-300'
              }`}
            >
              {opt}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-slate-400 transition-colors duration-300">No results</div>
          )}
        </div>
      )}
    </div>
  )
}


