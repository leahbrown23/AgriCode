"use client"

import { ArrowLeft, User, MapPin, Sprout, Ruler, Star , MessageSquare, Eye } from "lucide-react"
import { useEffect, useState } from "react"
import api from "../api/api"
import LoadingSpinner from "./LoadingSpinner"

export default function FarmSetupScreen({ onBackClick, onAddCropsClick, onThreadClick, onManagePlotsClick }) {
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
  const [isEditing, setIsEditing] = useState(false)
  const [loadingFavorites, setLoadingFavorites] = useState(true)

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
        setIsEditing(false)
      } catch (error) {
        if (error.response?.status === 404) {
          setFarmExists(false)
          setIsEditing(true)
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
    const fetchFavoritesFromApi = async () => {
      if (!token) return
      setLoadingFavorites(true)
      try {
        // Get favorite thread records for current user
        const favRes = await api.get("/api/favorites/")
        const favs = favRes.data // [{id, thread_id}]
        const favoriteIds = favs.map(fav => fav.thread_id)

        if (favoriteIds.length > 0) {
          // Get all threads and filter by favorites
          const threadsRes = await api.get("/forum/threads/")
          const allThreads = threadsRes.data.results || []
          const filtered = allThreads.filter(t => favoriteIds.includes(t.id))
          setFavoriteThreads(filtered)
        } else {
          setFavoriteThreads([])
        }
      } catch (err) {
        console.error("Error fetching favorite threads:", err)
        setFavoriteThreads([])
      } finally {
        setLoadingFavorites(false)
      }
    }
    fetchFavoritesFromApi()
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
        size: Number.parseFloat(size),
        has_livestock: hasLivestock === "yes",
      })
      setFarmExists(true)
      setIsEditing(false)
      showSuccess("Farm added successfully!")
    } catch (err) {
      console.error(err)
      alert("Error adding farm: " + JSON.stringify(err.response?.data || err))
    }
  }

  const handleUpdateFarmAndExitEditMode = async () => {
    try {
      await api.put("/api/farm/", {
        farm_name: farmName,
        location,
        crop_types: cropTypes,
        size: Number.parseFloat(size),
        has_livestock: hasLivestock === "yes",
      })
      showSuccess("Farm updated successfully!")
      setIsEditing(false)
    } catch (err) {
      console.error(err)
      alert("Error updating farm: " + JSON.stringify(err.response?.data || err))
    }
  }

  const handleThreadClick = (threadId) => {
    // Make sure onThreadClick is called properly
    if (onThreadClick) {
      onThreadClick(threadId)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="flex flex-col h-full pb-12">
      {/* Top Header */}
      <div className="p-4 bg-white flex items-center shadow-sm">
        <button onClick={onBackClick} className="mr-2 p-1 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold flex-1 text-center">User Management</h1>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#d1e6b2] p-4 space-y-4">
        {/* User Details Section */}
        {user && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-800">User Details</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-600 w-16">Name:</span>
                <span className="text-sm text-gray-800">
                  {user.first_name} {user.last_name}
                </span>
              </div>
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-600 w-16">Email:</span>
                <span className="text-sm text-gray-800">{user.email}</span>
              </div>
              {user.phone && (
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600 w-16">Phone:</span>
                  <span className="text-sm text-gray-800">{user.phone}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg p-4">
            <div className="flex items-center text-white">
              <div className="w-5 h-5 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-3">
                <span className="text-green-600 text-xs font-bold">✓</span>
              </div>
              <span className="font-medium">{successMessage}</span>
            </div>
          </div>
        )}

        {/* Farm Details Section */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg mr-3">
                <Sprout className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-800">Farm Details</h2>
            </div>
            {farmExists && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
              >
                Edit Farm
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Farm Name</label>
              <div className="relative">
                <Sprout className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Enter farm name"
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg text-sm transition-colors ${
                    isEditing
                      ? "border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      : "border-gray-200 bg-gray-50"
                  }`}
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                  readOnly={!isEditing}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Enter location"
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg text-sm transition-colors ${
                    isEditing
                      ? "border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      : "border-gray-200 bg-gray-50"
                  }`}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  readOnly={!isEditing}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Crop Types</label>
              <div className="relative">
                <Sprout className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Enter crop types"
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg text-sm transition-colors ${
                    isEditing
                      ? "border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      : "border-gray-200 bg-gray-50"
                  }`}
                  value={cropTypes}
                  onChange={(e) => setCropTypes(e.target.value)}
                  readOnly={!isEditing}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Size (hectares)</label>
              <div className="relative">
                <Ruler className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  placeholder="Enter size in hectares"
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg text-sm transition-colors ${
                    isEditing
                      ? "border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      : "border-gray-200 bg-gray-50"
                  }`}
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  readOnly={!isEditing}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Livestock</label>
              <div className="relative">
                <Sprout className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={hasLivestock}
                  onChange={(e) => setHasLivestock(e.target.value)}
                  disabled={!isEditing}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg text-sm appearance-none transition-colors ${
                    isEditing
                      ? "border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <option value="" disabled>
                    Select livestock option
                  </option>
                  <option value="yes">Yes, I have livestock</option>
                  <option value="no">No, I do not have livestock</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 space-y-3">
            {!farmExists ? (
              <button
                onClick={handleAddFarm}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 rounded-xl font-medium shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
              >
                Add Farm
              </button>
            ) : (
              <>
                {isEditing && (
                  <button
                    onClick={handleUpdateFarmAndExitEditMode}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 rounded-xl font-medium shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
                  >
                    Save Farm
                  </button>
                )}
                <button
                  onClick={onManagePlotsClick}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 rounded-xl font-medium shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
                >
                  Manage Plots
                </button>

                <button
                  onClick={onAddCropsClick}
                  className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white py-3 rounded-xl font-medium shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
                >
                  Manage Crops
                </button>
              </>
            )}
          </div>
        </div>

        {/* My Threads Section - Enhanced */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg mr-3">
                <Star className="w-5 h-5 text-yellow-500" />
              </div>
              <h2 className="text-lg font-bold text-gray-800">My Threads</h2>
            </div>
            <div className="text-sm text-gray-500">
              {favoriteThreads.length} thread{favoriteThreads.length !== 1 ? 's' : ''}
            </div>
          </div>

          {loadingFavorites ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : favoriteThreads.length === 0 ? (
            <div className="text-center py-8">
              <div className="p-4 bg-gray-50 rounded-lg inline-block mb-4">
                <Star className="w-8 h-8 text-gray-400 mx-auto" />
              </div>
              <p className="text-gray-500 font-medium">No favorite threads yet</p>
              <p className="text-sm text-gray-400 mb-4">Start exploring the forum to add favorites</p>
              <button
                onClick={() => {/* Navigate to forum - you can implement this */}}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-sm rounded-lg transition-colors"
              >
                Browse Forum
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {favoriteThreads.map((thread) => (
                <div
                  key={thread.id}
                  className="p-4 bg-gray-50 hover:bg-yellow-50 rounded-lg cursor-pointer transition-all duration-200 border border-gray-100 hover:border-yellow-200 hover:shadow-md group"
                  onClick={() => handleThreadClick(thread.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 pr-3">
                      <h3 className="font-semibold text-gray-800 text-sm mb-2 group-hover:text-yellow-700 transition-colors line-clamp-2">
                        {thread.title}
                      </h3>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center">
                          <MessageSquare className="w-3 h-3 mr-1" />
                          <span>{thread.replies_count ?? 0} replies</span>
                        </div>
                        <div className="flex items-center">
                          <Eye className="w-3 h-3 mr-1" />
                          <span>{thread.views_count ?? 0} views</span>
                        </div>
                        {thread.created_at && (
                          <div className="text-gray-400">
                            {new Date(thread.created_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                    <Star className="w-4 h-4 text-yellow-400 fill-current flex-shrink-0 group-hover:scale-110 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="h-6" />
      </div>
    </div>
  )
}