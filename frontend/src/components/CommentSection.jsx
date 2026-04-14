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
  const committedRef = useRef(false)

  useEffect(() => {
    if (editing) {
      committedRef.current = false
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  function saveEdit() {
    committedRef.current = true
    const trimmed = value.trim()
    if (trimmed && trimmed !== comment.comment) {
      onEdit(comment.id, trimmed)
    } else {
      setValue(comment.comment)
    }
    setEditing(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveEdit()
    }
    if (e.key === 'Escape') {
      committedRef.current = true
      setValue(comment.comment)
      setEditing(false)
    }
  }

  // Android IME keyboards fire 'insertLineBreak' on Enter instead of a standard
  // keydown with e.key === 'Enter'. Cancelling the beforeinput event prevents
  // the browser from moving focus to the next field.
  function handleBeforeInput(e) {
    if (e.nativeEvent.inputType === 'insertLineBreak') {
      e.preventDefault()
      saveEdit()
    }
  }

  function handleBlur() {
    if (!committedRef.current) {
      setValue(comment.comment)
    }
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
          onBeforeInput={handleBeforeInput}
          onBlur={handleBlur}
          enterKeyHint="done"
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

  function handleSubmit(e) {
    e?.preventDefault()
    const trimmed = input.trim()
    if (trimmed) {
      onAdd(taskId, trimmed)
      setInput('')
    }
  }

  // Kept for physical keyboard support. On desktop, e.key === 'Enter' fires and
  // e.preventDefault() stops the form from submitting a second time.
  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="comment-section">
      {comments.map(c => (
        <CommentItem key={c.id} comment={c} onEdit={onEdit} onDelete={onDelete} />
      ))}
      <form onSubmit={handleSubmit} style={{ margin: 0 }}>
        <input
          className="comment-input"
          placeholder="Add a comment..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          enterKeyHint="send"
        />
      </form>
    </div>
  )
}
