import { useState, useRef } from 'react'

const PALETTE = [
  '#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5',
  '#8e24aa', '#00acc1', '#f06292', '#6d4c41', '#546e7a',
]

function randomColor() {
  return PALETTE[Math.floor(Math.random() * PALETTE.length)]
}

function LabelRow({ label, onUpdate, onDelete }) {
  const [editingName, setEditingName] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [name, setName] = useState(label.name)
  const [desc, setDesc] = useState(label.description)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const colorInputRef = useRef(null)

  async function saveName() {
    const trimmed = name.trim()
    if (!trimmed) { setName(label.name); setEditingName(false); return }
    if (trimmed === label.name) { setEditingName(false); return }
    setSaving(true)
    setError(null)
    const ok = await onUpdate(label.id, { name: trimmed })
    setSaving(false)
    if (ok) {
      setEditingName(false)
    } else {
      setError('Name already in use')
    }
  }

  async function saveDesc() {
    const trimmed = desc.trim()
    if (trimmed === label.description) { setEditingDesc(false); return }
    setSaving(true)
    await onUpdate(label.id, { description: trimmed })
    setSaving(false)
    setEditingDesc(false)
  }

  async function handleColorChange(e) {
    await onUpdate(label.id, { color: e.target.value })
  }

  return (
    <div className="label-row">
      <div className="label-row-main">
        <button
          className="label-color-swatch"
          style={{ background: label.color }}
          onClick={() => colorInputRef.current?.click()}
          aria-label="Change color"
          title="Change color"
        />
        <input
          ref={colorInputRef}
          type="color"
          className="label-color-input"
          value={label.color}
          onChange={handleColorChange}
          tabIndex={-1}
        />
        {editingName ? (
          <input
            className="label-name-input"
            value={name}
            autoFocus
            onChange={e => { setName(e.target.value); setError(null) }}
            onKeyDown={e => {
              if (e.key === 'Enter') saveName()
              if (e.key === 'Escape') { setName(label.name); setEditingName(false); setError(null) }
            }}
            onBlur={saveName}
            disabled={saving}
          />
        ) : (
          <span
            className="label-name"
            onClick={() => setEditingName(true)}
            title="Click to edit"
          >
            {label.name}
          </span>
        )}
        <button
          className="label-delete-btn"
          onClick={() => onDelete(label.id)}
          aria-label="Delete label"
          title="Delete label"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/>
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </button>
      </div>
      {error && <p className="label-error">{error}</p>}
      <div className="label-desc-row">
        {editingDesc ? (
          <textarea
            className="label-desc-input"
            value={desc}
            autoFocus
            rows={2}
            placeholder="Description for AI auto-tagging…"
            onChange={e => setDesc(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Escape') { setDesc(label.description); setEditingDesc(false) }
            }}
            onBlur={saveDesc}
            disabled={saving}
          />
        ) : (
          <span
            className={`label-desc${desc ? '' : ' label-desc--empty'}`}
            onClick={() => setEditingDesc(true)}
            title="Click to edit description"
          >
            {desc || 'Add description for AI auto-tagging…'}
          </span>
        )}
      </div>
    </div>
  )
}

function AddLabelForm({ onCreate }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(randomColor)
  const [desc, setDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const colorInputRef = useRef(null)

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setSaving(true)
    setError(null)
    const result = await onCreate(trimmed, color, desc.trim())
    setSaving(false)
    if (result) {
      setName('')
      setColor(randomColor())
      setDesc('')
    } else {
      setError('A label with that name already exists')
    }
  }

  return (
    <form className="label-add-form" onSubmit={handleSubmit}>
      <div className="label-add-row">
        <button
          type="button"
          className="label-color-swatch"
          style={{ background: color }}
          onClick={() => colorInputRef.current?.click()}
          aria-label="Choose color"
          title="Choose color"
        />
        <input
          ref={colorInputRef}
          type="color"
          className="label-color-input"
          value={color}
          onChange={e => setColor(e.target.value)}
          tabIndex={-1}
        />
        <input
          className="label-name-input"
          placeholder="Label name"
          value={name}
          onChange={e => { setName(e.target.value); setError(null) }}
          disabled={saving}
        />
        <button
          type="submit"
          className="label-add-btn"
          disabled={saving || !name.trim()}
        >
          Add
        </button>
      </div>
      {error && <p className="label-error">{error}</p>}
      <textarea
        className="label-desc-input"
        placeholder="Description for AI auto-tagging (optional)…"
        value={desc}
        rows={2}
        onChange={e => setDesc(e.target.value)}
        disabled={saving}
      />
    </form>
  )
}

export default function LabelsManager({ labels, onClose, onCreate, onUpdate, onDelete }) {
  return (
    <div className="labels-overlay" onClick={onClose}>
      <div className="labels-card" onClick={e => e.stopPropagation()}>
        <div className="labels-header">
          <h2 className="labels-title">Labels</h2>
          <button className="labels-close-btn" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="labels-body">
          {labels.length === 0 ? (
            <p className="labels-empty">No labels yet. Add one below.</p>
          ) : (
            <div className="labels-list">
              {labels.map(label => (
                <LabelRow
                  key={label.id}
                  label={label}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
          <AddLabelForm onCreate={onCreate} />
        </div>
      </div>
    </div>
  )
}
