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
  Zap,
  Activity,
  Info,
  Settings,
  Save,
  BarChart3,
} from "lucide-react"
import { useEffect, useState, useRef } from "react"
import api from "../api/api"
import LoadingSpinner from "./LoadingSpinner"
import {
  getOptimalRanges,
  calculateSoilScore,
} from "../utils/soilHealthCalculator"

// Soil type preferences for each crop (for display only)
const SOIL_TYPE_PREFERENCES = {
  wheat: ["loamy", "clay", "silt"],
  tomato: ["loamy", "sandy", "silt"],
  sugarcane: ["clay", "loamy", "silt"],
  maize: ["loamy", "clay", "sandy"],
  potato: ["sandy", "loamy", "silt"],
  rice: ["clay", "loamy", "silt"],
}

// Crop-specific optimal ranges (used to color the nutrient gauges)
const CROP_OPTIMAL_RANGES = {
  wheat: { N: [80, 200], P: [30, 80], K: [40, 120], pH_level: [6.0, 6.8] },
  tomato: { N: [100, 250], P: [50, 120], K: [80, 250], pH_level: [5.5, 6.8] },
  sugarcane: { N: [90, 200], P: [50, 100], K: [40, 150], pH_level: [5.0, 8.0] },
  maize: { N: [60, 200], P: [20, 100], K: [20, 150], pH_level: [5.5, 7.0] },
  potato: { N: [100, 300], P: [50, 120], K: [150, 250], pH_level: [5.5, 6.5] },
  rice: { N: [100, 200], P: [20, 70], K: [65, 120], pH_level: [5.5, 6.5] },
}

