"use client"

import { ArrowLeft } from "lucide-react"
import { useEffect, useState } from "react"
import api from "../api/api"
import LoadingSpinner from "./LoadingSpinner"

export default function FarmSetupScreen({ onBackClick, onAddCropsClick }) {
  const [user, setUser] = useState(null)
  const [farmExists, setFarmExists] = useState(false)
  const [farmName, setFarmName] = useState("")
  const [location, setLocation] = useState("")
  const [cropTypes, setCropTypes] = useState("")
  const [size, setSize] = useState("")
  const [hasLivestock, setHasLivestock] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [loading, setLoading] = useState(true)

  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null

  useEffect(() => {
    const fetchProfileAndFarm = async () => {
      if (!token) return

      try {
        const profileRes = await api.get("/api/profile/")
        setUser(profileRes.data)

        const farmRes = await api.get("/api/farm/")
        const farmData = farmRes.data
        setFarmExists(true)
        setFarmName(farmData.farm_name || "")
        setLocation(farmData.location || "")
        setCropTypes(farmData.crop_types || "")
        setSize(farmData.size || "")
        setHasLivestock(farmData.has_livestock ? "yes" : "no")
      } catch (error) {
        if (error.response?.status === 404) {
          setFarmExists(false)
        } else {
          console.error("Failed to fetch profile or farm:", error)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchProfileAndFarm()
  }, [token])

  const showSuccess = (message) => {
    setSuccessMessage(message)
    setTimeout(() => setSuccessMessage(""), 3000)
  }

  const handleAddFarm = async () => {
    try {
      await api.post("/api/farm/", {
        farm_name: farmName,
        location,
        crop_types: cropTypes,
        size: parseFloat(size),
        has_livestock: hasLivestock === "yes",
      })

      setFarmExists(true)
      showSuccess("Farm added successfully!")
    } catch (err) {
      console.error(err)
      alert("Error adding farm: " + JSON.stringify(err.response?.data || err))
    }
  }

  const handleUpdateFarm = async () => {
    try {
      await api.put("/api/farm/", {
        farm_name: farmName,
        location,
        crop_types: cropTypes,
        size: parseFloat(size),
        has_livestock: hasLivestock === "yes",
      })

      showSuccess("Farm updated successfully!")
    } catch (err) {
      console.error(err)
      alert("Error updating farm: " + JSON.stringify(err.response?.data || err))
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="flex flex-col h-full pb-12">
      <div className="p-4 bg-white flex items-center">
        <button onClick={onBackClick} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold flex-1 text-center">User Management</h1>
      </div>
      <div className="flex flex-col h-full bg-[#d1e6b2] p-6">
        {user && (
          <div className="text-sm mb-4 text-right text-gray-700">
            Logged in as: <strong>{user.email}</strong>
          </div>
        )}

        {/* Success message box */}
        {successMessage && (
          <div
            className="flex items-center bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4"
            role="alert"
          >
            <svg
              className="fill-current w-5 h-5 mr-2"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
            >
              <path d="M10 15a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0-10a1 1 0 00-1 1v4a1 1 0 002 0V6a1 1 0 00-1-1zm0-3a9 9 0 100 18 9 9 0 000-18z" />
            </svg>
            <span className="block sm:inline">{successMessage}</span>
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

          {!farmExists ? (
            <button
              onClick={handleAddFarm}
              className="bg-[#2a9d4a] hover:bg-[#238a3e] text-white w-full py-2 rounded mt-2"
            >
              Add Farm
            </button>
          ) : (
            <>
              <button
                onClick={handleUpdateFarm}
                className="bg-[#2a9d4a] hover:bg-[#238a3e] text-white w-full py-2 rounded mt-2"
              >
                Update Farm
              </button>
              <button
                onClick={onAddCropsClick}
                className="bg-[#4b5563] hover:bg-[#374151] text-white w-full py-2 rounded"
              >
                Add Crops
              </button>
            </>
          )}

          <button onClick={onBackClick} className="text-sm text-gray-700 hover:underline">
            Back
          </button>
        </div>
      </div>
    </div>
  )
}
