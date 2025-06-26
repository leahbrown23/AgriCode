"use client"

import { useEffect, useState } from "react"
import { ArrowLeft } from "lucide-react"
import LoadingSpinner from "./LoadingSpinner"

export default function SoilHealthScreen({ onBackClick, onViewSensorClick, onUploadSensorClick }) {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  if (loading) return <LoadingSpinner />

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-20">
      <div className="p-4 bg-white flex items-center">
        <button onClick={onBackClick} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold flex-1 text-center">Soil Health</h1>
      </div>

      <div className="flex-1 p-4 space-y-6 bg-[#d1e6b2]">

        {/* TOP METRICS SECTION */}
        <div className="bg-white rounded shadow p-4">
          <p className="text-center text-sm mb-1">SOIL SCORE (i)</p>
          <p className="text-center text-5xl font-bold text-green-700 mb-4">87</p>

          <div className="grid grid-cols-2 gap-y-2 text-center">
            <div>
              <p className="text-sm">Moisture</p>
              <p className="text-lg font-semibold">6.7</p>
            </div>
            <div>
              <p className="text-sm">Nitrogen</p>
              <p className="text-lg font-semibold">35 ppm</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm">Phosphorus</p>
              <p className="text-lg font-semibold">20 ppm</p>
            </div>
          </div>
        </div>

        {/* STATUS MESAGE */}
        <div className="bg-white p-4 rounded shadow text-center text-green-700 font-semibold">
          No urgent issues
        </div>

        {/* REC SECTION */}
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
          </ul>
        </div>

        {/* SOIL TRENDS SECTION */}
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold mb-2">Soil Trends</h2>
          <div className="bg-[#f9f3e3] h-40 rounded flex items-center justify-center">
            <div className="text-gray-500 text-sm">Trend graph placeholder</div>
          </div>
        </div>

        {/* BOTTOM BUTTONS */}
        <div className="space-y-2 pt-2">
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

      </div>
    </div>
  )
}
