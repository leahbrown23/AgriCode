"use client"

import { useEffect, useState, useCallback } from "react"
import africaLogo from "../assets/africa-logo.png"
import RegisterForm from "./RegisterForm"

function SuccessModal({ open, message, onClose, autoCloseMs = 1500 }) {
  // close on ESC
  const onKeyDown = useCallback((e) => {
    if (e.key === "Escape") onClose?.()
  }, [onClose])

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
          {/* icon badge */}
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 ring-1 ring-emerald-100">
            <svg viewBox="0 0 24 24" className="h-7 w-7 text-emerald-600">
              <path fill="currentColor" d="M9.55 17.05 5.5 13l1.4-1.4 2.65 2.65 7.6-7.6 1.4 1.4-9 9z"/>
            </svg>
          </div>

          <h3 className="text-xl font-semibold text-gray-900">Success</h3>
          <p className="mt-2 text-sm text-gray-600">{message}</p>

          <button
            onClick={onClose}
            className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-3 text-white font-medium shadow-sm transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}

export default function LoginScreen({ onLoginClick }) {
  const [showMessage, setShowMessage] = useState(false)
  const [showRegister, setShowRegister] = useState(false)

  const handleLoginClick = () => {
    setShowMessage(true)
    // onLoginClick will be called by SuccessModal auto-close
  }

  if (showRegister) {
    return (
      <RegisterForm
        onRegisterClick={() => setShowRegister(false)}
        onBackClick={() => setShowRegister(false)}
      />
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#d1e6b2] p-6">
      <div className="bg-white rounded-xl p-6 mb-6 w-full max-w-[200px] shadow">
        <img
          src={africaLogo || "/placeholder.svg"}
          alt="SmartHarvest Africa Logo"
          className="w-full h-auto"
        />
      </div>

      <div className="flex flex-col space-y-4 w-full max-w-md">
        <button
          onClick={handleLoginClick}
          className="bg-[#2a9d4a] hover:bg-[#238a3e] text-white py-3 rounded-lg font-medium transition"
        >
          Login
        </button>

        <button
          onClick={() => setShowRegister(true)}
          className="bg-white border border-[#2a9d4a] text-[#2a9d4a] hover:bg-[#e6f5e9] py-3 rounded-lg font-medium transition"
        >
          Sign Up
        </button>
      </div>

      <SuccessModal
        open={showMessage}
        message="Proceeding to login form..."
        autoCloseMs={1500}
        onClose={() => {
          setShowMessage(false)
          onLoginClick?.()
        }}
      />
    </div>
  )
}
