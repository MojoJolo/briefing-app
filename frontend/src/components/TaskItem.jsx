export default function TaskItem({ text, priority }) {
  return (
    <div className="task-item">
      <span className="task-bullet">–</span>
      <span className="task-text">{text}</span>
      {priority && <span className={`task-dot ${priority}`} />}
    </div>
  )
}
