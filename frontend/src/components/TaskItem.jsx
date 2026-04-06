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
    if (e.target.closest('.task-checkbox, .task-delete, .task-cat-wrapper, a')) return
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

  const catSlug = (category || 'none').toLowerCase()
  const catName = category
    ? CATEGORY_OPTIONS.find(o => o.value === category)?.label.split(' ').slice(1).join(' ')
    : null

  return (
    <div className={`task-item-wrapper${expanded ? ' task-item-wrapper--expanded' : ''}`}>
      <div className={`task-item task-item--clickable${done ? ' task-item--done' : ''}`} onClick={handleRowClick}>

        <div className="task-cat-wrapper" ref={menuRef}>
          <button
            className={`task-cat-btn task-cat-btn--${catSlug}`}
            onClick={handleLabelClick}
            aria-label="Change task label"
          >
            <span className="task-cat-text">{catName || '+ label'}</span>
            <span className="task-cat-strip" />
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

        <input
          type="checkbox"
          className="task-checkbox"
          checked={done}
          onChange={onToggle}
        />
        <div className="task-body">
          <div className="task-row-main">
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
        </div>
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
