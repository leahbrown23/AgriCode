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
  const [favoriteThreads, setFavoriteThreads] = useState([])

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

  useEffect(() => {
    const fetchFavorites = async () => {
      const stored = localStorage.getItem("favorites")
      const favoriteIds = stored ? JSON.parse(stored) : []

      if (favoriteIds.length > 0) {
        try {
          const res = await api.get("/forum/threads/")
          const allThreads = res.data.results || []
          const filtered = allThreads.filter((t) => favoriteIds.includes(t.id))
          setFavoriteThreads(filtered)
        } catch (err) {
          console.error("Error fetching favorite threads:", err)
        }
      }
    }

    fetchFavorites()
  }, [])

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

      <div className="flex-1 overflow-y-auto bg-[#d1e6b2] p-6">
        {user && (
          <>
            <h2 className="text-md font-semibold mb-1 text-gray-800">User Details</h2>
            <div className="bg-white rounded shadow p-4 mb-6 text-sm text-gray-800 space-y-1">
              <div>
                <span className="font-medium">Name:</span> {user.first_name} {user.last_name}
              </div>
              <div>
                <span className="font-medium">Email:</span> {user.email}
              </div>
              {user.phone && (
                <div>
                  <span className="font-medium">Phone:</span> {user.phone}
                </div>
              )}
            </div>
          </>
        )}

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
          <h2 className="text-md font-semibold mb-1 text-gray-800">Farm Details</h2>
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
          
        </div>

        <div className="mt-8">
          <h2 className="text-md font-semibold mb-1 text-gray-800">Favourited Threads</h2>
          <div className="space-y-3">
            {favoriteThreads.length === 0 ? (
              <div className="text-sm text-gray-600">No favourites yet.</div>
            ) : (
              favoriteThreads.map((thread) => (
                <div key={thread.id} className="bg-white rounded shadow p-3">
                  <div className="font-semibold text-sm">{thread.title}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {thread.replies_count ?? 0} replies • {thread.views_count ?? 0} views
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="h-6" />
      </div>
    </div>
  )
}
