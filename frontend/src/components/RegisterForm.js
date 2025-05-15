"use client"

import { useState } from "react"

export default function RegisterForm({ onRegisterClick, onBackClick }) {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [farmName, setFarmName] = useState("")

  const handleRegister = async () => {
  try {
    // Step 1: Register the user
    const res = await fetch("http://localhost:8000/api/register/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username: email, // username will be email
        email: email,
        password: password,
        first_name: firstName,
        last_name: lastName,
        farm_name: farmName
      })
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.detail || "Registration failed")
    }

    // Step 2: Log the user in right after registration
    const loginRes = await fetch("http://localhost:8000/api/login/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username: email, // login with same email
        password: password
      })
    })

    const loginData = await loginRes.json()

    if (!loginRes.ok) {
      throw new Error(loginData.detail || "Login failed after registration")
    }

    // Step 3: Store the tokens
    localStorage.setItem("accessToken", loginData.access)
    localStorage.setItem("refreshToken", loginData.refresh)

    alert("Registration successful and user logged in!")

    // Step 4: Redirect
    onRegisterClick() // Go to dashboard or wherever needed

  } catch (err) {
    console.error("Registration/Login error:", err)
    alert("Error: " + err.message)
  }
}


  return (
    <div className="flex flex-col h-full bg-[#d1e6b2] p-6">
      <h2 className="text-right text-[#2a9d4a] font-medium mb-4">Create an account</h2>
      <div className="w-full space-y-3">
        <input type="text" placeholder="First Name" className="w-full bg-white border border-gray-300 p-2 rounded" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        <input type="text" placeholder="Last Name" className="w-full bg-white border border-gray-300 p-2 rounded" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        <input type="email" placeholder="Email" className="w-full bg-white border border-gray-300 p-2 rounded" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" className="w-full bg-white border border-gray-300 p-2 rounded" value={password} onChange={(e) => setPassword(e.target.value)} />
        <input type="text" placeholder="Farm Name" className="w-full bg-white border border-gray-300 p-2 rounded" value={farmName} onChange={(e) => setFarmName(e.target.value)} />
        <button
          onClick={handleRegister}
          className="bg-[#2a9d4a] hover:bg-[#238a3e] text-white w-full py-2 rounded mt-2"
        >
          Register
        </button>
        <button onClick={onBackClick} className="text-sm text-gray-700 hover:underline">
          Back
        </button>
      </div>
    </div>
  )
}
