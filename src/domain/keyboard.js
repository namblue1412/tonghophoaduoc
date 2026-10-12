export function dialogKeyAction(event) {
  if (event.defaultPrevented || event.isComposing || event.keyCode === 229 || event.repeat || event.altKey) return null;
  if (event.key === 'Escape') return 'close';
  if (event.key !== 'Enter') return null;
  const target = event.target;
  // Preserve native activation (including Cancel/Delete), multiline editing and select navigation.
  if (target?.isContentEditable || ['TEXTAREA', 'BUTTON', 'A', 'SELECT'].includes(target?.tagName)) return null;
  if (target?.tagName === 'INPUT' && ['checkbox', 'radio', 'file', 'button', 'submit', 'reset'].includes(target.type)) return null;
  return 'confirm';
}
