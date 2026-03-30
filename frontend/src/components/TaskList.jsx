import TaskItem from './TaskItem'

export default function TaskList({ category, tasks, onToggle, onEdit, onDelete }) {
  const remaining = tasks.filter(t => t.status !== 1).length
  return (
    <div className="task-list">
      <div className="task-category">
        <span>{category}</span>
        {tasks.length > 0 && <span className="task-count">{remaining}/{tasks.length}</span>}
      </div>
      {tasks.map((task, i) => (
        <TaskItem
          key={task.id ?? i}
          text={task.text}
          done={task.status === 1}
          onToggle={() => onToggle(task.id, task.status)}
          onEdit={(text) => onEdit(task.id, text)}
          onDelete={() => onDelete(task.id)}
        />
      ))}
    </div>
  )
}
