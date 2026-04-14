export default function InputBar({ value, onChange, onSubmit, disabled, error, placeholder }) {
  function handleSubmit() {
    if (value.trim()) {
      onSubmit(value.trim())
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="input-bar">
      <textarea
        className="input-field"
        rows={3}
        placeholder={placeholder || "What's on your plate?"}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        autoFocus
      />
      <div className="input-footer">
        <span className="input-hint">{error ? <span className="input-error">{error}</span> : 'Shift + Enter for new line'}</span>
        <button
          className="submit-button"
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          aria-label="Send"
        >
          {disabled ? (
            <svg className="spinner" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="28" strokeDashoffset="10"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 13V3M4 7l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
