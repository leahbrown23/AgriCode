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
import { getOptimalRanges, calculateSoilScore, getScoreClassification } from "../utils/soilHealthCalculator"

// Soil type preferences for each crop (moved from utility since it's only used here)
const SOIL_TYPE_PREFERENCES = {
  wheat: ["loamy", "clay", "silt"],
  tomato: ["loamy", "sandy", "silt"],
  sugarcane: ["clay", "loamy", "silt"],
  maize: ["loamy", "clay", "sandy"],
  potato: ["sandy", "loamy", "silt"],
  rice: ["clay", "loamy", "silt"],
}

// Crop-specific optimal ranges (for crop recommendations only)
const CROP_OPTIMAL_RANGES = {
  wheat: { N: [80, 200], P: [30, 80], K: [40, 120], pH_level: [6.0, 6.8] },
  tomato: { N: [100, 250], P: [50, 120], K: [80, 250], pH_level: [5.5, 6.8] },
  sugarcane: { N: [90, 200], P: [50, 100], K: [40, 150], pH_level: [5.0, 8.0] },
  maize: { N: [60, 200], P: [20, 100], K: [20, 150], pH_level: [5.5, 7.0] },
  potato: { N: [100, 300], P: [50, 120], K: [150, 250], pH_level: [5.5, 6.5] },
  rice: { N: [100, 200], P: [20, 70], K: [65, 120], pH_level: [5.5, 6.5] },
}

