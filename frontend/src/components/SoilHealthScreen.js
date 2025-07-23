"use client"

import { ArrowLeft, Home, Info, Menu, User } from "lucide-react"
import { useEffect, useState } from "react"
import api from "../api/api"
import LoadingSpinner from "./LoadingSpinner"

export default function SoilHealthScreen({
  onBackClick,
  onViewSensorClick,
  onUploadSensorClick,
  onHomeClick,
  onProfileClick,
  onMenuClick,
}) {
  const [user, setUser] = useState(null)
  const [soilData, setSoilData] = useState(null)
  const [plotOptions, setPlotOptions] = useState([])
  const [selectedPlot, setSelectedPlot] = useState("")

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/api/profile/")
        setUser(res.data)
      } catch (err) {
        console.error("Failed to load user profile:", err)
      }
    }
    fetchProfile()
  }, [])

  // Fetch user plots
  useEffect(() => {
    const fetchPlots = async () => {
      try {
        const res = await api.get("/api/farm/plots/")
        // Handle different response formats and ensure it's always an array
        const plotsData = res.data?.results || res.data || []
        const plotsArray = Array.isArray(plotsData) ? plotsData : []
        
        // Extract plot_id values for the dropdown
        const plotIds = plotsArray.map(plot => plot.plot_id)
        setPlotOptions(plotIds)
        setSelectedPlot(plotIds[0] || "")
      } catch (err) {
        console.error("Failed to fetch plots", err)
        // Set empty array if fetch fails
        setPlotOptions([])
        setSelectedPlot("")
      }
    }

    fetchPlots()
  }, [])

  // Fetch soil data for selected plot
  useEffect(() => {
    const fetchSoilData = async () => {
      if (!selectedPlot) return
      try {
        const res = await api.get(
          `/api/latest-reading/?plot_number=${selectedPlot}`
        )
        setSoilData(res.data)
      } catch (err) {
        console.error("Error fetching soil data", err)
        setSoilData(null)
      }
    }

    if (selectedPlot) {
      fetchSoilData()
    }
  }, [selectedPlot])

  const score = soilData ? calculateSoilScore(soilData) : 0

  function calculateSoilScore(data) {
    const { moisture_level, N, P, K } = data
    // Updated weights to include Potassium: moisture 25%, N 30%, P 25%, K 20%
    const score = moisture_level * 0.25 + N * 0.3 + P * 0.25 + (K || 0) * 0.2
    return Math.round(score)
  }

  return (
    <div className="flex flex-col h-full pb-12">
      {/* Top Header */}
      <div className="p-4 bg-white flex items-center">
        <button onClick={onBackClick} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold flex-1 text-center">Soil Health</h1>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto bg-[#d1e6b2] p-6 space-y-6">
        {/* Plot Filter */}
        <div className="bg-white p-3 rounded shadow">
          <label className="text-sm font-medium text-gray-700">Select Plot:</label>
          <select
            className="mt-1 w-full border border-gray-300 rounded p-2"
            value={selectedPlot}
            onChange={(e) => setSelectedPlot(e.target.value)}
            disabled={plotOptions.length === 0}
          >
            {plotOptions.length > 0 ? (
              plotOptions.map((plot) => (
                <option key={plot} value={plot}>
                  Plot {plot}
                </option>
              ))
            ) : (
              <option value="" disabled>
                No plots available
              </option>
            )}
          </select>
        </div>

        {soilData ? (
          <>
            {/* Date Updated */}
            <div className="text-sm text-right text-gray-600">
              Date last updated:{" "}
              <strong>{new Date(soilData.timestamp).toLocaleString()}</strong>
            </div>

            {/* Score Card */}
            <div className="bg-white rounded shadow p-4">
              <p className="text-center text-sm mb-1">
                SOIL SCORE <Info size={12} className="inline ml-1" />
              </p>
              <p className="text-center text-5xl font-bold text-green-700 mb-4">{score}</p>

              <div className="grid grid-cols-2 gap-y-2 text-center">
                <div>
                  <p className="text-sm">Moisture</p>
                  <p className="text-lg font-semibold">{soilData.moisture_level?.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm">Nitrogen</p>
                  <p className="text-lg font-semibold">{soilData.N?.toFixed(2)} ppm</p>
                </div>
                <div>
                  <p className="text-sm">Phosphorus</p>
                  <p className="text-lg font-semibold">{soilData.P?.toFixed(2)} ppm</p>
                </div>
                <div>
                  <p className="text-sm">Potassium</p>
                  <p className="text-lg font-semibold">{soilData.K?.toFixed(2)} ppm</p>
                </div>
              </div>
            </div>

            {/* Status Message */}
            <div className="bg-white p-4 rounded shadow text-center text-green-700 font-semibold">
              No urgent issues
            </div>

            {/* Recommendations */}
            <div className="bg-white p-4 rounded shadow">
              <h2 className="text-lg font-semibold mb-2">Recommendations</h2>
              <ul className="space-y-1 text-sm">
                <li className="flex items-start">
                  ✅ <span className="ml-2">Maintain current pH level</span>
                </li>
                <li className="flex items-start">
                  ✅ <span className="ml-2">Soil moisture is adequate, no irrigation needed</span>
                </li>
                <li className="flex items-start">
                  ✅ <span className="ml-2">Apply phosphorus fertilizer: 15 kg/ha</span>
                </li>
                <li className="flex items-start">
                  ✅ <span className="ml-2">Potassium levels are balanced</span>
                </li>
              </ul>
            </div>

            {/* Soil Trends */}
            <div className="bg-white p-4 rounded shadow">
              <h2 className="text-lg font-semibold mb-2">Soil Trends</h2>
              <div className="bg-[#f9f3e3] h-40 rounded flex items-center justify-center">
                <div className="text-gray-500 text-sm">Trend graph placeholder</div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Score Card - No Data */}
            <div className="bg-white rounded shadow p-4">
              <p className="text-center text-sm mb-1">
                SOIL SCORE <Info size={12} className="inline ml-1" />
              </p>
              <p className="text-center text-5xl font-bold text-gray-400 mb-4">--</p>

              <div className="grid grid-cols-2 gap-y-2 text-center">
                <div>
                  <p className="text-sm">Moisture</p>
                  <p className="text-lg font-semibold text-gray-400">No data</p>
                </div>
                <div>
                  <p className="text-sm">Nitrogen</p>
                  <p className="text-lg font-semibold text-gray-400">No data</p>
                </div>
                <div>
                  <p className="text-sm">Phosphorus</p>
                  <p className="text-lg font-semibold text-gray-400">No data</p>
                </div>
                <div>
                  <p className="text-sm">Potassium</p>
                  <p className="text-lg font-semibold text-gray-400">No data</p>
                </div>
              </div>
            </div>

            {/* Status Message - No Data */}
            <div className="bg-white p-4 rounded shadow text-center text-gray-500 font-semibold">
              No data available for analysis
            </div>

            {/* Recommendations - No Data */}
            <div className="bg-white p-4 rounded shadow">
              <h2 className="text-lg font-semibold mb-2">Recommendations</h2>
              <div className="text-center text-gray-500 py-4">
                No data available - please upload sensor data to get recommendations
              </div>
            </div>

            {/* Soil Trends - No Data */}
            <div className="bg-white p-4 rounded shadow">
              <h2 className="text-lg font-semibold mb-2">Soil Trends</h2>
              <div className="bg-[#f9f3e3] h-40 rounded flex items-center justify-center">
                <div className="text-gray-500 text-sm">No data available</div>
              </div>
            </div>
          </>
        )}

        {/* Bottom Buttons */}
        <div className="space-y-2">
          <button
            onClick={onViewSensorClick}
            className="bg-[#4b5563] hover:bg-[#374151] text-white w-full py-2 rounded"
          >
            View Sensor Data
          </button>
          <button
            onClick={onUploadSensorClick}
            className="bg-[#2a9d4a] hover:bg-[#238a3e] text-white w-full py-2 rounded"
          >
            Upload Sensor Data
          </button>
        </div>

        <div className="h-2" /> {/* Spacer to prevent content from touching nav */}
      </div>

      {/* Bottom Nav */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-around items-center h-12 border-t bg-white">
        <button onClick={onHomeClick} className="flex flex-col items-center justify-center w-1/3">
          <Home size={20} />
        </button>
        <button onClick={onProfileClick} className="flex flex-col items-center justify-center w-1/3">
          <User size={20} />
        </button>
        <button onClick={() => onMenuClick((prev) => !prev)} className="flex flex-col items-center justify-center w-1/3">
          <Menu size={20} />
        </button>
      </div>
    </div>
  )
}