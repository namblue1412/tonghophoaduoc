import { useEffect, useRef } from 'react';
import { dialogKeyAction } from '../domain/keyboard.js';

const stack = [];
// Only the most recently opened overlay handles a key; callbacks always use the current draft.
export function useDialogKeys({ active, onClose, onConfirm, busy = false }) {
  const callbacks = useRef();
  callbacks.current = { onClose, onConfirm, busy };
  useEffect(() => {
    if (!active) return;
    const token = {};
    stack.push(token);
    const handler = (event) => {
      if (stack.at(-1) !== token) return;
      const action = dialogKeyAction(event);
      if (!action) return;
      const state = callbacks.current;
      const callback = action === 'close' ? state.onClose : state.onConfirm;
      if (!callback) return;
      event.preventDefault(); event.stopImmediatePropagation();
      if (!state.busy) callback();
    };
    window.addEventListener('keydown', handler, true);
    return () => { stack.splice(stack.indexOf(token), 1); window.removeEventListener('keydown', handler, true); };
  }, [active]);
}
