import { useRef, useEffect } from 'react'
import TaskItem from './TaskItem'

const BUCKET_ORDER = ['Older', 'This Week', 'Yesterday', 'Today']

function getBucket(updatedAt) {
  const now = new Date()
  const taskDate = new Date(updatedAt)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart.getTime() - 86400000)
  const weekStart = new Date(todayStart.getTime() - 7 * 86400000)

  if (taskDate >= todayStart) return 'Today'
  if (taskDate >= yesterdayStart) return 'Yesterday'
  if (taskDate >= weekStart) return 'This Week'
  return 'Older'
}

export default function TimelineView({ tasks, onToggle, onEdit, onDelete, onCategoryChange, commentsMap, onFetchComments, onAddComment, onEditComment, onDeleteComment }) {
  const buckets = {}
  for (const task of tasks) {
    const bucket = getBucket(task.updatedAt)
    if (!buckets[bucket]) buckets[bucket] = []
    buckets[bucket].push(task)
  }

  for (const bucket of Object.keys(buckets)) {
    buckets[bucket].sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt))
  }

  const visibleBuckets = BUCKET_ORDER.filter(b => buckets[b]?.length > 0)

  if (visibleBuckets.length === 0) {
    return <div className="task-list-empty" style={{ padding: '12px 8px' }}>No items</div>
  }

  return (
    <div className="timeline">
      {visibleBuckets.map(bucket => (
        <div key={bucket} className="timeline-section">
          <div className="timeline-header">{bucket}</div>
          <div className="timeline-items">
            {buckets[bucket].map((task, i) => (
              <TaskItem
                key={task.id ?? i}
                id={task.id}
                text={task.text}
                done={task.status === 1}
                category={task.category}
                commentCount={task.commentCount || 0}
                onToggle={() => onToggle(task.id, task.status)}
                onEdit={(text) => onEdit(task.id, text)}
                onDelete={() => onDelete(task.id)}
                onCategoryChange={(cat) => onCategoryChange(task.id, cat)}
                comments={commentsMap[task.id]}
                onFetchComments={onFetchComments}
                onAddComment={onAddComment}
                onEditComment={onEditComment}
                onDeleteComment={onDeleteComment}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
