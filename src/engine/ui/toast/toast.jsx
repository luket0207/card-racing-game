/**
 * Usage
 *
 * 1) Wrap your app once (usually in main.jsx or App.jsx)
 *
 * import { ToastProvider } from "./engine/ui/toast/toast";
 *
 * <ToastProvider>
 *   <App />
 * </ToastProvider>
 *
 * 2) Trigger toasts from any component
 *
 * import { useToast, TOAST_TYPE } from "../../engine/ui/toast/toast";
 *
 * const MyComponent = () => {
 *   const { showToast, player1, player2, player3, player4 } = useToast();
 *
 *   return (
 *     <>
 *       <button onClick={() => player1("Player 1 moved!")}>Player 1</button>
 *       <button onClick={() => showToast(TOAST_TYPE.PLAYER2, "Player 2 gained stamina", { durationMs: 5000 })}>
 *         Player 2 (5s)
 *       </button>
 *     </>
 *   );
 * };
 */

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import "./toast.scss";

export const TOAST_TYPE = Object.freeze({
  PLAYER1: "player1",
  PLAYER2: "player2",
  PLAYER3: "player3",
  PLAYER4: "player4",
});

const ToastContext = createContext(null);

const EXIT_ANIMATION_MS = 260;

const isValidType = (type) => Object.values(TOAST_TYPE).includes(type);

const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const TOAST_LABEL = Object.freeze({
  [TOAST_TYPE.PLAYER1]: "Player 1",
  [TOAST_TYPE.PLAYER2]: "Player 2",
  [TOAST_TYPE.PLAYER3]: "Player 3",
  [TOAST_TYPE.PLAYER4]: "Player 4",
});

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [log, setLog] = useState([]);

  const timeoutsRef = useRef(new Map());

  const clearToastTimeout = useCallback((toastId) => {
    const timeout = timeoutsRef.current.get(toastId);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(toastId);
    }
  }, []);

  const removeToastNow = useCallback((toastId) => {
    clearToastTimeout(toastId);
    setToasts((prev) => prev.filter((t) => t.id !== toastId));
  }, [clearToastTimeout]);

  const dismissToast = useCallback(
    (toastId) => {
      // Set exiting state (for animation), then remove.
      setToasts((prev) =>
        prev.map((t) => (t.id === toastId ? { ...t, isExiting: true } : t))
      );

      // Ensure auto-dismiss timer is cleared
      clearToastTimeout(toastId);

      // Remove after exit animation
      const timeout = setTimeout(() => {
        removeToastNow(toastId);
      }, EXIT_ANIMATION_MS);

      timeoutsRef.current.set(toastId, timeout);
    },
    [clearToastTimeout, removeToastNow]
  );

  const showToast = useCallback(
    (type, message, options = {}) => {
      const safeType = isValidType(type) ? type : TOAST_TYPE.PLAYER1;
      const safeMessage = typeof message === "string" ? message : String(message ?? "");

      const durationMsRaw = options.durationMs;
      const durationMs =
        typeof durationMsRaw === "number" && Number.isFinite(durationMsRaw) && durationMsRaw >= 0
          ? durationMsRaw
          : 3000;

      const id = makeId();
      const createdAt = new Date();

      const toast = {
        id,
        type: safeType,
        message: safeMessage,
        createdAt,
        durationMs,
        color: options.color ?? null,
        isExiting: false,
      };

      // Add toast to UI
      setToasts((prev) => [toast, ...prev]);

      // Add to log (record every toast produced)
      setLog((prev) => [
        {
          id,
          type: safeType,
          message: safeMessage,
          createdAt,
          durationMs,
          color: options.color ?? null,
        },
        ...prev,
      ]);

      // Auto-dismiss (0 means no auto-dismiss)
      if (durationMs > 0) {
        const timeout = setTimeout(() => {
          dismissToast(id);
        }, durationMs);

        timeoutsRef.current.set(id, timeout);
      }

      return id;
    },
    [dismissToast]
  );

  const player1 = useCallback((message, options) => showToast(TOAST_TYPE.PLAYER1, message, options), [showToast]);
  const player2 = useCallback((message, options) => showToast(TOAST_TYPE.PLAYER2, message, options), [showToast]);
  const player3 = useCallback((message, options) => showToast(TOAST_TYPE.PLAYER3, message, options), [showToast]);
  const player4 = useCallback((message, options) => showToast(TOAST_TYPE.PLAYER4, message, options), [showToast]);

  const clearLog = useCallback(() => {
    setLog([]);
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((t) => clearTimeout(t));
      timeoutsRef.current.clear();
    };
  }, []);

  const value = useMemo(
    () => ({
      toasts,
      log,
      showToast,
      player1,
      player2,
      player3,
      player4,
      dismissToast,
      clearLog,
    }),
    [toasts, log, showToast, player1, player2, player3, player4, dismissToast, clearLog]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("[useToast] Must be used within <ToastProvider>.");
  }
  return ctx;
};

const ToastViewport = ({ toasts, onDismiss }) => {
  return (
    <div className="toastViewport" aria-live="polite" aria-relevant="additions removals">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`toast toast--${t.type}${t.isExiting ? " toast--exit" : ""}`}
          style={t.color ? { background: t.color, color: "#111827" } : undefined}
          onClick={() => onDismiss(t.id)}
          title="Click to dismiss"
        >
          <div className="toast__title">{TOAST_LABEL[t.type] ?? t.type}</div>
          <div className="toast__message">{t.message}</div>
        </button>
      ))}
    </div>
  );
};
