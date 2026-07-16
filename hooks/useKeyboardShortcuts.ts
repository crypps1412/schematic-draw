// hooks/useKeyboardShortcuts.ts
import { useEffect } from "react";
import { useEditorStore } from "../store/editorStore";

/** True if focus is inside a text input / contentEditable — shortcuts should not fire there. */
function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
}

export default function useKeyboardShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const store = useEditorStore.getState();
      const hasSelection = store.selection.size > 0;
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key.toLowerCase() === "c" && hasSelection) {
        e.preventDefault();
        store.copySelection();
      } else if (mod && e.key.toLowerCase() === "x" && hasSelection) {
        e.preventDefault();
        store.cutSelection();
      } else if (mod && e.key.toLowerCase() === "d" && hasSelection) {
        e.preventDefault();
        store.duplicateSelection();
      } else if ((e.key === "Delete" || e.key === "Backspace") && hasSelection) {
        e.preventDefault();
        store.deleteSelection();
      } else if (e.key === "ArrowUp" && hasSelection) {
        e.preventDefault();
        store.nudgeSelection(0, -1);
      } else if (e.key === "ArrowDown" && hasSelection) {
        e.preventDefault();
        store.nudgeSelection(0, 1);
      } else if (e.key === "ArrowLeft" && hasSelection) {
        e.preventDefault();
        store.nudgeSelection(-1, 0);
      } else if (e.key === "ArrowRight" && hasSelection) {
        e.preventDefault();
        store.nudgeSelection(1, 0);
      } else if (e.key === "Escape") {
        store.cancelWiring();
        store.clearSelection();
      }
    };

    // Right-click undo-last-anchor and middle-click cancel for the wiring tool
    const onContextMenu = (e: MouseEvent) => {
      const store = useEditorStore.getState();
      if (store.wiringTool.active) {
        e.preventDefault();
        store.undoLastAnchor();
      }
    };
    const onAuxClick = (e: MouseEvent) => {
      const store = useEditorStore.getState();
      if (e.button === 1 && store.wiringTool.active) {
        store.cancelWiring();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("auxclick", onAuxClick);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("auxclick", onAuxClick);
    };
  }, []);
}
