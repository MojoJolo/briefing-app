import { useState, useRef, useEffect } from 'react'
import { renderTextWithLinks } from '../utils/renderLinks'
import CommentSection from './CommentSection'

const CATEGORY_OPTIONS = [
  { value: '', label: '—' },
  { value: 'BLOCKER', label: '🚨 Blocker' },
  { value: 'ISSUE', label: '🐛 Issue' },
  { value: 'PENDING', label: '⏳ Pending' },
  { value: 'DELEGATED', label: '👤 Delegated' },
  { value: 'IDEA', label: '💡 Idea' },
]

export default function TaskItem({ id, text, done, strikethrough, fading, category, commentCount, onToggle, onEdit, onDelete, onCategoryChange, comments, onFetchComments, onAddComment, onEditComment, onDeleteComment }) {
  const showDoneStyle = strikethrough !== undefined ? strikethrough : done
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(text)
  const [expanded, setExpanded] = useState(false)
  const [showLabelMenu, setShowLabelMenu] = useState(false)
  const [menuPos, setMenuPos] = useState(null)
  const [showActionMenu, setShowActionMenu] = useState(false)
  const [actionMenuPos, setActionMenuPos] = useState(null)
  const inputRef = useRef(null)
  const menuRef = useRef(null)
  const actionMenuRef = useRef(null)

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
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [showLabelMenu])

  useEffect(() => {
    if (!showActionMenu) return
    function handleClickOutside(e) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) {
        setShowActionMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [showActionMenu])

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

  function handleActionClick(e) {
    e.stopPropagation()
    if (!showActionMenu) {
      const rect = actionMenuRef.current.getBoundingClientRect()
      setActionMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    }
    setShowActionMenu(prev => !prev)
  }

  function handleRowClick(e) {
    if (editing) return
    if (e.target.closest('.task-checkbox, .task-action-wrapper, .task-cat-wrapper, a')) return
    const next = !expanded
    setExpanded(next)
    if (next && !comments) {
      onFetchComments(id)
    }
  }

  function handleLabelClick(e) {
    e.stopPropagation()
    if (!showLabelMenu) {
      const rect = menuRef.current.getBoundingClientRect()
      const isMobile = window.innerWidth <= 640
      setMenuPos(isMobile
        ? { top: rect.bottom + 4, left: rect.left }
        : { top: rect.top, left: rect.right + 8 }
      )
    }
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
    <div className={`task-item-wrapper${expanded ? ' task-item-wrapper--expanded' : ''}${fading ? ' task-item-wrapper--fading' : ''}`}>
      <div className={`task-item task-item--clickable${showDoneStyle ? ' task-item--done' : ''}`} onClick={handleRowClick}>

        <div className="task-cat-wrapper" ref={menuRef}>
          <button
            className={`task-cat-btn task-cat-btn--${catSlug}`}
            onClick={handleLabelClick}
            aria-label="Change task label"
          >
            <span className="task-cat-text">{catName || '+ label'}</span>
            <span className="task-cat-strip" />
          </button>
          {showLabelMenu && menuPos && (
            <div
              className="task-label-menu"
              style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, margin: 0 }}
            >
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
            <div className="task-action-wrapper" ref={actionMenuRef}>
              <button className="task-action-btn" onClick={handleActionClick} aria-label="Task actions">⋮</button>
              {showActionMenu && actionMenuPos && (
                <div
                  className="task-action-menu"
                  style={{ position: 'fixed', top: actionMenuPos.top, right: actionMenuPos.right, margin: 0 }}
                >
                  <button
                    className="task-action-option"
                    onClick={(e) => { e.stopPropagation(); setShowActionMenu(false); setEditing(true); }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Rename
                  </button>
                  <button
                    className="task-action-option task-action-option--delete"
                    onClick={(e) => { e.stopPropagation(); setShowActionMenu(false); onDelete(); }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    Delete
                  </button>
                </div>
              )}
            </div>
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
