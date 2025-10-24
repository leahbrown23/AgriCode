"use client"

import { useEffect, useState } from "react"
import { MessageSquare, TrendingUp, AlertTriangle } from "lucide-react"
import LoadingSpinner from "./LoadingSpinner"
import api from "../api/api"
import { getOptimalRanges, calculateSoilScore } from "../utils/soilHealthCalculator"

export default function DashboardScreen({
  onSoilHealthClick,
  onInsightsClick,
  onRecommendationsClick,
  onDiscussionForumClick,
  onSensorSetupClick,
}) {
  const [loading, setLoading] = useState(true)
  const [farmData, setFarmData] = useState({
    plots: [],
    sensors: [],
    recommendations: [],
    farmStats: { totalPlots: 0, totalSensors: 0, activeSensors: 0, activeCrops: 0 },
  })
  const [plotsWithSoilData, setPlotsWithSoilData] = useState([])

  /** ---------------- helpers ---------------- */
  function safeNum(v) {
    if (v == null || v === "") return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }

  function normalizeReading(item = {}) {
    return {
      pH_level: safeNum(item?.pH_level ?? item?.ph_level ?? item?.ph),
      N: safeNum(item?.N ?? item?.n),
      P: safeNum(item?.P ?? item?.p),
      K: safeNum(item?.K ?? item?.k),
      Temperature: safeNum(item?.Temperature ?? item?.temperature),
      Humidity: safeNum(item?.Humidity ?? item?.humidity),
      Rainfall: safeNum(item?.Rainfall ?? item?.rainfall),
    }
  }

  const parseDate = (d) => (d ? new Date(d) : null)

  // tolerant collector for /api/sim/status/
  async function linkedPlotsFromSim() {
    try {
      const res = await api.get("/api/sim/status/")
      const data = res.data
      const arrays = []
      if (Array.isArray(data)) arrays.push(data)
      else if (data && typeof data === "object") arrays.push(...Object.values(data).filter(Array.isArray))
      const devices = arrays.flat()

      const plotSet = new Set()
      const meta = new Map()
      devices.forEach((d) => {
        // Prefer public plot code the backend exposes in sim_status as `plot`
        let pid = null
        if (d?.plot != null) pid = String(d.plot) // public code (e.g., 802)
        else if (d?.plot_number != null) pid = String(d.plot_number)
        else if (d?.plot_id != null) pid = String(d.plot_id)
        else if (typeof d?.plot === "string") {
          const m = d.plot.match(/\d+/)
          pid = m ? m[0] : null
        }
        if (!pid) return
        plotSet.add(pid)
        const sid = d.sensor_id ?? d.sensor ?? d.device_id ?? d.id ?? null
        if (!meta.has(pid)) meta.set(pid, {})
        if (sid != null) meta.get(pid).sensorId = String(sid)
      })
      return { plotSet, meta }
    } catch {
      return { plotSet: new Set(), meta: new Map() }
    }
  }

  /** ---------------- load dashboard data ---------------- */
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // 1) plots
        const plotsRes = await api.get("/api/farm/plots/")
        const plots = Array.isArray(plotsRes.data?.results) ? plotsRes.data.results : plotsRes.data || []

        // 2) crops (for crop label/soil type)
        const cropsRes = await api.get("/api/farm/crops/")
        const crops = Array.isArray(cropsRes.data?.results) ? cropsRes.data.results : cropsRes.data || []

        // 3) harvests – we want latest open one per plot
        const harvestsRes = await api.get("/api/farm/harvests/")
        const harvests = Array.isArray(harvestsRes.data?.results) ? harvestsRes.data.results : harvestsRes.data || []

        // map plot(public code) -> latest OPEN harvest (end_date == null) with max start_date
        const latestHarvestByPlot = new Map()
        for (const h of harvests) {
          if (h.end_date) continue
          const pid = String(h.plot_number ?? h.plot_code ?? h.plot_id ?? h.plot ?? "")
          if (!pid) continue
          const current = latestHarvestByPlot.get(pid)
          if (!current) latestHarvestByPlot.set(pid, h)
          else {
            const a = parseDate(h.start_date)?.getTime() ?? 0
            const b = parseDate(current.start_date)?.getTime() ?? 0
            if (a > b) latestHarvestByPlot.set(pid, h)
          }
        }

        // 4) sensors
        const sensorsRes = await api.get("/api/sim/status/")
        const sensors = sensorsRes.data || []

        // crop map for quick lookups keyed by public plot code
        const plotToCrop = new Map()
        crops.forEach((crop) => {
          const plotCode = String(crop.plot_number || crop.plot_code || crop.plot_id)
          if (!plotCode) return
          plotToCrop.set(plotCode, {
            cropName: crop.crop_type || crop.name,
            soilType: crop.soil_type ?? null,
          })
        })

        // which plots really have sensors/data (use public codes)
        const allPlotCodes = plots.map((p) => String(p.plot_id))
        const { plotSet: linkedFromSim } = await linkedPlotsFromSim()

        const stillUnknown = allPlotCodes.filter((code) => !linkedFromSim.has(code))
        if (stillUnknown.length) {
          const checks = await Promise.allSettled(
            stillUnknown.map((code) =>
              api.get(`/api/sensors/data/by-code/${encodeURIComponent(code)}/`)
            )
          )
          checks.forEach((r, i) => {
            const code = stillUnknown[i]
            if (r.status === "fulfilled") {
              const payload = r.value?.data || {}
              const hasData =
                !!payload?.linked_sensor_id ||
                !!payload?.sensor_id ||
                !!payload?.latest ||
                (Array.isArray(payload?.history) && payload.history.length > 0) ||
                (Array.isArray(payload?.readings) && payload.readings.length > 0)
              if (hasData) linkedFromSim.add(code)
            }
          })
        }

        // Build unified plot cards (keyed by public plot code)
        const plotsWithData = []
        for (const plot of plots) {
          const plotCode = String(plot.plot_id) // public code
          if (!linkedFromSim.has(plotCode)) continue

          const cropInfo = plotToCrop.get(plotCode)
          const harvest = latestHarvestByPlot.get(plotCode) || null

          try {
            const soilRes = await api.get(`/api/sensors/data/by-code/${encodeURIComponent(plotCode)}/`)
            const soilPayload = soilRes.data
            const latest = soilPayload.latest || soilPayload.latest_reading || soilPayload[0] || soilPayload
            const normalized = latest ? normalizeReading(latest) : null

            plotsWithData.push({
              ...plot,
              crop: cropInfo?.cropName || (harvest?.crop_type ?? "Unknown"),
              soilType: cropInfo?.soilType || null,
              soilData: normalized,
              hasRealSoilData:
                !!normalized &&
                (normalized.pH_level != null || normalized.N != null || normalized.P != null || normalized.K != null),
              harvest, // latest open harvest or null
            })
          } catch {
            plotsWithData.push({
              ...plot,
              crop: cropInfo?.cropName || (harvest?.crop_type ?? "Unknown"),
              soilType: cropInfo?.soilType || null,
              soilData: null,
              hasRealSoilData: false,
              harvest,
            })
          }
        }

        setPlotsWithSoilData(plotsWithData)

        // mock recs (UI only)
        const recommendations = [
          { id: 1, priority: "high", title: "pH level adjustment needed", plot: "Plot 2", action: "Add lime" },
          { id: 2, priority: "medium", title: "Irrigation optimization", plot: "Plot 3", action: "Reduce frequency" },
          { id: 3, priority: "low", title: "Nutrient monitoring", plot: "Plot 1", action: "Check levels" },
        ]

        const activeCrops = plotsWithData.filter((p) => p.crop && p.crop !== "Unknown").length
        const farmStats = {
          totalPlots: plots.length,
          totalSensors: Array.isArray(sensors) ? sensors.length : 0,
          activeSensors: (Array.isArray(sensors) ? sensors : []).filter((s) => s.is_active).length,
          activeCrops,
        }

        setFarmData({ plots, sensors: Array.isArray(sensors) ? sensors : [], recommendations, farmStats })
      } catch (e) {
        console.error("Failed to load dashboard data:", e)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  /** ---------------- scoring (same as Insights) ---------------- */
  function computeSoilScore(plot) {
    const d = plot?.soilData
    const hasAny = d && (d.pH_level != null || d.N != null || d.P != null || d.K != null)
    if (!hasAny) return null
    const plotInfo = { crop: plot.crop, soilType: plot.soilType }
    const ranges = getOptimalRanges(plotInfo)
    const { score } = calculateSoilScore(d, ranges, String(plot.plot_id))
    return Math.round(score)
  }

  /** ---------------- harvest progress ---------------- */
  function calculateHarvestProgress(harvestOrFallback) {
    const start = parseDate(harvestOrFallback?.start_date)
    const expected = parseDate(harvestOrFallback?.expected_end_date)
    if (!start || !expected) return { progress: 0, daysRemaining: 0, status: "unknown" }

    const now = new Date()
    const totalMs = Math.max(1, expected - start)
    const elapsedMs = Math.max(0, now - start)
    const remainingMs = Math.max(0, expected - now)

    let progress = Math.max(0, Math.min(100, (elapsedMs / totalMs) * 100))
    const daysRemaining = Math.floor(remainingMs / (1000 * 60 * 60 * 24))

    let status = "growing"
    if (daysRemaining <= 0) { progress = 100; status = "ready" }
    else if (daysRemaining <= 7) status = "almost-ready"
    else if (progress < 25) status = "early"
    else if (progress < 75) status = "growing"
    else status = "almost-ready"

    return { progress, daysRemaining, status }
  }

  function getProgressColor(status) {
    switch (status) {
      case "ready": return "bg-green-500"
      case "almost-ready": return "bg-yellow-500"
      case "growing": return "bg-blue-500"
      case "early": return "bg-gray-400"
      default: return "bg-gray-300"
    }
  }

  function getStatusText(h) {
    switch (h.status) {
      case "ready": return "Ready to harvest!"
      case "almost-ready": return `${h.daysRemaining} days to harvest`
      case "growing": return `${h.daysRemaining} days remaining`
      case "early": return `${h.daysRemaining} days remaining`
      default: return "No harvest date set"
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-700 border-red-200"
      case "medium": return "bg-yellow-100 text-yellow-700 border-yellow-200"
      case "low": return "bg-green-100 text-green-700 border-green-200"
      default: return "bg-gray-100 text-gray-700 border-gray-200"
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full pb-16 bg-[#d1e6b2]">
      {/* Header */}
      <div className="p-4 bg-white shadow-sm">
        <h1 className="text-xl font-bold text-center text-gray-800">Farm Overview • Green Valley Farm</h1>
        <p className="text-sm text-gray-500 text-center mt-1">Last synced: 2m ago</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div onClick={onSoilHealthClick} className="bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-800">{farmData.farmStats.totalPlots}</p>
              <p className="text-xs text-gray-500">Total Plots</p>
            </div>
          </div>

          <div onClick={onSensorSetupClick} className="bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-800">{farmData.farmStats.activeSensors}</p>
              <p className="text-xs text-gray-500">Active Sensors</p>
            </div>
          </div>

          <div onClick={onSoilHealthClick} className="bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-800">{farmData.farmStats.activeCrops}</p>
              <p className="text-xs text-gray-500">Active Crops</p>
            </div>
          </div>

          <div onClick={onRecommendationsClick} className="bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-800">{farmData.recommendations.length}</p>
              <p className="text-xs text-gray-500">To do's</p>
            </div>
          </div>
        </div>

        {/* Plots & Crops */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Plots & Crops</h2>
            <button onClick={onSoilHealthClick} className="text-blue-600 text-sm font-medium hover:underline">
              Tap a plot for details
            </button>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="flex gap-4 min-w-max">
              {plotsWithSoilData.map((plot) => {
                const soilScore = computeSoilScore(plot)
                const harvestInfo = calculateHarvestProgress(plot.harvest)

                return (
                  <div
                    key={plot.id ?? plot.plot_id}
                    onClick={onSoilHealthClick}
                    className="flex-none w-64 p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-800 text-lg">Plot {plot.plot_id}</h3>
                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-800">{soilScore == null ? "—" : Math.round(soilScore)}</p>
                        <p className="text-xs text-gray-500">Soil Score</p>
                      </div>
                    </div>

                    {/* Crop */}
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-1">{plot.crop}</p>
                      <p className="text-xs text-gray-500">{plot.location}</p>
                    </div>

                    {/* Harvest Progress */}
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-medium text-gray-600">Harvest Progress</span>
                        <span className="text-xs text-gray-500">{Math.round(harvestInfo.progress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(harvestInfo.status)}`}
                          style={{ width: `${harvestInfo.progress}%` }}
                        />
                      </div>
                      <p
                        className={`text-xs font-medium ${
                          harvestInfo.status === "ready"
                            ? "text-green-600"
                            : harvestInfo.status === "almost-ready"
                            ? "text-yellow-600"
                            : harvestInfo.status === "unknown"
                            ? "text-gray-600"
                            : "text-blue-600"
                        }`}
                      >
                        {getStatusText(harvestInfo)}
                      </p>
                    </div>

                    {/* Soil bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          soilScore == null
                            ? "bg-gray-400"
                            : soilScore >= 80
                            ? "bg-green-500"
                            : soilScore >= 60
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${soilScore == null ? 0 : soilScore}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Top Issues */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">Top 3 Issues to Address</h2>
            <button onClick={onRecommendationsClick} className="text-blue-600 text-sm font-medium hover:underline">
              View all
            </button>
          </div>
          <div className="space-y-2">
            {farmData.recommendations.slice(0, 3).map((rec) => (
              <div
                key={rec.id}
                onClick={onRecommendationsClick}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle
                    className={`h-4 w-4 ${
                      rec.priority === "high" ? "text-red-500" : rec.priority === "medium" ? "text-yellow-500" : "text-green-500"
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{rec.plot}</p>
                    <p className="text-xs text-gray-500">{rec.title}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(rec.priority)}`}>{rec.priority}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sensor Status */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Sensor Status</h2>
            <button onClick={onSensorSetupClick} className="text-blue-600 text-sm font-medium hover:underline">
              Manage sensors
            </button>
          </div>
          <div className="space-y-2">
            {farmData.sensors.slice(0, 3).map((sensor) => (
              <div
                key={sensor.id}
                onClick={onSensorSetupClick}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${sensor.is_active ? "bg-green-500" : "bg-gray-400"}`} />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{sensor.name}</p>
                    <p className="text-xs text-gray-500">Plot {sensor.plot} • {sensor.external_id}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${sensor.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                  {sensor.is_active ? "OK" : "Disconnected"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Insights Snapshot */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Insights Snapshot</h2>
            <button onClick={onInsightsClick} className="text-blue-600 text-sm font-medium hover:underline">
              from last 24h
            </button>
          </div>
          <div className="space-y-3">
            <div onClick={onInsightsClick} className="p-3 bg-blue-50 rounded-lg border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Maize (Plot 1):</span> pH trending up towards optimal.
              </p>
            </div>
            <div onClick={onInsightsClick} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200 cursor-pointer hover:bg-yellow-100 transition-colors">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Tomato (Plot 3):</span> Moisture above target, consider reducing irrigation.
              </p>
            </div>
            <div onClick={onInsightsClick} className="p-3 bg-green-50 rounded-lg border border-green-200 cursor-pointer hover:bg-green-100 transition-colors">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Wheat (Plot 2):</span> Potassium deficit flagged for correction.
              </p>
            </div>
          </div>

          <button
            onClick={onRecommendationsClick}
            className="w-full mt-3 bg-green-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
          >
            Open AI Recommendations
            <span className="ml-2 px-1.5 py-0.5 bg-green-400 rounded text-xs">3 new</span>
          </button>
        </div>

        {/* Quick Nav */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onDiscussionForumClick}
            className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all"
          >
            <MessageSquare className="h-6 w-6 text-blue-600" />
            <div className="text-left">
              <p className="font-medium text-gray-800">Discussion Forum</p>
              <p className="text-xs text-gray-500">Connect with farmers</p>
            </div>
          </button>

          <button
            onClick={onSoilHealthClick}
            className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all"
          >
            <TrendingUp className="h-6 w-6 text-green-600" />
            <div className="text-left">
              <p className="font-medium text-gray-800">Analytics</p>
              <p className="text-xs text-gray-500">Detailed reports</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
