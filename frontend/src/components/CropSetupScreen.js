"use client"

import { AlertTriangle, ArrowLeft, Edit, Home, MapPin, Menu, Plus, Search, Sprout, User } from "lucide-react"
import { useEffect, useState } from "react"
import api from "../api/api"
import LoadingSpinner from "./LoadingSpinner"

export default function CropSetupScreen({ onBackClick, onHomeClick, onProfileClick, onMenuClick }) {
  const [selectedPlotId, setSelectedPlotId] = useState("")
  const [cropType, setCropType] = useState("")
  const [soilType, setSoilType] = useState("")
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
  const [errorMessage, setErrorMessage] = useState("")
  const [showHarvestModal, setShowHarvestModal] = useState(false)
  const [harvestCrop, setHarvestCrop] = useState(null)
  const [yieldAmount, setYieldAmount] = useState("")
  const [comments, setComments] = useState("")
  const [harvestRecords, setHarvestRecords] = useState([])
  const [harvestLoading, setHarvestLoading] = useState(false)
  const [expectedEndDate, setExpectedEndDate] = useState("")
  const [pestMonth, setPestMonth] = useState("")
  const [fertMonth, setFertMonth] = useState("")

  const cropTypes = [
    "Maize",
    "Potato",
    "Rice",
    "Sugarcane",
    "Tomato",
    "Wheat",
  ]

  const soil_type = [
    "Clay",
    "Loamy",
    "Peaty",
    "Saline",
    "Sandy",
    "Silt",
  ]

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/api/profile/")
        setUser(res.data)
      } catch (err) {
        setErrorMessage("Failed to load profile: " + err.message)
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
      fetchHarvestRecords()
    }
  }, [user])

  useEffect(() => {
    const term = searchTerm.toLowerCase()
    setFilteredCrops(
      userCrops.filter(
        (crop) =>
          crop.plot_number?.toString().toLowerCase().includes(term) ||
          crop.crop_type?.toLowerCase().includes(term) ||
          crop.crop_variety?.toLowerCase().includes(term)
      )
    )
  }, [searchTerm, userCrops])

  const fetchUserCrops = async () => {
    setTableLoading(true)
    setErrorMessage("")
    try {
      const res = await api.get("/api/farm/crops/")
      const cropsData = res.data?.results || res.data || []
      setUserCrops(Array.isArray(cropsData) ? cropsData : [])
    } catch (err) {
      setErrorMessage(`API Error: ${err.response?.status || "Network"} - ${err.response?.data?.detail || err.message}`)
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
      setUserPlots([])
    }
  }

  const fetchHarvestRecords = async () => {
  setHarvestLoading(true);
  try {
    const res = await api.get("/api/farm/harvests/");  // <-- not /api/harvests/
    setHarvestRecords(res.data);
  } catch (err) {
    console.error("Failed to fetch harvest records:", err);
  } finally {
    setHarvestLoading(false);
  }
};


  

  const getRawPlotId = (uniqueKey) => {
    if (!uniqueKey || typeof uniqueKey !== "string") return ""
    return uniqueKey.split("U")[0]?.replace("P", "") || ""
  }

  const getAvailablePlots = () => {
    const occupiedPlotIds = userCrops
      .map((crop) => crop.plot_number?.toString())
      .filter(Boolean)
    return userPlots.filter((plot) => !occupiedPlotIds.includes(plot.plot_id?.toString()))
  }

  const isPlotOccupied = (plotId) => {
    const occupiedPlotIds = userCrops
      .map((crop) => crop.plot_number?.toString())
      .filter(Boolean)
    return occupiedPlotIds.includes(plotId?.toString())
  }

  const handleAddCrop = async () => {
    if (!selectedPlotId || !cropType || !cropVariety) {
      setErrorMessage("Please fill in all fields.")
      setTimeout(() => setErrorMessage(""), 3000)
      return
    }
    const plotId = getRawPlotId(selectedPlotId)
    if (isPlotOccupied(plotId)) {
      setErrorMessage(
        "A crop already belongs to this plot, please remove the crop linked to the plot before adding a new crop",
      )
      setTimeout(() => setErrorMessage(""), 5000)
      return
    }
    try {
      await api.post("/api/farm/crops/", {
  plot_number: plotId,
  plot: selectedPlotId,
  crop_type: cropType,
  crop_variety: cropVariety,
  soil_type: soilType, 
  expected_end_date: expectedEndDate,
  pest_month: pestMonth,
  fert_month: fertMonth,
})
      setSuccessMessage("Crop added successfully!")
      setSelectedPlotId("")
      setCropType("")
      setCropVariety("")
      setPestMonth("")
      setFertMonth("")
      fetchUserCrops()
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (err) {
      let errorMessage = "Error adding crop"
      if (err.response?.data) {
        if (typeof err.response.data === "string") {
          if (err.response.data.includes("IntegrityError") || err.response.data.includes("UNIQUE constraint")) {
            errorMessage =
              "A crop already belongs to this plot, please remove the crop linked to the plot before adding a new crop"
          } else if (err.response.data.includes("<!DOCTYPE html>")) {
            errorMessage = "Server returned HTML error page - check Django logs"
          } else {
            errorMessage = err.response.data
          }
        } else if (typeof err.response.data === "object") {
          errorMessage = JSON.stringify(err.response.data, null, 2)
        }
      } else {
        errorMessage = err.message || "Unknown error occurred"
      }
      setErrorMessage(errorMessage)
      setTimeout(() => setErrorMessage(""), 8000)
    }
  }

  const handleUpdateCrop = async () => {
    if (!editingCrop || !editingCrop.id) {
      setErrorMessage("Error: No crop selected for update")
      setTimeout(() => setErrorMessage(""), 3000)
      return
    }
    try {
      await api.put(`/api/farm/crops/${editingCrop.id}/`, {
        plot_number: editingCrop.plot_number,
        plot: editingCrop.plot,
        crop_type: editingCrop.crop_type,
        crop_variety: editingCrop.crop_variety,
        expected_end_date: editingCrop.expected_end_date,
      })
      setSuccessMessage("Crop updated successfully!")
      setEditingCrop(null)
      fetchUserCrops()
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (err) {
      let errorMessage = "Error updating crop"
      if (err.response?.data) {
        if (typeof err.response.data === "string" && err.response.data.includes("<!DOCTYPE html>")) {
          if (err.response.data.includes("IntegrityError") || err.response.data.includes("UNIQUE constraint")) {
            errorMessage = "This crop combination already exists for this plot."
          } else {
            errorMessage = "Server error occurred. Please try again."
          }
        } else {
          errorMessage = JSON.stringify(err.response.data)
        }
      }
      setErrorMessage(errorMessage)
      setTimeout(() => setErrorMessage(""), 5000)
      setEditingCrop(null)
    }
  }

  const handleDeleteCrop = async () => {
    if (!editingCrop || !editingCrop.id) {
      setErrorMessage("Error: No crop selected for deletion")
      setShowDeleteConfirm(false)
      setTimeout(() => setErrorMessage(""), 3000)
      return
    }
    try {
      await api.delete(`/api/farm/crops/${editingCrop.id}/`)
      setSuccessMessage("Crop deleted successfully!")
      setEditingCrop(null)
      setShowDeleteConfirm(false)
      fetchUserCrops()
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (err) {
      setErrorMessage(`Error deleting crop: ${err.response?.data?.detail || err.message}`)
      setTimeout(() => setErrorMessage(""), 5000)
      setShowDeleteConfirm(false)
    }
  }

 const handleHarvestDone = async () => {
  console.log("handleHarvestDone called", harvestCrop, yieldAmount, comments);

  if (!yieldAmount) {
    setErrorMessage("Please enter a yield amount");
    setTimeout(() => setErrorMessage(""), 3000);
    return;
  }

  try {
    if (!harvestCrop?.id) {
      setErrorMessage("Harvest record not found for this crop");
      setTimeout(() => setErrorMessage(""), 4000);
      return;
    }

    const harvestData = {
      end_date: new Date().toISOString(),
      yield_amount: Number(yieldAmount),
      comments,
    };

    // Axios PUT request to update harvest
    const response = await api.put(
      `/api/farm/harvests/${harvestCrop.id}/update/`,
      harvestData
    );

    console.log("Harvest updated:", response.data);

    // Remove crop locally; refresh history
    setUserCrops(prev => prev.filter(c => c.id !== harvestCrop.id));
    setShowHarvestModal(false);
    setHarvestCrop(null);
    setYieldAmount("");
    setComments("");
    fetchHarvestRecords();

    setSuccessMessage("Harvest recorded and crop removed!");
    setTimeout(() => setSuccessMessage(""), 3000);
  } catch (err) {
    setErrorMessage(
      "Failed to record harvest: " + (err.response?.data?.error || err.message)
    );
    setTimeout(() => setErrorMessage(""), 5000);
  }
};





  const handleStatusChange = async (cropId, status) => {
    try {
      await api.post(`/api/farm/crops/${cropId}/status/`, { status })
      setUserCrops(prevCrops =>
        prevCrops.map(crop =>
          crop.id === cropId ? { ...crop, status } : crop
        )
      )
    } catch (err) {
      setErrorMessage("Failed to update status")
      setTimeout(() => setErrorMessage(""), 3000)
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
        <h1 className="text-lg font-semibold flex-1 text-center">Crop Setup</h1>
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

        {/* Error Message */}
        {errorMessage && (
          <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl shadow-lg p-4">
            <div className="flex items-center text-white">
              <div className="w-5 h-5 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-3">
                <span className="text-red-600 text-xs font-bold">!</span>
              </div>
              <span className="font-medium">{errorMessage}</span>
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

        {/* Add Crop Form */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center mb-6">
            <div className="p-2 bg-green-100 rounded-lg mr-3">
              <Plus className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">Add New Crop</h2>
          </div>
          
          {userPlots.length === 0 ? (
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">No plots available</p>
                  <p className="text-xs text-yellow-600">Please create a plot first in Plot Management.</p>
                </div>
              </div>
            </div>
          ) : getAvailablePlots().length === 0 ? (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-blue-800">All plots have crops assigned</p>
                  <p className="text-xs text-blue-600">
                    Remove existing crops to assign new ones, or create more plots.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Plot *</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={selectedPlotId}
                  onChange={(e) => setSelectedPlotId(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors appearance-none"
                >
                  <option value="" disabled>
                    Select Plot
                  </option>
                  {getAvailablePlots().map((plot) => (
                    <option key={plot.id} value={plot.unique_plot_key}>
                      {plot.plot_id} - {plot.location} ({Number.parseFloat(plot.size).toFixed(2)} ha)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Crop Type *</label>
              <div className="relative">
                <Sprout className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={cropType}
                  onChange={(e) => setCropType(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors appearance-none"
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
              </div>
            </div>

            <div>
  <label className="block text-sm font-medium text-gray-700 mb-2">Soil Type *</label>
  <div className="relative">
    <Sprout className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
    <select
      value={soilType}
      onChange={(e) => setSoilType(e.target.value)}
      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors appearance-none"
    >
      <option value="" disabled>Select Soil Type</option>
      {soil_type.map((type) => (
        <option key={type} value={type}>
          {type}
        </option>
      ))}
    </select>
  </div>
</div>


            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Crop Variety *</label>
              <div className="relative">
                <Sprout className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Enter crop variety"
                  value={cropVariety}
                  onChange={(e) => setCropVariety(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                />
              </div>
            </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Expected Harvest End Date *
          </label>
          <div className="relative">
            <Sprout className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="datetime-local"
              name="expected_end_date"
              value={expectedEndDate}
              onChange={(e) => setExpectedEndDate(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm 
                        focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
              required
            />
          </div>
        </div>

        <div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Pesticide Usage per Month (kg)
  </label>
  <div className="relative">
    <Sprout className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
    <input
      type="number"
      step="any"
      placeholder="Enter pesticide amount per month"
      value={pestMonth}
      onChange={(e) => setPestMonth(e.target.value)}
      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm
                focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
    />
  </div>
</div>

  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      Fertiliser Usage per Month (kg)
    </label>
    <div className="relative">
      <Sprout className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="number"
        step="any"
        placeholder="Enter fertiliser amount per month"
        value={fertMonth}
        onChange={(e) => setFertMonth(e.target.value)}
        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm
                  focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
      />
    </div>
  </div>



            <button
              onClick={handleAddCrop}
              disabled={userPlots.length === 0 || getAvailablePlots().length === 0}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 rounded-xl font-medium shadow-lg transition-all duration-200 transform hover:scale-[1.02] disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed disabled:transform-none"
            >
              Add Crop
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search crops..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
            />
          </div>
        </div>

      {/* CROPS TABLE */}
<div className="bg-white rounded-xl shadow-lg overflow-hidden">
  <div className="p-4 border-b border-gray-100">
    <div className="flex items-center">
      <div className="p-2 bg-green-100 rounded-lg mr-3">
        <Sprout className="w-5 h-5 text-green-600" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-gray-800">My Crops</h2>
        <p className="text-sm text-gray-500">Click on any row to edit</p>
      </div>
    </div>
  </div>

  <div className="divide-y divide-gray-100">
    {tableLoading ? (
      <div className="px-4 py-8 text-center">
        <LoadingSpinner />
      </div>
    ) : errorMessage && userCrops.length === 0 ? (
      <div className="px-4 py-12 text-center">
        <div className="p-4 bg-red-50 rounded-lg inline-block mb-4">
          <Sprout className="w-8 h-8 text-red-400 mx-auto" />
        </div>
        <p className="text-red-500 font-medium">API Connection Error</p>
        <button
          onClick={fetchUserCrops}
          className="mt-2 px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
        >
          Retry
        </button>
      </div>
    ) : filteredCrops.length === 0 ? (
      <div className="px-4 py-12 text-center">
        <div className="p-4 bg-gray-50 rounded-lg inline-block mb-4">
          <Sprout className="w-8 h-8 text-gray-400 mx-auto" />
        </div>
        <p className="text-gray-500 font-medium">
          {userCrops.length === 0 ? "No crops found" : "No crops match your search"}
        </p>
      </div>
    ) : (
      filteredCrops.map((crop) => (
        <div
          key={crop.id}
          className="p-4 bg-white hover:bg-gray-50 shadow-sm hover:shadow-md rounded-xl transition-all duration-200 ease-in-out cursor-pointer flex justify-between items-start space-x-4"
          onClick={(e) => {
            if (
              !e.target.closest(".status-control") &&
              !e.target.closest(".harvest-btn") &&
              !e.target.closest(".edit-btn")
            ) {
              setEditingCrop(crop)
            }
          }}
        >
        <div className="flex flex-col flex-1 min-w-0">
  <div className="flex items-center mb-1">
    <div className="w-2 h-2 bg-green-400 rounded-full mr-2" />
    <span className="text-sm font-semibold text-green-600">
      Plot {crop.plot_number}
    </span>
  </div>
  <span className="text-sm text-gray-800 truncate">{crop.crop_type}</span>
  <span className="text-xs text-gray-500 truncate">{crop.crop_variety}</span>
</div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="status-control" onClick={(e) => e.stopPropagation()}>
              <select
  value={crop.status}
  onChange={(e) => handleStatusChange(crop.id, e.target.value)}
  className="rounded-xl border border-green-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-500 shadow-sm transition-all"
>
  <option value="planting">Planting</option>
  <option value="growing">Growing</option>
  <option value="harvesting">Harvesting</option>
</select>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setHarvestCrop(crop)
                setShowHarvestModal(true)
              }}
              className="harvest-btn bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-xs font-medium transition-all"
            >
              Harvest
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setEditingCrop(crop)
              }}
              className="edit-btn p-1 rounded-full hover:bg-gray-100 transition-all"
            >
              <Edit className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
      ))
    )}
  </div>
</div>


        {/* Harvest Modal */}
{showHarvestModal && harvestCrop && (
  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50 p-4">
    <div className="bg-white w-full max-w-sm mx-auto rounded-xl shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center">
          <div className="p-2 bg-green-100 rounded-lg mr-3">
            <Sprout className="w-5 h-5 text-green-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-800">Harvest Crop</h3>
        </div>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <strong>Crop:</strong> {harvestCrop.crop_type}<br />
          <strong>Plot:</strong> {harvestCrop.plot_number}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Yield Amount</label>
          <input
            type="number"
            value={yieldAmount}
            onChange={e => setYieldAmount(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Comments</label>
          <textarea
            value={comments}
            onChange={e => setComments(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-sm"
          />
        </div>
      </div>
      <div className="p-4 border-t border-gray-100 flex flex-col space-y-2">
       <button
  onClick={handleHarvestDone}
  className="w-full py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-medium transition-all duration-200 text-sm"
>
  Done
</button>
        <button
          onClick={() => setShowHarvestModal(false)}
          className="w-full py-2 text-gray-500 hover:text-gray-700 font-medium transition-colors border border-gray-300 rounded-lg text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}
       {/* Historical Harvest Record Table */}
<div className="bg-white rounded-xl shadow-lg overflow-hidden mt-8">
  <div className="p-6 border-b border-gray-100">
    <div className="flex items-center">
      <div className="p-2 bg-green-100 rounded-lg mr-3">
        <Sprout className="w-5 h-5 text-green-600" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Historical Harvest Record</h2>
        <p className="text-sm text-gray-500">All completed harvests</p>
      </div>
    </div>
  </div>

  <div className="overflow-x-auto">
    {harvestLoading ? (
      <div className="text-center py-12">
        <LoadingSpinner />
      </div>
    ) : harvestRecords.length === 0 ? (
      <div className="text-center py-12">
        <div className="p-4 bg-gray-50 rounded-lg inline-block mb-4">
          <Sprout className="w-8 h-8 text-gray-400 mx-auto" />
        </div>
        <p className="text-gray-500 font-medium">No harvest records found</p>
        <p className="text-sm text-gray-400">Check back after completing harvests</p>
      </div>
    ) : (
      <table className="w-full">
        <thead>
          <tr className="bg-gradient-to-r from-green-50 to-green-100">
            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-green-200">
              Plot
            </th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-green-200">
              Crop
            </th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-green-200">
              Start Date
            </th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-green-200">
              End Date
            </th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-green-200">
              Yield
            </th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-green-200">
              Comments
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {harvestRecords.map((hr) => (
            <tr key={hr.id} className="hover:bg-gray-50 transition-colors duration-150 ease-in-out">
              <td className="px-3 py-3 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                  <span className="text-sm font-medium text-gray-900">{hr.plot_number}</span>
                </div>
              </td>
              <td className="px-3 py-3 whitespace-nowrap">
                <span className="text-sm text-gray-900">{hr.crop_type}</span>
              </td>
              <td className="px-3 py-3 whitespace-nowrap">
                <div className="text-sm text-gray-900">{new Date(hr.start_date).toLocaleDateString()}</div>
                <div className="text-xs text-gray-500">{new Date(hr.start_date).toLocaleTimeString()}</div>
              </td>
              <td className="px-3 py-3 whitespace-nowrap">
                <div className="text-sm text-gray-900">{new Date(hr.end_date).toLocaleDateString()}</div>
                <div className="text-xs text-gray-500">{new Date(hr.end_date).toLocaleTimeString()}</div>
              </td>
              <td className="px-3 py-3 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{hr.yield_amount}</div>
                <div className="text-xs text-gray-500">kg/ha</div>
              </td>
              <td className="px-3 py-3">
                <div className="text-sm text-gray-900 max-w-xs truncate">{hr.comments || 'None'}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
</div>

        {/* Bottom spacer */}
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

      {/* Edit Crop Modal */}
      {editingCrop && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50 p-4">
          <div className="bg-white w-full max-w-sm mx-auto rounded-xl shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg mr-3">
                  <Edit className="w-4 h-4 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-800">Edit Crop</h3>
              </div>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Plot</label>
                <select
                  value={editingCrop.plot_number}
                  onChange={(e) => setEditingCrop({ ...editingCrop, plot_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors appearance-none text-sm"
                >
                  <option value="" disabled>
                    Select Plot
                  </option>
                  {userPlots.map((plot) => (
                    <option key={plot.id} value={plot.plot_id}>
                      {plot.plot_id} - {plot.location} ({Number.parseFloat(plot.size).toFixed(2)} ha)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Crop Type</label>
                <select
                  value={editingCrop.crop_type}
                  onChange={(e) => setEditingCrop({ ...editingCrop, crop_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors appearance-none text-sm"
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Crop Variety</label>
                <input
                  value={editingCrop.crop_variety}
                  onChange={(e) => setEditingCrop({ ...editingCrop, crop_variety: e.target.value })}
                  placeholder="Crop Variety"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-sm"
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex flex-col space-y-2">
              <button
                onClick={handleUpdateCrop}
                className="w-full py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-medium transition-all duration-200 text-sm"
              >
                Save Changes
              </button>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex-1 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-medium transition-all duration-200 text-sm"
                >
                  Delete
                </button>
                <button
                  onClick={() => setEditingCrop(null)}
                  className="flex-1 py-2 text-gray-500 hover:text-gray-700 font-medium transition-colors border border-gray-300 rounded-lg text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-[70] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-xs w-full overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg mr-3">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-800">Confirm Delete</h3>
              </div>
            </div>

            <div className="p-4">
              <p className="text-gray-600 text-sm">
                Are you sure you want to delete this crop? This action cannot be undone.
              </p>
            </div>

            <div className="p-4 border-t border-gray-100 flex flex-col space-y-2">
              <button
                onClick={handleDeleteCrop}
                className="w-full py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-medium transition-all duration-200 text-sm"
              >
                Delete Crop
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="w-full py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors border border-gray-300 rounded-lg text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}