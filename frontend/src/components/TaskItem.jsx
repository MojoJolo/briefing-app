import { useState, useRef, useEffect } from 'react'
import { renderTextWithLinks } from '../utils/renderLinks'
import CommentSection from './CommentSection'

const LABEL_OPTIONS = [
  { value: '', label: '—' },
  { value: 'BLOCKER', label: '🚨 Blocker' },
  { value: 'ISSUE', label: '🐛 Issue' },
  { value: 'PENDING', label: '⏳ Pending' },
  { value: 'DELEGATED', label: '👤 Delegated' },
]

export default function TaskItem({ id, text, category, done, commentCount, onToggle, onEdit, onDelete, onLabelChange, comments, onFetchComments, onAddComment, onEditComment, onDeleteComment }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(text)
  const [expanded, setExpanded] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  function handleDoubleClick(e) {
    e.stopPropagation()
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

  function handleRowClick(e) {
    if (editing) return
    // Don't expand when clicking checkbox, label select, delete button, or links
    if (e.target.closest('.task-checkbox, .task-label-select, .task-delete, a')) return
    const next = !expanded
    setExpanded(next)
    if (next && !comments) {
      onFetchComments(id)
    }
  }

  return (
    <div className={`task-item-wrapper${expanded ? ' task-item-wrapper--expanded' : ''}`}>
      <div className={`task-item task-item--clickable${done ? ' task-item--done' : ''}`} onClick={handleRowClick}>
        <input
          type="checkbox"
          className="task-checkbox"
          checked={done}
          onChange={onToggle}
        />
        {!done && (
          <select
            className="task-label-select"
            value={category || ''}
            onChange={e => { e.stopPropagation(); onLabelChange(e.target.value) }}
            onClick={e => e.stopPropagation()}
          >
            {LABEL_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}
        {editing ? (
          <input
            ref={inputRef}
            className="task-edit-input"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span className="task-text" onDoubleClick={handleDoubleClick}>{renderTextWithLinks(text)}</span>
        )}
        {commentCount > 0 && (
          <span className="comment-count">{commentCount}</span>
        )}
        <button className="task-delete" onClick={(e) => { e.stopPropagation(); onDelete(); }} aria-label="Delete task">✕</button>
      </div>
      {expanded && (
        <CommentSection
          taskId={id}
          comments={comments || []}
          onAdd={onAddComment}
          onEdit={onEditComment}
          onDelete={onDeleteComment}
        />
      )}
    </div>
  )
}
