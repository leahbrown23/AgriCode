"use client"

import { ArrowLeft } from "lucide-react"
import { useEffect, useState } from "react"

export default function FarmSetupScreen({ onRegisterClick, onBackClick }) {
  const [user, setUser] = useState(null)
  const [farmName, setFarmName] = useState("")
  const [location, setLocation] = useState("")
  const [cropTypes, setCropTypes] = useState("")
  const [size, setSize] = useState("")
  const [hasLivestock, setHasLivestock] = useState("")

  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null

  // Fetch user profile + farm
  useEffect(() => {
    const fetchProfileAndFarm = async () => {
      if (!token) return

      // Fetch user profile
      const profileRes = await fetch("http://localhost:8000/api/profile/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (profileRes.ok) {
        const userData = await profileRes.json()
        setUser(userData)
      }

      // Fetch farm info
      const farmRes = await fetch("http://localhost:8000/api/farm/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (farmRes.ok) {
        const farmData = await farmRes.json()
        setFarmName(farmData.farm_name || "")
        setLocation(farmData.location || "")
        setCropTypes(farmData.crop_types || "")
        setSize(farmData.size || "")
        setHasLivestock(farmData.has_livestock ? "yes" : "no")
      }
    }

    fetchProfileAndFarm()
  }, [token])

  // Save farm data to Django
  const handleFarmRegister = async () => {
    if (!token) {
      alert("User not logged in")
      return
    }

    const response = await fetch("http://localhost:8000/api/farm/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        farm_name: farmName,
        location,
        crop_types: cropTypes,
        size: parseFloat(size),
        has_livestock: hasLivestock === "yes",
      }),
    })

    if (response.ok) {
      alert("Farm saved successfully!")
      onRegisterClick()
    } else {
      const err = await response.json()
      alert("Failed to save farm: " + JSON.stringify(err))
    }
  }

  return (
    <div className="flex flex-col h-full pb-12">
      <div className="p-4 bg-white flex items-center">
        <button onClick={onBackClick} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold flex-1 text-center">Farm Setup</h1>
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
            <option value="" disabled>Livestock</option>
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
