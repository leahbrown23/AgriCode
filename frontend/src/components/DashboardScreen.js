"use client"
import { BarChart3, Leaf, ListChecks, MessageSquare } from "lucide-react"

export default function DashboardScreen({
  onSoilHealthClick,
  onInsightsClick,
  onRecommendationsClick,
  onDiscussionForumClick,
}) {
  return (
    <div className="flex flex-col h-full pb-12 bg-[#d1e6b2]">
      <div className="p-4 bg-white">
        <h1 className="text-lg font-semibold text-center">Smart Harvest Africa</h1>
      </div>

      <div className="flex-1 p-4 grid grid-cols-2 gap-4">
        <div
          className="flex flex-col items-center justify-center p-2 cursor-pointer hover:bg-gray-50 border rounded shadow
          bg-white"
          onClick={onSoilHealthClick}
        >
          <BarChart3 className="h-10 w-10 text-[#2a9d4a] mb-2" />
          <span className="text-sm font-medium">Soil Health</span>
        </div>

        <div
          className="flex flex-col items-center justify-center p-2 cursor-pointer hover:bg-gray-50 border rounded shadow
          bg-white"
          onClick={onInsightsClick}
        >
          <Leaf className="h-10 w-10 text-[#2a9d4a] mb-2" />
          <span className="text-sm font-medium">Insights</span>
        </div>

        <div className="flex flex-col items-center justify-center p-2 cursor-pointer hover:bg-gray-50 border rounded shadow
        bg-white"
        onClick={onRecommendationsClick}>
          <ListChecks className="h-10 w-10 text-[#2a9d4a] mb-2" />
          <span className="text-sm font-medium">Recommendations</span>
        </div>

        <div className="flex flex-col items-center justify-center p-2 cursor-pointer hover:bg-gray-50 border rounded shadow
        bg-white"
        onClick={onDiscussionForumClick}>
          <MessageSquare className="h-10 w-10 text-[#2a9d4a] mb-2" />
          <span className="text-sm font-medium">Discussion Forum</span>
        </div>
      </div>
    </div>
  )
}