// Add this after CROP_OPTIMAL_RANGES constant
const CROP_DETAILS = {
  wheat: {
    season: "Winter/Spring",
    growthPeriod: "120-150 days",
    waterRequirement: "Medium",
    difficulty: "Easy",
    marketValue: "Stable",
    description: "Hardy cereal crop, good for beginners"
  },
  tomato: {
    season: "Spring/Summer", 
    growthPeriod: "75-90 days",
    waterRequirement: "High",
    difficulty: "Medium",
    marketValue: "High",
    description: "High-value vegetable, requires careful management"
  },
  sugarcane: {
    season: "Year-round",
    growthPeriod: "12-18 months", 
    waterRequirement: "High",
    difficulty: "Medium",
    marketValue: "Stable",
    description: "Long-term crop with consistent returns"
  },
  maize: {
    season: "Summer",
    growthPeriod: "90-120 days",
    waterRequirement: "Medium",
    difficulty: "Easy", 
    marketValue: "Stable",
    description: "Versatile crop with multiple uses"
  },
  potato: {
    season: "Cool seasons",
    growthPeriod: "70-90 days",
    waterRequirement: "Medium",
    difficulty: "Easy",
    marketValue: "Stable", 
    description: "Fast-growing, good soil aerator"
  },
  rice: {
    season: "Monsoon",
    growthPeriod: "120-150 days",
    waterRequirement: "Very High",
    difficulty: "Medium",
    marketValue: "Stable",
    description: "Staple crop, requires flooded fields"
  }
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
    unit: "mg/kg",
    icon: Leaf,
    description: "Essential for plant growth and chlorophyll production",
  },
  P: {
    name: "Phosphorus (P)",
    unit: "mg/kg",
    icon: Zap,
    description: "Crucial for root development and energy transfer",
  },
  K: {
    name: "Potassium (K)",
    unit: "mg/kg",
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
    return saved ? JSON.parse(saved) : null
  })
  const [showCustomSettings, setShowCustomSettings] = useState(false)
  const [tempRanges, setTempRanges] = useState({})
  const [plotSoilType, setPlotSoilType] = useState(null)
  const [plotsWithSensors, setPlotsWithSensors] = useState(new Set())
  const dropdownRef = useRef(null)

  // polling timer ref (same as SoilHealthScreen)
  const pollTimerRef = useRef(null)

  // Get optimal ranges using shared utility
  const selectedPlotInfo = plotOptions.find(opt => opt.value === selectedPlot)
  const DESIRED = getOptimalRanges(selectedPlotInfo)

  // Update tempRanges when customRanges or selected plot changes
  useEffect(() => {
    setTempRanges(getOptimalRanges(selectedPlotInfo))
  }, [selectedPlot, customRanges, plotOptions])

  // Helper function to classify nutrient values
  function classify(value, minVal, maxVal) {
    if (value == null || isNaN(value)) return "unknown"
    if (value < minVal) return "deficient"
    if (value > maxVal) return "excess"
    return "optimal"
  }

  // Function to get single ML crop recommendation
  async function getMLCropRecommendation(soilData, currentSoilType) {
    if (!soilData) return null

    try {
      // Ensure we have all required fields with default values
      const payload = {
        N: soilData.N || 100,
        P: soilData.P || 50,
        K: soilData.K || 100,
        pH: soilData.pH_level || 6.5,
        Temperature: soilData.Temperature || 25,
        Humidity: soilData.Humidity || 60,
        Rainfall: soilData.Rainfall || 500,
        Soil_Type: currentSoilType || "Loamy",
      }

      console.log("Sending ML recommendation request:", payload)
      
      const res = await api.post("/ml/recommend-crop/", payload)
      console.log("ML recommendation response:", res.data)
      
      // Handle the single recommendation format
      const recommendation = res.data.recommendation
      
      if (recommendation && recommendation.crop) {
        // Clean up crop name in case there are any formatting issues
        let cropName = recommendation.crop.toString().toLowerCase().trim()
        
        // Ensure it's a valid crop name
        const validCrops = ['wheat', 'tomato', 'sugarcane', 'maize', 'potato', 'rice']
        if (!validCrops.includes(cropName)) {
          console.warn(`Invalid crop name received: ${cropName}, defaulting to maize`)
          cropName = 'maize'
        }
        
        return {
          crop: cropName,
          mlConfidence: parseInt(recommendation.ml_confidence) || 75,
          compatibilityScore: parseInt(recommendation.compatibility_score) || getCompatibilityScore(cropName, soilData),
          soilTypeCompatible: SOIL_TYPE_PREFERENCES[cropName]?.includes(currentSoilType?.toLowerCase()) || false,
        }
      }
      
      return null
    } catch (err) {
      console.error("ML recommendation failed:", err)
      console.error("Error details:", err.response?.data)
      console.error("Error status:", err.response?.status)
      return null
    }
  }

  // Add helper function for compatibility calculation
  function getCompatibilityScore(cropName, soilData) {
    if (!CROP_OPTIMAL_RANGES[cropName] || !soilData) return 50
    
    const ranges = CROP_OPTIMAL_RANGES[cropName]
    let score = 0
    let totalMetrics = 0
    
    Object.entries(ranges).forEach(([nutrient, [min, max]]) => {
      const currentValue = soilData[nutrient]
      if (currentValue != null) {
        totalMetrics++
        if (currentValue >= min && currentValue <= max) {
          score += 100
        } else {
          const mid = (min + max) / 2
          const range = max - min
          const distance = Math.abs(currentValue - mid)
          const normalizedDistance = distance / (range / 2)
          const partialScore = Math.max(0, 100 - (normalizedDistance * 40))
          score += partialScore
        }
      }
    })
    
    return totalMetrics > 0 ? Math.round(score / totalMetrics) : 50
  }

  /* ---------------- helper: find plots that have sensors (same as SoilHealthScreen) ---------------- */
  async function linkedPlotsFromSim() {
    try {
      const res = await api.get("/api/sim/status/")
      const data = res.data

      // sim/status can be various shapes, normalize to flat array of devices
      const arrays = []
      if (Array.isArray(data)) arrays.push(data)
      else if (data && typeof data === "object") {
        arrays.push(...Object.values(data).filter(Array.isArray))
      }
      const devices = arrays.flat()

      const plotSet = new Set()
      const meta = new Map()

      devices.forEach((d) => {
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

        const sid =
          d.sensor_id ??
          d.sensor ??
          d.device_id ??
          d.external_id ??
          d.id ??
          null

        if (!meta.has(pid)) meta.set(pid, {})
        if (sid != null) meta.get(pid).sensorId = String(sid)
      })

      return { plotSet, meta }
    } catch {
      return { plotSet: new Set(), meta: new Map() }
    }
  }

  /* ---------------- initial load of plots / crops / sensor mapping (same as SoilHealthScreen) ---------------- */
  useEffect(() => {
    ;(async () => {
      try {
        // get plots
        const plotsRes = await api.get("/api/farm/plots/")
        const plotsRaw = plotsRes.data?.results || plotsRes.data || []

        // get crops
        const cropsRes = await api.get("/api/farm/crops/")
        const cropsRaw = cropsRes.data?.results || cropsRes.data || []

        // map plot -> crop meta
        const plotToCrop = new Map()
        cropsRaw.forEach((crop) => {
          const plotId = String(crop.plot_number || crop.plot_code)
          const cropName = crop.crop_type || crop.name
          const soilType = crop.soil_type
          if (plotId && cropName) {
            plotToCrop.set(plotId, { cropName, soilType })
          }
        })

        // collect all plot ids
        const allPlotIds = plotsRaw.map((p) => String(p.plot_id))

        // figure out which plots actually have active sensors
        const { plotSet: linkedFromSim, meta: simMeta } = await linkedPlotsFromSim()
        const meta = new Map(simMeta)

        // fallback check per-plot via /api/sensors/data/<plotId>/ if sim/status didn't list them
        const stillUnknown = allPlotIds.filter((pid) => !linkedFromSim.has(pid))
        if (stillUnknown.length) {
          const checks = await Promise.allSettled(
            stillUnknown.map((pid) =>
              api.get(`/api/sensors/data/${encodeURIComponent(pid)}/`)
            )
          )

          checks.forEach((r, i) => {
            const pid = stillUnknown[i]
            if (r.status === "fulfilled") {
              const payload = r.value?.data || {}

              const hasData =
                !!payload?.linked_sensor_id ||
                !!payload?.sensor_id ||
                !!payload?.latest ||
                (Array.isArray(payload?.history) &&
                  payload.history.length > 0) ||
                (Array.isArray(payload?.readings) &&
                  payload.readings.length > 0)

              if (hasData) linkedFromSim.add(pid)

              const latestLike =
                payload.latest ||
                payload.latest_reading ||
                payload.latestReading ||
                payload
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

        // Build dropdown options = plots that actually have sensor data
        const options = plotsRaw
          .filter((p) => linkedFromSim.has(String(p.plot_id)))
          .map((p) => {
            const pid = String(p.plot_id)
            const m = meta.get(pid) || {}
            const sensorId = m.sensorId || "—"
            const cropInfo = plotToCrop.get(pid)
            const cropVar = cropInfo?.cropName || "—"
            return {
              value: pid,
              label: `Plot ${pid} : ${cropVar}`,
              crop: cropVar,
              soilType: cropInfo?.soilType || null,
            }
          })

        setPlotsWithSensors(linkedFromSim)
        setPlotOptions(options)

        // restore selection (or choose default)
        const saved = localStorage.getItem("selectedInsightsPlot")
        if (saved && options.find((o) => String(o.value) === String(saved))) {
          setSelectedPlot(String(saved))
          const selectedOption = options.find(o => String(o.value) === String(saved))
          setPlotSoilType(selectedOption?.soilType || null)
        } else if (options.length) {
          const def = String(options[0].value)
          setSelectedPlot(def)
          localStorage.setItem("selectedInsightsPlot", def)
          setPlotSoilType(options[0].soilType || null)
        } else {
          setSelectedPlot("")
          localStorage.removeItem("selectedInsightsPlot")
          setPlotSoilType(null)
        }
      } catch (err) {
        console.error("Failed to fetch plots/linked sensors:", err)
        setPlotOptions([])
        setSelectedPlot("")
        setPlotSoilType(null)
      }
    })()
  }, [])

  /* ---------------- fetch latest + history (same as SoilHealthScreen) ---------------- */
  async function fetchLatestAndHistory(plotId) {
    // We now rely ONLY on /api/latest-reading/ and /api/reading-history/
    // which your backend exposes and which match reading_views.py
    const [latestRes, histRes] = await Promise.all([
      api.get(
        `/api/latest-reading/?plot_number=${encodeURIComponent(plotId)}`
      ),
      api.get(
        `/api/reading-history/?plot_number=${encodeURIComponent(plotId)}`
      ),
    ])

    // normalize latest
    const latestReading = normalizeReading(latestRes.data)

    // normalize history
    const histRaw = Array.isArray(histRes.data) ? histRes.data : []
    const histNorm = histRaw
      .map(normalizeReading)
      .filter(isCompleteReading)

    return { latest: latestReading, history: histNorm }
  }

  /* ---------------- poll loop for the currently selected plot (same as SoilHealthScreen) ---------------- */
  useEffect(() => {
    // whenever selectedPlot changes, clear old data, load fresh,
    // and start polling every 5s
    if (!selectedPlot) {
      setSoilData(null)
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
      return
    }

    let isAlive = true
    setIsLoading(true)

    async function loadOnce() {
      try {
        const { latest, history } = await fetchLatestAndHistory(selectedPlot)
        if (!isAlive) return
        setSoilData(latest)
        // We don't need history for insights, but we could store it if needed
      } catch (err) {
        console.error("Error fetching insights data:", err)
        if (!isAlive) return
        setSoilData(null)
      } finally {
        if (isAlive) {
          setIsLoading(false)
        }
      }
    }

    // first immediate load
    loadOnce()

    // start polling after first load
    // NOTE: you can tune interval (5000ms here = 5s)
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
    }
    pollTimerRef.current = setInterval(loadOnce, 5000)

    return () => {
      isAlive = false
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
    }
  }, [selectedPlot])

  useEffect(() => {
    if (selectedPlot && plotOptions.length > 0) {
      const selectedOption = plotOptions.find(opt => opt.value === selectedPlot)
      setPlotSoilType(selectedOption?.soilType || null)
    }
  }, [selectedPlot, plotOptions])

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

  /* ---------------- helpers (same as SoilHealthScreen) ---------------- */
  function normalizeReading(item = {}) {
    if (!item) return null
    const ts =
      item.timestamp ||
      item.ts ||
      item.created_at ||
      item.time ||
      null

    return {
      timestamp: ts,
      pH_level: safeNum(item.pH_level ?? item.ph_level ?? item.ph ?? null),
      N: safeNum(item.N ?? item.n ?? null),
      P: safeNum(item.P ?? item.p ?? null),
      K: safeNum(item.K ?? item.k ?? null),
      moisture_level: safeNum(
        item.moisture_level ?? item.moisture ?? null
      ),
      plot_id: item.plot_id ?? item.plot_number ?? item.plot ?? null,
      sensor_id: item.sensor_id ?? item.sensor ?? null,
      Temperature: safeNum(item.Temperature ?? item.temperature ?? null),
      Humidity: safeNum(item.Humidity ?? item.humidity ?? null),
      Rainfall: safeNum(item.Rainfall ?? item.rainfall ?? null),
    }
  }

  function isCompleteReading(r) {
    return (
      r &&
      r.timestamp &&
      r.pH_level != null &&
      r.N != null &&
      r.P != null &&
      r.K != null
    )
  }

  function safeNum(v) {
    if (v === null || v === undefined || v === "") return null
    const n =
      typeof v === "string"
        ? Number(v.replace(/,/g, "."))
        : Number(v)
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
        if (status.status === "optimal") return "Maintain current pH."
        if (val < DESIRED.pH_level[0]) return "Add lime to raise pH."
        return "Add sulfur/organic matter to lower pH."
      case "N":
        if (status.status === "optimal") return "Nitrogen is balanced."
        if (val < DESIRED.N[0]) return "Apply nitrogen fertilizer or compost."
        return "Reduce nitrogen input to avoid leaching."
      case "P":
        if (status.status === "optimal") return "Phosphorus is balanced."
        if (val < DESIRED.P[0]) return "Add phosphorus fertilizer or bone meal."
        return "Reduce phosphorus to prevent runoff."
      case "K":
        if (status.status === "optimal") return "Potassium is balanced."
        if (val < DESIRED.K[0]) return "Apply potassium fertilizer or wood ash."
        return "Reduce potassium input."
      default:
        return "Monitor regularly."
    }
  }

  // Use shared soil score calculation
  function getOverallHealth() {
    if (!soilData) return { score: 0, status: "unknown" }
    
    const result = calculateSoilScore(soilData, DESIRED, selectedPlot)
    
    let status = "poor"
    if (result.score >= 85) status = "excellent"
    else if (result.score >= 70) status = "good"
    else if (result.score >= 55) status = "moderate"
    else if (result.score >= 40) status = "fair"
    
    return { score: result.score, status }
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
    localStorage.removeItem("customSoilRanges")
    setCustomRanges(null)
    const newRanges = getOptimalRanges(selectedPlotInfo)
    setTempRanges(newRanges)
    setShowCustomSettings(false)
  }

  function resetToCropDefaults() {
    if (selectedPlotInfo) {
      const cropType = selectedPlotInfo.crop.toLowerCase()
      const cropRanges = CROP_OPTIMAL_RANGES[cropType]
      if (cropRanges) {
        setTempRanges(cropRanges)
      }
    }
  }

  const overallHealth = soilData ? getOverallHealth() : null
  const criticalMetric = soilData ? mostCriticalMetric(soilData) : null
  const hasCustomRanges = localStorage.getItem("customSoilRanges") !== null
  const hasCropSpecificRanges =
    selectedPlotInfo && CROP_OPTIMAL_RANGES[selectedPlotInfo.crop.toLowerCase()]

  // State for single ML recommendation and current crop analysis
  const [mlRecommendation, setMlRecommendation] = useState(null)
  const [currentCropAnalysis, setCurrentCropAnalysis] = useState(null)
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false)

  // Fetch ML recommendation and analyze current crop
  useEffect(() => {
    if (soilData && plotSoilType !== undefined && selectedPlotInfo) {
      setIsLoadingRecommendations(true)
      
      // Get ML recommendation
      getMLCropRecommendation(soilData, plotSoilType)
        .then(recommendation => {
          setMlRecommendation(recommendation)
        })
        .catch(err => {
          console.error("Failed to get ML recommendation:", err)
          setMlRecommendation(null)
        })
      
      // Analyze current crop if we have one
      if (selectedPlotInfo.crop && selectedPlotInfo.crop !== "Unknown Crop") {
        const currentCrop = selectedPlotInfo.crop.toLowerCase()
        try {
          // Calculate compatibility for current crop using the same logic
          const compatibilityScore = getCompatibilityScore(currentCrop, soilData)
          setCurrentCropAnalysis({
            crop: currentCrop,
            compatibilityScore: compatibilityScore,
            soilTypeCompatible: SOIL_TYPE_PREFERENCES[currentCrop]?.includes(plotSoilType?.toLowerCase()) || false,
          })
        } catch (err) {
          console.error("Failed to analyze current crop:", err)
          setCurrentCropAnalysis(null)
        }
      } else {
        setCurrentCropAnalysis(null)
      }
      
      setIsLoadingRecommendations(false)
    } else {
      setMlRecommendation(null)
      setCurrentCropAnalysis(null)
    }
  }, [soilData, plotSoilType, selectedPlotInfo])

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
            <label className="text-sm font-semibold text-gray-700">
              Select Plot for Analysis
            </label>
          </div>
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              className="w-full flex items-center justify-between border-2 border-green-300 rounded-2xl px-4 py-2 bg-white hover:border-green-400 transition-colors"
              onClick={() => setDropdownOpen(o => !o)}
              disabled={!plotOptions.length}
            >
              <span className="text-left">
                {selectedPlotInfo
                  ? selectedPlotInfo.label
                  : plotOptions.length === 0
                  ? "No plots with sensors available"
                  : "Select a plot to analyze"}
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
            {/* Overall Health Summary */}
            <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl shadow-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800">Overall Soil Health</h2>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    {overallHealth?.score || 0}%
                  </div>
                  <div className="text-sm text-gray-600 capitalize">
                    {overallHealth?.status || "Unknown"}
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-700 mb-4">
                <strong>Crop:</strong> {selectedPlotInfo.crop}
                <div className="text-xs text-gray-500 mt-1">
                  {hasCustomRanges
                    ? "Using custom optimal ranges"
                    : hasCropSpecificRanges
                    ? `Using ${selectedPlotInfo.crop.toLowerCase()}-specific ranges`
                    : "Using default ranges"}
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${
                    overallHealth?.score >= 85
                      ? "bg-green-500"
                      : overallHealth?.score >= 70
                      ? "bg-blue-500"
                      : overallHealth?.score >= 55
                      ? "bg-yellow-500"
                      : overallHealth?.score >= 40
                      ? "bg-orange-500"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${overallHealth?.score || 0}%` }}
                />
              </div>

              {/* Metrics Status List */}
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-800 text-sm mb-2">
                  Metrics Status:
                </h3>
                {Object.entries(DESIRED)
                  .map(([metric, range]) => {
                    const val = soilData[metric]
                    const info = METRIC_INFO[metric]
                    if (!info) return null
                    const status = getStatus(metric, val)
                    const IconComponent = info.icon
                    return (
                      <div
                        key={metric}
                        className="flex items-center justify-between py-1"
                      >
                        <div className="flex items-center">
                          <IconComponent className="w-4 h-4 text-green-600 mr-2" />
                          <span className="text-sm font-medium text-gray-700">
                            {info.name}
                          </span>
                        </div>
                        <div
                          className={`text-sm font-semibold flex items-center ${
                            status.color === "green"
                              ? "text-green-600"
                              : status.color === "yellow"
                              ? "text-yellow-600"
                              : status.color === "red"
                              ? "text-red-600"
                              : "text-gray-500"
                          }`}
                        >
                          {status.color === "green" && (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          )}
                          {status.color === "red" && (
                            <XCircle className="w-3 h-3 mr-1" />
                          )}
                          {status.color === "yellow" && (
                            <AlertTriangle className="w-3 h-3 mr-1" />
                          )}
                          {status.text}
                        </div>
                      </div>
                    )
                  })
                  .filter(Boolean)}
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
                      <strong>{METRIC_INFO[criticalMetric.key]?.name}</strong>{" "}
                      needs immediate attention.{" "}
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
                {Object.entries(DESIRED)
                  .map(([metric, range]) => {
                    const val = soilData[metric]
                    const info = METRIC_INFO[metric]
                    if (!info) return null
                    const status = getStatus(metric, val)
                    const pos = getPositionPercent(val, range)
                    const IconComponent = info.icon

                    return (
                      <div
                        key={metric}
                        className="border border-gray-100 rounded-lg p-4 space-y-3"
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <IconComponent className="w-5 h-5 text-green-600 mr-2" />
                            <div>
                              <span className="font-semibold text-gray-800">
                                {info.name}
                              </span>
                              <div className="text-xs text-gray-500">
                                {info.description}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-gray-800">
                              {val != null ? `${val.toFixed(1)}${info.unit}` : "N/A"}
                            </div>
                            <div
                              className={`text-sm font-semibold flex items-center justify-end ${
                                status.color === "green"
                                  ? "text-green-600"
                                  : status.color === "yellow"
                                  ? "text-yellow-600"
                                  : status.color === "red"
                                  ? "text-red-600"
                                  : "text-gray-500"
                              }`}
                            >
                              {status.color === "green" && (
                                <CheckCircle className="w-4 h-4 mr-1" />
                              )}
                              {status.color === "red" && (
                                <XCircle className="w-4 h-4 mr-1" />
                              )}
                              {status.color === "yellow" && (
                                <AlertTriangle className="w-4 h-4 mr-1" />
                              )}
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
                                  status.color === "green"
                                    ? "bg-green-600"
                                    : status.color === "yellow"
                                    ? "bg-yellow-500"
                                    : status.color === "red"
                                    ? "bg-red-500"
                                    : "bg-gray-400"
                                }`}
                                style={{ left: `${pos}%`, transform: "translateX(-50%)" }}
                              />
                            )}
                          </div>
                          {/* Range labels */}
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Low</span>
                            <span className="font-semibold text-green-600">
                              Optimal: {range[0]} - {range[1]}
                              {info.unit}
                            </span>
                            <span>High</span>
                          </div>
                        </div>

                        {/* Recommendation */}
                        <div className="bg-blue-50 rounded-lg p-3">
                          <div className="flex items-start">
                            <Info className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-blue-800">
                              <strong>Recommendation:</strong>{" "}
                              {getRecommendation(metric, val)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                  .filter(Boolean)}
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
                    if (!showCustomSettings) {
                      setTempRanges(DESIRED)
                    }
                  }}
                  className="text-green-600 hover:text-green-700 font-medium text-sm"
                >
                  {showCustomSettings ? "Hide" : "Customize"}
                </button>
              </div>
              {showCustomSettings && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Adjust the optimal ranges for your specific crop and soil conditions.
                    Changes will update all insights and recommendations.
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
                            onChange={(e) =>
                              handleCustomRangeChange(metric, 0, e.target.value)
                            }
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
                            onChange={(e) =>
                              handleCustomRangeChange(metric, 1, e.target.value)
                            }
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <span className="text-xs text-gray-500 min-w-8">
                          {info.unit}
                        </span>
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

            {/* Single ML Recommendation + Current Crop Analysis */}
            <div className="bg-white rounded-xl shadow-lg p-5">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center">
                <Leaf className="w-5 h-5 mr-2 text-green-600" />
                Crop Recommendation
              </h3>

              {soilData ? (
                <>
                  <div className="text-sm text-gray-600 mb-4">
                    <strong>Current Soil Type:</strong>{" "}
                    {plotSoilType
                      ? plotSoilType.charAt(0).toUpperCase() + plotSoilType.slice(1)
                      : "Unknown"}
                  </div>
                  
                  {isLoadingRecommendations ? (
                    <div className="text-center py-4">
                      <LoadingSpinner />
                      <p className="text-sm text-gray-600 mt-2">Getting ML prediction...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* ML Recommendation */}
                      {mlRecommendation ? (
                        <div className="border-2 border-green-400 rounded-lg p-4 bg-green-50">
                          <div className="flex items-center mb-3">
                            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
                              AI
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-lg text-gray-800 capitalize">
                                  {mlRecommendation.crop}
                                </span>
                                <div className="text-right">
                                  <div className="text-xl font-bold text-green-600">
                                    
                                  </div>
                                
                                </div>
                              </div>
                              <div className="text-sm text-green-700 font-medium">
                                Recommended Crop
                              </div>
                            </div>
                          </div>

                          {/* ML Recommendation Details */}
<div className="grid grid-cols-1 gap-3 mb-3">
  <div
    className={`rounded p-3 ${
      mlRecommendation.soilTypeCompatible ? "bg-green-100" : "bg-orange-100"
    }`}
  >
    <div className="text-xs font-medium flex items-center">
      {mlRecommendation.soilTypeCompatible ? (
        <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
      ) : (
        <XCircle className="w-3 h-3 text-orange-500 mr-1" />
      )}
      <span
        className={
          mlRecommendation.soilTypeCompatible
            ? "text-green-600"
            : "text-orange-600"
        }
      >
        Soil Type Match
      </span>
    </div>
    <div
      className={`text-sm font-medium ${
        mlRecommendation.soilTypeCompatible
          ? "text-green-700"
          : "text-orange-700"
      }`}
    >
      {mlRecommendation.soilTypeCompatible ? "Excellent" : "Consider"}
    </div>
  </div>
</div>


                          

                          <div className="bg-blue-50 rounded-lg p-3">
                            <div className="flex items-start">
                              <Info className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                              <div className="text-sm text-blue-800">
                                <strong>Recommendation:</strong> Based on your soil conditions, our machine learning model predicts {mlRecommendation.crop} as the optimal crop choice.
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
                          <div className="text-center text-gray-500">
                            <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
                            <p className="font-medium">No ML Recommendation Available</p>
                            <p className="text-sm">Unable to generate prediction for current conditions</p>
                          </div>
                        </div>
                      )}

                      {/* Current Crop Analysis */}
                      {currentCropAnalysis && (
                        <div className="border-2 border-blue-400 rounded-lg p-4 bg-blue-50">
                          <div className="flex items-center mb-3">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
                              📍
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-lg text-gray-800 capitalize">
                                  {currentCropAnalysis.crop}
                                </span>
                                <div className="text-right">
                                  <div className="text-xl font-bold text-blue-600">
                                    {currentCropAnalysis.compatibilityScore}%
                                  </div>
                                  <div className="text-xs text-gray-500">Compatibility</div>
                                </div>
                              </div>
                              <div className="text-sm text-blue-700 font-medium">
                                🌱 Your Current Crop
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-3">
                            <div className={`rounded p-3 ${currentCropAnalysis.soilTypeCompatible ? "bg-green-100" : "bg-orange-100"}`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  {currentCropAnalysis.soilTypeCompatible ? (
                                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-orange-500 mr-2" />
                                  )}
                                  <span className="text-sm font-medium">
                                    {currentCropAnalysis.soilTypeCompatible ? "Good soil type match" : "Soil type could be better"}
                                  </span>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  currentCropAnalysis.compatibilityScore >= 80 ? "bg-green-100 text-green-700" :
                                  currentCropAnalysis.compatibilityScore >= 60 ? "bg-yellow-100 text-yellow-700" :
                                  "bg-red-100 text-red-700"
                                }`}>
                                  {currentCropAnalysis.compatibilityScore >= 80 ? "Excellent" :
                                   currentCropAnalysis.compatibilityScore >= 60 ? "Good" : "Needs Attention"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Comparison with ML recommendation */}
                          {mlRecommendation && mlRecommendation.crop !== currentCropAnalysis.crop && (
                            <div className="mt-3 bg-white rounded-lg p-3">
                              <div className="text-sm text-gray-700">
                                <strong>Comparison:</strong> AI suggests switching to {mlRecommendation.crop}  
                                 , instead of  {currentCropAnalysis.crop} 
                                
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ML Explanation */}
                  <div className="mt-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
                      <Activity className="w-4 h-4 mr-2 text-purple-600" />
                      How It Works
                    </h4>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>• <strong>Single Prediction:</strong> ML model analyzes all factors and predicts one optimal crop</div>
                      <div>• <strong>Confidence Score:</strong> Shows how certain the AI is about its recommendation</div>
                      <div>• <strong>Compatibility:</strong> Separate analysis of how well soil conditions match crop needs</div>
                      <div>• <strong>Current Crop:</strong> Analysis of your existing crop's suitability</div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center text-gray-500 py-4">
                  <Leaf className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">
                    Select a plot with soil data to see ML recommendation
                  </p>
                </div>
              )}
            </div>
          </>
        ) : selectedPlot ? (
          <div className="bg-white rounded-xl shadow-lg p-6 text-center text-gray-500">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <h3 className="font-semibold mb-2">No Data Available</h3>
            <p className="text-sm">
              Unable to retrieve soil data for this plot. Please check sensor connectivity.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-6 text-center text-gray-500">
            <Leaf className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <h3 className="font-semibold mb-2">Select a Plot</h3>
            <p className="text-sm">
              Choose a plot above to view detailed soil health insights and
              recommendations.
            </p>
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