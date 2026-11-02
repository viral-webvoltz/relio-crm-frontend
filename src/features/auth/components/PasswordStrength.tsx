// The server only requires 8 to 128 characters, so this is length advice in words (not colour alone), not a rule.
export function PasswordStrength({ value }: { value: string }) {
  if (!value) return <p className="text-xs text-muted">At least 8 characters. A few random words are stronger than one clever word.</p>
  const [label, hint] =
    value.length < 8 ? ['Too short', `${8 - value.length} more character${8 - value.length === 1 ? '' : 's'} needed.`]
    : value.length < 12 ? ['Okay', 'Longer is safer: aim for 12 or more characters.']
    : ['Strong length', 'Do not reuse this password anywhere else.']
  return (
    <p role="status" className="text-xs text-muted">
      <span className="font-medium text-heading">{label}.</span> {hint}
    </p>
  )
}
