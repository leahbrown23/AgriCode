"use client"

import { ArrowLeft, Home, User, Menu } from "lucide-react"
import { useEffect, useState } from "react"
import api from "../api/api"
import LoadingSpinner from "./LoadingSpinner"

export default function CropSetupScreen({ onBackClick, onHomeClick, onProfileClick, onMenuClick }) {
  const [plotNumber, setPlotNumber] = useState("")
  const [cropType, setCropType] = useState("")
  const [cropVariety, setCropVariety] = useState("")
  const [user, setUser] = useState(null)
  const [successMessage, setSuccessMessage] = useState("")
  const [loading, setLoading] = useState(true)

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

  const handleAddCrop = async () => {
    if (!plotNumber || !cropType || !cropVariety) {
      alert("Please fill in all fields.")
      return
    }

    try {
      await api.post("/api/farm/crops/", {
        plot_number: plotNumber,
        crop_type: cropType,
        crop_variety: cropVariety,
      })

      setSuccessMessage("Crop added successfully!")
      setPlotNumber("")
      setCropType("")
      setCropVariety("")
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (err) {
      console.error(err)
      alert("Error adding crop: " + JSON.stringify(err.response?.data || err))
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="flex flex-col h-full pb-12">
      {/* Header */}
      <div className="p-4 bg-white flex items-center">
        <button onClick={onBackClick} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold flex-1 text-center">Crop Setup</h1>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-[#d1e6b2] p-6 space-y-4">
        {user && (
          <div className="text-sm text-right text-gray-700">
            Logged in as: <strong>{user.email}</strong>
          </div>
        )}

        {successMessage && (
          <div
            className="flex items-center bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative"
            role="alert"
          >
            <svg
              className="fill-current w-5 h-5 mr-2"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
            >
              <path d="M10 15a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0-10a1 1 0 00-1 1v4a1 1 0 002 0V6a1 1 0 00-1-1zm0-3a9 9 0 100 18 9 9 0 000-18z" />
            </svg>
            <span>{successMessage}</span>
          </div>
        )}

        <input
          type="text"
          placeholder="Plot Number"
          value={plotNumber}
          onChange={(e) => setPlotNumber(e.target.value)}
          className="w-full bg-white border border-gray-300 p-2 rounded"
        />
        <select
  value={cropType}
  onChange={(e) => setCropType(e.target.value)}
  className="w-full bg-white border border-gray-300 p-2 rounded"
>
  <option value="" disabled>Select Crop Type</option>
  <option value="Maize">Maize</option>
  <option value="Wheat">Wheat</option>
  <option value="Rice">Rice</option>
  <option value="Barley">Barley</option>
  <option value="Soybean">Soybean</option>
  <option value="Groundnut">Groundnut</option>
  <option value="Potato">Potato</option>
  <option value="Tomato">Tomato</option>
  <option value="Onion">Onion</option>
  <option value="Carrot">Carrot</option>
  <option value="Cabbage">Cabbage</option>
  <option value="Spinach">Spinach</option>
</select>

        <input
          type="text"
          placeholder="Crop Variety"
          value={cropVariety}
          onChange={(e) => setCropVariety(e.target.value)}
          className="w-full bg-white border border-gray-300 p-2 rounded"
        />
        <button
          onClick={handleAddCrop}
          className="bg-[#2a9d4a] hover:bg-[#238a3e] text-white w-full py-2 rounded mt-2"
        >
          Add Crop
        </button>
        <button
          onClick={onBackClick}
          className="text-sm text-gray-700 hover:underline"
        >
          Back to Farm Setup
        </button>
      </div>

      {/* Bottom Nav */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-around items-center h-12 border-t bg-white">
        <button onClick={onHomeClick} className="flex flex-col items-center justify-center w-1/3">
          <Home size={20} />
        </button>
        <button onClick={onProfileClick} className="flex flex-col items-center justify-center w-1/3">
          <User size={20} />
        </button>
        <button onClick={() => onMenuClick(prev => !prev)} className="flex flex-col items-center justify-center w-1/3">
          <Menu size={20} />
        </button>
      </div>
    </div>
  )
}
