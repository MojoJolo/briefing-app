import { useState, useRef, useEffect } from 'react'
import { renderTextWithLinks } from '../utils/renderLinks'

function formatTimestamp(ts) {
  const d = new Date(ts)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function CommentItem({ comment, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(comment.comment)
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const trimmed = value.trim()
      if (trimmed && trimmed !== comment.comment) {
        onEdit(comment.id, trimmed)
      } else {
        setValue(comment.comment)
      }
      setEditing(false)
    }
    if (e.key === 'Escape') {
      setValue(comment.comment)
      setEditing(false)
    }
  }

  function handleBlur() {
    setValue(comment.comment)
    setEditing(false)
  }

  return (
    <div className="comment-item">
      {editing ? (
        <input
          ref={inputRef}
          className="comment-edit-input"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
        />
      ) : (
        <span className="comment-text" onDoubleClick={() => setEditing(true)}>
          {renderTextWithLinks(comment.comment)}
        </span>
      )}
      <span className="comment-time">{formatTimestamp(comment.created_at)}</span>
      <button className="comment-delete" onClick={() => onDelete(comment.id)} aria-label="Delete comment">✕</button>
    </div>
  )
}

export default function CommentSection({ taskId, comments, onAdd, onEdit, onDelete }) {
  const [input, setInput] = useState('')

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const trimmed = input.trim()
      if (trimmed) {
        onAdd(taskId, trimmed)
        setInput('')
      }
    }
  }

  return (
    <div className="comment-section">
      {comments.map(c => (
        <CommentItem key={c.id} comment={c} onEdit={onEdit} onDelete={onDelete} />
      ))}
      <input
        className="comment-input"
        placeholder="Add a comment..."
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </div>
  )
}
