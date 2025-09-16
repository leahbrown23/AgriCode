"use client"

import {
  ArrowLeft,
  Home,
  Menu,
  User,
  ChevronDown,
  Leaf,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Zap,
  Activity,
  Info,
  Settings,
  Save,
} from "lucide-react"
import { useEffect, useState, useRef } from "react"
import api from "../api/api"
import LoadingSpinner from "./LoadingSpinner"

// Crop-specific optimal ranges
const CROP_OPTIMAL_RANGES = {
  wheat: { N: [80, 200], P: [30, 80], K: [40, 120], pH_level: [6.0, 6.8] },
  tomato: { N: [100, 250], P: [50, 120], K: [80, 250], pH_level: [5.5, 6.8] },
  sugarcane: { N: [90, 200], P: [50, 100], K: [40, 150], pH_level: [5.0, 8.0] },
  maize: { N: [60, 200], P: [20, 100], K: [20, 150], pH_level: [5.5, 7.0] },
  potato: { N: [100, 300], P: [50, 120], K: [150, 250], pH_level: [5.5, 6.5] },
  rice: { N: [100, 200], P: [20, 70], K: [65, 120], pH_level: [5.5, 6.5] },
}

const DEFAULT_DESIRED = {
  pH_level: [6.0, 7.5],
  N: [30, 70],
  P: [20, 50],
  K: [150, 300],
}

const METRIC_INFO = {
  pH_level: {
    name: "pH Level",
    unit: "",
    icon: Activity,
    description: "Soil acidity/alkalinity affects nutrient availability",
  },
  N: {
    name: "Nitrogen (N)",
    unit: "ppm",
    icon: Leaf,
    description: "Essential for plant growth and chlorophyll production",
  },
  P: {
    name: "Phosphorus (P)",
    unit: "ppm",
    icon: Zap,
    description: "Crucial for root development and energy transfer",
  },
  K: {
    name: "Potassium (K)",
    unit: "ppm",
    icon: TrendingUp,
    description: "Improves disease resistance and water regulation",
  },
}

