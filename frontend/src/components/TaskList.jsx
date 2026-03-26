import TaskItem from './TaskItem'

export default function TaskList({ category, tasks }) {
  return (
    <div className="task-list">
      <div className="task-category">{category}</div>
      {tasks.map((task, i) => (
        <TaskItem key={i} text={task.text} priority={task.priority} />
      ))}
    </div>
  )
}
