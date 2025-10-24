"use client"

import { useState } from "react"
import {
  ArrowLeft,
  Home,
  Menu,
  User,
  AlertTriangle,
  Leaf,
  CheckCircle,
} from "lucide-react"
import LoadingSpinner from "./LoadingSpinner"

export default function RecommendationsScreen({
  onBackClick,
  setCurrentScreen,
  currentScreen,
}) {
  const [loading, setLoading] = useState(false)

  if (loading) return <LoadingSpinner />

  return (
    <div className="flex flex-col h-full pb-12">
      {/* Header */}
      <div className="p-4 bg-white flex items-center shadow">
        <button onClick={onBackClick} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold flex-1 text-center">
          Recommendations
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 bg-[#d1e6b2] space-y-6">
        {/* Important Section */}
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg shadow">
          <h2 className="flex items-center text-red-600 font-bold mb-2">
            <AlertTriangle className="h-5 w-5 mr-2" /> Important
          </h2>
          <p className="text-gray-600 text-sm">
            🔔 AI-powered urgent recommendations will appear here
          </p>
        </div>

        {/* Plot Recommendations */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-semibold text-green-700 mb-2 flex items-center">
            <Leaf className="h-5 w-5 mr-2 text-green-600" /> Per Plot / Crop
          </h2>
          <p className="text-gray-600 text-sm mb-2">
            📍 Recommendations grouped by plot/crop will be displayed here.
          </p>
          <div className="border rounded p-3 mb-2 bg-gray-50">
            <p className="text-gray-500 text-sm">Plot A – Maize (placeholder)</p>
            <p className="text-gray-400 text-xs">
              Example recommendations for this plot will appear here.
            </p>
          </div>
          <div className="border rounded p-3 bg-gray-50">
            <p className="text-gray-500 text-sm">Plot B – Tomato (placeholder)</p>
            <p className="text-gray-400 text-xs">
              Example recommendations for this plot will appear here.
            </p>
          </div>
        </div>

        {/* Farm-wide Recommendations */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-semibold text-green-700 mb-2">Farm-wide</h2>
          <p className="text-gray-600 text-sm">
            🌱 AI will generate recommendations that apply to the whole farm.
          </p>
        </div>

        {/* Completed Recommendations */}
        <div className="bg-gray-50 p-4 rounded-lg shadow">
          <h2 className="font-semibold text-gray-600 mb-2">Completed</h2>
          <p className="text-gray-500 text-sm">
            ✅ Completed recommendations will appear here after being ticked off.
          </p>
        </div>
      </div>

      {/* Bottom Navigation */}
      {["dashboard", "soilHealth", "insights", "recommendations", "userProfile"].includes(
        currentScreen
      ) && (
        <div className="absolute bottom-0 left-0 right-0 flex justify-around items-center h-12 border-t bg-white">
          <button
            onClick={() => setCurrentScreen("dashboard")}
            className="flex flex-col items-center justify-center w-1/3"
          >
            <Home size={20} />
          </button>
          <button
            onClick={() => setCurrentScreen("userProfile")}
            className="flex flex-col items-center justify-center w-1/3"
          >
            <User size={20} />
          </button>
          <button className="flex flex-col items-center justify-center w-1/3">
            <Menu size={20} />
          </button>
        </div>
      )}
    </div>
  )
}
