"use client"

import { useState } from "react"
import { ArrowLeft, CheckCircle, Loader2, AlertCircle, Wifi, Database } from "lucide-react"
import api from "../api/api"

export default function ConnectSensorWizard({ plotOptions = [], onClose, onFinished }) {
  const [step, setStep] = useState(1)
  const [plotId, setPlotId] = useState("")
  const [name, setName] = useState("")
  const [sensorId, setSensorId] = useState("")
  const [validationResult, setValidationResult] = useState(null)
  const [device, setDevice] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  // ---- NEW: helper to render a nice plot label everywhere ----
  const getPlotLabel = (id) => {
    const p = (plotOptions || []).find(x => String(x.id) === String(id))
    if (!p) return ""
    // Prefer a prebuilt label if FarmSetupScreen provided it; otherwise build a good fallback
    return (
      p.label ||
      `${p.plot_id}${p.location ? ` - ${p.location}` : ""}${p.size ? ` (${Number.parseFloat(p.size).toFixed(2)} ha)` : ""}`
    )
  }

  const validate = async () => {
    if (!sensorId.trim()) {
      setError("Please enter a sensor ID")
      return
    }

    setBusy(true)
    setError("")
    
    try {
      const response = await api.post("/api/sensors/validate/", { 
        sensor_id: parseInt(sensorId.trim())  // Ensure it's an integer
      })
      
      setValidationResult(response.data)
      setStep(2)
    } catch (err) {
      console.error("Validation error:", err)
      setError(err.response?.data?.detail || err.response?.data?.message || "Sensor validation failed")
    } finally {
      setBusy(false)
    }
  }

  const connect = async () => {
    if (!plotId || !name.trim()) {
      setError("Please fill in all fields")
      return
    }

    setBusy(true)
    setError("")
    
    try {
      const response = await api.post("/api/sensors/connect/", {
        plot_id: parseInt(plotId),               // IMPORTANT: numeric pk
        device_name: name.trim(),
        sensor_id: parseInt(sensorId.trim())     // Ensure it's an integer
      })
      
      setDevice(response.data)
      setStep(3)
    } catch (err) {
      console.error("Connection error:", err)
      setError(err.response?.data?.detail || err.response?.data?.message || "Device connection failed")
    } finally {
      setBusy(false)
    }
  }

  const startStreaming = async () => {
    setBusy(true)
    setError("")
    
    try {
      // Fixed: Use device.id instead of device.device_id
     await api.post(`/api/sensors/${device.id}/activate/`, { 
  active: true 
})

      
      setStep(4)
      
      setTimeout(() => {
        onFinished && onFinished(device)
      }, 2000)
    } catch (err) {
      console.error("Activation error:", err)
      setError(err.response?.data?.detail || err.response?.data?.message || "Failed to start streaming")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-3">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm h-[500px] flex flex-col">
        {/* Header */}
        <div className="p-3 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center">
            <button onClick={onClose} className="mr-2">
              <ArrowLeft className="h-4 w-4 text-gray-600" />
            </button>
            <h2 className="text-lg font-bold text-gray-800 flex-1">Connect Sensor</h2>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="p-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center space-x-1">
            {[1, 2, 3, 4].map((num) => (
              <div key={num} className="flex items-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                    step >= num
                      ? "bg-green-600 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {step > num ? <CheckCircle className="h-3 w-3" /> : num}
                </div>
                {num < 4 && (
                  <div
                    className={`w-6 h-0.5 ${
                      step > num ? "bg-green-600" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {step === 1 && "Enter sensor details"}
            {step === 2 && "Verify sensor data"}
            {step === 3 && "Configure connection"}
            {step === 4 && "Sensor connected!"}
          </div>
        </div>

        {/* Content */}
        <div className="p-3 flex-1 overflow-y-auto">
          {error && (
            <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
              <AlertCircle className="h-3 w-3 text-red-600 flex-shrink-0" />
              <span className="text-xs text-red-600">{error}</span>
            </div>
          )}

          {/* Step 1: Sensor Details */}
          {step === 1 && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Sensor ID
                </label>
                <input
                  type="number"
                  placeholder="e.g., 8"
                  className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                  value={sensorId}
                  onChange={(e) => setSensorId(e.target.value)}
                  disabled={busy}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Available: 1, 6, 7, 8, 13, 14, 31, 34, 38, 42, 43, 45
                </p>
              </div>

              <button
                onClick={validate}
                disabled={busy || !sensorId.trim()}
                className="w-full bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Validating...</span>
                  </>
                ) : (
                  <>
                    <Database className="h-3 w-3" />
                    <span>Validate Sensor</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 2: Validation Result */}
          {step === 2 && validationResult && (
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <h3 className="font-semibold text-green-800 mb-2 flex items-center text-sm">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Sensor Found!
                </h3>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">ID:</span>
                    <span className="font-medium text-gray-800">{validationResult.sensor_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Readings:</span>
                    <span className="font-medium text-gray-800">{validationResult.total_readings}</span>
                  </div>
                  {validationResult.date_range && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Range:</span>
                      <span className="font-medium text-gray-800 text-xs">
                        {new Date(validationResult.date_range.earliest).toLocaleDateString()} - {new Date(validationResult.date_range.latest).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {validationResult.sample_data && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-800">Sample Reading:</h4>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {/* pH */}
                    <div className="bg-gray-50 p-2 rounded">
                      <div className="text-xs text-gray-600 mb-0.5">pH:</div>
                      <div className="text-sm font-semibold text-gray-800">
                        {parseFloat(validationResult.sample_data.pH_level || validationResult.sample_data.ph || 0).toFixed(2)}
                      </div>
                    </div>
                    
                    {/* Moisture */}
                    <div className="bg-gray-50 p-2 rounded">
                      <div className="text-xs text-gray-600 mb-0.5">Moisture:</div>
                      <div className="text-sm font-semibold text-gray-800">
                        {parseFloat(validationResult.sample_data.moisture_level || validationResult.sample_data.moisture || 0).toFixed(2)}%
                      </div>
                    </div>
                    
                    {/* Nitrogen */}
                    <div className="bg-gray-50 p-2 rounded">
                      <div className="text-xs text-gray-600 mb-0.5">N:</div>
                      <div className="text-sm font-semibold text-gray-800">
                        {parseFloat(validationResult.sample_data.N || validationResult.sample_data.n || 0).toFixed(2)}
                      </div>
                    </div>
                    
                    {/* Phosphorus */}
                    <div className="bg-gray-50 p-2 rounded">
                      <div className="text-xs text-gray-600 mb-0.5">P:</div>
                      <div className="text-sm font-semibold text-gray-800">
                        {parseFloat(validationResult.sample_data.P || validationResult.sample_data.p || 0).toFixed(2)}
                      </div>
                    </div>
                    
                    {/* Potassium spans both columns */}
                    <div className="col-span-2 bg-gray-50 p-2 rounded">
                      <div className="text-xs text-gray-600 mb-0.5">K:</div>
                      <div className="text-sm font-semibold text-gray-800">
                        {parseFloat(validationResult.sample_data.K || validationResult.sample_data.k || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {validationResult.already_connected && (
                <div className="bg-yellow-50 p-2 rounded-lg border border-yellow-200">
                  <p className="text-xs text-yellow-800">
                    ⚠️ Already connected to plot: {validationResult.connected_plot}
                  </p>
                </div>
              )}

              <div className="flex space-x-2">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-100 text-gray-600 p-2 rounded-lg hover:bg-gray-200 transition-all duration-200 font-semibold text-sm"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    // Prefill device name once we proceed to configuration
                    if (!name.trim()) setName(`Sensor ${sensorId}`)
                    setStep(3)
                  }}
                  className="flex-1 bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 transition-all duration-200 font-semibold text-sm"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Configure Connection */}
          {step === 3 && !device && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Select Plot
                </label>
                <select
                  className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                  value={plotId}
                  onChange={(e) => setPlotId(e.target.value)}
                  disabled={busy}
                >
                  <option value="">Choose a plot...</option>
                  {plotOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {getPlotLabel(p.id)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Device Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., North Field Monitor"
                  className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={busy}
                />
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 bg-gray-100 text-gray-600 p-2 rounded-lg hover:bg-gray-200 transition-all duration-200 font-semibold text-sm"
                >
                  Back
                </button>
                <button
                  onClick={connect}
                  disabled={busy || !plotId || !name.trim()}
                  className="flex-1 bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1 text-sm"
                >
                  {busy ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <Wifi className="h-3 w-3" />
                      <span>Connect</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Device Connected, Start Streaming */}
          {step === 3 && device && (
            <div className="space-y-3">
              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                <h3 className="font-semibold text-green-800 mb-2 text-sm">Device Connected!</h3>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Device:</span>
                    <span className="font-medium">{device.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Plot:</span>
                    <span className="font-medium">{getPlotLabel(plotId)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sensor ID:</span>
                    <span className="font-medium">{device.linked_sensor_id || sensorId}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={startStreaming}
                disabled={busy}
                className="w-full bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1 text-sm"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Starting...</span>
                  </>
                ) : (
                  <>
                    <Wifi className="h-3 w-3" />
                    <span>Start Streaming</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 4: Success */}
          {step === 4 && device && (
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>

              <div>
                <h3 className="text-base font-bold text-gray-800">Sensor Connected!</h3>
                <p className="text-gray-600 text-xs mt-1">
                  {device.name} is now streaming data
                </p>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg text-left">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Device:</span>
                    <span className="font-medium">{device.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sensor ID:</span>
                    <span className="font-medium">{device.linked_sensor_id || sensorId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Plot:</span>
                    <span className="font-medium">{getPlotLabel(plotId)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="text-green-600 font-medium">● Active</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-500">
                Data will appear in your dashboard within 30 seconds
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}