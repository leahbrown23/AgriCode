"use client"

import { ArrowLeft, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import api from "../api/api"
import LoadingSpinner from "./LoadingSpinner"
import ConnectSensorWizard from "./ConnectSensorWizard"

export default function SensorSetupScreen({ onBackClick }) {
  const [plotOptions, setPlotOptions] = useState([])
  const [devices, setDevices] = useState([])
  const [showWizard, setShowWizard] = useState(false)
  const [loading, setLoading] = useState(true)
  const [removingDeviceId, setRemovingDeviceId] = useState(null)
  const [refreshingDevices, setRefreshingDevices] = useState(false) // New state for post-connection loading

  // Load plots for wizard
  useEffect(() => {
    (async () => {
      try {
        const r = await api.get("/api/farm/plots/");
        const rows = Array.isArray(r.data?.results) ? r.data.results : r.data;

        const mapped = rows.map(p => ({
          id: p.id,
          plot_id: p.plot_id,
          location: p.location,
          size: p.size,
          label: `${p.plot_id} - ${p.location}${p.size ? ` (${Number.parseFloat(p.size).toFixed(2)} ha)` : ""}`,
        }));

        setPlotOptions(mapped);
      } catch (e) {
        console.error("Failed to load plots for sensor wizard:", e);
        setPlotOptions([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const refreshDevices = async (showLoadingSpinner = false) => {
    try {
      if (showLoadingSpinner) {
        setRefreshingDevices(true)
      }
      const r = await api.get("/api/sim/status/")
      setDevices(r.data || [])
    } catch (e) {
      console.error("Failed to load sensor devices:", e)
      setDevices([])
    } finally {
      if (showLoadingSpinner) {
        setRefreshingDevices(false)
      }
    }
  }

  useEffect(() => { refreshDevices() }, [])

  const toggleActive = async (d) => {
    try {
      await api.post(`/api/sim/devices/${d.id}/toggle/`, { active: !d.is_active })
      await refreshDevices()
    } catch (e) {
      console.error("Toggle failed:", e)
      alert("Failed to toggle device. See console for details.")
    }
  }

  const removeSensor = async (device) => {
    try {
      setRemovingDeviceId(device.id)
      
      // Delete from backend
      const response = await api.delete(`/api/sim/devices/${device.id}/`)
      
      if (response.status === 200 || response.status === 204) {
        // Remove from local state immediately
        setDevices(prevDevices => prevDevices.filter(d => d.id !== device.id))
        
        // Show success message
        alert(`${device.name} has been removed successfully!`)
      } else {
        throw new Error('Failed to remove sensor')
      }
    } catch (error) {
      console.error('Error removing sensor:', error)
      alert(`Failed to remove ${device.name}. Please try again.`)
    } finally {
      setRemovingDeviceId(null)
    }
  }

  const handleRemoveClick = (device) => {
    const confirmMessage = `Are you sure you want to remove "${device.name}"?\n\nThis will permanently delete the sensor and all its data. This action cannot be undone.`
    
    if (window.confirm(confirmMessage)) {
      removeSensor(device)
    }
  }

  const handleWizardFinished = () => {
    setShowWizard(false)
    // Show loading spinner while refreshing devices after connection
    refreshDevices(true)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="flex flex-col h-full pb-12">
      {/* Top Header */}
      <div className="p-4 bg-white flex items-center shadow-sm">
        <button onClick={onBackClick} className="mr-2 p-1 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold flex-1 text-center">Sensor Management</h1>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#d1e6b2] p-4">
        {/* Sensor Management */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8.111 16.404a5.5 5.5 0 717.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"/>
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-800">Sensor Management</h2>
            </div>

            <button
              onClick={() => setShowWizard(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-md transition-transform duration-200 hover:scale-[1.02]"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12M6 12h12"/>
              </svg>
              Connect Sensor
            </button>
          </div>

          {/* Loading spinner for post-connection refresh */}
          {refreshingDevices && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-center space-x-3">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-blue-700 font-medium">Loading connected sensors...</span>
              </div>
            </div>
          )}

          {devices.length === 0 && !refreshingDevices ? (
            <div className="text-center py-8">
              <div className="p-4 bg-gray-50 rounded-lg inline-block mb-4">
                <svg className="w-8 h-8 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8.111 16.404a5.5 5.5 0 717.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"/>
                </svg>
              </div>
              <p className="text-gray-500 font-medium">No sensors connected yet</p>
              <p className="text-sm text-gray-400 mb-4">Connect your first sensor to start monitoring</p>
              <button
                onClick={() => setShowWizard(true)}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-2 rounded-lg font-medium shadow-md transition-transform duration-200 hover:scale-[1.02]"
              >
                Get Started
              </button>
            </div>
          ) : devices.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">
                  {devices.length} sensor{devices.length !== 1 ? 's' : ''} connected
                </span>
                <div className="flex items-center text-sm text-gray-500">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2" />{devices.filter(d => d.is_active).length} active
                </div>
              </div>

              <ul className="space-y-3">
                {devices.map((d) => (
                  <li key={d.id} className="p-4 bg-gray-50 hover:bg-blue-50 rounded-lg border border-gray-100 hover:border-blue-200 transition">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: status dot + sensor info */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <span className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 ${d.is_active ? 'bg-green-500' : 'bg-gray-400'}`}/>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-800 truncate">{d.name}</h3>
                          <div className="mt-1 space-y-1">
                            <div className="flex items-center text-sm text-gray-500">
                              <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                              </svg>
                              <span>Plot #{d.plot}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-500">
                              <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                              </svg>
                              <span className="truncate">{d.external_id}</span>
                            </div>
                          </div>
                          <span className={`inline-block px-2 py-1 mt-2 text-xs rounded-full font-medium ${
                            d.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {d.is_active ? 'Active' : 'Paused'}
                          </span>
                        </div>
                      </div>

                      {/* Right: action buttons - stacked vertically */}
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        {/* Start/Pause button */}
                        <button
                          onClick={() => toggleActive(d)}
                          disabled={removingDeviceId === d.id}
                          className={`inline-flex items-center justify-center px-3 py-1.5 rounded-md font-medium text-xs transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed w-20 ${
                            d.is_active 
                              ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                              : 'bg-green-100 text-green-600 hover:bg-green-200'
                          }`}
                        >
                          {d.is_active ? (
                            <>
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                              </svg>
                              Pause
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m2-10a9 9 0 11-18 0 9 9 0 0118 0z"/>
                              </svg>
                              Start
                            </>
                          )}
                        </button>

                        {/* Remove button */}
                        <button
                          onClick={() => handleRemoveClick(d)}
                          disabled={removingDeviceId === d.id}
                          className="inline-flex items-center justify-center px-3 py-1.5 rounded-md font-medium text-xs bg-red-500 text-white hover:bg-red-600 transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed w-20"
                        >
                          {removingDeviceId === d.id ? (
                            <>
                              <div className="w-3 h-3 mr-1 border border-white border-t-transparent rounded-full animate-spin"></div>
                              <span className="truncate">Removing</span>
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-3 h-3 mr-1" />
                              Remove
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>

       
       {/* Wizard Modal (parent) */}
{showWizard && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white">
    <div
      className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[80vh]"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Body (wizard) */}
      <div className="flex-1 overflow-hidden">
        <ConnectSensorWizard
          plotOptions={plotOptions}
          onClose={() => setShowWizard(false)}
          onFinished={handleWizardFinished}
        />
      </div>
    </div>
  </div>
)}

      </div>
    </div>
  )
}