export default function InsightsScreen({
  onBackClick,
  onHomeClick,
  onProfileClick,
  onMenuClick,
}) {
  const [plotOptions, setPlotOptions] = useState([])
  const [selectedPlot, setSelectedPlot] = useState(() => localStorage.getItem("selectedInsightsPlot") || "")
  const [soilData, setSoilData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [customRanges, setCustomRanges] = useState(() => {
    const saved = localStorage.getItem("customSoilRanges")
    return saved ? JSON.parse(saved) : DEFAULT_DESIRED
  })
  const [showCustomSettings, setShowCustomSettings] = useState(false)
  const [tempRanges, setTempRanges] = useState(customRanges)
  const dropdownRef = useRef(null)

  // Get optimal ranges based on selected crop, with fallback to custom ranges
  function getOptimalRanges() {
    const selectedPlotInfo = plotOptions.find(opt => opt.value === selectedPlot)
    if (!selectedPlotInfo) return customRanges

    const cropType = selectedPlotInfo.crop.toLowerCase()
    const cropRanges = CROP_OPTIMAL_RANGES[cropType]
    
    // If we have crop-specific ranges and no custom ranges saved, use crop ranges
    if (cropRanges && !localStorage.getItem("customSoilRanges")) {
      return cropRanges
    }
    
    // Otherwise use custom ranges (which may have been set by user)
    return customRanges
  }

  const DESIRED = getOptimalRanges()

  // Helper function to classify nutrient values
  function classify(value, minVal, maxVal) {
    if (value == null || isNaN(value)) return "unknown"
    if (value < minVal) return "deficient"
    if (value > maxVal) return "excess"
    return "optimal"
  }

  /* Fetch plots with sensors - same logic as SoilHealthScreen */
  useEffect(() => {
    (async () => {
      try {
        const plotsRes = await api.get("/api/farm/plots/")
        const plotsRaw = plotsRes.data?.results || plotsRes.data || []
        
        // Fetch crop data separately
        const cropsRes = await api.get("/api/farm/crops/")
        const cropsRaw = cropsRes.data?.results || cropsRes.data || []
        
        // Create a map of plot_id to crop info
        const plotToCrop = new Map()
        cropsRaw.forEach(crop => {
          const plotId = String(crop.plot_number || crop.plot_code)
          const cropName = crop.crop_type || crop.name
          if (plotId && cropName) {
            plotToCrop.set(plotId, cropName)
          }
        })
        
        const allPlotIds = plotsRaw.map(p => String(p.plot_id))

        // 1) derive linked plots & sensor meta from sim
        const { plotSet: linkedFromSim, meta: simMeta } = await linkedPlotsFromSim()

        // 2) fallback/confirm by probing sensors/data to (a) mark as linked and (b) fetch sensorId
        const meta = new Map(simMeta) // start with what sim gave us
        const stillUnknown = allPlotIds.filter(pid => !linkedFromSim.has(pid))
        if (stillUnknown.length) {
          const checks = await Promise.allSettled(
            stillUnknown.map(pid => api.get(`/api/sensors/data/${encodeURIComponent(pid)}/`))
          )
          checks.forEach((r, i) => {
            const pid = stillUnknown[i]
            if (r.status === "fulfilled") {
              const payload = r.value?.data || {}

              // identify as linked if any data shape exists
              const hasData =
                !!payload?.linked_sensor_id ||
                !!payload?.sensor_id ||
                !!payload?.latest ||
                (Array.isArray(payload?.history) && payload.history.length > 0) ||
                (Array.isArray(payload?.readings) && payload.readings.length > 0)

              if (hasData) linkedFromSim.add(pid)

              // capture sensorId if present
              const latestLike =
                payload.latest || payload.latest_reading || payload.latestReading || payload
              const sensorId =
                payload.linked_sensor_id ??
                payload.sensor_id ??
                latestLike?.sensor_id ??
                latestLike?.sensor ??
                null

              if (!meta.has(pid)) meta.set(pid, {})
              if (sensorId != null) meta.get(pid).sensorId = String(sensorId)
            }
          })
        }

        // 3) filter & build labels "PlotID : CropVariety"
        const options = plotsRaw
          .filter(p => linkedFromSim.has(String(p.plot_id)))
          .map(p => {
            const pid = String(p.plot_id)
            const cropVar = plotToCrop.get(pid) || "Unknown Crop"
            return {
              value: pid,
              label: `Plot ${pid} : ${cropVar}`,
              crop: cropVar,
            }
          })

        setPlotOptions(options)

        // keep a valid selection only
        const saved = localStorage.getItem("selectedInsightsPlot")
        if (saved && options.find(o => String(o.value) === String(saved))) {
          setSelectedPlot(String(saved))
        } else if (options.length) {
          const def = String(options[0].value)
          setSelectedPlot(def)
          localStorage.setItem("selectedInsightsPlot", def)
        } else {
          setSelectedPlot("")
          localStorage.removeItem("selectedInsightsPlot")
        }
      } catch (err) {
        console.error("Failed to fetch plots/linked sensors:", err)
        setPlotOptions([])
        setSelectedPlot("")
      }
    })()
  }, [])

  // Update custom ranges when plot selection changes (if no custom ranges are saved)
  useEffect(() => {
    if (!localStorage.getItem("customSoilRanges") && selectedPlot) {
      const selectedPlotInfo = plotOptions.find(opt => opt.value === selectedPlot)
      if (selectedPlotInfo) {
        const cropType = selectedPlotInfo.crop.toLowerCase()
        const cropRanges = CROP_OPTIMAL_RANGES[cropType]
        if (cropRanges) {
          setCustomRanges(cropRanges)
          setTempRanges(cropRanges)
        }
      }
    }
  }, [selectedPlot, plotOptions])

  // tolerant parser for /api/sim/status/ that returns both set & meta
  async function linkedPlotsFromSim() {
    try {
      const res = await api.get("/api/sim/status/")
      const data = res.data

      // normalize into a flat array of device-ish objects
      const arrays = []
      if (Array.isArray(data)) arrays.push(data)
      else if (data && typeof data === "object")
        arrays.push(...Object.values(data).filter(Array.isArray))
      const devices = arrays.flat()

      const plotSet = new Set()
      const meta = new Map() // plotId -> { sensorId }

      devices.forEach((d) => {
        // try multiple shapes for plot id
        let pid = null
        if (d?.plot_id) pid = String(d.plot_id)
        else if (d?.plot_number) pid = String(d.plot_number)
        else if (typeof d?.plot === "number") pid = String(d.plot)
        else if (typeof d?.plot === "string") {
          const m = d.plot.match(/\d+/)
          pid = m ? m[0] : null
        } else if (typeof d?.plot_name === "string") {
          const m = d.plot_name.match(/\d+/)
          pid = m ? m[0] : null
        }
        if (!pid) return

        plotSet.add(pid)

        // sensor id in many shapes
        const sid =
          d.sensor_id ?? d.sensor ?? d.device_id ?? d.external_id ?? d.id ?? null
        if (!meta.has(pid)) meta.set(pid, {})
        if (sid != null) meta.get(pid).sensorId = String(sid)
      })

      return { plotSet, meta }
    } catch {
      return { plotSet: new Set(), meta: new Map() }
    }
  }

  /* Fetch soil data */
  useEffect(() => {
    if (!selectedPlot) {
      setSoilData(null)
      return
    }
    ;(async () => {
      setIsLoading(true)
      try {
        try {
          const res = await api.get(`/api/sensors/data/${encodeURIComponent(selectedPlot)}/`)
          const payload = res.data
          const latest = payload.latest || payload.latest_reading || payload[0] || payload
          setSoilData(normalizeReading(latest))
        } catch {
          const latestRes = await api.get(`/api/latest-reading/?plot_number=${encodeURIComponent(selectedPlot)}`)
          setSoilData(normalizeReading(latestRes.data))
        }
      } catch (err) {
        console.error("Error fetching insights data:", err)
        setSoilData(null)
      } finally {
        setIsLoading(false)
      }
    })()
  }, [selectedPlot])

  /* Close dropdown when clicking outside */
  useEffect(() => {
    if (!dropdownOpen) return
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    window.addEventListener("mousedown", handleClick)
    return () => window.removeEventListener("mousedown", handleClick)
  }, [dropdownOpen])

  /* Helpers */
  function normalizeReading(item = {}) {
    return {
      pH_level: safeNum(item.pH_level ?? item.ph),
      N: safeNum(item.N ?? item.n),
      P: safeNum(item.P ?? item.p),
      K: safeNum(item.K ?? item.k),
      // Removed moisture_level
    }
  }

  function safeNum(v) {
    if (v == null || v === "") return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }

  function withinRange(val, [min, max]) {
    return val != null && val >= min && val <= max
  }

  function getStatus(metric, val) {
    if (val == null) return { status: "unknown", color: "gray", text: "No Data" }
    const range = DESIRED[metric]
    if (!range) return { status: "unknown", color: "gray", text: "Unknown" }
    
    const classification = classify(val, range[0], range[1])
    
    switch (classification) {
      case "optimal":
        return { status: "optimal", color: "green", text: "Optimal" }
      case "deficient":
        const deficit = ((range[0] - val) / range[0]) * 100
        if (deficit > 30) return { status: "critical", color: "red", text: "Critical Low" }
        return { status: "low", color: "yellow", text: "Below Optimal" }
      case "excess":
        const excess = ((val - range[1]) / range[1]) * 100
        if (excess > 30) return { status: "critical", color: "red", text: "Critical High" }
        return { status: "high", color: "yellow", text: "Above Optimal" }
      default:
        return { status: "unknown", color: "gray", text: "Unknown" }
    }
  }

  function getPositionPercent(val, [min, max]) {
    if (val == null) return 0
    const extendedMin = min - (max - min) * 0.2
    const extendedMax = max + (max - min) * 0.2
    if (val < extendedMin) return 0
    if (val > extendedMax) return 100
    return ((val - extendedMin) / (extendedMax - extendedMin)) * 100
  }

  function getRecommendation(metric, val) {
    if (val == null) return "Check sensor connectivity."
    const status = getStatus(metric, val)
    
    switch (metric) {
      case "pH_level":
        if (status.status === "optimal") return "Maintain current pH through regular testing."
        if (val < DESIRED.pH_level[0]) return "Add lime to raise pH and improve nutrient uptake."
        return "Add sulfur or organic matter to lower pH."
      
      case "N":
        if (status.status === "optimal") return "Continue current nitrogen management."
        if (val < DESIRED.N[0]) return "Apply nitrogen fertilizer or compost."
        return "Reduce nitrogen input to prevent leaching."
      
      case "P":
        if (status.status === "optimal") return "Phosphorus levels are well managed."
        if (val < DESIRED.P[0]) return "Apply phosphorus fertilizer or bone meal."
        return "Reduce phosphorus to prevent runoff."
      
      case "K":
        if (status.status === "optimal") return "Potassium levels support healthy growth."
        if (val < DESIRED.K[0]) return "Apply potassium fertilizer or wood ash."
        return "Monitor for nutrient imbalances."
      
      default:
        return "Monitor regularly for changes."
    }
  }

  // Improved soil score calculation with better weightings and more forgiving penalties
  function calculateSoilScore(d) {
    const OPTIMAL_RANGES = DESIRED

    // More balanced weights - pH is less critical, nutrients more important
    const WEIGHTS = {
      pH_level: 0.15,  // Reduced from 0.20
      N: 0.40,         // Increased from 0.35 (most important for growth)
      P: 0.25,         // Keep same
      K: 0.20,         // Keep same
    }

    function getMetricHealthPercentage(value, range) {
      if (value == null || !range) return 50 // Give neutral score instead of 0
      const [min, max] = range
      const mid = (min + max) / 2
      
      if (value >= min && value <= max) {
        // Inside optimal range - much more forgiving
        const distanceFromCenter = Math.abs(value - mid)
        const maxDistanceFromCenter = (max - min) / 2
        const centerScore = 100 - (distanceFromCenter / maxDistanceFromCenter) * 10 // Reduced penalty from 20% to 10%
        return Math.max(85, centerScore) // Increased minimum from 80% to 85%
      } else if (value < min) {
        // Below optimal range - less harsh penalty
        const deficit = min - value
        const penaltyPercentage = (deficit / min) * 100
        return Math.max(20, 100 - penaltyPercentage * 1.2) // Reduced penalty from 2x to 1.2x
      } else {
        // Above optimal range - less harsh penalty
        const excess = value - max
        const penaltyPercentage = (excess / max) * 100
        return Math.max(30, 100 - penaltyPercentage * 1.0) // Reduced penalty from 1.5x to 1.0x
      }
    }

    const pH = safeNum(d.pH_level)
    const N = safeNum(d.N)
    const P = safeNum(d.P)
    const K = safeNum(d.K)

    const pHHealth = getMetricHealthPercentage(pH, OPTIMAL_RANGES.pH_level)
    const nHealth = getMetricHealthPercentage(N, OPTIMAL_RANGES.N)
    const pHealth = getMetricHealthPercentage(P, OPTIMAL_RANGES.P)
    const kHealth = getMetricHealthPercentage(K, OPTIMAL_RANGES.K)

    // Store individual scores in localStorage for SoilHealthScreen to use
    const individualScores = {
      pH_level: Math.round(pHHealth),
      N: Math.round(nHealth),
      P: Math.round(pHealth),
      K: Math.round(kHealth)
    }
    localStorage.setItem('soilHealthScores', JSON.stringify(individualScores))

    // Weighted average
    const weightedScore = (pHHealth * WEIGHTS.pH_level) + 
                         (nHealth * WEIGHTS.N) + 
                         (pHealth * WEIGHTS.P) + 
                         (kHealth * WEIGHTS.K)
    
    const finalScore = Math.round(weightedScore)
    
    // Store the final score and classification for SoilHealthScreen
    let classification = "Poor"
    if (finalScore >= 85) classification = "Excellent"
    else if (finalScore >= 70) classification = "Good" 
    else if (finalScore >= 55) classification = "Moderate"
    else if (finalScore >= 40) classification = "Fair"
    
    localStorage.setItem('soilHealthScore', finalScore.toString())
    localStorage.setItem('soilHealthClassification', classification)
    
    return finalScore
  }

  function getOverallHealth() {
    if (!soilData) return { score: 0, status: "unknown" }
    
    const score = calculateSoilScore(soilData)
    
    // Updated thresholds to match the stored classification
    let status = "poor"
    if (score >= 85) status = "excellent"
    else if (score >= 70) status = "good"
    else if (score >= 55) status = "moderate"
    else if (score >= 40) status = "fair"
    
    return { score, status }
  }

  function mostCriticalMetric(data) {
    let worst = { key: "", gap: -1, status: null }
    Object.entries(DESIRED).forEach(([k, range]) => {
      const val = data[k]
      if (val == null) return
      const status = getStatus(k, val)
      if (status.status === "critical") {
        const gap = Math.min(Math.abs(val - range[0]), Math.abs(val - range[1]))
        if (gap > worst.gap) worst = { key: k, gap, status }
      }
    })
    return worst.key ? worst : null
  }

  function handleCustomRangeChange(metric, index, value) {
    const newRanges = { ...tempRanges }
    if (!newRanges[metric]) newRanges[metric] = [0, 0]
    newRanges[metric][index] = parseFloat(value) || 0
    setTempRanges(newRanges)
  }

  function saveCustomRanges() {
    setCustomRanges(tempRanges)
    localStorage.setItem("customSoilRanges", JSON.stringify(tempRanges))
    setShowCustomSettings(false)
  }

  function resetToDefaults() {
    // Reset to crop-specific defaults if available, otherwise use DEFAULT_DESIRED
    const selectedPlotInfo = plotOptions.find(opt => opt.value === selectedPlot)
    let defaultRanges = DEFAULT_DESIRED
    
    if (selectedPlotInfo) {
      const cropType = selectedPlotInfo.crop.toLowerCase()
      const cropRanges = CROP_OPTIMAL_RANGES[cropType]
      if (cropRanges) {
        defaultRanges = cropRanges
      }
    }
    
    setTempRanges(defaultRanges)
    setCustomRanges(defaultRanges)
    localStorage.setItem("customSoilRanges", JSON.stringify(defaultRanges))
    setShowCustomSettings(false)
  }

  function resetToCropDefaults() {
    const selectedPlotInfo = plotOptions.find(opt => opt.value === selectedPlot)
    if (selectedPlotInfo) {
      const cropType = selectedPlotInfo.crop.toLowerCase()
      const cropRanges = CROP_OPTIMAL_RANGES[cropType]
      if (cropRanges) {
        setTempRanges(cropRanges)
      }
    }
  }

  const selectedPlotInfo = plotOptions.find(opt => opt.value === selectedPlot)
  const overallHealth = soilData ? getOverallHealth() : null
  const criticalMetric = soilData ? mostCriticalMetric(soilData) : null
  const hasCustomRanges = localStorage.getItem("customSoilRanges") !== null
  const hasCropSpecificRanges = selectedPlotInfo && CROP_OPTIMAL_RANGES[selectedPlotInfo.crop.toLowerCase()]

  /* Render */
  return (
    <div className="flex flex-col h-full pb-12">
      {/* Header */}
      <div className="p-4 bg-white flex items-center shadow-sm">
        <button onClick={onBackClick} className="mr-2 p-1 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold flex-1 text-center">Soil Health Insights</h1>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#d1e6b2] p-4 space-y-4">
        {/* Plot Filter */}
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center mb-3">
            <Leaf className="w-5 h-5 text-green-600 mr-2" />
            <label className="text-sm font-semibold text-gray-700">Select Plot for Analysis</label>
          </div>
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              className="w-full flex items-center justify-between border-2 border-green-300 rounded-2xl px-4 py-2 bg-white hover:border-green-400 transition-colors"
              onClick={() => setDropdownOpen(o => !o)}
              disabled={!plotOptions.length}
            >
              <span className="text-left">
                {selectedPlotInfo ? selectedPlotInfo.label : plotOptions.length === 0 ? "No plots with sensors available" : "Select a plot to analyze"}
              </span>
              <ChevronDown className="w-5 h-5 text-gray-400 ml-2" />
            </button>
            {dropdownOpen && plotOptions.length > 0 && (
              <div className="absolute z-20 mt-2 w-full bg-white rounded-2xl shadow-lg border border-green-100">
                {plotOptions.map(opt => (
                  <button
                    key={opt.value}
                    className={`w-full text-left px-4 py-2 text-base rounded-2xl transition-colors ${
                      selectedPlot === opt.value 
                        ? "bg-green-100 text-green-700 font-bold" 
                        : "hover:bg-green-50"
                    }`}
                    onClick={() => {
                      setSelectedPlot(opt.value)
                      localStorage.setItem("selectedInsightsPlot", opt.value)
                      setDropdownOpen(false)
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <LoadingSpinner />
            <p className="mt-2 text-gray-600">Analyzing soil health data...</p>
          </div>
        ) : soilData && selectedPlotInfo ? (
          <>
            {/* Overall Health Summary with Metrics Status */}
            <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl shadow-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800">Overall Soil Health</h2>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">{overallHealth?.score || 0}%</div>
                  <div className="text-sm text-gray-600 capitalize">{overallHealth?.status || "Unknown"}</div>
                </div>
              </div>
              <div className="text-sm text-gray-700 mb-4">
                <strong>Crop:</strong> {selectedPlotInfo.crop}
                <div className="text-xs text-gray-500 mt-1">
                  {hasCustomRanges ? "Using custom optimal ranges" : 
                   hasCropSpecificRanges ? `Using ${selectedPlotInfo.crop.toLowerCase()}-specific ranges` : 
                   "Using default ranges"}
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${
                    overallHealth?.score >= 85 ? "bg-green-500" :
                    overallHealth?.score >= 70 ? "bg-blue-500" :
                    overallHealth?.score >= 55 ? "bg-yellow-500" :
                    overallHealth?.score >= 40 ? "bg-orange-500" : "bg-red-500"
                  }`}
                  style={{ width: `${overallHealth?.score || 0}%` }}
                />
              </div>
              
              {/* Metrics Status List */}
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-800 text-sm mb-2">Metrics Status:</h3>
                {Object.entries(DESIRED).map(([metric, range]) => {
                  const val = soilData[metric]
                  const info = METRIC_INFO[metric]
                  
                  // Skip if metric info doesn't exist
                  if (!info) return null
                  
                  const status = getStatus(metric, val)
                  const IconComponent = info.icon

                  return (
                    <div key={metric} className="flex items-center justify-between py-1">
                      <div className="flex items-center">
                        <IconComponent className="w-4 h-4 text-green-600 mr-2" />
                        <span className="text-sm font-medium text-gray-700">{info.name}</span>
                      </div>
                      <div className={`text-sm font-semibold flex items-center ${
                        status.color === "green" ? "text-green-600" :
                        status.color === "yellow" ? "text-yellow-600" :
                        status.color === "red" ? "text-red-600" : "text-gray-500"
                      }`}>
                        {status.color === "green" && <CheckCircle className="w-3 h-3 mr-1" />}
                        {status.color === "red" && <XCircle className="w-3 h-3 mr-1" />}
                        {status.color === "yellow" && <AlertTriangle className="w-3 h-3 mr-1" />}
                        {status.text}
                      </div>
                    </div>
                  )
                }).filter(Boolean)}
              </div>
            </div>

            {/* Priority Action */}
            {criticalMetric && (
              <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl shadow-lg p-4">
                <div className="flex items-center text-white">
                  <AlertTriangle className="w-5 h-5 mr-3 flex-shrink-0" />
                  <div>
                    <div className="font-bold text-sm">PRIORITY ACTION REQUIRED</div>
                    <div className="text-sm opacity-90">
                      <strong>{METRIC_INFO[criticalMetric.key]?.name}</strong> needs immediate attention. 
                      {getRecommendation(criticalMetric.key, soilData[criticalMetric.key])}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Soil Metrics Analysis */}
            <div className="bg-white rounded-xl shadow-lg p-5">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-green-600" />
                Detailed Soil Analysis for {selectedPlotInfo.crop}
              </h2>
              <div className="space-y-6">
                {Object.entries(DESIRED).map(([metric, range]) => {
                  const val = soilData[metric]
                  const info = METRIC_INFO[metric]
                  
                  // Skip if metric info doesn't exist
                  if (!info) return null
                  
                  const status = getStatus(metric, val)
                  const pos = getPositionPercent(val, range)
                  const IconComponent = info.icon

                  return (
                    <div key={metric} className="border border-gray-100 rounded-lg p-4 space-y-3">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <IconComponent className="w-5 h-5 text-green-600 mr-2" />
                          <div>
                            <span className="font-semibold text-gray-800">{info.name}</span>
                            <div className="text-xs text-gray-500">{info.description}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-800">
                            {val != null ? `${val.toFixed(1)}${info.unit}` : "N/A"}
                          </div>
                          <div className={`text-sm font-semibold flex items-center justify-end ${
                            status.color === "green" ? "text-green-600" :
                            status.color === "yellow" ? "text-yellow-600" :
                            status.color === "red" ? "text-red-600" : "text-gray-500"
                          }`}>
                            {status.color === "green" && <CheckCircle className="w-4 h-4 mr-1" />}
                            {status.color === "red" && <XCircle className="w-4 h-4 mr-1" />}
                            {status.color === "yellow" && <AlertTriangle className="w-4 h-4 mr-1" />}
                            {status.text}
                          </div>
                        </div>
                      </div>

                      {/* Visual Bar */}
                      <div className="space-y-2">
                        <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
                          {/* Optimal range background */}
                          <div
                            className="absolute top-0 bottom-0 bg-green-200"
                            style={{
                              left: "20%",
                              width: "60%",
                            }}
                          />
                          {/* Current value indicator */}
                          {val != null && (
                            <div
                              className={`absolute top-0 bottom-0 w-3 rounded-full border-2 border-white ${
                                status.color === "green" ? "bg-green-600" :
                                status.color === "yellow" ? "bg-yellow-500" :
                                status.color === "red" ? "bg-red-500" : "bg-gray-400"
                              }`}
                              style={{ left: `${pos}%`, transform: "translateX(-50%)" }}
                            />
                          )}
                        </div>
                        
                        {/* Range labels */}
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Low</span>
                          <span className="font-semibold text-green-600">
                            Optimal: {range[0]} - {range[1]}{info.unit}
                          </span>
                          <span>High</span>
                        </div>
                      </div>

                      {/* Recommendation */}
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="flex items-start">
                          <Info className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                          <div className="text-sm text-blue-800">
                            <strong>Recommendation:</strong> {getRecommendation(metric, val)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                }).filter(Boolean)}
              </div>
            </div>

            {/* Custom Settings Section */}
            <div className="bg-white rounded-xl shadow-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800 flex items-center">
                  <Settings className="w-5 h-5 mr-2 text-green-600" />
                  Optimal Range Settings
                </h3>
                <button
                  onClick={() => {
                    setShowCustomSettings(!showCustomSettings)
                    setTempRanges(customRanges)
                  }}
                  className="text-green-600 hover:text-green-700 font-medium text-sm"
                >
                  {showCustomSettings ? "Hide" : "Customize"}
                </button>
              </div>

              {showCustomSettings && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Adjust the optimal ranges for your specific crop and soil conditions. Changes will update all insights and recommendations.
                  </p>
                  
                  {Object.entries(METRIC_INFO).map(([metric, info]) => (
                    <div key={metric} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center mb-2">
                        <info.icon className="w-4 h-4 text-green-600 mr-2" />
                        <span className="font-medium text-gray-800">{info.name}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="flex-1">
                          <label className="text-xs text-gray-500">Min</label>
                          <input
                            type="number"
                            step="0.1"
                            value={tempRanges[metric]?.[0] || 0}
                            onChange={(e) => handleCustomRangeChange(metric, 0, e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <span className="text-gray-400">-</span>
                        <div className="flex-1">
                          <label className="text-xs text-gray-500">Max</label>
                          <input
                            type="number"
                            step="0.1"
                            value={tempRanges[metric]?.[1] || 0}
                            onChange={(e) => handleCustomRangeChange(metric, 1, e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <span className="text-xs text-gray-500 min-w-8">{info.unit}</span>
                      </div>
                    </div>
                  ))}

                  <div className="flex space-x-3 pt-3 border-t">
                    <button
                      onClick={saveCustomRanges}
                      className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium flex items-center justify-center hover:bg-green-700 transition-colors"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </button>
                    {hasCropSpecificRanges && (
                      <button
                        onClick={resetToCropDefaults}
                        className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-600 transition-colors"
                      >
                        Use {selectedPlotInfo.crop} Defaults
                      </button>
                    )}
                    <button
                      onClick={resetToDefaults}
                      className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-600 transition-colors"
                    >
                      Reset to Defaults
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Additional Insights */}
            <div className="bg-white rounded-xl shadow-lg p-5">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                Additional Insights
              </h3>
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <span>
                    <strong>Crop-Specific Analysis:</strong> {hasCropSpecificRanges ? 
                      `Ranges optimized for ${selectedPlotInfo.crop.toLowerCase()} cultivation` : 
                      "Using general soil health ranges"}.
                  </span>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <span>
                    <strong>Seasonal Tip:</strong> Soil nutrient needs vary by crop growth stage and season.
                  </span>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <span>
                    <strong>Monitor Frequency:</strong> Check soil health weekly during growing season.
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : selectedPlot ? (
          <div className="bg-white rounded-xl shadow-lg p-6 text-center text-gray-500">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <h3 className="font-semibold mb-2">No Data Available</h3>
            <p className="text-sm">Unable to retrieve soil data for this plot. Please check sensor connectivity.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-6 text-center text-gray-500">
            <Leaf className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <h3 className="font-semibold mb-2">Select a Plot</h3>
            <p className="text-sm">Choose a plot above to view detailed soil health insights and recommendations.</p>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-around items-center h-12 border-t bg-white shadow-lg">
        <button 
          onClick={onHomeClick} 
          className="flex flex-col items-center justify-center w-1/3 hover:bg-gray-50 transition-colors"
        >
          <Home size={20} className="text-gray-600" />
        </button>
        <button 
          onClick={onProfileClick} 
          className="flex flex-col items-center justify-center w-1/3 hover:bg-gray-50 transition-colors"
        >
          <User size={20} className="text-gray-600" />
        </button>
        <button 
          onClick={onMenuClick} 
          className="flex flex-col items-center justify-center w-1/3 hover:bg-gray-50 transition-colors"
        >
          <Menu size={20} className="text-gray-600" />
        </button>
      </div>
    </div>
  )
}