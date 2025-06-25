"use client"

import { useState } from "react"

export default function RegisterForm({ onRegisterClick, onBackClick }) {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [farmName, setFarmName] = useState("")
  const [phone, setPhone] = useState("")
  const [showMessage, setShowMessage] = useState(false)

  const handleRegister = async () => {
    try {
      const payload = {
        username: email,
        email: email,
        password: password,
        first_name: firstName,
        last_name: lastName,
        farm_name: farmName,
        phone_number: phone
      }

      // Debug: Log the payload being sent
      console.log("Registration payload:", payload)

      const res = await fetch("http://localhost:8000/api/register/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      
      // Debug: Log the response
      console.log("Registration response:", data)

      if (!res.ok) {
        console.error("Registration failed with status:", res.status)
        console.error("Error response:", data)
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

      // Show success message instead of alert
      setShowMessage(true)
      
      // Redirect after showing message
      setTimeout(() => {
        if (onRegisterClick) onRegisterClick()
      }, 2000) // 2 second delay to show the message
    } catch (err) {
      console.error("Registration/Login error:", err)
      alert("Error: " + err.message)
    }
  }

  const closeMessage = () => {
    setShowMessage(false)
    if (onRegisterClick) onRegisterClick()
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
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 bg-green-500 rounded-sm flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
          </div>
          <div className="text-lg font-semibold mb-3 text-green-700">
            Success
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
    <div className="flex flex-col h-full bg-[#d1e6b2] p-6">
      <h2 className="text-right text-[#2a9d4a] font-medium mb-4">Create an account</h2>
      <div className="w-full space-y-3">
        <input 
          type="text" 
          placeholder="First Name" 
          className="w-full bg-white border border-gray-300 p-2 rounded" 
          value={firstName} 
          onChange={(e) => setFirstName(e.target.value)} 
          required
        />
        <input 
          type="text" 
          placeholder="Last Name" 
          className="w-full bg-white border border-gray-300 p-2 rounded" 
          value={lastName} 
          onChange={(e) => setLastName(e.target.value)} 
          required
        />
        <input 
          type="email" 
          placeholder="Email" 
          className="w-full bg-white border border-gray-300 p-2 rounded" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required
        />
        <input 
          type="password" 
          placeholder="Password" 
          className="w-full bg-white border border-gray-300 p-2 rounded" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required
        />
        <input 
          type="tel" 
          placeholder="Phone Number" 
          className="w-full bg-white border border-gray-300 p-2 rounded" 
          value={phone} 
          onChange={(e) => setPhone(e.target.value)} 
        />
        <input 
          type="text" 
          placeholder="Farm Name" 
          className="w-full bg-white border border-gray-300 p-2 rounded" 
          value={farmName} 
          onChange={(e) => setFarmName(e.target.value)} 
        />
        <button 
          onClick={handleRegister} 
          className="bg-[#2a9d4a] hover:bg-[#238a3e] text-white w-full py-2 rounded mt-2"
        >
          Register
        </button>
        <button 
          onClick={onBackClick} 
          className="text-sm text-gray-700 hover:underline"
        >
          Back
        </button>
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