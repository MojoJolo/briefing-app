import TaskItem from './TaskItem'

export default function TaskList({ category, tasks, onToggle, onEdit, onDelete }) {
  return (
    <div className="task-list">
      <div className="task-category">{category}</div>
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
