"use client"
import { useState } from "react"
import africaLogo from "../assets/africa-logo.png"

export default function LoginScreen({ onLoginClick }) {
  const [showMessage, setShowMessage] = useState(false)

  const handleLoginClick = () => {
    // Show success message when login button is clicked
    setShowMessage(true)
    // Call the original onLoginClick after showing message
    setTimeout(() => {
      if (onLoginClick) onLoginClick()
    }, 1500) // Small delay to show the message
  }

  const closeMessage = () => {
    setShowMessage(false)
  }

  // Reusable MessageBox component matching your app's design
  const MessageBox = ({ message, onClose }) => (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
      onClick={onClose}
    >
      <div
        className="bg-[#d1e6b2] rounded-lg p-6 max-w-sm w-full mx-4 shadow-2xl border-2 border-white"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <div className="text-lg font-semibold mb-3 text-green-700">
            ✅ Success
          </div>
          <p className="text-gray-800 text-sm leading-relaxed">
            {message}
          </p>
        </div>
        <button
          onClick={onClose}
          className="bg-[#2a9d4a] hover:bg-[#238a3e] text-white w-full py-2 rounded font-medium transition-colors duration-200"
        >
          OK
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#d1e6b2] p-6">
      <div className="bg-white rounded-lg p-6 mb-6 w-full max-w-[200px] shadow-lg">
        <img src={africaLogo || "/placeholder.svg"} alt="Smart Harvest Africa Logo" className="w-full h-auto" />
      </div>
      <button 
        onClick={handleLoginClick} 
        className="bg-[#2a9d4a] hover:bg-[#238a3e] text-white w-full py-3 rounded-lg font-medium transition-colors duration-200 max-w-md"
      >
        Login
      </button>

      {showMessage && (
        <MessageBox
          message="Proceeding to login form..."
          onClose={closeMessage}
        />
      )}
    </div>
  )
}