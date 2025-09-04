import { useCallback, useEffect } from "react"

// 🔴 Profanity Alert Modal
export function ProfanityAlertModal({ open, message, onClose, autoCloseMs = 2000 }) {
  return (
    <BaseAlertModal
      open={open}
      onClose={onClose}
      autoCloseMs={autoCloseMs}
      title="Inappropriate Language"
      message={message}
      iconColor="text-red-600"
      bgColor="bg-red-50 ring-red-100"
      buttonColor="bg-red-600 hover:bg-red-700 focus-visible:ring-red-500"
    />
  )
}

// 🔴 Error Alert Modal
export function ErrorAlertModal({ open, message, onClose, autoCloseMs = 3000 }) {
  return (
    <BaseAlertModal
      open={open}
      onClose={onClose}
      autoCloseMs={autoCloseMs}
      title="Error"
      message={message}
      iconColor="text-red-600"
      bgColor="bg-red-50 ring-red-100"
      buttonColor="bg-red-600 hover:bg-red-700 focus-visible:ring-red-500"
    />
  )
}

// 🟢 Success Alert Modal
export function SuccessAlertModal({ open, message, onClose, autoCloseMs = 2000 }) {
  return (
    <BaseAlertModal
      open={open}
      onClose={onClose}
      autoCloseMs={autoCloseMs}
      title="Success"
      message={message}
      iconColor="text-green-600"
      bgColor="bg-green-50 ring-green-100"
      buttonColor="bg-green-600 hover:bg-green-700 focus-visible:ring-green-500"
    />
  )
}

// 🟡 Base Reusable Modal
function BaseAlertModal({ open, title, message, onClose, autoCloseMs, iconColor, bgColor, buttonColor }) {
  const onKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") onClose?.()
    },
    [onClose]
  )

  useEffect(() => {
    if (!open) return
    window.addEventListener("keydown", onKeyDown)
    let t
    if (autoCloseMs) t = setTimeout(onClose, autoCloseMs)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      if (t) clearTimeout(t)
    }
  }, [open, onKeyDown, autoCloseMs, onClose])

  if (!open) return null

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md mx-4 rounded-2xl bg-white shadow-xl ring-1 ring-black/5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 md:p-7 text-center">
          {/* icon badge */}
          <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${bgColor}`}>
            <svg viewBox="0 0 24 24" className={`h-7 w-7 ${iconColor}`}>
              <path
                fill="currentColor"
                d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1 14h-2v-2h2Zm0-4h-2V7h2Z"
              />
            </svg>
          </div>

          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          <p className="mt-2 text-sm text-gray-600">{message}</p>

          <button
            onClick={onClose}
            className={`mt-6 inline-flex w-full items-center justify-center rounded-lg px-4 py-3 text-white font-medium shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${buttonColor}`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
