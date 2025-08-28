"use client"

import { ArrowLeft, FileText, Home, Menu, User, Filter, X } from "lucide-react"
import { useEffect, useState } from "react"
import api from "../api/api"
import LoadingSpinner from "./LoadingSpinner"

export default function ViewSensorData({ onBackClick, onHomeClick, onProfileClick, onMenuClick }) {
  const [loading, setLoading] = useState(true)
  const [sensorData, setSensorData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [selectedSensor, setSelectedSensor] = useState('all')
  const [showFilter, setShowFilter] = useState(false)

  useEffect(() => {
    const fetchActiveSensorData = async () => {
      try {
        setLoading(true)
        let allSensorData = []
        
        // Method 1: Get active sensors from sim/status and fetch ALL their data
        try {
          const simRes = await api.get("/api/sim/status/")
          const simData = simRes.data
          
          // Normalize sim data into flat array
          const arrays = []
          if (Array.isArray(simData)) {
            arrays.push(simData)
          } else if (simData && typeof simData === "object") {
            arrays.push(...Object.values(simData).filter(Array.isArray))
          }
          const devices = arrays.flat()
          
          // Get all devices and their plot assignments
          for (const device of devices) {
            try {
              // Get plot ID from device
              let plotId = null
              if (device?.plot_id) plotId = String(device.plot_id)
              else if (device?.plot_number) plotId = String(device.plot_number)
              else if (typeof device?.plot === "number") plotId = String(device.plot)
              else if (typeof device?.plot === "string") {
                const m = device.plot.match(/\d+/)
                plotId = m ? m[0] : null
              }
              
              if (!plotId) continue
              
              // Only include if device is active
              const isActive = device.isActive || device.active || device.status === 'active'
              if (!isActive) continue
              
              // Fetch ALL data for this plot (both latest and history)
              const dataRes = await api.get(`/api/sensors/data/${encodeURIComponent(plotId)}/`)
              const payload = dataRes.data
              
              // Extract all readings (latest + history)
              const allReadings = []
              
              // Add latest reading
              const latest = payload.latest || payload.latest_reading || payload.latestReading
              if (latest && isValidReading(latest)) {
                allReadings.push(latest)
              }
              
              // Add historical readings
              const history = payload.history || payload.readings || payload.data || []
              if (Array.isArray(history)) {
                history.forEach(reading => {
                  if (isValidReading(reading)) {
                    allReadings.push(reading)
                  }
                })
              }
              
              // If payload is an array, treat it as readings
              if (Array.isArray(payload)) {
                payload.forEach(reading => {
                  if (isValidReading(reading)) {
                    allReadings.push(reading)
                  }
                })
              }
              
              // Normalize all readings
              allReadings.forEach(reading => {
                const normalized = normalizeReading(reading, device, plotId)
                if (normalized) {
                  allSensorData.push(normalized)
                }
              })
              
            } catch (err) {
              console.log(`Failed to fetch data for device ${device.sensor_id || device.id}:`, err)
            }
          }
        } catch (err) {
          console.log("Failed to fetch from sim/status:", err)
        }
        
        // Method 2: Fallback - try to get data from individual plot endpoints
        if (allSensorData.length === 0) {
          try {
            // Get plots that might have sensors
            const plotsRes = await api.get("/api/farm/plots/")
            const plots = plotsRes.data?.results || plotsRes.data || []
            
            for (const plot of plots) {
              try {
                const plotId = String(plot.plot_id)
                
                // Try to get latest reading for this plot
                const latestRes = await api.get(`/api/latest-reading/?plot_number=${encodeURIComponent(plotId)}`)
                const latestData = latestRes.data
                
                if (latestData && isValidReading(latestData)) {
                  const normalized = normalizeReading(latestData, null, plotId)
                  if (normalized) {
                    allSensorData.push(normalized)
                  }
                }
                
                // Try to get historical data for this plot
                try {
                  const historyRes = await api.get(`/api/reading-history/?plot_number=${encodeURIComponent(plotId)}`)
                  const historyData = historyRes.data || []
                  
                  historyData.forEach(reading => {
                    if (isValidReading(reading)) {
                      const normalized = normalizeReading(reading, null, plotId)
                      if (normalized) {
                        allSensorData.push(normalized)
                      }
                    }
                  })
                } catch (histErr) {
                  console.log(`No history data for plot ${plotId}`)
                }
                
              } catch (err) {
                // This plot probably doesn't have sensor data
                continue
              }
            }
          } catch (err) {
            console.log("Fallback method failed:", err)
          }
        }
        
        // Method 3: Last resort - get ALL soil sensor readings
        if (allSensorData.length === 0) {
          try {
            const readingsRes = await api.get("/api/soilsensorreading/")
            const readings = readingsRes.data?.results || readingsRes.data || []
            
            // Convert to array and normalize ALL readings
            allSensorData = readings
              .map(reading => normalizeReading(reading))
              .filter(Boolean)
              
          } catch (err) {
            console.log("Final fallback also failed:", err)
          }
        }
        
        // Remove duplicates based on sensor_id, plot_number, and timestamp
        const uniqueData = allSensorData.reduce((acc, current) => {
          const key = `${current.sensor_id}-${current.plot_number}-${current.timestamp}`
          if (!acc.find(item => 
            `${item.sensor_id}-${item.plot_number}-${item.timestamp}` === key)) {
            acc.push(current)
          }
          return acc
        }, [])
        
        // Sort by sensor ID first, then by timestamp (newest first)
        uniqueData.sort((a, b) => {
          const sensorCompare = a.sensor_id.localeCompare(b.sensor_id)
          if (sensorCompare !== 0) return sensorCompare
          return new Date(b.timestamp) - new Date(a.timestamp)
        })
        
        setSensorData(uniqueData)
        
      } catch (error) {
        console.error("Error fetching active sensor data:", error)
        setSensorData([])
      } finally {
        setLoading(false)
      }
    }
    
    fetchActiveSensorData()
  }, [])

  // Filter data when sensorData or selectedSensor changes
  useEffect(() => {
    if (selectedSensor === 'all') {
      setFilteredData(sensorData)
    } else {
      setFilteredData(sensorData.filter(item => item.sensor_id === selectedSensor))
    }
  }, [sensorData, selectedSensor])

  // Enhanced helper function to get sensor ID for plot
  const getSensorIdForPlot = (plotId, device = null, item = null) => {
    // Enhanced sensor-plot mappings based on your system
    const plotSensorMap = {
      '5001': '42', // Plot 5001 uses Sensor 42
      '5002': '8',  // Plot 5002 uses Sensor 8
      '802': '31',  // Add other known mappings if needed
      '2802': '7'   // Add other known mappings if needed
    }
    
    // First try device data (most reliable)
    if (device?.sensor_id) return String(device.sensor_id)
    if (device?.device_id) return String(device.device_id)
    if (device?.id) return String(device.id)
    
    // Then try reading data
    if (item?.sensor_id) return String(item.sensor_id)
    if (item?.device_id) return String(item.device_id)
    if (item?.id) return String(item.id)
    
    // Fall back to known mapping for your plots
    if (plotId && plotSensorMap[plotId]) {
      return plotSensorMap[plotId]
    }
    
    // If we still don't have a sensor ID, try to infer from plot number patterns
    if (plotId) {
      // For plots starting with 50xx, use last digit + 40 as sensor ID
      if (plotId.startsWith('50')) {
        const lastDigit = plotId.slice(-1)
        if (lastDigit === '1') return '42'
        if (lastDigit === '2') return '8'
      }
    }
    
    return 'Unknown'
  }

  // Helper function to normalize reading data
  const normalizeReading = (item, device = null, plotId = null) => {
    if (!item) return null
    
    try {
      const timestamp = item.timestamp || item.ts || item.created_at || item.time || new Date().toISOString()
      
      // Get plot number from multiple sources
      const plotNumber = item.plot_number || item.plot_id || item.plot || 
                        plotId || device?.plot_id || device?.plot_number || device?.plot || 'Unknown'
      
      // Get sensor ID using the enhanced helper function
      const sensorId = getSensorIdForPlot(String(plotNumber), device, item)
      
      // Parse numeric values safely
      const pH_level = safeParseFloat(item.pH_level || item.ph_level || item.ph)
      const N = safeParseFloat(item.N || item.n || item.nitrogen)
      const P = safeParseFloat(item.P || item.p || item.phosphorus)
      const K = safeParseFloat(item.K || item.k || item.potassium)
      const moisture_level = safeParseFloat(item.moisture_level || item.moisture)
      
      return {
        sensor_id: sensorId,
        plot_number: String(plotNumber),
        pH_level,
        N,
        P,
        K,
        moisture_level,
        timestamp
      }
    } catch (err) {
      console.error("Error normalizing reading:", err, item)
      return null
    }
  }

  // Helper to safely parse float values
  const safeParseFloat = (value) => {
    if (value === null || value === undefined || value === '') return 0
    const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '.')) : parseFloat(value)
    return isNaN(num) ? 0 : num
  }

  // Helper to validate if reading has required data
  const isValidReading = (reading) => {
    return reading && (
      reading.pH_level !== undefined || reading.ph_level !== undefined || reading.ph !== undefined ||
      reading.N !== undefined || reading.n !== undefined ||
      reading.moisture_level !== undefined || reading.moisture !== undefined
    )
  }

  // Get unique sensors for filter dropdown
  const uniqueSensorIds = [...new Set(sensorData.map(d => d.sensor_id))].sort()
  const uniqueSensors = new Set(filteredData.map(d => d.sensor_id)).size

  if (loading) return <LoadingSpinner />

  return (
    <div className="flex flex-col h-full pb-12">
      {/* Top Header */}
      <div className="p-4 bg-white flex items-center shadow-sm">
        <button onClick={onBackClick} className="mr-2 p-1 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold flex-1 text-center">Active Sensor Data</h1>
        <button 
          onClick={() => setShowFilter(!showFilter)}
          className="ml-2 p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <Filter className="h-5 w-5" />
        </button>
      </div>

      {/* Filter Section */}
      {showFilter && (
        <div className="p-4 bg-gray-50 border-b">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Filter by Sensor:</label>
            <select
              value={selectedSensor}
              onChange={(e) => setSelectedSensor(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Sensors</option>
              {uniqueSensorIds.map(sensorId => (
                <option key={sensorId} value={sensorId}>
                  Sensor {sensorId}
                </option>
              ))}
            </select>
            {selectedSensor !== 'all' && (
              <button
                onClick={() => setSelectedSensor('all')}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-auto p-4 space-y-4 bg-[#d1e6b2]">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg mr-3">
                  <FileText className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    {selectedSensor === 'all' ? 'All Sensor Readings' : `Sensor ${selectedSensor} Readings`}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedSensor === 'all' ? 'Complete history from active sensors' : `All readings from Sensor ${selectedSensor}`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {selectedSensor === 'all' ? `${uniqueSensors} Active Sensors` : `Sensor ${selectedSensor}`}
                </div>
                <div className="text-xs text-gray-500">{filteredData.length} Total Readings</div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {filteredData.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-4 bg-gray-50 rounded-lg inline-block mb-4">
                  <FileText className="w-8 h-8 text-gray-400 mx-auto" />
                </div>
                <p className="text-gray-500 font-medium">
                  {selectedSensor === 'all' ? 'No active sensors found' : `No data found for Sensor ${selectedSensor}`}
                </p>
                <p className="text-sm text-gray-400">
                  {selectedSensor === 'all' ? 'Connect sensors to plots to see data here' : 'Try selecting a different sensor'}
                </p>
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
                      Status
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-green-200">
                      Timestamp
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredData.map((row, index) => (
                    <tr key={`${row.sensor_id}-${row.plot_number}-${row.timestamp}-${index}`} 
                        className="hover:bg-gray-50 transition-colors duration-150 ease-in-out">
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-2 h-2 bg-green-400 rounded-full mr-3 animate-pulse"></div>
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
                          {row.pH_level.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">pH</div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">{row.N.toFixed(2)}</div>
                        <div className="text-xs text-gray-500">ppm</div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">{row.P.toFixed(2)}</div>
                        <div className="text-xs text-gray-500">ppm</div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">{row.K.toFixed(2)}</div>
                        <div className="text-xs text-gray-500">ppm</div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-sm text-gray-900 font-medium">
                            {row.moisture_level.toFixed(2)}%
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
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1"></div>
                          Active
                        </span>
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
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center w-1/3 hover:bg-gray-50 transition-colors py-2"
        >
          <Menu size={20} className="text-gray-600" />
        </button>
      </div>
    </div>
  )
}