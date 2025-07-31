"use client"

import { ArrowLeft, Home, User, Menu, MapPin, Ruler, FileText, Search, Plus, Edit } from "lucide-react"
import { useEffect, useState } from "react"
import api from "../api/api"
import LoadingSpinner from "./LoadingSpinner"

export default function PlotManagementScreen({ onBackClick, onHomeClick, onProfileClick, onMenuClick }) {
  const [plotId, setPlotId] = useState("")
  const [description, setDescription] = useState("")
  const [location, setLocation] = useState("")
  const [size, setSize] = useState("")
  const [user, setUser] = useState(null)
  const [userPlots, setUserPlots] = useState([])
  const [filteredPlots, setFilteredPlots] = useState([])
  const [editingPlot, setEditingPlot] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [tableLoading, setTableLoading] = useState(false)
  const [apiError, setApiError] = useState("")

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        console.log("🔍 Fetching user profile...")
        const res = await api.get("/api/profile/")
        console.log("✅ Profile response:", res.data)
        setUser(res.data)
      } catch (err) {
        console.error("❌ Failed to load user profile:", err)
        setApiError("Failed to load profile: " + err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [])

  useEffect(() => {
    // Always fetch plots, even if user is null for debugging
    fetchUserPlots()
  }, [user])

  useEffect(() => {
    const term = searchTerm.toLowerCase()
    const plotsArray = Array.isArray(userPlots) ? userPlots : []
    setFilteredPlots(
      plotsArray.filter(
        (plot) =>
          plot.plot_id?.toString().toLowerCase().includes(term) ||
          plot.location?.toLowerCase().includes(term) ||
          (plot.description && plot.description.toLowerCase().includes(term)),
      ),
    )
  }, [searchTerm, userPlots])

  const fetchUserPlots = async () => {
    setTableLoading(true)
    setApiError("")
    try {
      console.log("🔍 Fetching plots from /api/farm/plots/...")
      const res = await api.get("/api/farm/plots/")
      console.log("✅ Plots API response:", res)
      console.log("✅ Plots data:", res.data)

      const plotsData = res.data?.results || res.data || []
      console.log("✅ Processed plots data:", plotsData)

      setUserPlots(Array.isArray(plotsData) ? plotsData : [])
    } catch (err) {
      console.error("❌ Error fetching plots:", err)
      console.error("❌ Error response:", err.response)
      console.error("❌ Error status:", err.response?.status)
      console.error("❌ Error data:", err.response?.data)

      setApiError(`API Error: ${err.response?.status || "Network"} - ${err.response?.data?.detail || err.message}`)
      setUserPlots([])
    } finally {
      setTableLoading(false)
    }
  }

  const handleAddPlot = async () => {
    if (!plotId || !location || !size) {
      alert("Please fill in all required fields.")
      return
    }
    try {
      console.log("🔍 Adding plot:", { plot_id: plotId, description, location, size: Number.parseFloat(size) })
      await api.post("/api/farm/plots/", {
        plot_id: plotId,
        description: description || "",
        location: location,
        size: Number.parseFloat(size),
      })
      setSuccessMessage("Plot added successfully!")
      setPlotId("")
      setDescription("")
      setLocation("")
      setSize("")
      fetchUserPlots()
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (err) {
      console.error("❌ Error adding plot:", err)
      let errorMessage = "Error adding plot"

      if (err.response?.data) {
        if (typeof err.response.data === "string" && err.response.data.includes("<!DOCTYPE html>")) {
          if (err.response.data.includes("IntegrityError") || err.response.data.includes("UNIQUE constraint")) {
            errorMessage = "Plot ID already exists. Please use a different Plot ID."
          } else {
            errorMessage = "Server error occurred. Please try again."
          }
        } else {
          errorMessage = JSON.stringify(err.response.data)
        }
      }

      alert(errorMessage)
    }
  }

  const handleUpdatePlot = async () => {
    try {
      await api.put(`/api/farm/plots/${editingPlot.id}/`, {
        plot_id: editingPlot.plot_id,
        description: editingPlot.description || "",
        location: editingPlot.location,
        size: Number.parseFloat(editingPlot.size),
      })
      setSuccessMessage("Plot updated successfully!")
      setEditingPlot(null)
      fetchUserPlots()
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (err) {
      console.error(err)
      let errorMessage = "Error updating plot"

      if (err.response?.data) {
        if (typeof err.response.data === "string" && err.response.data.includes("<!DOCTYPE html>")) {
          if (err.response.data.includes("IntegrityError") || err.response.data.includes("UNIQUE constraint")) {
            errorMessage = "Plot ID already exists. Please use a different Plot ID."
          } else {
            errorMessage = "Server error occurred. Please try again."
          }
        } else {
          errorMessage = JSON.stringify(err.response.data)
        }
      }

      alert(errorMessage)
    }
  }

  const handleDeletePlot = async () => {
    try {
      await api.delete(`/api/farm/plots/${editingPlot.id}/`)
      setSuccessMessage("Plot deleted successfully!")
      setEditingPlot(null)
      fetchUserPlots()
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (err) {
      console.error(err)
      alert("Error deleting plot: " + (err.response?.data?.detail || err.message))
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
        <h1 className="text-lg font-semibold flex-1 text-center">Plot Management</h1>
      </div>

      <div className="flex-1 bg-[#d1e6b2] p-4 space-y-4 overflow-y-auto">
        {/* User Info */}
        {user && (
          <div className="text-right">
            <div className="inline-flex items-center bg-white px-3 py-2 rounded-lg shadow-sm">
              <User className="w-4 h-4 text-gray-500 mr-2" />
              <span className="text-xs text-gray-500 mr-2">Logged in as:</span>
              <span className="text-xs font-medium text-gray-700">{user.email}</span>
            </div>
          </div>
        )}

        {/* API Error Message */}
        {apiError && (
          <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl shadow-lg p-4">
            <div className="flex items-center text-white">
              <div className="w-5 h-5 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-3">
                <span className="text-red-600 text-xs font-bold">!</span>
              </div>
              <span className="font-medium">{apiError}</span>
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

        {/* Add Plot Form */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center mb-6">
            <div className="p-2 bg-green-100 rounded-lg mr-3">
              <Plus className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">Add New Plot</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Plot ID *</label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Enter plot ID (e.g., 6801, P100U5)"
                  value={plotId}
                  onChange={(e) => setPlotId(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <textarea
                  placeholder="Enter plot description (optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors resize-none h-20"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location *</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Enter location (e.g., Between the farm barn)"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Size (hectares) *</label>
              <div className="relative">
                <Ruler className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  placeholder="Enter size in hectares"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>

            <button
              onClick={handleAddPlot}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 rounded-xl font-medium shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
            >
              Add Plot
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search plots..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
            />
          </div>
        </div>

        {/* PLOTS TABLE - COMPACT VERSION */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">Your Plots</h2>
                <p className="text-sm text-gray-500">Click on any row to edit</p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {tableLoading ? (
              <div className="px-4 py-8 text-center">
                <div className="flex items-center justify-center">
                  <LoadingSpinner />
                  <span className="ml-2 text-gray-500">Loading plots...</span>
                </div>
              </div>
            ) : apiError ? (
              <div className="px-4 py-12 text-center">
                <div className="p-4 bg-red-50 rounded-lg inline-block mb-4">
                  <MapPin className="w-8 h-8 text-red-400 mx-auto" />
                </div>
                <p className="text-red-500 font-medium">API Connection Error</p>
                <p className="text-sm text-red-400">Check console for details</p>
                <button
                  onClick={fetchUserPlots}
                  className="mt-2 px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
                >
                  Retry
                </button>
              </div>
            ) : filteredPlots.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <div className="p-4 bg-gray-50 rounded-lg inline-block mb-4">
                  <MapPin className="w-8 h-8 text-gray-400 mx-auto" />
                </div>
                <p className="text-gray-500 font-medium">
                  {userPlots.length === 0 ? "No plots found" : "No plots match your search"}
                </p>
                <p className="text-sm text-gray-400">
                  {userPlots.length === 0 ? "Add your first plot above!" : "Try a different search term"}
                </p>
              </div>
            ) : (
              filteredPlots.map((plot) => (
                <div
                  key={plot.id}
                  className="p-4 hover:bg-gray-50 transition-colors duration-150 ease-in-out cursor-pointer"
                  onClick={() => setEditingPlot(plot)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1 min-w-0">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-3 flex-shrink-0"></div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-medium text-green-600 hover:text-green-700">
                            {plot.plot_id}
                          </span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-sm text-gray-900 truncate">{plot.location}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
  {(Math.round(Number(plot.size) * 100) / 100).toFixed(2)} hectares
</div>
                      </div>
                    </div>
                    <div className="ml-2 flex-shrink-0">
                      <Edit className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        {/* Bottom spacer to ensure table is visible above navigation */}
        <div className="h-20"></div>
      </div>

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-around items-center h-12 border-t bg-white shadow-lg">
        <button
          onClick={onHomeClick}
          className="flex flex-col items-center justify-center w-1/3 hover:bg-gray-50 transition-colors py-2"
        >
          <Home size={20} className="text-gray-600" />
        </button>
        <button
          onClick={onProfileClick}
          className="flex flex-col items-center justify-center w-1/3 hover:bg-gray-50 transition-colors py-2"
        >
          <User size={20} className="text-gray-600" />
        </button>
        <button
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center w-1/3 hover:bg-gray-50 transition-colors py-2"
        >
          <Menu size={20} className="text-gray-600" />
        </button>
      </div>

      {/* Edit Plot Modal - COMPACT VERSION */}
      {editingPlot && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50 p-4">
          <div className="bg-white w-full max-w-sm mx-auto rounded-xl shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg mr-3">
                  <Edit className="w-4 h-4 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-800">Edit Plot</h3>
              </div>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Plot ID</label>
                <input
                  value={editingPlot.plot_id}
                  onChange={(e) => setEditingPlot({ ...editingPlot, plot_id: e.target.value })}
                  placeholder="Plot ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={editingPlot.description || ""}
                  onChange={(e) => setEditingPlot({ ...editingPlot, description: e.target.value })}
                  placeholder="Plot Description"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors h-16 resize-none text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <input
                  value={editingPlot.location}
                  onChange={(e) => setEditingPlot({ ...editingPlot, location: e.target.value })}
                  placeholder="Location"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Size (hectares)</label>
                <input
                  type="number"
                  value={editingPlot.size}
                  onChange={(e) => setEditingPlot({ ...editingPlot, size: e.target.value })}
                  placeholder="Size (hectares)"
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-sm"
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex flex-col space-y-2">
              <button
                onClick={handleUpdatePlot}
                className="w-full py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-medium transition-all duration-200 text-sm"
              >
                Save Changes
              </button>
              <div className="flex space-x-2">
                <button
                  onClick={handleDeletePlot}
                  className="flex-1 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-medium transition-all duration-200 text-sm"
                >
                  Delete
                </button>
                <button
                  onClick={() => setEditingPlot(null)}
                  className="flex-1 py-2 text-gray-500 hover:text-gray-700 font-medium transition-colors border border-gray-300 rounded-lg text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
