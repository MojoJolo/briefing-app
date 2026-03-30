import { useState } from 'react'
import { renderTextWithLinks } from '../utils/renderLinks'

export default function DoneList({ tasks, onToggle, onDelete }) {
  const [collapsed, setCollapsed] = useState(true)
  const shown = collapsed ? tasks.slice(0, 3) : tasks
  const hasMore = tasks.length > 3

  return (
    <div className="done-list">
      <div className="done-header" onClick={() => hasMore && setCollapsed(c => !c)}>
        <span className="done-label">Done</span>
        <span className="done-count">{tasks.length}</span>
        {hasMore && (
          <span className={`done-chevron ${collapsed ? '' : 'done-chevron--open'}`}>&#8250;</span>
        )}
      </div>
      <div className="done-items">
        {shown.map(task => (
          <div key={task.id} className="done-item">
            <input
              type="checkbox"
              className="task-checkbox"
              checked
              onChange={() => onToggle(task.id)}
            />
            <span className="done-text">{renderTextWithLinks(task.text)}</span>
            <button className="task-delete" onClick={() => onDelete(task.id)} aria-label="Delete task">✕</button>
          </div>
        ))}
      </div>
      {hasMore && collapsed && (
        <button className="done-show-more" onClick={() => setCollapsed(false)}>
          Show {tasks.length - 3} more
        </button>
      )}
    </div>
  )
}
