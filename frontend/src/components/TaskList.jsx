import TaskItem from './TaskItem'

const SECTION_LABELS = {
  BLOCKER: '🚨 Blocker',
  ISSUE: '🐛 Issue',
  '': 'Tasks',
  PENDING: '⏳ Pending',
  DELEGATED: '👤 Delegated',
}

export default function TaskList({ category, tasks, onToggle, onEdit, onDelete, onCategoryChange, commentsMap, onFetchComments, onAddComment, onEditComment, onDeleteComment }) {
  const label = SECTION_LABELS[category] ?? category

  return (
    <div className="task-list" data-category={category || 'tasks'}>
      <div className="task-category">
        <span>{label}</span>
        {tasks.length > 0 && <span className="task-count">{tasks.length}</span>}
      </div>
      {tasks.length === 0 && (
        <div className="task-list-empty">No items</div>
      )}
      {tasks.map((task, i) => (
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
  )
}
