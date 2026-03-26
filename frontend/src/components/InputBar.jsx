export default function InputBar({ value, onChange, onSubmit }) {
  function handleSubmit() {
    if (value.trim()) {
      onSubmit(value.trim())
    }
  }

  return (
    <div className="input-bar">
      <textarea
        className="input-field"
        rows={3}
        placeholder="What's on your mind..."
        value={value}
        onChange={e => onChange(e.target.value)}
        autoFocus
      />
      <div className="input-footer">
        <button
          className="submit-button"
          onClick={handleSubmit}
          disabled={!value.trim()}
          aria-label="Send"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
