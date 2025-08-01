"use client"

import { Activity, ArrowLeft, Droplets, Home, Info, Leaf, Menu, User, Zap } from "lucide-react"
import { useEffect, useState } from "react"
import api from "../api/api"
import LoadingSpinner from "./LoadingSpinner"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"

export default function SoilHealthScreen({
  onBackClick,
  onViewSensorClick,
  onUploadSensorClick,
  onHomeClick,
  onProfileClick,
  onMenuClick,
}) {
  const [user, setUser] = useState(null)
  const [soilData, setSoilData] = useState(null)
  const [plotOptions, setPlotOptions] = useState([])
  const [selectedPlot, setSelectedPlot] = useState(() => {
    // Load saved plot from localStorage on component mount
    return localStorage.getItem('selectedSoilPlot') || ""
  })
  const [isLoadingPlotData, setIsLoadingPlotData] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)
  const [historyData, setHistoryData] = useState([])

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/api/profile/")
        setUser(res.data)
      } catch (err) {
        console.error("Failed to load user profile:", err)
      }
    }
    fetchProfile()
  }, [])

  // Fetch user's crops and format dropdown
  useEffect(() => {
    const fetchCrops = async () => {
      try {
        const res = await api.get("/api/farm/crops/")
        const cropsData = res.data || []

        const formattedOptions = cropsData.map((crop) => ({
          value: crop.plot_number,
          label: `Plot ${crop.plot_number} - ${crop.crop_type}`,
        }))

        setPlotOptions(formattedOptions)

        const savedPlot = localStorage.getItem("selectedSoilPlot")
        if (savedPlot && formattedOptions.find((opt) => opt.value === savedPlot)) {
          setSelectedPlot(savedPlot)
        } else if (formattedOptions.length > 0) {
          const defaultPlot = formattedOptions[0].value
          setSelectedPlot(defaultPlot)
          localStorage.setItem("selectedSoilPlot", defaultPlot)
        }
      } catch (err) {
        console.error("Failed to fetch crops", err)
        setPlotOptions([])
        setSelectedPlot("")
      }
    }
    fetchCrops()
  }, [])

  // Fetch soil data for selected plot
  const fetchSoilData = async () => {
    if (!selectedPlot) return
    setIsLoadingPlotData(true)
    try {
      const res = await api.get(`/api/latest-reading/?plot_number=${selectedPlot}`)
      setSoilData(res.data)
    } catch (err) {
      console.error("Error fetching soil data", err)
      setSoilData(null)
    } finally {
      setIsLoadingPlotData(false)
    }
  }

  // Fetch historical data for trends
  const fetchHistoryData = async () => {
  if (!selectedPlot) return;
  try {
    const res = await api.get(`/api/reading-history/?plot_number=${selectedPlot}`);
    // Convert all values to numbers and fix decimal separator
    const formatted = (res.data || [])
      .map((item) => ({
        ...item,
        pH_level: item.pH_level ? parseFloat(String(item.pH_level).replace(/,/g, ".")) : null,
        N: item.N ? parseFloat(String(item.N).replace(/,/g, ".")) : null,
        P: item.P ? parseFloat(String(item.P).replace(/,/g, ".")) : null,
        K: item.K ? parseFloat(String(item.K).replace(/,/g, ".")) : null,
        moisture_level: item.moisture_level ? parseFloat(String(item.moisture_level).replace(/,/g, ".")) : null,
        timestamp: item.timestamp ? new Date(item.timestamp).toLocaleDateString("en-ZA", { year: "2-digit", month: "2-digit", day: "2-digit" }) : "",
      }))
      .filter(
        (item) =>
          item.pH_level !== null &&
          item.N !== null &&
          item.P !== null &&
          item.K !== null &&
          item.moisture_level !== null &&
          item.timestamp
      );
    setHistoryData(formatted);
    console.log("historyData", formatted); // <-- Add this for debugging
  } catch (err) {
    setHistoryData([]);
  }
};

  useEffect(() => {
    if (selectedPlot) {
      fetchSoilData()
      fetchHistoryData()
    }
  }, [selectedPlot])

  const score = soilData ? calculateSoilScore(soilData) : 0
  const classification = getClassification(score)

  function calculateSoilScore(data) {
    const { moisture_level, N, P, K, pH_level } = data

    // More robust pH conversion
    let pH = 0;
    if (pH_level !== null && pH_level !== undefined && pH_level !== "") {
      pH = parseFloat(pH_level);
      // Ensure pH is a valid number
      if (isNaN(pH)) {
        pH = 0;
      }
    }

    const score = pH * 0.2 + (N || 0) * 0.35 + (P || 0) * 0.25 + (K || 0) * 0.2;
    return Math.round(score);
  }

  function getClassification(score) {
    if (score >= 80) {
      return "Healthy"
    } else if (score >= 60) {
      return "Moderate"
    } else {
      return "Poor"
    }
  }

  function getScoreColor(score) {
    if (score < 60) return "rgb(229,57,53)";      // red
    if (score < 80) return "rgb(251,192,45)";     // yellow
    return "rgb(67,160,71)";                      // green
  }

  return (
    <div className="flex flex-col h-full pb-12">
      {/* Top Header */}
      <div className="p-4 bg-white flex items-center shadow-sm">
        <button onClick={onBackClick} className="mr-2 p-1 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold flex-1 text-center">Soil Health</h1>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto bg-[#d1e6b2] p-4 space-y-4">
        {/* Action Buttons - Moved to Top */}
        <div className="space-y-3">
          <button
            onClick={onUploadSensorClick}
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white w-full py-3 rounded-xl font-medium shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
          >
            Upload Sensor Data
          </button>
          <button
            onClick={onViewSensorClick}
            className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white w-full py-3 rounded-xl font-medium shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
          >
            View Sensor Data
          </button>
        </div>

        {/* Plot Filter */}
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center mb-3">
            <div className="p-2 bg-green-100 rounded-lg mr-3">
              <Leaf className="w-4 h-4 text-green-600" />
            </div>
            <label className="text-sm font-semibold text-gray-700">Select Plot</label>
          </div>
          <select
            className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
            value={selectedPlot}
            onChange={(e) => {
              const newPlot = e.target.value
              setSelectedPlot(newPlot)
              // Save selected plot to localStorage
              localStorage.setItem('selectedSoilPlot', newPlot)
            }}
            disabled={plotOptions.length === 0}
          >
            {plotOptions.length > 0 ? (
              plotOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))
            ) : (
              <option value="" disabled>
                No plots available
              </option>
            )}
          </select>
        </div>

        {isLoadingPlotData ? (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center mb-2">
                <span className="text-sm font-medium text-gray-600 mr-1">SOIL HEALTH SCORE</span>
                <Info size={14} className="text-gray-300" />
              </div>
              <div className="text-6xl font-bold text-gray-300 mb-2">--</div>
              <div className="w-24 h-2 bg-gray-200 rounded-full mx-auto"></div>
            </div>
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          </div>
        ) : soilData ? (
          <>
            {/* Date Updated */}
            <div className="text-right">
              <div className="inline-flex items-center bg-white px-3 py-2 rounded-lg shadow-sm">
                <span className="text-xs text-gray-500 mr-2">Last updated:</span>
                <span className="text-xs font-medium text-gray-700">
                  {new Date(soilData.timestamp).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Score Card */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="text-center mb-6">
                <div className="flex items-center justify-center mb-2">
                  <span className="text-sm font-medium text-gray-600 mr-1">SOIL HEALTH SCORE</span>
                  <button onClick={() => setShowExplanation(true)} className="text-gray-400 hover:text-gray-600">
                    <Info size={14} />
                  </button>
                  {showExplanation && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                      <div className="bg-white rounded-xl shadow-lg max-w-sm p-6 text-sm text-gray-800">
                        <h2 className="text-lg font-bold mb-3">How Soil Score is Calculated</h2>
                        <p className="mb-2">
                          The Soil Health Score (SHS) is a weighted average of key soil nutrients and pH:
                        </p>
                        <ul className="list-disc list-inside mb-2">
                          <li>pH level: 20%</li>
                          <li>Nitrogen (N): 35%</li>
                          <li>Phosphorus (P): 25%</li>
                          <li>Potassium (K): 20%</li>
                        </ul>
                        <p className="mb-2">
                          Formula: <code>(pH × 0.2) + (N × 0.35) + (P × 0.25) + (K × 0.2)</code>
                        </p>
                        <p className="mt-4">
                          <strong>Score Classification:</strong>
                          <br />
                          <span className="text-green-700">80–100:</span> Healthy
                          <br />
                          <span className="text-yellow-600">60–79:</span> Moderate
                          <br />
                          <span className="text-red-600">Below 60:</span> Poor
                        </p>
                        <div className="text-right mt-6">
                          <button
                            onClick={() => setShowExplanation(false)}
                            className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="relative">
                  <div
                    className="text-6xl font-bold mb-2"
                    style={{ color: getScoreColor(score) }}
                  >
                    {score}
                  </div>
                  {classification && (
                    <div className="text-sm font-semibold text-gray-600">
                      Classification:{" "}
                      <span style={{ color: getScoreColor(score) }}>
                        {classification}
                      </span>
                    </div>
                  )}
                  <div className="w-24 h-2 bg-gray-200 rounded-full mx-auto mt-2 overflow-hidden">
                    <div
                      style={{
                        width: `${Math.min(score, 100)}%`,
                        background: getScoreColor(score),
                        height: "100%",
                        borderRadius: 8,
                        transition: "width 0.5s"
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <div className="w-4 h-4 bg-yellow-500 rounded-full mr-1"></div>
                    <span className="text-xs font-medium text-yellow-600">pH Level</span>
                  </div>
                  <div className="text-lg font-bold text-yellow-700">
                    {(() => {
                      const pHValue = soilData.pH_level;
                      if (pHValue !== null && pHValue !== undefined && pHValue !== "") {
                        const numericPH = parseFloat(pHValue);
                        return !isNaN(numericPH) ? numericPH.toFixed(2) : "N/A";
                      }
                      return "N/A";
                    })()}
                  </div>
                  <div className="text-xs text-yellow-500">pH</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Droplets className="w-4 h-4 text-blue-600 mr-1" />
                    <span className="text-xs font-medium text-blue-600">Moisture</span>
                  </div>
                  <div className="text-lg font-bold text-blue-700">{soilData.moisture_level?.toFixed(2)}%</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Leaf className="w-4 h-4 text-green-600 mr-1" />
                    <span className="text-xs font-medium text-green-600">Nitrogen</span>
                  </div>
                  <div className="text-lg font-bold text-green-700">{soilData.N?.toFixed(2)}</div>
                  <div className="text-xs text-green-500">ppm</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Zap className="w-4 h-4 text-purple-600 mr-1" />
                    <span className="text-xs font-medium text-purple-600">Phosphorus</span>
                  </div>
                  <div className="text-lg font-bold text-purple-700">{soilData.P?.toFixed(2)}</div>
                  <div className="text-xs text-purple-500">ppm</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 text-center col-span-2">
                  <div className="flex items-center justify-center mb-2">
                    <Activity className="w-4 h-4 text-orange-600 mr-1" />
                    <span className="text-xs font-medium text-orange-600">Potassium</span>
                  </div>
                  <div className="text-lg font-bold text-orange-700">{soilData.K?.toFixed(2)}</div>
                  <div className="text-xs text-orange-500">ppm</div>
                </div>
              </div>
            </div>

            {/* Soil Trends */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg mr-3">
                  <Activity className="w-4 h-4 text-purple-600" />
                </div>
                Soil Trends
              </h2>
              <div className="space-y-6">
                <div>
                  <div className="font-semibold text-xs text-gray-700 mb-1">pH Level</div>
                  // Example for pH Level chart
<ResponsiveContainer width="100%" height={120}>
  <LineChart
    data={historyData}
    margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
  >
    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
    <XAxis dataKey="timestamp" fontSize={12} tick={{ fill: "#64748b" }} />
    <YAxis fontSize={12} tick={{ fill: "#64748b" }} />
    <Tooltip />
    <Line
      type="monotone"
      dataKey="pH_level"
      stroke="#a78bfa"
      strokeWidth={3}
      dot={false}
    />
  </LineChart>
</ResponsiveContainer>
                </div>
                <div>
                  <div className="font-semibold text-xs text-gray-700 mb-1">Moisture (%)</div>
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={historyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" fontSize={10} />
                      <YAxis domain={['auto', 'auto']} fontSize={10} />
                      <Tooltip />
                      <Line type="monotone" dataKey="moisture_level" stroke="#3b82f6" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <div className="font-semibold text-xs text-gray-700 mb-1">Nitrogen (ppm)</div>
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={historyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" fontSize={10} />
                      <YAxis domain={['auto', 'auto']} fontSize={10} />
                      <Tooltip />
                      <Line type="monotone" dataKey="N" stroke="#22c55e" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <div className="font-semibold text-xs text-gray-700 mb-1">Phosphorus (ppm)</div>
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={historyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" fontSize={10} />
                      <YAxis domain={['auto', 'auto']} fontSize={10} />
                      <Tooltip />
                      <Line type="monotone" dataKey="P" stroke="#a78bfa" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <div className="font-semibold text-xs text-gray-700 mb-1">Potassium (ppm)</div>
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={historyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" fontSize={10} />
                      <YAxis domain={['auto', 'auto']} fontSize={10} />
                      <Tooltip />
                      <Line type="monotone" dataKey="K" stroke="#fb923c" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            
            {/* Status Message */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg p-4">
              <div className="text-center text-white font-semibold">✅ No urgent issues detected</div>
            </div>

            {/* Recommendations */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg mr-3">
                  <Info className="w-4 h-4 text-blue-600" />
                </div>
                Recommendations
              </h2>
              <div className="space-y-3">
                <div className="flex items-start p-3 bg-green-50 rounded-lg">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-sm text-gray-700">Maintain current pH level</span>
                </div>
                <div className="flex items-start p-3 bg-green-50 rounded-lg">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-sm text-gray-700">Soil moisture is adequate, no irrigation needed</span>
                </div>
                <div className="flex items-start p-3 bg-green-50 rounded-lg">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-sm text-gray-700">Apply phosphorus fertilizer: 15 kg/ha</span>
                </div>
                <div className="flex items-start p-3 bg-green-50 rounded-lg">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-sm text-gray-700">Potassium levels are balanced</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Score Card - No Data */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="text-center mb-6">
                <div className="flex items-center justify-center mb-2">
                  <span className="text-sm font-medium text-gray-400 mr-1">SOIL HEALTH SCORE</span>
                  <Info size={14} className="text-gray-300" />
                </div>
                <div className="text-6xl font-bold text-gray-300 mb-2">--</div>
                <div className="w-24 h-2 bg-gray-200 rounded-full mx-auto"></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <div className="w-4 h-4 bg-gray-400 rounded-full mr-1"></div>
                    <span className="text-xs font-medium text-gray-400">pH Level</span>
                  </div>
                  <div className="text-lg font-bold text-gray-400">No data</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Droplets className="w-4 h-4 text-gray-400 mr-1" />
                    <span className="text-xs font-medium text-gray-400">Moisture</span>
                  </div>
                  <div className="text-lg font-bold text-gray-400">No data</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Leaf className="w-4 h-4 text-gray-400 mr-1" />
                    <span className="text-xs font-medium text-gray-400">Nitrogen</span>
                  </div>
                  <div className="text-lg font-bold text-gray-400">No data</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Zap className="w-4 h-4 text-gray-400 mr-1" />
                    <span className="text-xs font-medium text-gray-400">Phosphorus</span>
                  </div>
                  <div className="text-lg font-bold text-gray-400">No data</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center col-span-2">
                  <div className="flex items-center justify-center mb-2">
                    <Activity className="w-4 h-4 text-gray-400 mr-1" />
                    <span className="text-xs font-medium text-gray-400">Potassium</span>
                  </div>
                  <div className="text-lg font-bold text-gray-400">No data</div>
                </div>
              </div>
            </div>

            {/* Status Message - No Data */}
            <div className="bg-gray-100 rounded-xl shadow-lg p-4">
              <div className="text-center text-gray-500 font-semibold">📊 No data available for analysis</div>
            </div>

            {/* Recommendations - No Data */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <div className="p-2 bg-gray-100 rounded-lg mr-3">
                  <Info className="w-4 h-4 text-gray-400" />
                </div>
                Recommendations
              </h2>
              <div className="text-center py-8">
                <div className="p-4 bg-gray-50 rounded-lg inline-block mb-4">
                  <Info className="w-8 h-8 text-gray-400 mx-auto" />
                </div>
                <p className="text-gray-500 font-medium">No data available</p>
                <p className="text-sm text-gray-400">Upload sensor data to get personalized recommendations</p>
              </div>
            </div>

            {/* Soil Trends - No Data */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <div className="p-2 bg-gray-100 rounded-lg mr-3">
                  <Activity className="w-4 h-4 text-gray-400" />
                </div>
                Soil Trends
              </h2>
              <div className="bg-gray-50 h-40 rounded-lg flex items-center justify-center border border-gray-200">
                <div className="text-center">
                  <Activity className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <div className="text-gray-500 text-sm">No data available</div>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="h-2" /> {/* Spacer to prevent content from touching nav */}
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

