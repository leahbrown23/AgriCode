"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, Check, Home, Menu, User } from "lucide-react"
import LoadingSpinner from "./LoadingSpinner"

export default function RecommendationsScreen({ onBackClick, setCurrentScreen, currentScreen }) {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  if (loading) return <LoadingSpinner />

  return (
    <div className="flex flex-col h-full pb-12 relative">
      <div className="p-4 bg-white flex items-center">
        <button onClick={onBackClick} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold flex-1 text-center">Recommendations</h1>
      </div>

      <div className="flex-1 p-4 bg-[#d1e6b2]">
        {/* Alerts speech bubble */}
        <div className="flex justify-center mb-4">
          <div className="bg-white rounded-full py-3 px-10 relative">
            <span className="text-lg font-medium">Alerts</span>
            <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[16px] border-t-white"></div>
          </div>
        </div>

        {/* Recommendations list */}
        <div className="bg-transparent space-y-3 mt-6">
          <div className="flex items-start">
            <div className="w-6 h-6 rounded border border-gray-400 bg-white flex items-center justify-center mr-3">
              <Check className="h-4 w-4 text-[#2a9d4a]" />
            </div>
            <span className="text-black">Water Plants before 3pm</span>
          </div>
          <div className="flex items-start">
            <div className="w-6 h-6 rounded border border-gray-400 bg-white mr-3"></div>
            <span className="text-black">Apply lime to raise soil pH to an optimal 6.0-6.8 for maize</span>
          </div>
          <div className="flex items-start">
            <div className="w-6 h-6 rounded border border-gray-400 bg-white mr-3"></div>
            <span className="text-black">Apply nitrogen-rich fertilizers</span>
          </div>
          <div className="flex items-start">
            <div className="w-6 h-6 rounded border border-gray-400 bg-white mr-3"></div>
            <span className="text-black">Apply gypsum or calcium nitrate to improve calcium availability</span>
          </div>
        </div>

        {/* View Previous button */}
        <div className="mt-8">
          <button className="w-full bg-[#2a9d4a] hover:bg-[#238a3e] text-white py-2 rounded">
            View Previous
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      {["dashboard", "soilHealth", "insights", "recommendations", "userProfile"].includes(currentScreen) && (
        <div className="absolute bottom-0 left-0 right-0 flex justify-around items-center h-12 border-t bg-white">
          <button onClick={() => setCurrentScreen("dashboard")} className="flex flex-col items-center justify-center w-1/3">
            <Home size={20} />
          </button>
          <button onClick={() => setCurrentScreen("userProfile")} className="flex flex-col items-center justify-center w-1/3">
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
