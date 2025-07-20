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
      <div className="p-4 bg-white flex items-center">
        <button onClick={onBackClick} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold flex-1 text-center">View Sensor Data</h1>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-4 space-y-4 bg-[#d1e6b2]">
        <div className="bg-white rounded shadow p-4">
          <div className="flex items-center mb-2">
            <FileText className="w-4 h-4 mr-2 text-gray-500" />
            <h3 className="text-sm font-medium text-gray-700">Recent Sensor Data</h3>
          </div>
          <div className="overflow-x-auto w-full">
            <table className="min-w-full text-sm text-left text-gray-600">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-2 py-1">Sensor ID</th>
                  <th className="px-2 py-1">Plot No</th>
                  <th className="px-2 py-1">pH</th>
                  <th className="px-2 py-1">N</th>
                  <th className="px-2 py-1">P</th>
                  <th className="px-2 py-1">K</th>
                  <th className="px-2 py-1">Moisture</th>
                  <th className="px-2 py-1">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {sensorData.map((row, index) => (
                  <tr key={index}>
                    <td className="px-2 py-1">{row.sensor_id}</td>
                    <td className="px-2 py-1">{row.plot_number}</td>
                    <td className="px-2 py-1">{row.pH_level}</td>
                    <td className="px-2 py-1">{row.N}</td>
                    <td className="px-2 py-1">{row.P}</td>
                    <td className="px-2 py-1">{row.K}</td>
                    <td className="px-2 py-1">{row.moisture_level}</td>
                    <td className="px-2 py-1">{new Date(row.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
                {sensorData.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-2 text-gray-500">No sensor data found.</td>
                  </tr>
                )}
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
