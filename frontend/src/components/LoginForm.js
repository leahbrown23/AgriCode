"use client"

import { useState } from "react";
import supabase from "../supabaseClient"; // Adjust path as needed

export default function LoginForm({ onLoginClick, onSignUpClick }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert("Login failed: " + error.message)
      return
    }

    alert("Login successful!")

    // Optional: Trigger navigation or context update
    if (onLoginClick) {
      onLoginClick()
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#d1e6b2] p-6">
      <div className="w-full space-y-4">
        <input
          type="email"
          placeholder="Email"
          className="w-full bg-white border border-gray-300 p-2 rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full bg-white border border-gray-300 p-2 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          onClick={handleLogin}
          className="bg-[#2a9d4a] hover:bg-[#238a3e] text-white w-full py-2 rounded"
        >
          Login
        </button>
        <div className="text-center mt-4">
          <button onClick={onSignUpClick} className="text-sm text-gray-700 hover:underline">
            Don't have an account? Sign up
          </button>
        </div>
      </div>
    </div>
  )
}
