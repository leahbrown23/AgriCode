"use client"

import { ArrowLeft } from "lucide-react"
import { useEffect, useState } from "react"
import api from "../api/api"
import LoadingSpinner from "./LoadingSpinner"

export default function CropSetupScreen({ onBackClick }) {
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
      <div className="p-4 bg-white flex items-center">
        <button onClick={onBackClick} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold flex-1 text-center">Crop Setup</h1>
      </div>
      <div className="flex flex-col h-full bg-[#d1e6b2] p-6">
        {user && (
          <div className="text-sm mb-4 text-right text-gray-700">
            Logged in as: <strong>{user.email}</strong>
          </div>
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
          <input
            type="text"
            placeholder="Plot Number"
            value={plotNumber}
            onChange={(e) => setPlotNumber(e.target.value)}
            className="w-full bg-white border border-gray-300 p-2 rounded"
          />
          <input
            type="text"
            placeholder="Crop Type"
            value={cropType}
            onChange={(e) => setCropType(e.target.value)}
            className="w-full bg-white border border-gray-300 p-2 rounded"
          />
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
      </div>
    </div>
  )
}
