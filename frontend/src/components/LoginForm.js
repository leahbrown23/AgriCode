"use client"

import { useState } from "react"

export default function LoginForm({ onLoginClick, onSignUpClick }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState("")
  const [isError, setIsError] = useState(false)
  const [messageBoxVisible, setMessageBoxVisible] = useState(false)

  const handleLogin = async () => {
    // Basic validation
    if (!email || !password) {
      setMessage("Please enter both email and password.")
      setIsError(true)
      setMessageBoxVisible(true)
      return
    }

    try {
      const res = await fetch("http://localhost:8000/api/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: email,
          password: password
        })
      })

      const data = await res.json()

     if (res.ok) {
  // Store tokens in localStorage
  localStorage.setItem("accessToken", data.access)
  localStorage.setItem("refreshToken", data.refresh)

  // Use messageBox for feedback
  setMessage("Login successful! Redirecting to dashboard...")
  setIsError(false)
  setMessageBoxVisible(true)

  // Simulate redirect delay
  setTimeout(() => {
    if (onLoginClick) onLoginClick()
  }, 2000)
} else {
  setMessage("Login failed: " + (data.detail || "Invalid email or password. Please try again."))
  setIsError(true)
  setMessageBoxVisible(true)
}
    } catch (error) {
      setMessage("Connection error: Unable to connect to server. Please check your internet connection.")
      setIsError(true)
      setMessageBoxVisible(true)
    }
  }

  const closeMessageBox = () => {
    setMessageBoxVisible(false)
  }

  // Updated MessageBox component with your app's styling
  const MessageBox = ({ message, isError, onClose }) => (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
      onClick={onClose}
    >
      <div
        className="bg-[#d1e6b2] rounded-lg p-6 max-w-sm w-full mx-4 shadow-2xl border-2 border-white"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 ${
            isError ? "bg-red-100" : "bg-green-100"
          }`}>
            <span className={`text-2xl ${isError ? "text-red-600" : "text-green-600"}`}>
              {isError ? "⚠️" : "✅"}
            </span>
          </div>
          <div className={`text-lg font-semibold mb-3 ${isError ? "text-red-700" : "text-green-700"}`}>
            {isError ? "Error" : "Success"}
          </div>
          <p className="text-gray-800 text-sm leading-relaxed">
            {message}
          </p>
        </div>
        <button
          onClick={onClose}
          className="bg-[#2a9d4a] hover:bg-[#238a3e] text-white w-full py-3 rounded-lg font-medium transition-colors duration-200"
        >
          OK
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#d1e6b2] p-6">
      <div className="w-full space-y-4 max-w-md">
        <input
          type="email"
          placeholder="Email"
          className="w-full bg-white border-2 border-gray-200 p-3 rounded-lg text-gray-800 placeholder-gray-500 focus:border-[#2a9d4a] focus:outline-none transition-colors"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full bg-white border-2 border-gray-200 p-3 rounded-lg text-gray-800 placeholder-gray-500 focus:border-[#2a9d4a] focus:outline-none transition-colors"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          onClick={handleLogin}
          className="bg-[#2a9d4a] hover:bg-[#238a3e] text-white w-full py-3 rounded-lg font-medium transition-colors duration-200"
        >
          Login
        </button>

        {messageBoxVisible && (
          <MessageBox
            message={message}
            isError={isError}
            onClose={closeMessageBox}
          />
        )}

        <div className="text-center mt-6">
          <button 
            onClick={onSignUpClick} 
            className="text-sm text-gray-700 hover:text-gray-900 hover:underline transition-colors"
          >
            Don't have an account? Sign up
          </button>
        </div>
      </div>
    </div>
  )
}