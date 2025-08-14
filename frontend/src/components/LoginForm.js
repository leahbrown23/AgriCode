"use client"

import { useEffect, useState, useCallback } from "react"
import api from "../api/api"

/** Reusable modal with success/error variants */
function ModalToast({ open, title = "Success", message, variant = "success", onClose, autoCloseMs = 1500 }) {
  const isSuccess = variant === "success"
  const badgeBg = isSuccess ? "bg-emerald-50 ring-emerald-100" : "bg-rose-50 ring-rose-100"
  const iconColor = isSuccess ? "text-emerald-600" : "text-rose-600"
  const buttonBg = isSuccess ? "bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-500"
                             : "bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-500"

  const onKeyDown = useCallback((e) => {
    if (e.key === "Escape") onClose?.()
  }, [onClose])

  useEffect(() => {
    if (!open) return
    window.addEventListener("keydown", onKeyDown)
    let t
    if (autoCloseMs && isSuccess) t = setTimeout(onClose, autoCloseMs)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      if (t) clearTimeout(t)
    }
  }, [open, onKeyDown, autoCloseMs, isSuccess, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md mx-4 rounded-2xl bg-white shadow-xl ring-1 ring-black/5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 md:p-7 text-center">
          <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${badgeBg} ring-1`}>
            {isSuccess ? (
              <svg viewBox="0 0 24 24" className={`h-7 w-7 ${iconColor}`}>
                <path fill="currentColor" d="M9.55 17.05 5.5 13l1.4-1.4 2.65 2.65 7.6-7.6 1.4 1.4-9 9z"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className={`h-7 w-7 ${iconColor}`}>
                <path fill="currentColor" d="M11 7h2v6h-2zm0 8h2v2h-2z"/><path fill="currentColor" d="M1 21h22L12 2 1 21z"/>
              </svg>
            )}
          </div>

          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          <p className="mt-2 text-sm text-gray-600">{message}</p>

          <button
            onClick={onClose}
            className={`mt-6 inline-flex w-full items-center justify-center rounded-lg px-4 py-3 text-white font-medium shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${buttonBg}`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}

export default function LoginForm({ onLoginClick, onSignUpClick }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [toastOpen, setToastOpen] = useState(false)
  const [toastVariant, setToastVariant] = useState("success") // "success" | "error"
  const [toastMessage, setToastMessage] = useState("")

  const handleLogin = async () => {
    if (!email || !password) {
      setToastVariant("error")
      setToastMessage("Please enter both email and password.")
      setToastOpen(true)
      return
    }

    try {
      const res = await api.post("/api/login/", {
        username: email,
        password: password
      })

      localStorage.setItem("accessToken", res.data.access)
      localStorage.setItem("refreshToken", res.data.refresh)

      setToastVariant("success")
      setToastMessage("Login successful! Redirecting to dashboard...")
      setToastOpen(true)
      // on close (or auto-close) we continue in onToastClose handler below
    } catch (error) {
      const errorMsg = error?.response?.data?.detail || "Invalid email or password. Please try again."
      setToastVariant("error")
      setToastMessage(errorMsg)
      setToastOpen(true)
    }
  }

  const onToastClose = () => {
    const wasSuccess = toastVariant === "success"
    setToastOpen(false)
    if (wasSuccess) onLoginClick?.()
  }

  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#d1e6b2] p-6">
      <div className="w-full space-y-4 max-w-md">
        <h1 className="text-4xl font-bold text-[#2a9d4a] mb-2 text-center tracking-tight">SmartHarvest</h1>

        <input
          type="email"
          placeholder="Email"
          className="w-full bg-white border-2 border-gray-200 p-3 rounded-lg text-gray-800 placeholder-gray-500 focus:border-[#2a9d4a] focus:outline-none transition"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full bg-white border-2 border-gray-200 p-3 rounded-lg text-gray-800 placeholder-gray-500 focus:border-[#2a9d4a] focus:outline-none transition"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleLogin}
          className="bg-[#2a9d4a] hover:bg-[#238a3e] text-white w-full py-3 rounded-lg font-medium transition"
        >
          Login
        </button>

        <div className="text-center mt-6">
          <button
            onClick={onSignUpClick}
            className="text-sm text-gray-700 hover:text-gray-900 hover:underline transition"
          >
            Don't have an account? Sign up
          </button>
        </div>
      </div>

      <ModalToast
        open={toastOpen}
        title={toastVariant === "success" ? "Success" : "Something went wrong"}
        message={toastMessage}
        variant={toastVariant}
        onClose={onToastClose}
        autoCloseMs={toastVariant === "success" ? 1500 : null} // success auto-closes, error waits for user
      />
    </div>
  )
}
