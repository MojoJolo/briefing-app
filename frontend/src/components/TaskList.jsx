import TaskItem from './TaskItem'

export default function TaskList({ category, tasks, onToggle, onEdit, onDelete, commentsMap, onFetchComments, onAddComment, onEditComment, onDeleteComment }) {
  return (
    <div className="task-list" data-category={category}>
      <div className="task-category">
        <span>{category}</span>
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
          commentCount={task.commentCount || 0}
          onToggle={() => onToggle(task.id, task.status)}
          onEdit={(text) => onEdit(task.id, text)}
          onDelete={() => onDelete(task.id)}
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
