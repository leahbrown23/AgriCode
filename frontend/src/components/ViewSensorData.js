"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, FileText, Home, User, Menu } from "lucide-react"
import LoadingSpinner from "./LoadingSpinner"

export default function ViewSensorData({ onBackClick, onHomeClick, onProfileClick, onMenuClick }) {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  if (loading) return <LoadingSpinner />

  return (
    <div className="flex flex-col h-full pb-12">
      {/* Top Header */}
      <div className="p-4 bg-white flex items-center">
        <button onClick={onBackClick} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold flex-1 text-center">View Sensor Data</h1>
      </div>

      {/* Main content */}
      <div className="flex-1 p-4 space-y-4 bg-[#d1e6b2]">
        {/* Table Preview */}
        <div className="bg-white rounded shadow p-4">
          <div className="flex items-center mb-2">
            <FileText className="w-4 h-4 mr-2 text-gray-500" />
            <h3 className="text-sm font-medium text-gray-700">Sensor Data</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left text-gray-600">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-2 py-1">Soil ID</th>
                  <th className="px-2 py-1">User ID</th>
                  <th className="px-2 py-1">pH Level</th>
                  <th className="px-2 py-1">N</th>
                  <th className="px-2 py-1">P</th>
                  <th className="px-2 py-1">K</th>
                  <th className="px-2 py-1">Moisture</th>
                  <th className="px-2 py-1">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-2 py-1">1</td>
                  <td className="px-2 py-1">68</td>
                  <td className="px-2 py-1">6.59</td>
                  <td className="px-2 py-1">17.77</td>
                  <td className="px-2 py-1">3.96</td>
                  <td className="px-2 py-1">423.16</td>
                  <td className="px-2 py-1">47.13</td>
                  <td className="px-2 py-1">[date]</td>
                </tr>
                <tr>
                  <td className="px-2 py-1">2</td>
                  <td className="px-2 py-1">47</td>
                  <td className="px-2 py-1">7.05</td>
                  <td className="px-2 py-1">20.99</td>
                  <td className="px-2 py-1">7.54</td>
                  <td className="px-2 py-1">394.11</td>
                  <td className="px-2 py-1">12.09</td>
                  <td className="px-2 py-1">[date]</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
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
