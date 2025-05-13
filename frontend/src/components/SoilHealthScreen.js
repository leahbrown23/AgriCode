"use client"
import { ArrowLeft } from "lucide-react"

export default function SoilHealthScreen({ onBackClick }) {
  return (
    <div className="flex flex-col h-full pb-12">
      <div className="p-4 bg-white flex items-center">
        <button onClick={onBackClick} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold flex-1 text-center">Soil Health</h1>
      </div>

      <div className="flex-1 p-4 space-y-4 bg-[#d1e6b2]">
        <button className="w-full bg-[#2a9d4a] hover:bg-[#238a3e] text-white py-2 rounded">Upload Sensor Data</button>

        <button className="w-full bg-[#2a9d4a] hover:bg-[#238a3e] text-white py-2 rounded">View Sensor Data</button>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="border rounded shadow p-2 bg-white">
            <h3 className="text-xs font-medium mb-1">Nutrient levels by crop</h3>
            <div className="bg-[#f9f3e3] rounded p-2 h-24 flex items-center justify-center">
              <div
                className="w-full h-16 bg-contain bg-no-repeat bg-center"
                style={{ backgroundImage: "url('/placeholder.png')" }}
              ></div>
            </div>
          </div>

          <div className="border rounded shadow p-2 bg-white">
            <h3 className="text-xs font-medium mb-1">Soil pH over time</h3>
            <div className="bg-[#f9f3e3] rounded p-2 h-24 flex items-center justify-center">
              <div
                className="w-full h-16 bg-contain bg-no-repeat bg-center"
                style={{ backgroundImage: "url('/placeholder.png')" }}
              ></div>
            </div>
          </div>

          <div className="border rounded shadow p-2 bg-white">
            <h3 className="text-xs font-medium mb-1">Average water metrics</h3>
            <div className="bg-[#f9f3e3] rounded p-2 h-24 flex items-center justify-center">
              <div
                className="w-full h-16 bg-contain bg-no-repeat bg-center"
                style={{ backgroundImage: "url('/placeholder.png')" }}
              ></div>
            </div>
          </div>

          <div className="border rounded shadow p-2 bg-white">
            <h3 className="text-xs font-medium mb-1">Soil trend for farm</h3>
            <div className="bg-[#f9f3e3] rounded p-2 h-24 flex items-center justify-center">
              <div
                className="w-full h-16 bg-contain bg-no-repeat bg-center"
                style={{ backgroundImage: "url('/placeholder.png')" }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
