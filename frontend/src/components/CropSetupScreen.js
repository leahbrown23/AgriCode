"use client"

import { ArrowLeft, Home, User, Menu } from "lucide-react"
import { useEffect, useState } from "react"
import api from "../api/api"
import LoadingSpinner from "./LoadingSpinner"

export default function CropSetupScreen({ onBackClick, onHomeClick, onProfileClick, onMenuClick }) {
  const [selectedPlotId, setSelectedPlotId] = useState("")
  const [cropType, setCropType] = useState("")
  const [cropVariety, setCropVariety] = useState("")
  const [user, setUser] = useState(null)
  const [userCrops, setUserCrops] = useState([])
  const [userPlots, setUserPlots] = useState([])
  const [filteredCrops, setFilteredCrops] = useState([])
  const [editingCrop, setEditingCrop] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [tableLoading, setTableLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const cropTypes = [
    "Maize",
    "Wheat",
    "Rice",
    "Barley",
    "Soybean",
    "Groundnut",
    "Potato",
    "Tomato",
    "Onion",
    "Carrot",
    "Cabbage",
    "Spinach",
    "Other",
  ]

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/api/profile/")
        setUser(res.data)
      } catch (err) {
        console.error("Failed to load user profile:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [])

  useEffect(() => {
    if (user) {
      fetchUserCrops()
      fetchUserPlots()
    }
  }, [user])

  useEffect(() => {
    const term = searchTerm.toLowerCase()
    setFilteredCrops(
      userCrops.filter(
        (crop) =>
          crop.plot_number?.toLowerCase().includes(term) ||
          crop.crop_type?.toLowerCase().includes(term) ||
          crop.crop_variety?.toLowerCase().includes(term),
      ),
    )
  }, [searchTerm, userCrops])

  const fetchUserCrops = async () => {
    setTableLoading(true)
    try {
      const res = await api.get("/api/farm/crops/")
      const cropsData = res.data?.results || res.data || []
      setUserCrops(Array.isArray(cropsData) ? cropsData : [])
      console.log("Fetched crops:", cropsData)
    } catch (err) {
      console.error("Error fetching crops:", err)
      setUserCrops([])
    } finally {
      setTableLoading(false)
    }
  }

  const fetchUserPlots = async () => {
    try {
      const res = await api.get("/api/farm/plots/")
      const plotsData = res.data?.results || res.data || []
      setUserPlots(Array.isArray(plotsData) ? plotsData : [])
    } catch (err) {
      console.error("Error fetching plots:", err)
      setUserPlots([])
    }
  }

  const getPlotDisplayName = (plotId) => {
    const plot = userPlots.find((p) => p.plot_id === plotId)
    return plot ? `${plot.plot_id} - ${plot.location}` : plotId
  }

  const handleAddCrop = async () => {
    if (!selectedPlotId || !cropType || !cropVariety) {
      alert("Please fill in all fields.")
      return
    }

    try {
      await api.post("/api/farm/crops/", {
        plot_number: selectedPlotId,
        crop_type: cropType,
        crop_variety: cropVariety,
      })
      setSuccessMessage("Crop added successfully!")
      setSelectedPlotId("")
      setCropType("")
      setCropVariety("")
      fetchUserCrops()
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (err) {
      console.error(err)
      alert("Error adding crop: " + JSON.stringify(err.response?.data || err))
    }
  }

  const handleUpdateCrop = async () => {
    if (!editingCrop || !editingCrop.id) {
      alert("Error: No crop selected for update")
      return
    }

    try {
      // Using the correct endpoint based on your Django setup
      await api.put(`/api/farm/crops/${editingCrop.id}/`, {
        plot_number: editingCrop.plot_number,
        crop_type: editingCrop.crop_type,
        crop_variety: editingCrop.crop_variety,
      })

      setSuccessMessage("Crop updated successfully!")
      setEditingCrop(null)
      fetchUserCrops()
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (err) {
      console.error("Update error:", err)
      alert(`Error updating crop: ${err.response?.data || err.message}`)
    }
  }

  const handleDeleteCrop = async () => {
    if (!editingCrop || !editingCrop.id) {
      alert("Error: No crop selected for deletion")
      setShowDeleteConfirm(false)
      return
    }

    try {
      // Using the correct endpoint based on your Django setup
      await api.delete(`/api/farm/crops/${editingCrop.id}/`)

      setSuccessMessage("Crop deleted successfully!")
      setEditingCrop(null)
      setShowDeleteConfirm(false)
      fetchUserCrops()
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (err) {
      console.error("Delete error:", err)
      alert(`Error deleting crop: ${err.response?.data || err.message}`)
      setShowDeleteConfirm(false)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="flex flex-col h-full pb-12">
      <div className="p-4 bg-white flex items-center">
        <button onClick={onBackClick} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold flex-1 text-center">Crop Setup</h1>
      </div>

      <div className="flex-1 flex flex-col bg-[#d1e6b2] p-6 space-y-4 overflow-y-auto">
        {user && (
          <div className="text-sm text-right text-gray-700">
            Logged in as: <strong>{user.email}</strong>
          </div>
        )}

        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded">{successMessage}</div>
        )}

        {/* Plot Selection Dropdown */}
        <select
          value={selectedPlotId}
          onChange={(e) => setSelectedPlotId(e.target.value)}
          className="w-full bg-white border p-2 rounded"
        >
          <option value="" disabled>
            Select Plot
          </option>
          {userPlots.map((plot) => (
            <option key={plot.id} value={plot.plot_id}>
              {plot.plot_id} - {plot.location} ({plot.size} ha)
            </option>
          ))}
        </select>

        {userPlots.length === 0 && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-2 rounded text-sm">
            No plots available. Please create a plot first in Plot Management.
          </div>
        )}

        <select
          value={cropType}
          onChange={(e) => setCropType(e.target.value)}
          className="w-full bg-white border p-2 rounded"
        >
          <option value="" disabled>
            Select Crop Type
          </option>
          {cropTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Crop Variety"
          value={cropVariety}
          onChange={(e) => setCropVariety(e.target.value)}
          className="w-full bg-white border p-2 rounded"
        />

        <button
          onClick={handleAddCrop}
          disabled={userPlots.length === 0}
          className="bg-[#2a9d4a] text-white w-full py-2 rounded hover:bg-[#238a3e] disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Add Crop
        </button>

        <input
          type="text"
          placeholder="Search crops..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full border p-2 rounded bg-white"
        />

        <div className="bg-white rounded shadow p-4">
          <h2 className="text-md font-semibold mb-4">Your Crops</h2>
          {tableLoading ? (
            <LoadingSpinner />
          ) : filteredCrops.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              {userCrops.length === 0 ? "No crops found. Add your first crop above!" : "No crops match your search."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-[#edf6e5] text-left text-[#293241]">
                    <th className="px-4 py-3">Plot</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Variety</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCrops.map((crop) => (
                    <tr key={crop.id} className="hover:bg-[#f0fdf4] transition-all">
                      <td
                        onClick={() => setEditingCrop(crop)}
                        className="px-4 py-2 text-[#2a9d4a] cursor-pointer hover:underline"
                      >
                        {getPlotDisplayName(crop.plot_number)}
                      </td>
                      <td
                        onClick={() => setEditingCrop(crop)}
                        className="px-4 py-2 text-[#2a9d4a] cursor-pointer hover:underline"
                      >
                        {crop.crop_type}
                      </td>
                      <td className="px-4 py-2">{crop.crop_variety}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 flex justify-around items-center h-12 border-t bg-white">
        <button onClick={onHomeClick} className="w-1/3 flex justify-center">
          <Home size={20} />
        </button>
        <button onClick={onProfileClick} className="w-1/3 flex justify-center">
          <User size={20} />
        </button>
        <button onClick={onMenuClick} className="w-1/3 flex justify-center">
          <Menu size={20} />
        </button>
      </div>

      {editingCrop && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50 px-4">
          <div className="bg-white w-full max-w-xs mx-auto p-5 rounded-xl shadow-xl overflow-y-auto max-h-[90vh] space-y-4">
            <h3 className="text-xl font-bold text-[#2a9d4a] text-center">Edit Crop</h3>

            <select
              value={editingCrop.plot_number}
              onChange={(e) => setEditingCrop({ ...editingCrop, plot_number: e.target.value })}
              className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2a9d4a]"
            >
              <option value="" disabled>
                Select Plot
              </option>
              {userPlots.map((plot) => (
                <option key={plot.id} value={plot.plot_id}>
                  {plot.plot_id} - {plot.location} ({plot.size} ha)
                </option>
              ))}
            </select>

            <select
              value={editingCrop.crop_type}
              onChange={(e) => setEditingCrop({ ...editingCrop, crop_type: e.target.value })}
              className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2a9d4a]"
            >
              <option value="" disabled>
                Select Crop Type
              </option>
              {cropTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <input
              value={editingCrop.crop_variety}
              onChange={(e) => setEditingCrop({ ...editingCrop, crop_variety: e.target.value })}
              placeholder="Crop Variety"
              className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2a9d4a]"
            />

            <div className="flex justify-between pt-2">
              <button
                onClick={handleUpdateCrop}
                className="bg-[#2a9d4a] text-white px-4 py-2 rounded-lg hover:bg-[#238a3e]"
              >
                Save
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
              >
                Delete
              </button>
              <button onClick={() => setEditingCrop(null)} className="text-gray-500 hover:text-black underline">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-[70] px-4">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this crop? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button onClick={handleDeleteCrop} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
