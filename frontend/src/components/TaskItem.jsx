export default function TaskItem({ text, priority }) {
  const cls = ['task-item']
  if (priority) cls.push(`priority-${priority}`)

  return (
    <div className={cls.join(' ')}>
      <span className="task-text">{text}</span>
    </div>
  )
}
