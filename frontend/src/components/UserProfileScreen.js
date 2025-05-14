"use client"

import { ArrowLeft } from "lucide-react"
import { useEffect, useState } from "react"
import supabase from "../supabaseClient"

export default function FarmSetupScreen({ onRegisterClick, onBackClick }) {
  const [user, setUser] = useState(null)
  const [farmName, setFarmName] = useState("")
  const [location, setLocation] = useState("")
  const [cropTypes, setCropTypes] = useState("")
  const [size, setSize] = useState("")
  const [hasLivestock, setHasLivestock] = useState("")

  // Fetch the logged-in user
  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error) {
        console.error("Failed to fetch user", error)
      } else {
        setUser(data.user)
      }
    }

    fetchUser()
  }, [])

  const handleFarmRegister = async () => {
    if (!user) {
      alert("User not logged in")
      return
    }

    const { error } = await supabase.from("farms").insert({
      user_id: user.id,
      farm_name: farmName,
      location: location,
      crop_types: cropTypes,
      size: parseFloat(size),
      has_livestock: hasLivestock === "yes",
    })

    if (error) {
      console.error("Failed to save farm", error)
      alert("Error saving farm data")
    } else {
      alert("Farm registered successfully!")
      onRegisterClick()  // navigate to next screen
    }
  }

  return (
    <div className="flex flex-col h-full pb-12">
      <div className="p-4 bg-white flex items-center">
        <button onClick={onBackClick} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold flex-1 text-center">Profile</h1>
      </div>
      <div className="flex flex-col h-full bg-[#d1e6b2] p-6">
        {user && (
          <div className="text-sm mb-4 text-right text-gray-700">
            Logged in as: <strong>{user.email}</strong>
          </div>
        )}

        <div className="w-full space-y-3">
          <input
            type="text"
            placeholder="Farm Name"
            className="w-full bg-white border border-gray-300 p-2 rounded"
            value={farmName}
            onChange={(e) => setFarmName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Location"
            className="w-full bg-white border border-gray-300 p-2 rounded"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <input
            type="text"
            placeholder="Crop Types"
            className="w-full bg-white border border-gray-300 p-2 rounded"
            value={cropTypes}
            onChange={(e) => setCropTypes(e.target.value)}
          />
          <input
            type="number"
            placeholder="Size (in hectares)"
            className="w-full bg-white border border-gray-300 p-2 rounded"
            value={size}
            onChange={(e) => setSize(e.target.value)}
          />
          <select
            value={hasLivestock}
            onChange={(e) => setHasLivestock(e.target.value)}
            className="w-full bg-white border border-gray-300 p-2 rounded appearance-none"
          >
            <option value="" disabled>
              Livestock
            </option>
            <option value="yes">Yes I have livestock</option>
            <option value="no">No I do not have livestock</option>
          </select>

          <button
            onClick={handleFarmRegister}
            className="bg-[#2a9d4a] hover:bg-[#238a3e] text-white w-full py-2 rounded mt-2"
          >
            Register
          </button>
          <button onClick={onBackClick} className="text-sm text-gray-700 hover:underline">
            Back
          </button>
        </div>
      </div>
    </div>
  )
}
