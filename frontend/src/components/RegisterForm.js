"use client"

import { useState } from "react"

export default function RegisterForm({ onRegisterClick, onBackClick }) {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [phone, setPhone] = useState("")
  const [showMessage, setShowMessage] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleRegister = async () => {
    setIsLoading(true)
    try {
      const payload = {
        username: email,
        email: email,
        password: password,
        first_name: firstName,
        last_name: lastName,
        phone_number: phone
      }

      const res = await fetch("http://localhost:8000/api/register/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      })

      const responseText = await res.text()
      let data

      try {
        data = JSON.parse(responseText)
      } catch (err) {
        console.error("Non-JSON response from backend:", responseText)
        throw new Error("Unexpected server response. Check if the backend is returning valid JSON.")
      }

      if (!res.ok) {
        throw new Error(data.detail || data.message || JSON.stringify(data) || "Registration failed")
      }

      const loginRes = await fetch("http://localhost:8000/api/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: email,
          password: password
        })
      })

      const loginData = await loginRes.json()

      if (!loginRes.ok) {
        throw new Error(loginData.detail || "Login failed after registration")
      }

      localStorage.setItem("accessToken", loginData.access)
      localStorage.setItem("refreshToken", loginData.refresh)

      setShowMessage(true)

      setTimeout(() => {
        if (onRegisterClick) onRegisterClick()
      }, 2000)
    } catch (err) {
      console.error("Registration/Login error:", err)
      alert("Error: " + err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const closeMessage = () => {
    setShowMessage(false)
    if (onRegisterClick) onRegisterClick()
  }

  const MessageBox = ({ message, onClose }) => (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center mb-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-[#2a9d4a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h3 className="text-lg font-bold mb-2 text-gray-800">Success!</h3>
          <p className="text-gray-600 text-sm">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="bg-[#2a9d4a] hover:bg-[#238a3e] text-white w-full py-2 rounded-xl font-semibold transition-all duration-200"
        >
          Continue
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#c7dbb5] flex flex-col">
      {/* Header with back button */}
      <div className="bg-white shadow-sm p-4">
        <div className="flex items-center">
          <button
            onClick={onBackClick}
            className="text-gray-700 hover:text-gray-900 mr-4"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
            </svg>
          </button>
          <h1 className="text-xl font-semibold text-gray-800">User Registration</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4">
        <div className="bg-white rounded-2xl shadow-sm p-6 max-w-md mx-auto">
        {/* User icon and title */}
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-6 h-6 text-[#2a9d4a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Create Account</h2>
          </div>

          {/* Form */}
          <div className="space-y-4">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  placeholder="John"
                  className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  placeholder="Doe"
                  className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                placeholder="john.doe@example.com"
                className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                placeholder="+27 123 456 7890"
                className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                placeholder="Enter password"
                className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {/* Register Button */}
            <button
              onClick={handleRegister}
              disabled={isLoading}
              className="w-full bg-[#2a9d4a] hover:bg-[#238a3e] disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center text-sm mt-6"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </div>
        </div>
      </div>

      {showMessage && (
        <MessageBox
          message="Registration successful! Redirecting to dashboard..."
          onClose={closeMessage}
        />
      )}
    </div>
  )
} 