// Metric display metadata
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
  // plot dropdown data
  const [plotOptions, setPlotOptions] = useState([])
  const [selectedPlot, setSelectedPlot] = useState(
    () => localStorage.getItem("selectedInsightsPlot") || ""
  )

  // most recent sensor reading for the selected plot
  const [soilData, setSoilData] = useState(null)

  // ui state
  const [isLoading, setIsLoading] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // optimal range customization state
  const [customRanges, setCustomRanges] = useState(() => {
    const saved = localStorage.getItem("customSoilRanges")
    return saved ? JSON.parse(saved) : null
  })
  const [showCustomSettings, setShowCustomSettings] = useState(false)
  const [tempRanges, setTempRanges] = useState({})

  // plot metadata
  const [plotSoilType, setPlotSoilType] = useState(null)
  const [plotHectares, setPlotHectares] = useState(1) // still stored, but not used in yield math now
  const [plotsWithSensors, setPlotsWithSensors] = useState(new Set())

  // ML states
  const [mlRecommendation, setMlRecommendation] = useState(null) // AI suggested crop
  const [currentCropAnalysis, setCurrentCropAnalysis] = useState(null) // { crop: "rice" }
  const [currentCropYield, setCurrentCropYield] = useState(null) // raw from generate-recommendations
  const [isLoadingRecommendations, setIsLoadingRecommendations] =
    useState(false)

  // refs
  const dropdownRef = useRef(null)
  const pollTimerRef = useRef(null)

  // -------------------------------------------------
  // Derived helpers from selected plot option
  // -------------------------------------------------
  const selectedPlotInfo = plotOptions.find(
    (opt) => opt.value === selectedPlot
  )
  const DESIRED = getOptimalRanges(selectedPlotInfo)

  // sync tempRanges with selected plot each time the plot/customRanges change
  useEffect(() => {
    setTempRanges(getOptimalRanges(selectedPlotInfo))
  }, [selectedPlot, customRanges, plotOptions, selectedPlotInfo])

  // -------------------------------------------------
  // Helpers
  // -------------------------------------------------

  function classify(value, minVal, maxVal) {
    if (value == null || isNaN(value)) return "unknown"
    if (value < minVal) return "deficient"
    if (value > maxVal) return "excess"
    return "optimal"
  }

  function safeNum(v) {
    if (v === null || v === undefined || v === "") return null
    const n =
      typeof v === "string" ? Number(v.replace(/,/g, ".")) : Number(v)
    return Number.isFinite(n) ? n : null
  }

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
      pH_level: safeNum(
        item.pH_level ?? item.ph_level ?? item.ph ?? null
      ),
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
      Fertilizer: safeNum(item.Fertilizer ?? item.fertilizer ?? null),
      Pesticide: safeNum(item.Pesticide ?? item.pesticide ?? null),
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

  function getPositionPercent(val, [min, max]) {
    if (val == null) return 0
    const extendedMin = min - (max - min) * 0.2
    const extendedMax = max + (max - min) * 0.2
    if (val < extendedMin) return 0
    if (val > extendedMax) return 100
    return (
      ((val - extendedMin) / (extendedMax - extendedMin)) *
      100
    )
  }

  function getStatus(metric, val) {
    const range = DESIRED[metric]
    if (val == null)
      return { status: "unknown", color: "gray", text: "No Data" }
    if (!range)
      return { status: "unknown", color: "gray", text: "Unknown" }

    const classification = classify(val, range[0], range[1])

    switch (classification) {
      case "optimal":
        return {
          status: "optimal",
          color: "green",
          text: "Optimal",
        }
      case "deficient": {
        const deficit = ((range[0] - val) / range[0]) * 100
        if (deficit > 30)
          return {
            status: "critical",
            color: "red",
            text: "Critical Low",
          }
        return {
          status: "low",
          color: "yellow",
          text: "Below Optimal",
        }
      }
      case "excess": {
        const excess = ((val - range[1]) / range[1]) * 100
        if (excess > 30)
          return {
            status: "critical",
            color: "red",
            text: "Critical High",
          }
        return {
          status: "high",
          color: "yellow",
          text: "Above Optimal",
        }
      }
      default:
        return {
          status: "unknown",
          color: "gray",
          text: "Unknown",
        }
    }
  }

  function getOverallHealth() {
    if (!soilData) return { score: 0, status: "unknown" }
    const result = calculateSoilScore(
      soilData,
      DESIRED,
      selectedPlot
    )
    let status = "poor"
    if (result.score >= 85) status = "excellent"
    else if (result.score >= 70) status = "good"
    else if (result.score >= 55) status = "moderate"
    else if (result.score >= 40) status = "fair"
    return { score: result.score, status }
  }

  function handleCustomRangeChange(metric, index, value) {
    const newRanges = { ...tempRanges }
    if (!newRanges[metric]) newRanges[metric] = [0, 0]
    newRanges[metric][index] = parseFloat(value) || 0
    setTempRanges(newRanges)
  }

  function saveCustomRanges() {
    setCustomRanges(tempRanges)
    localStorage.setItem(
      "customSoilRanges",
      JSON.stringify(tempRanges)
    )
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

  // -------------------------------------------------
  // Backend calls
  // -------------------------------------------------

  // Which plots have active sensors?
  async function linkedPlotsFromSim() {
    try {
      const res = await api.get("/api/sim/status/")
      const data = res.data

      const arrays = []
      if (Array.isArray(data)) arrays.push(data)
      else if (data && typeof data === "object") {
        arrays.push(...Object.values(data).filter(Array.isArray))
      }
      const devices = arrays.flat()

      const plotSet = new Set()

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
      })

      return { plotSet }
    } catch {
      return { plotSet: new Set() }
    }
  }

  // ML: "What crop should I plant?"
  async function getMLCropRecommendation(latestSoil, currentSoilType) {
    if (!latestSoil) return null
    try {
      const payload = {
        N: latestSoil.N,
        P: latestSoil.P,
        K: latestSoil.K,
        pH: latestSoil.pH_level,
        Temperature: latestSoil.Temperature,
        Humidity: latestSoil.Humidity,
        Rainfall: latestSoil.Rainfall,
        Soil_Type: currentSoilType,
      }

      const res = await api.post("/ml/recommend-crop/", payload)

      const recommendation = res.data.recommendation
      if (recommendation && recommendation.crop) {
        let cropName = recommendation.crop.toString().toLowerCase().trim()
        const validCrops = [
          "wheat",
          "tomato",
          "sugarcane",
          "maize",
          "potato",
          "rice",
        ]
        if (!validCrops.includes(cropName)) {
          console.warn(
            `Invalid crop name received: ${cropName}, defaulting to maize`
          )
          cropName = "maize"
        }

        return {
          crop: cropName,
          mlConfidence: parseInt(recommendation.ml_confidence) || 75,
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

  // ML: "How is my current crop doing and what should I do?"
  // We send current soil / climate / input data and ask the model for yield + recs.
  // We do NOT multiply anything or post-process. We just surface what the model says.
  async function getCurrentCropYieldPrediction(
    latestSoil,
    currentCrop,
    currentSoilType
  ) {
    if (!latestSoil || !currentCrop) return null

    try {
      const payload = {
        N: latestSoil.N,
        P: latestSoil.P,
        K: latestSoil.K,
        pH: latestSoil.pH_level,
        Temperature: latestSoil.Temperature,
        Humidity: latestSoil.Humidity,
        Rainfall: latestSoil.Rainfall,
        Fertilizer: latestSoil.Fertilizer,
        Pesticide: latestSoil.Pesticide,
        Soil_Type: currentSoilType,
        Current_Crop: currentCrop,
      }

      console.log("Yield payload for model:", payload)

      const res = await api.post("/ml/generate-recommendations/", payload)

      // Backend should return something like:
      // {
      //   current_crop: "rice",
      //   current_yield: 2.2,
      //   recommendations: [
      //     "N is below optimal...",
      //     "For your current crop (rice): Optimal Fertilizer=..., Yield improvement: 618.2%)",
      //     "Estimated yield for current crop (rice): 2.20 units"
      //   ]
      // }

      return {
        cropName: res.data?.current_crop || currentCrop,
        currentYield: res.data?.current_yield ?? null,
        recommendations: Array.isArray(res.data?.recommendations)
          ? res.data.recommendations
          : [],
        error: null,
      }
    } catch (err) {
      console.error("Yield prediction failed:", err)
      console.error("Error details:", err.response?.data)
      console.error("Error status:", err.response?.status)

      // Even on 400, backend sent a body, so surface that instead of crashing UI
      const data = err.response?.data
      if (data) {
        return {
          cropName: data.current_crop || currentCrop,
          currentYield: data.current_yield ?? null,
          recommendations: Array.isArray(data.recommendations)
            ? data.recommendations
            : [],
          error: data.error || "Prediction failed",
        }
      }

      return null
    }
  }

  // Fetch current + history from sensor endpoints
  async function fetchLatestAndHistory(plotId) {
    const [latestRes, histRes] = await Promise.all([
      api.get(
        `/api/latest-reading/?plot_number=${encodeURIComponent(plotId)}`
      ),
      api.get(
        `/api/reading-history/?plot_number=${encodeURIComponent(plotId)}`
      ),
    ])

    const latestReading = normalizeReading(latestRes.data)

    const histRaw = Array.isArray(histRes.data) ? histRes.data : []
    const histNorm = histRaw.map(normalizeReading).filter(isCompleteReading)

    return { latest: latestReading, history: histNorm }
  }

  // -------------------------------------------------
  // Initial load of plots, crops, soil types, etc.
  // -------------------------------------------------
  useEffect(() => {
    ;(async () => {
      try {
        const plotsRes = await api.get("/api/farm/plots/")
        const plotsRaw = plotsRes.data?.results || plotsRes.data || []

        const cropsRes = await api.get("/api/farm/crops/")
        const cropsRaw = cropsRes.data?.results || cropsRes.data || []

        // map each plot_id -> { cropName, soilType }
        const plotToCrop = new Map()
        cropsRaw.forEach((crop) => {
          const plotId = String(crop.plot_number || crop.plot_code)
          const cropName = crop.crop_type || crop.name
          const soilType = crop.soil_type
          if (plotId && cropName) {
            plotToCrop.set(plotId, { cropName, soilType })
          }
        })

        // see which plots actually have sensors
        const { plotSet: linkedFromSim } = await linkedPlotsFromSim()

        // Build dropdown options from plots
        const options = plotsRaw
          .filter((p) => linkedFromSim.has(String(p.plot_id)))
          .map((p) => {
            const pid = String(p.plot_id)
            const cropInfo = plotToCrop.get(pid)
            const cropVar = cropInfo?.cropName || "—"

            return {
              value: pid,
              label: `Plot ${pid} : ${cropVar}`,
              crop: cropVar,
              soilType: cropInfo?.soilType || null,
              // we still grab hectares (your "size" field) for reference,
              // but we don't do math with it anymore.
              hectares: Number(p.size) || 1,
            }
          })

        setPlotsWithSensors(linkedFromSim)
        setPlotOptions(options)

        const saved = localStorage.getItem("selectedInsightsPlot")
        if (saved && options.find((o) => String(o.value) === String(saved))) {
          setSelectedPlot(String(saved))
          const selectedOption = options.find(
            (o) => String(o.value) === String(saved)
          )
          setPlotSoilType(selectedOption?.soilType || null)
          setPlotHectares(selectedOption?.hectares || 1)
        } else if (options.length) {
          const def = String(options[0].value)
          setSelectedPlot(def)
          localStorage.setItem("selectedInsightsPlot", def)
          setPlotSoilType(options[0].soilType || null)
          setPlotHectares(options[0].hectares || 1)
        } else {
          setSelectedPlot("")
          localStorage.removeItem("selectedInsightsPlot")
          setPlotSoilType(null)
          setPlotHectares(1)
        }
      } catch (err) {
        console.error("Failed to fetch plots/linked sensors:", err)
        setPlotOptions([])
        setSelectedPlot("")
        setPlotSoilType(null)
        setPlotHectares(1)
      }
    })()
  }, [])

  // -------------------------------------------------
  // Keep polling sensor data for this plot every 5s
  // -------------------------------------------------
  useEffect(() => {
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
        const { latest } = await fetchLatestAndHistory(selectedPlot)
        if (!isAlive) return
        setSoilData(latest)
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

    loadOnce()

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

  // -------------------------------------------------
  // Keep plot-level soil type + hectares synced
  // -------------------------------------------------
  useEffect(() => {
    if (selectedPlot && plotOptions.length > 0) {
      const selectedOption = plotOptions.find(
        (opt) => opt.value === selectedPlot
      )
      setPlotSoilType(selectedOption?.soilType || null)
      setPlotHectares(selectedOption?.hectares || 1)
    }
  }, [selectedPlot, plotOptions])

  // -------------------------------------------------
  // Close dropdown if clicked outside
  // -------------------------------------------------
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

  // -------------------------------------------------
  // Call ML when soilData or plot changes
  // -------------------------------------------------
  useEffect(() => {
    if (soilData && plotSoilType !== undefined && selectedPlotInfo) {
      setIsLoadingRecommendations(true)

      // 1. Best crop recommendation from ML model
      getMLCropRecommendation(soilData, plotSoilType)
        .then((recommendation) => {
          setMlRecommendation(recommendation)
        })
        .catch((err) => {
          console.error("Failed to get ML recommendation:", err)
          setMlRecommendation(null)
        })

      // 2. Current crop yield + recs
      if (
        selectedPlotInfo.crop &&
        selectedPlotInfo.crop !== "Unknown Crop" &&
        selectedPlotInfo.crop !== "—"
      ) {
        const currentCropLower = selectedPlotInfo.crop.toLowerCase()
        setCurrentCropAnalysis({
          crop: currentCropLower,
        })

        getCurrentCropYieldPrediction(
          soilData,
          currentCropLower,
          plotSoilType
        )
          .then((yieldData) => {
            setCurrentCropYield(yieldData)
          })
          .catch((err) => {
            console.error("Failed to get yield prediction:", err)
            setCurrentCropYield(null)
          })
      } else {
        setCurrentCropAnalysis(null)
        setCurrentCropYield(null)
      }

      setIsLoadingRecommendations(false)
    } else {
      setMlRecommendation(null)
      setCurrentCropAnalysis(null)
      setCurrentCropYield(null)
    }
  }, [soilData, plotSoilType, selectedPlotInfo])

  // -------------------------------------------------
  // RENDER
  // -------------------------------------------------

  return (
    <div className="flex flex-col h-full pb-12">
      {/* Header */}
      <div className="p-4 bg-white flex items-center shadow-sm">
        <button
          onClick={onBackClick}
          className="mr-2 p-1 hover:bg-gray-100 rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold flex-1 text-center">
          Soil Health Insights
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#d1e6b2] p-4 space-y-4">
        {/* Plot Selector */}
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
              onClick={() => setDropdownOpen((o) => !o)}
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
                {plotOptions.map((opt) => (
                  <button
                    key={opt.value}
                    className={`w-full text-left px-4 py-2 text-base rounded-2xl transition-colors ${
                      selectedPlot === opt.value
                        ? "bg-green-100 text-green-700 font-bold"
                        : "hover:bg-green-50"
                    }`}
                    onClick={() => {
                      setSelectedPlot(opt.value)
                      localStorage.setItem(
                        "selectedInsightsPlot",
                        opt.value
                      )
                      setPlotSoilType(opt.soilType || null)
                      setPlotHectares(opt.hectares || 1)
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
            <p className="mt-2 text-gray-600">
              Analyzing soil health data...
            </p>
          </div>
        ) : soilData && selectedPlotInfo ? (
          <>
            {/* Overall Soil Health Card */}
            <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl shadow-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800">
                  Overall Soil Health
                </h2>
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
                  {customRanges
                    ? "Using custom optimal ranges"
                    : CROP_OPTIMAL_RANGES[
                        selectedPlotInfo.crop.toLowerCase()
                      ]
                    ? `Using ${selectedPlotInfo.crop.toLowerCase()}-specific ranges`
                    : "Using default ranges"}
                </div>
              </div>

              {/* Score bar */}
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
                  style={{
                    width: `${overallHealth?.score || 0}%`,
                  }}
                />
              </div>

              {/* Nutrient status summary */}
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-800 text-sm mb-2">
                  Metrics Status:
                </h3>

                {Object.entries(DESIRED)
                  .map(([metric]) => {
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

            {/* Detailed Soil Metrics per nutrient */}
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
                              {val != null
                                ? `${val.toFixed(1)}${info.unit}`
                                : "N/A"}
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

                        {/* Visual gauge */}
                        <div className="space-y-2">
                          <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
                            {/* Optimal center band */}
                            <div
                              className="absolute top-0 bottom-0 bg-green-200"
                              style={{
                                left: "20%",
                                width: "60%",
                              }}
                            />
                            {/* Needle showing current value */}
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
                                style={{
                                  left: `${pos}%`,
                                  transform: "translateX(-50%)",
                                }}
                              />
                            )}
                          </div>

                          {/* Labels */}
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Low</span>
                            <span className="font-semibold text-green-600">
                              Optimal: {range[0]} - {range[1]} {info.unit}
                            </span>
                            <span>High</span>
                          </div>
                        </div>
                      </div>
                    )
                  })
                  .filter(Boolean)}
              </div>
            </div>

            {/* Custom Settings Drawer */}
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
                    Adjust the optimal ranges for your specific crop and
                    soil conditions. Changes will update all insights
                    and recommendations.
                  </p>

                  {Object.entries(METRIC_INFO).map(([metric, info]) => (
                    <div
                      key={metric}
                      className="border border-gray-200 rounded-lg p-3"
                    >
                      <div className="flex items-center mb-2">
                        <info.icon className="w-4 h-4 text-green-600 mr-2" />
                        <span className="font-medium text-gray-800">
                          {info.name}
                        </span>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="flex-1">
                          <label className="text-xs text-gray-500">
                            Min
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={tempRanges[metric]?.[0] || 0}
                            onChange={(e) =>
                              handleCustomRangeChange(
                                metric,
                                0,
                                e.target.value
                              )
                            }
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </div>

                        <span className="text-gray-400">-</span>

                        <div className="flex-1">
                          <label className="text-xs text-gray-500">
                            Max
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={tempRanges[metric]?.[1] || 0}
                            onChange={(e) =>
                              handleCustomRangeChange(
                                metric,
                                1,
                                e.target.value
                              )
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

                    {CROP_OPTIMAL_RANGES[
                      selectedPlotInfo.crop.toLowerCase()
                    ] && (
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

            {/* Crop Recommendation + Yield Prediction */}
            <div className="bg-white rounded-xl shadow-lg p-5">
              {/* Crop Recommendation (AI suggested crop) */}
              <h3 className="font-bold text-gray-800 mb-3 flex items-center">
                <Leaf className="w-5 h-5 mr-2 text-green-600" />
                Crop Recommendation
              </h3>

              <div className="text-sm text-gray-600 mb-4">
                <strong>Current Soil Type:</strong>{" "}
                {plotSoilType
                  ? plotSoilType.charAt(0).toUpperCase() +
                    plotSoilType.slice(1)
                  : "Unknown"}
              </div>

              {isLoadingRecommendations ? (
                <div className="text-center py-4">
                  <LoadingSpinner />
                  <p className="text-sm text-gray-600 mt-2">
                    Getting ML prediction...
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* AI Recommended Crop card */}
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

                            <div className="text-right text-xs text-gray-600 space-y-1">
                              <div className="font-semibold text-green-700 text-sm">
                                Confidence:{" "}
                                {mlRecommendation.mlConfidence}%
                              </div>
                            </div>
                          </div>

                          <div className="text-sm text-green-700 font-medium">
                            Recommended Crop
                          </div>
                        </div>
                      </div>

                      {/* Soil preferences */}
                      <div className="rounded p-3 bg-orange-50 border border-orange-200">
                        <div className="text-xs font-medium flex items-center text-orange-600">
                          <span className="font-semibold text-orange-700">
                            Ideal Soil Types:
                          </span>
                          <span className="ml-1 text-orange-700">
                            {SOIL_TYPE_PREFERENCES[mlRecommendation.crop]
                              ?.map(
                                (t) =>
                                  t.charAt(0).toUpperCase() + t.slice(1)
                              )
                              .join(", ") || "—"}
                          </span>
                        </div>
                      </div>

                      {/* Explanation box */}
                      <div className="bg-blue-50 rounded-lg p-3 mt-3">
                        <div className="flex items-start">
                          <Info className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                          <div className="text-sm text-blue-800">
                            <strong>Recommendation:</strong> Based on
                            your soil conditions, our machine learning
                            model predicts{" "}
                            {mlRecommendation.crop} as the optimal
                            crop choice.
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
                      <div className="text-center text-gray-500">
                        <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
                        <p className="font-medium">
                          No ML Recommendation Available
                        </p>
                        <p className="text-sm">
                          Unable to generate prediction for current
                          conditions
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Yield Prediction for the CURRENT crop */}
                  {currentCropAnalysis && (
                    <div>
                      <h4 className="font-bold text-gray-800 mb-3 flex items-center">
                        <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                        Yield Prediction for{" "}
                        {currentCropAnalysis.crop
                          .charAt(0)
                          .toUpperCase() +
                          currentCropAnalysis.crop.slice(1)}
                      </h4>

                      {isLoadingRecommendations ? (
                        <div className="text-center py-4">
                          <LoadingSpinner />
                          <p className="text-sm text-gray-600 mt-2">
                            Calculating yield prediction...
                          </p>
                        </div>
                      ) : currentCropYield ? (
                        <div className="space-y-4">
                          {/* Raw Model Yield */}
                          <div className="rounded-lg border-2 border-blue-300 bg-blue-50 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="flex-1 min-w-[150px]">
                                <div className="flex items-start">
                                  <BarChart3 className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                                  <div>
                                    <div className="font-bold text-lg text-gray-800">
                                      Predicted Yield
                                    </div>
                                    <div className="text-sm text-blue-700 font-medium leading-snug">
                                      Raw model output for this crop
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="text-3xl font-bold text-blue-700">
                                  {currentCropYield.currentYield != null
                                    ? currentCropYield.currentYield.toFixed(
                                        2
                                      )
                                    : "—"}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {currentCropYield.currentYield != null
                                    ? "units"
                                    : "no yield available"}
                                </div>
                              </div>
                            </div>

                            {/* backend error text if provided */}
                            {currentCropYield.error && (
                              <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
                                {currentCropYield.error}
                              </div>
                            )}
                          </div>

                          {/* Model's own recommendations list */}
                          {currentCropYield.recommendations &&
                            currentCropYield.recommendations.length >
                              0 && (
                              <div className="rounded-lg border border-yellow-400 bg-yellow-50 p-4">
                                <h5 className="font-semibold text-yellow-800 mb-3 flex items-start">
                                  <Info className="w-4 h-4 mr-2 mt-0.5 text-yellow-700" />
                                  <span className="text-base leading-snug">
                                    AI Recommendations to Improve Yield
                                  </span>
                                </h5>

                                <ul className="space-y-4 text-sm text-yellow-800">
                                  {currentCropYield.recommendations.map(
                                    (rec, index) => (
                                      <li
                                        key={index}
                                        className="leading-relaxed list-disc ml-5"
                                      >
                                        {rec}
                                      </li>
                                    )
                                  )}
                                </ul>
                              </div>
                            )}
                        </div>
                      ) : (
                        <div className="text-center text-gray-500 py-4">
                          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                          <p className="font-medium">
                            Yield Prediction Unavailable
                          </p>
                          <p className="text-sm">
                            Unable to calculate yield for current
                            conditions
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : selectedPlot ? (
          <div className="bg-white rounded-xl shadow-lg p-6 text-center text-gray-500">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <h3 className="font-semibold mb-2">No Data Available</h3>
            <p className="text-sm">
              Unable to retrieve soil data for this plot. Please check
              sensor connectivity.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-6 text-center text-gray-500">
            <Leaf className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <h3 className="font-semibold mb-2">Select a Plot</h3>
            <p className="text-sm">
              Choose a plot above to view detailed soil health insights
              and recommendations.
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
