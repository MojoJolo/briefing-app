export default function TaskItem({ text, priority }) {
  const dot = priority === 'high' ? '🔴' : priority === 'medium' ? '🟡' : null

  return (
    <div className="task-item">
      <span className="task-bullet">○</span>
      <span className="task-text">{text}</span>
      {dot && <span className="task-dot">{dot}</span>}
    </div>
  )
}
