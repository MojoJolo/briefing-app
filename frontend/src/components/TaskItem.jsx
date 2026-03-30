import { useState, useRef, useEffect } from 'react'

export default function TaskItem({ text, done, onToggle, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(text)
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  function handleDoubleClick() {
    if (!done) setEditing(true)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const trimmed = value.trim()
      if (trimmed && trimmed !== text) onEdit(trimmed)
      else setValue(text)
      setEditing(false)
    }
    if (e.key === 'Escape') {
      setValue(text)
      setEditing(false)
    }
  }

  function handleBlur() {
    setValue(text)
    setEditing(false)
  }

  return (
    <div className={`task-item${done ? ' task-item--done' : ''}`}>
      <input
        type="checkbox"
        className="task-checkbox"
        checked={done}
        onChange={onToggle}
      />
      {editing ? (
        <input
          ref={inputRef}
          className="task-edit-input"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
        />
      ) : (
        <span className="task-text" onDoubleClick={handleDoubleClick}>{text}</span>
      )}
      <button className="task-delete" onClick={onDelete} aria-label="Delete task">✕</button>
    </div>
  )
}
