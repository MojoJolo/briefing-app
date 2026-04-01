import { useState, useRef, useEffect } from 'react'
import { renderTextWithLinks } from '../utils/renderLinks'
import CommentSection from './CommentSection'

const CATEGORY_OPTIONS = [
  { value: '', label: '—' },
  { value: 'BLOCKER', label: '🚨 Blocker' },
  { value: 'ISSUE', label: '🐛 Issue' },
  { value: 'PENDING', label: '⏳ Pending' },
  { value: 'DELEGATED', label: '👤 Delegated' },
]

const CATEGORY_BADGE = {
  BLOCKER: '🚨',
  ISSUE: '🐛',
  PENDING: '⏳',
  DELEGATED: '👤',
}

export default function TaskItem({ id, text, done, category, commentCount, onToggle, onEdit, onDelete, onCategoryChange, comments, onFetchComments, onAddComment, onEditComment, onDeleteComment }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(text)
  const [expanded, setExpanded] = useState(false)
  const [showLabelMenu, setShowLabelMenu] = useState(false)
  const inputRef = useRef(null)
  const menuRef = useRef(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  useEffect(() => {
    if (!showLabelMenu) return
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowLabelMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showLabelMenu])

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
    if (e.target.closest('.task-checkbox, .task-delete, .task-label-btn, .task-label-menu, a')) return
    const next = !expanded
    setExpanded(next)
    if (next && !comments) {
      onFetchComments(id)
    }
  }

  function handleLabelClick(e) {
    e.stopPropagation()
    setShowLabelMenu(prev => !prev)
  }

  function handleLabelSelect(cat) {
    setShowLabelMenu(false)
    if (cat !== category) {
      onCategoryChange(cat)
    }
  }

  const badge = CATEGORY_BADGE[category]

  return (
    <div className={`task-item-wrapper${expanded ? ' task-item-wrapper--expanded' : ''}`}>
      <div className={`task-item task-item--clickable${done ? ' task-item--done' : ''}`} onClick={handleRowClick}>
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
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span className="task-text" onDoubleClick={handleDoubleClick}>{renderTextWithLinks(text)}</span>
        )}
        {commentCount > 0 && (
          <span className="comment-count">{commentCount}</span>
        )}
        <div className="task-label-wrapper" ref={menuRef}>
          <button
            className={`task-label-btn${badge ? ' task-label-btn--active' : ''}`}
            onClick={handleLabelClick}
            aria-label="Change task label"
            title="Change label"
          >
            {badge || '·'}
          </button>
          {showLabelMenu && (
            <div className="task-label-menu">
              {CATEGORY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  className={`task-label-option${opt.value === category ? ' task-label-option--selected' : ''}`}
                  onClick={(e) => { e.stopPropagation(); handleLabelSelect(opt.value); }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
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
