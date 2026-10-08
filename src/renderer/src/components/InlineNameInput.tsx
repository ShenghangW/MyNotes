import { useState } from 'react'

type InlineNameInputProps = {
  initialValue?: string
  label: string
  placeholder?: string
  onSubmit: (name: string) => Promise<boolean> | boolean
  onCancel: () => void
}

/** Single-line name editor: Enter saves, Escape cancels, blur on an unchanged value cancels. */
export default function InlineNameInput({
  initialValue = '',
  label,
  placeholder,
  onSubmit,
  onCancel
}: InlineNameInputProps): React.JSX.Element {
  const [value, setValue] = useState(initialValue)

  const submit = async (): Promise<void> => {
    const name = value.trim()
    if (name === '' || name === initialValue) {
      onCancel()
      return
    }
    if (await onSubmit(name)) {
      onCancel()
    }
  }

  return (
    <input
      autoFocus
      type="text"
      aria-label={label}
      value={value}
      placeholder={placeholder}
      maxLength={60}
      className="h-8 w-full rounded-sm border border-accent bg-surface px-2 text-sm text-text outline-none"
      onChange={(event) => setValue(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          void submit()
        } else if (event.key === 'Escape') {
          event.preventDefault()
          onCancel()
        }
      }}
      onBlur={() => {
        if (value.trim() === '' || value.trim() === initialValue) {
          onCancel()
        }
      }}
    />
  )
}
