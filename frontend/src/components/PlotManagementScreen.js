"use client"

import { ArrowLeft, Home, User, Menu } from "lucide-react"
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
    if (user) fetchUserPlots()
  }, [user])

  useEffect(() => {
  const term = searchTerm.toLowerCase()
  // Ensure userPlots is an array before filtering
  const plotsArray = Array.isArray(userPlots) ? userPlots : []
  setFilteredPlots(
    plotsArray.filter(
      (plot) =>
        plot.plot_id?.toLowerCase().includes(term) ||
        plot.location?.toLowerCase().includes(term) ||
        (plot.description && plot.description.toLowerCase().includes(term)),
    ),
  )
}, [searchTerm, userPlots])

  const fetchUserPlots = async () => {
  setTableLoading(true)
  try {
    const res = await api.get("/api/farm/plots/")
    // Handle different response formats and ensure it's always an array
    const plotsData = res.data?.results || res.data || []
    setUserPlots(Array.isArray(plotsData) ? plotsData : [])
  } catch (err) {
    console.error("Error fetching plots:", err)
    setUserPlots([]) // Set empty array on error
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
      await api.post("/api/farm/plots/", {
        plot_id: plotId,
        description: description,
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
      console.error(err)
      alert("Error adding plot: " + JSON.stringify(err.response?.data || err))
    }
  }

  const handleUpdatePlot = async () => {
    try {
      await api.put(`/api/farm/plots/${editingPlot.id}/`, {
        plot_id: editingPlot.plot_id,
        description: editingPlot.description,
        location: editingPlot.location,
        size: Number.parseFloat(editingPlot.size),
      })
      setSuccessMessage("Plot updated successfully!")
      setEditingPlot(null)
      fetchUserPlots()
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (err) {
      console.error(err)
      alert("Error updating plot: " + JSON.stringify(err.response?.data || err))
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
      alert("Error deleting plot: " + JSON.stringify(err.response?.data || err))
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="flex flex-col h-full pb-12">
      <div className="p-4 bg-white flex items-center">
        <button onClick={onBackClick} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold flex-1 text-center">Plot Management</h1>
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

        <input
          type="text"
          placeholder="Plot ID *"
          value={plotId}
          onChange={(e) => setPlotId(e.target.value)}
          className="w-full bg-white border p-2 rounded"
        />

        <input
          type="text"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full bg-white border p-2 rounded"
        />

        <input
          type="text"
          placeholder="Location *"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full bg-white border p-2 rounded"
        />

        <input
          type="number"
          placeholder="Size (hectares) *"
          value={size}
          onChange={(e) => setSize(e.target.value)}
          className="w-full bg-white border p-2 rounded"
          step="0.01"
          min="0"
        />

        <button onClick={handleAddPlot} className="bg-[#2a9d4a] text-white w-full py-2 rounded hover:bg-[#238a3e]">
          Add Plot
        </button>

        <input
          type="text"
          placeholder="Search plots..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full border p-2 rounded bg-white"
        />

        <div className="bg-white rounded shadow p-4">
          <h2 className="text-md font-semibold mb-4">Your Plots</h2>
          {tableLoading ? (
            <LoadingSpinner />
          ) : filteredPlots.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              {userPlots.length === 0 ? "No plots found. Add your first plot above!" : "No plots match your search."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-[#edf6e5] text-left text-[#293241]">
                    <th className="px-4 py-3">Plot ID</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Size (ha)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPlots.map((plot) => (
                    <tr key={plot.id} className="hover:bg-[#f0fdf4] transition-all">
                      <td
                        onClick={() => setEditingPlot(plot)}
                        className="px-4 py-2 text-[#2a9d4a] cursor-pointer hover:underline"
                      >
                        {plot.plot_id}
                      </td>
                      <td className="px-4 py-2">{plot.location}</td>
                      <td className="px-4 py-2">{plot.size}</td>
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

      {editingPlot && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50 px-4">
          <div className="bg-white w-full max-w-xs mx-auto p-5 rounded-xl shadow-xl overflow-y-auto max-h-[90vh] space-y-4">
            <h3 className="text-xl font-bold text-[#2a9d4a] text-center">Edit Plot</h3>

            <input
              value={editingPlot.plot_id}
              onChange={(e) => setEditingPlot({ ...editingPlot, plot_id: e.target.value })}
              placeholder="Plot ID"
              className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2a9d4a]"
            />

            <textarea
              value={editingPlot.description || ''}
              onChange={(e) => setEditingPlot({ ...editingPlot, description: e.target.value })}
              placeholder="Plot Description"
              className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2a9d4a] h-20 resize-none"
              style={{ appearance: "none", WebkitAppearance: "none", MozAppearance: "textfield" }}
            />

            <input
              value={editingPlot.location}
              onChange={(e) => setEditingPlot({ ...editingPlot, location: e.target.value })}
              placeholder="Location"
              className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2a9d4a]"
            />

            <input
              type="number"
              value={editingPlot.size}
              onChange={(e) => setEditingPlot({ ...editingPlot, size: e.target.value })}
              placeholder="Size (hectares)"
              step="0.01"
              min="0"
              className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2a9d4a]"
            />

            <div className="flex justify-between pt-2">
              <button
                onClick={handleUpdatePlot}
                className="bg-[#2a9d4a] text-white px-4 py-2 rounded-lg hover:bg-[#238a3e]"
              >
                Save
              </button>
              <button
                onClick={handleDeletePlot}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
              >
                Delete
              </button>
              <button onClick={() => setEditingPlot(null)} className="text-gray-500 hover:text-black underline">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}