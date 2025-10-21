"use client"

import { useEffect, useState } from "react"
import { BarChart3, Leaf, ListChecks, MessageSquare } from "lucide-react"
import LoadingSpinner from "./LoadingSpinner"

export default function DashboardScreen({
  onSoilHealthClick,
  onInsightsClick,
  onRecommendationsClick,
  onDiscussionForumClick,
}) {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="flex flex-col h-full pb-16 bg-[#d1e6b2]">
      <div className="p-5 bg-white rounded-t-none shadow">
        <h1 className="text-xl font-bold text-center text-gray-800">SmartHarvest Africa</h1>
      </div>

      <div className="flex-1 p-5 grid grid-cols-2 gap-4">
        {/* Card Component */}
        {[
          {
            label: "Soil Health",
            icon: BarChart3,
            onClick: onSoilHealthClick,
          },
          {
            label: "Insights",
            icon: Leaf,
            onClick: onInsightsClick,
          },
          {
            label: "Recommendations",
            icon: ListChecks,
            onClick: onRecommendationsClick,
          },
          {
            label: "Discussion Forum",
            icon: MessageSquare,
            onClick: onDiscussionForumClick,
          },
        ].map(({ label, icon: Icon, onClick }) => (
          <div
            key={label}
            onClick={onClick}
            className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer"
          >
            <Icon className="h-9 w-9 text-green-600 mb-2" />
            <span className="text-sm font-semibold text-gray-800">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
