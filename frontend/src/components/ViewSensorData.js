"use client"

import { ArrowLeft, FileText, Home, Menu, User } from "lucide-react"
import { useEffect, useState } from "react"
import api from "../api/api"
import LoadingSpinner from "./LoadingSpinner"

export default function ViewSensorData({ onBackClick, onHomeClick, onProfileClick, onMenuClick }) {
  const [loading, setLoading] = useState(true)
  const [sensorData, setSensorData] = useState([])
  const [user, setUser] = useState(null)

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get("/api/latest-soil-data/")
        setSensorData(res.data)
      } catch (error) {
        console.error("Error fetching data", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return <LoadingSpinner />

  return (
    <div className="flex flex-col h-full pb-12">
      {/* Top Header */}
      <div className="p-4 bg-white flex items-center shadow-sm">
        <button onClick={onBackClick} className="mr-2 p-1 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold flex-1 text-center">View Sensor Data</h1>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-4 space-y-4 bg-[#d1e6b2]">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg mr-3">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Recent Sensor Data</h3>
                <p className="text-sm text-gray-500">Latest soil monitoring readings</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {sensorData.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-4 bg-gray-50 rounded-lg inline-block mb-4">
                  <FileText className="w-8 h-8 text-gray-400 mx-auto" />
                </div>
                <p className="text-gray-500 font-medium">No sensor data found</p>
                <p className="text-sm text-gray-400">Check back later for updates</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-green-50 to-green-100">
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-green-200">
                      Sensor ID
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-green-200">
                      Plot No
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-green-200">
                      pH Level
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-green-200">
                      Nitrogen
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-green-200">
                      Phosphorus
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-green-200">
                      Potassium
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-green-200">
                      Moisture
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-green-200">
                      Timestamp
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sensorData.map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors duration-150 ease-in-out">
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                          <span className="text-sm font-medium text-gray-900">{row.sensor_id}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Plot {row.plot_number}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">
                          {Number.parseFloat(row.pH_level).toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">pH</div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">{Number.parseFloat(row.N).toFixed(2)}</div>
                        <div className="text-xs text-gray-500">mg/kg</div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">{Number.parseFloat(row.P).toFixed(2)}</div>
                        <div className="text-xs text-gray-500">mg/kg</div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">{Number.parseFloat(row.K).toFixed(2)}</div>
                        <div className="text-xs text-gray-500">mg/kg</div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-sm text-gray-900 font-medium">
                            {Number.parseFloat(row.moisture_level).toFixed(2)}%
                          </div>
                          <div className="ml-2 w-12 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(row.moisture_level, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="text-xs text-gray-900">{new Date(row.timestamp).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-400">{new Date(row.timestamp).toLocaleTimeString()}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Nav */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-around items-center h-12 border-t bg-white shadow-lg">
        <button
          onClick={onHomeClick}
          className="flex flex-col items-center justify-center w-1/3 hover:bg-gray-50 transition-colors py-2"
        >
          <Home size={20} className="text-gray-600" />
        </button>
        <button
          onClick={onProfileClick}
          className="flex flex-col items-center justify-center w-1/3 hover:bg-gray-50 transition-colors py-2"
        >
          <User size={20} className="text-gray-600" />
        </button>
        <button
          onClick={() => onMenuClick((prev) => !prev)}
          className="flex flex-col items-center justify-center w-1/3 hover:bg-gray-50 transition-colors py-2"
        >
          <Menu size={20} className="text-gray-600" />
        </button>
      </div>
    </div>
  )
}
