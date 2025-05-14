"use client"

import { useState } from "react";
import supabase from "../supabaseClient.js"; // Adjust the path based on your project structure

export default function RegisterForm({ onRegisterClick, onBackClick }) {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [farmName, setFarmName] = useState("")

  const handleRegister = async () => {
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signUpError) {
      alert("Error signing up: " + signUpError.message)
      return
    }

    const userId = data.user?.id
    if (!userId) {
      alert("Signup succeeded but no user ID returned.")
      return
    }

    const { error: insertError } = await supabase
      .from("users")
      .insert({
        user_id: userId,
        email: email,
        first_name: firstName,
        surname: lastName,
        farm_name: farmName,
      })

    if (insertError) {
      alert("User registered, but failed to save profile: " + insertError.message)
    } else {
      alert("User registered successfully!")
      onRegisterClick()  // navigate to next screen if you want
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
