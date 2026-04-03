import { useState } from 'react'
import { renderTextWithLinks } from '../utils/renderLinks'
import CommentSection from './CommentSection'

function DoneItem({ task, onToggle, onDelete, comments, onFetchComments, onAddComment, onEditComment, onDeleteComment }) {
  const [expanded, setExpanded] = useState(false)

  function handleRowClick(e) {
    if (e.target.closest('.task-checkbox, .task-delete, a')) return
    const next = !expanded
    setExpanded(next)
    if (next && !comments) {
      onFetchComments(task.id)
    }
  }

  const commentCount = task.commentCount || 0

  return (
    <div className={`done-item-wrapper${expanded ? ' done-item-wrapper--expanded' : ''}`}>
      <div className="done-item done-item--clickable" onClick={handleRowClick}>
        <input
          type="checkbox"
          className="task-checkbox"
          checked
          onChange={() => onToggle(task.id)}
        />
        <span className="done-text">{renderTextWithLinks(task.text)}</span>
        {commentCount > 0 && (
          <span className="comment-count">{commentCount}</span>
        )}
        <button className="task-delete" onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} aria-label="Delete task">✕</button>
      </div>
      {expanded && (
        <CommentSection
          taskId={task.id}
          comments={comments || []}
          onAdd={onAddComment}
          onEdit={onEditComment}
          onDelete={onDeleteComment}
        />
      )}
    </div>
  )
}

export default function DoneList({ tasks, onToggle, onDelete, commentsMap, onFetchComments, onAddComment, onEditComment, onDeleteComment }) {
  return (
    <div className="done-list">
      <div className="done-header">
        <span className="done-label">✓ Done</span>
        <span className="done-count">{tasks.length}</span>
      </div>
      <div className="done-items">
        {tasks.map(task => (
          <DoneItem
            key={task.id}
            task={task}
            onToggle={onToggle}
            onDelete={onDelete}
            comments={commentsMap[task.id]}
            onFetchComments={onFetchComments}
            onAddComment={onAddComment}
            onEditComment={onEditComment}
            onDeleteComment={onDeleteComment}
          />
        ))}
      </div>
    </div>
  )
}
