"use client"

import { useEffect, useState } from "react"
import { MessageSquare, TrendingUp, AlertTriangle } from "lucide-react"
import LoadingSpinner from "./LoadingSpinner"
import api from "../api/api"
import {
  getOptimalRanges,
  calculateSoilScore,
  getScoreClassification,
} from "../utils/soilHealthCalculator"

export default function DashboardScreen({
  onSoilHealthClick,
  onInsightsClick,
  onRecommendationsClick,
  onDiscussionForumClick,
  onSensorSetupClick,
}) {
  const [loading, setLoading] = useState(true)

  // basic farm info
  const [farmData, setFarmData] = useState({
    plots: [],
    sensors: [],
    recommendations: [],
    farmStats: { totalPlots: 0, totalSensors: 0, activeSensors: 0, activeCrops: 0 },
  })

  // enriched plot cards
  const [plotsWithSoilData, setPlotsWithSoilData] = useState([])

  /** ---------------- helpers (shared with SoilHealthScreen style) ---------------- */

  function safeNum(v) {
    if (v === null || v === undefined || v === "") return null
    const n = typeof v === "string" ? Number(v.replace(/,/g, ".")) : Number(v)
    return Number.isFinite(n) ? n : null
  }

  // same normalization style as SoilHealthScreen.normalizeReading
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
      moisture_level: safeNum(item.moisture_level ?? item.moisture ?? null),
      plot_id: item.plot_id ?? item.plot_number ?? item.plot ?? null,
      sensor_id: item.sensor_id ?? item.sensor ?? null,
    }
  }

  function parseDate(d) {
    return d ? new Date(d) : null
  }

  // colour scale for soil score (borrowed from SoilHealthScreen.getScoreColor)
  function getScoreColor(s) {
    if (s >= 85) return "rgb(67,160,71)" // Green
    if (s >= 70) return "rgb(33,150,243)" // Blue
    if (s >= 55) return "rgb(251,192,45)" // Yellow
    if (s >= 40) return "rgb(255,152,0)" // Orange
    return "rgb(229,57,53)" // Red
  }

  // harvest progress helpers
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
    if (daysRemaining <= 0) {
      progress = 100
      status = "ready"
    } else if (daysRemaining <= 7) status = "almost-ready"
    else if (progress < 25) status = "early"
    else if (progress < 75) status = "growing"
    else status = "almost-ready"

    return { progress, daysRemaining, status }
  }

  function getProgressColor(status) {
    switch (status) {
      case "ready":
        return "bg-green-500"
      case "almost-ready":
        return "bg-yellow-500"
      case "growing":
        return "bg-blue-500"
      case "early":
        return "bg-gray-400"
      default:
        return "bg-gray-300"
    }
  }

  function getStatusText(h) {
    switch (h.status) {
      case "ready":
        return "Ready to harvest!"
      case "almost-ready":
        return `${h.daysRemaining} days to harvest`
      case "growing":
        return `${h.daysRemaining} days remaining`
      case "early":
        return `${h.daysRemaining} days remaining`
      default:
        return "No harvest date set"
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-700 border-red-200"
      case "medium":
        return "bg-yellow-100 text-yellow-700 border-yellow-200"
      case "low":
        return "bg-green-100 text-green-700 border-green-200"
      default:
        return "bg-gray-100 text-gray-700 border-gray-200"
    }
  }

  // sim/status parser for plots that have sensors
  async function linkedPlotsFromSim() {
    try {
      const res = await api.get("/api/sim/status/")
      const data = res.data

      const arrays = []
      if (Array.isArray(data)) {
        arrays.push(data)
      } else if (data && typeof data === "object") {
        arrays.push(...Object.values(data).filter(Array.isArray))
      }

      const devices = arrays.flat()

      const plotSet = new Set()
      const meta = new Map()

      devices.forEach((d) => {
        let pid = null
        if (d?.plot != null) pid = String(d.plot)
        else if (d?.plot_number != null) pid = String(d.plot_number)
        else if (d?.plot_id != null) pid = String(d.plot_id)
        else if (typeof d?.plot === "string") {
          const m = d.plot.match(/\d+/)
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

  // same data source SoilHealthScreen uses for the "latest" reading
  async function fetchLatestReadingForPlot(plotCode) {
    const latestRes = await api.get(
      `/api/latest-reading/?plot_number=${encodeURIComponent(plotCode)}`
    )
    const latestNorm = normalizeReading(latestRes.data)
    return latestNorm
  }

  /** ---------------- main data load ---------------- */
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // 1) plots
        const plotsRes = await api.get("/api/farm/plots/")
        const plots = Array.isArray(plotsRes.data?.results)
          ? plotsRes.data.results
          : plotsRes.data || []

        // 2) crops (crop name + soil type)
        const cropsRes = await api.get("/api/farm/crops/")
        const crops = Array.isArray(cropsRes.data?.results)
          ? cropsRes.data.results
          : cropsRes.data || []

        const plotToCrop = new Map()
        crops.forEach((crop) => {
          const plotCode = String(
            crop.plot_number || crop.plot_code || crop.plot_id
          )
          if (!plotCode) return
          plotToCrop.set(plotCode, {
            cropName: crop.crop_type || crop.name,
            soilType: crop.soil_type ?? null,
          })
        })

        // 3) harvests, get most recent still-open harvest per plot
        const harvestsRes = await api.get("/api/farm/harvests/")
        const harvests = Array.isArray(harvestsRes.data?.results)
          ? harvestsRes.data.results
          : harvestsRes.data || []

        const latestHarvestByPlot = new Map()
        for (const h of harvests) {
          if (h.end_date) continue
          const pid = String(
            h.plot_number ?? h.plot_code ?? h.plot_id ?? h.plot ?? ""
          )
          if (!pid) continue
          const current = latestHarvestByPlot.get(pid)
          if (!current) {
            latestHarvestByPlot.set(pid, h)
          } else {
            const a = parseDate(h.start_date)?.getTime() ?? 0
            const b = parseDate(current.start_date)?.getTime() ?? 0
            if (a > b) latestHarvestByPlot.set(pid, h)
          }
        }

        // 4) sensors list for "Sensor Status" section
        const sensorsRes = await api.get("/api/sim/status/")
        const sensors = sensorsRes.data || []

        // 5) figure which plots actually have sensor data
        const allPlotCodes = plots.map((p) => String(p.plot_id))
        const { plotSet: linkedFromSim } = await linkedPlotsFromSim()

        const stillUnknown = allPlotCodes.filter(
          (code) => !linkedFromSim.has(code)
        )

        if (stillUnknown.length) {
          const checks = await Promise.allSettled(
            stillUnknown.map((code) =>
              api.get(
                `/api/latest-reading/?plot_number=${encodeURIComponent(code)}`
              )
            )
          )
          checks.forEach((r, i) => {
            const code = stillUnknown[i]
            if (r.status === "fulfilled") {
              const payload = r.value?.data || {}
              const norm = normalizeReading(payload)
              const hasData =
                !!norm &&
                (norm.pH_level != null ||
                  norm.N != null ||
                  norm.P != null ||
                  norm.K != null)
              if (hasData) linkedFromSim.add(code)
            }
          })
        }

        // 6) build the array we'll actually render
        const enrichedPlots = []
        for (const plot of plots) {
          const plotCode = String(plot.plot_id)
          if (!linkedFromSim.has(plotCode)) {
            // skip plots that don't have live data
            continue
          }

          // crop + soilType
          const cropInfo = plotToCrop.get(plotCode)
          const cropNameGuess =
            cropInfo?.cropName ||
            latestHarvestByPlot.get(plotCode)?.crop_type ||
            "Unknown"
          const soilTypeGuess = cropInfo?.soilType || null

          // harvest progress info
          const harvest = latestHarvestByPlot.get(plotCode) || null
          const harvestInfo = calculateHarvestProgress(harvest)

          // latest soil reading for scoring
          let latestReadingNorm = null
          try {
            latestReadingNorm = await fetchLatestReadingForPlot(plotCode)
          } catch (err) {
            console.warn(
              "Could not fetch latest reading for plot",
              plotCode,
              err
            )
          }

          // compute soil health score & classification
          let soilScore = null
          let soilClass = null
          if (
            latestReadingNorm &&
            (latestReadingNorm.pH_level != null ||
              latestReadingNorm.N != null ||
              latestReadingNorm.P != null ||
              latestReadingNorm.K != null)
          ) {
            const plotInfoForScoring = {
              crop: cropNameGuess,
              soilType: soilTypeGuess,
            }
            const ranges = getOptimalRanges(plotInfoForScoring)
            const { score } = calculateSoilScore(
              latestReadingNorm,
              ranges,
              plotCode
            )

            soilScore = Math.round(score)
            soilClass = getScoreClassification
              ? getScoreClassification(score)
              : null
          }

          enrichedPlots.push({
            ...plot,
            plotCode,
            cropName: cropNameGuess,
            soilType: soilTypeGuess,
            harvestInfo,
            soilScore,
            soilClass,
          })
        }

        setPlotsWithSoilData(enrichedPlots)

        // recommendations mock
        const recommendations = [
          { id: 1, priority: "high", title: "pH level adjustment needed", plot: "Plot 2", action: "Add lime" },
          { id: 2, priority: "medium", title: "Irrigation optimization", plot: "Plot 3", action: "Reduce frequency" },
          { id: 3, priority: "low", title: "Nutrient monitoring", plot: "Plot 1", action: "Check levels" },
        ]

        const activeCrops = enrichedPlots.filter(
          (p) => p.cropName && p.cropName !== "Unknown"
        ).length

        const farmStats = {
          totalPlots: plots.length,
          totalSensors: Array.isArray(sensors) ? sensors.length : 0,
          activeSensors: (Array.isArray(sensors) ? sensors : []).filter(
            (s) => s.is_active
          ).length,
          activeCrops,
        }

        setFarmData({
          plots,
          sensors: Array.isArray(sensors) ? sensors : [],
          recommendations,
          farmStats,
        })
      } catch (e) {
        console.error("Failed to load dashboard data:", e)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  /** ---------------- render ---------------- */

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
        <h1 className="text-xl font-bold text-center text-gray-800">
          Farm Overview • Green Valley Farm
        </h1>
        <p className="text-sm text-gray-500 text-center mt-1">
          Last synced: 2m ago
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div
            onClick={onSoilHealthClick}
            className="bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-800">
                {farmData.farmStats.totalPlots}
              </p>
              <p className="text-xs text-gray-500">Total Plots</p>
            </div>
          </div>

          <div
            onClick={onSensorSetupClick}
            className="bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-800">
                {farmData.farmStats.activeSensors}
              </p>
              <p className="text-xs text-gray-500">Active Sensors</p>
            </div>
          </div>

          <div
            onClick={onSoilHealthClick}
            className="bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-800">
                {farmData.farmStats.activeCrops}
              </p>
              <p className="text-xs text-gray-500">Active Crops</p>
            </div>
          </div>

          <div
            onClick={onRecommendationsClick}
            className="bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-800">
                {farmData.recommendations.length}
              </p>
              <p className="text-xs text-gray-500">To do's</p>
            </div>
          </div>
        </div>

        {/* Plots & Crops */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              Plots & Crops
            </h2>
            <button
              onClick={onSoilHealthClick}
              className="text-blue-600 text-sm font-medium hover:underline"
            >
              Tap a plot for details
            </button>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="flex gap-4 min-w-max">
              {plotsWithSoilData.map((plot) => (
                <div
                  key={plot.plotCode}
                  onClick={onSoilHealthClick}
                  className="flex-none w-64 p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer"
                >
                  {/* Header row with soil score */}
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-800 text-lg">
                      Plot {plot.plotCode}
                    </h3>

                    <div className="text-right">
                      <p
                        className="text-xl font-bold leading-tight"
                        style={{
                          color: getScoreColor(plot.soilScore ?? 0),
                        }}
                      >
                        {plot.soilScore == null
                          ? "—"
                          : Math.round(plot.soilScore)}
                      </p>

                      {plot.soilClass && (
                        <p
                          className="text-[10px] font-semibold leading-tight"
                          style={{
                            color: getScoreColor(plot.soilScore ?? 0),
                          }}
                        >
                          {plot.soilClass}
                        </p>
                      )}

                      <p className="text-xs text-gray-500">Soil Score</p>
                    </div>
                  </div>

                  {/* Crop + location */}
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      {plot.cropName}
                    </p>
                    <p className="text-xs text-gray-500">{plot.location}</p>
                  </div>

                  {/* Harvest Progress */}
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-medium text-gray-600">
                        Harvest Progress
                      </span>
                      <span className="text-xs text-gray-500">
                        {Math.round(plot.harvestInfo.progress)}%
                      </span>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(
                          plot.harvestInfo.status
                        )}`}
                        style={{
                          width: `${plot.harvestInfo.progress}%`,
                        }}
                      />
                    </div>

                    <p
                      className={`text-xs font-medium ${
                        plot.harvestInfo.status === "ready"
                          ? "text-green-600"
                          : plot.harvestInfo.status === "almost-ready"
                          ? "text-yellow-600"
                          : plot.harvestInfo.status === "unknown"
                          ? "text-gray-600"
                          : "text-blue-600"
                      }`}
                    >
                      {getStatusText(plot.harvestInfo)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Issues */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">
              Top 3 Issues to Address
            </h2>
            <button
              onClick={onRecommendationsClick}
              className="text-blue-600 text-sm font-medium hover:underline"
            >
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
                      rec.priority === "high"
                        ? "text-red-500"
                        : rec.priority === "medium"
                        ? "text-yellow-500"
                        : "text-green-500"
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {rec.plot}
                    </p>
                    <p className="text-xs text-gray-500">{rec.title}</p>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(
                    rec.priority
                  )}`}
                >
                  {rec.priority}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Sensor Status */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              Sensor Status
            </h2>
            <button
              onClick={onSensorSetupClick}
              className="text-blue-600 text-sm font-medium hover:underline"
            >
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
                  <div
                    className={`w-2 h-2 rounded-full ${
                      sensor.is_active ? "bg-green-500" : "bg-gray-400"
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {sensor.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      Plot {sensor.plot} • {sensor.external_id}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    sensor.is_active
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {sensor.is_active ? "OK" : "Disconnected"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Insights Snapshot */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              Insights Snapshot
            </h2>
            <button
              onClick={onInsightsClick}
              className="text-blue-600 text-sm font-medium hover:underline"
            >
              from last 24h
            </button>
          </div>

          <div className="space-y-3">
            <div
              onClick={onInsightsClick}
              className="p-3 bg-blue-50 rounded-lg border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors"
            >
              <p className="text-sm text-gray-700">
                <span className="font-medium">Maize (Plot 1):</span> pH
                trending up towards optimal.
              </p>
            </div>

            <div
              onClick={onInsightsClick}
              className="p-3 bg-yellow-50 rounded-lg border border-yellow-200 cursor-pointer hover:bg-yellow-100 transition-colors"
            >
              <p className="text-sm text-gray-700">
                <span className="font-medium">Tomato (Plot 3):</span>{" "}
                Moisture above target, consider reducing irrigation.
              </p>
            </div>

            <div
              onClick={onInsightsClick}
              className="p-3 bg-green-50 rounded-lg border border-green-200 cursor-pointer hover:bg-green-100 transition-colors"
            >
              <p className="text-sm text-gray-700">
                <span className="font-medium">Wheat (Plot 2):</span>{" "}
                Potassium deficit flagged for correction.
              </p>
            </div>
          </div>

          <button
            onClick={onRecommendationsClick}
            className="w-full mt-3 bg-green-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
          >
            Open AI Recommendations
            <span className="ml-2 px-1.5 py-0.5 bg-green-400 rounded text-xs">
              3 new
            </span>
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
              <p className="text-xs text-gray-500">
                Connect with farmers
              </p>
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
