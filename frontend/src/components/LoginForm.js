"use client"

import { useEffect, useState, useCallback } from "react"
import api from "../api/api"

/** Reusable modal with success/error variants */
function ModalToast({ open, title = "Success", message, variant = "success", onClose, autoCloseMs = 1500 }) {
  const isSuccess = variant === "success"
  const badgeBg = isSuccess ? "bg-green-100 ring-green-200" : "bg-rose-50 ring-rose-100"
  const iconColor = isSuccess ? "text-[#2a9d4a]" : "text-rose-600"
  const buttonBg = isSuccess ? "bg-[#2a9d4a] hover:bg-[#238a3e] focus-visible:ring-[#2a9d4a]"
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
  const [toastVariant, setToastVariant] = useState("success")
  const [toastMessage, setToastMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) {
      setToastVariant("error")
      setToastMessage("Please enter both email and password.")
      setToastOpen(true)
      return
    }

    setIsLoading(true)
    try {
      const res = await api.post("/api/login/", {
        username: email,
        password: password,
      })

      // Save tokens for interceptors/refresh
      if (res.data?.access) localStorage.setItem("accessToken", res.data.access)
      if (res.data?.refresh) localStorage.setItem("refreshToken", res.data.refresh)

      setToastVariant("success")
      setToastMessage("Login successful! Redirecting to dashboard...")
      setToastOpen(true)
    } catch (error) {
      const errorMsg = error?.response?.data?.detail || "Invalid email or password. Please try again."
      setToastVariant("error")
      setToastMessage(errorMsg)
      setToastOpen(true)
    } finally {
      setIsLoading(false)
    }
  }

  const onToastClose = () => {
    const wasSuccess = toastVariant === "success"
    setToastOpen(false)
    if (wasSuccess) onLoginClick?.()
  }

  return (
    <div className="min-h-screen bg-[#c7dbb5] flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm p-4">
        <div className="flex items-center justify-center">
          <h1 className="text-xl font-semibold text-gray-800">Welcome to AgriCode</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 pt-8">
        <div className="w-full max-w-md mx-auto">
          {/* SMARTHARVEST Text */}
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-3">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-[#2a9d4a]">SMARTHARVEST</h2>
            </div>
          </div>

          {/* Login Form */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            {/* Login icon and title */}
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-[#2a9d4a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013 3v1"></path>
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-800">Login to Account</h2>
            </div>

            {/* Form */}
            <div className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="john.doe@example.com"
                  className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a9d4a] focus:border-transparent text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  placeholder="Enter your password"
                  className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a9d4a] focus:border-transparent text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {/* Login Button */}
              <button
                onClick={handleLogin}
                disabled={isLoading}
                className="w-full bg-[#2a9d4a] hover:bg-[#238a3e] disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center text-sm mt-6"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing In...
                  </>
                ) : (
                  'Login'
                )}
              </button>

              {/* Sign Up Link */}
              <div className="text-center mt-4">
                <p className="text-sm text-gray-600">
                  Don't have an account?{' '}
                  <button
                    onClick={onSignUpClick}
                    className="text-[#2a9d4a] hover:text-[#238a3e] font-medium"
                  >
                    Sign Up
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ModalToast
        open={toastOpen}
        title={toastVariant === "success" ? "Success" : "Something went wrong"}
        message={toastMessage}
        variant={toastVariant}
        onClose={onToastClose}
        autoCloseMs={toastVariant === "success" ? 1500 : null}
      />
    </div>
  )
}