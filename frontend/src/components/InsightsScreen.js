"use client"
import { ArrowLeft, Droplets, FlaskConical, Info, Leaf } from "lucide-react"

export default function InsightsScreen({ onBackClick }) {
  return (
    <div className="flex flex-col h-full pb-12">
      <div className="p-4 bg-white flex items-center">
        <button onClick={onBackClick} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold flex-1 text-center">Insights</h1>
      </div>

      <div className="flex-1 p-4">
        <div className="border rounded shadow mb-4 p-2">
          <div className="bg-[#f9f3e3] rounded p-2 h-24 flex items-center justify-center">
            <div
              className="w-full h-16 bg-contain bg-no-repeat bg-center"
              style={{ backgroundImage: "url('/placeholder.png')" }}
            ></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col items-center justify-center p-3 cursor-pointer hover:bg-gray-50 border rounded shadow">
            <Droplets className="h-10 w-10 text-[#2a9d4a] mb-2" />
            <span className="text-sm font-medium">Water</span>
          </div>

          <div className="flex flex-col items-center justify-center p-3 cursor-pointer hover:bg-gray-50 border rounded shadow">
            <Leaf className="h-10 w-10 text-[#2a9d4a] mb-2" />
            <span className="text-sm font-medium">Planting</span>
          </div>

          <div className="flex flex-col items-center justify-center p-3 cursor-pointer hover:bg-gray-50 border rounded shadow">
            <FlaskConical className="h-10 w-10 text-[#2a9d4a] mb-2" />
            <span className="text-sm font-medium">Fertilizer</span>
          </div>

          <div className="flex flex-col items-center justify-center p-3 cursor-pointer hover:bg-gray-50 border rounded shadow">
            <Info className="h-10 w-10 text-[#2a9d4a] mb-2" />
            <span className="text-sm font-medium">General</span>
          </div>
        </div>
      </div>
    </div>
  )
}
