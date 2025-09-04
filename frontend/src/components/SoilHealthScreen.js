"use client"

import {
  Activity,
  ArrowLeft,
  Home,
  Info,
  Leaf,
  Menu,
  User,
  Zap,
  ChevronDown,
  AlertTriangle,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import api from "../api/api"
import LoadingSpinner from "./LoadingSpinner"
import SoilHealthGraphs from "./SoilHealthGraphs"

export default function SoilHealthScreen({
  onBackClick,
  onViewSensorClick,
  onUploadSensorClick,
  onHomeClick,
  onProfileClick,
  onMenuClick,
}) {
  // readings
  const [soilData, setSoilData] = useState(null)       // latest reading (object)
  const [historyData, setHistoryData] = useState([])   // trend data (array)

  // plots / selection
  const [plotOptions, setPlotOptions] = useState([])   // only plots with sensors
  const [selectedPlot, setSelectedPlot] = useState(() => localStorage.getItem("selectedSoilPlot") || "")
  const [plotsWithSensors, setPlotsWithSensors] = useState(new Set()) // Set(["6801", ...])
  const [linkedMeta, setLinkedMeta] = useState(new Map()) // plotId -> { sensorId, cropVariety? }

  // ui
  const [isLoadingPlotData, setIsLoadingPlotData] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  // user (optional)
  const [user, setUser] = useState(null)

  /* ---------------- profile (optional) ---------------- */
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/api/profile/")
        setUser(res.data)
      } catch (err) {
        console.error("Failed to load user profile:", err)
      }
    })()
  }, [])

  /* ---------------- plots + linked sensors ----------------
     Build the dropdown from the user's PLOTS, but FILTER to
     only those that have a linked/active sensor.
  --------------------------------------------------------- */
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

        // 3) filter & build labels "SensorID : PlotID : CropVariety"
        const options = plotsRaw
          .filter(p => linkedFromSim.has(String(p.plot_id)))
          .map(p => {
            const pid = String(p.plot_id)
            const m = meta.get(pid) || {}
            const sensorId = m.sensorId || "—"
            const cropVar = plotToCrop.get(pid) || "—"
            return {
              value: pid,
              label: `${sensorId} : ${pid} : ${cropVar}`,
            }
          })

        setPlotsWithSensors(linkedFromSim)
        setPlotOptions(options)
        setLinkedMeta(meta)

        // keep a valid selection only
        const saved = localStorage.getItem("selectedSoilPlot")
        if (saved && options.find(o => String(o.value) === String(saved))) {
          setSelectedPlot(String(saved))
        } else if (options.length) {
          const def = String(options[0].value)
          setSelectedPlot(def)
          localStorage.setItem("selectedSoilPlot", def)
        } else {
          setSelectedPlot("")
          localStorage.removeItem("selectedSoilPlot")
        }
      } catch (err) {
        console.error("Failed to fetch plots/linked sensors:", err)
        setPlotOptions([])
        setSelectedPlot("")
      }
    })()
  }, [])

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

  /* ---------------- data fetchers ---------------- */
  const fetchLatestAndHistory = async (plotId) => {
    // Prefer the consolidated endpoint first
    try {
      const res = await api.get(`/api/sensors/data/${encodeURIComponent(plotId)}/`)
      const payload = res.data

      // possible shapes
      const latest =
        payload.latest ||
        payload.latest_reading ||
        payload.latestReading ||
        (Array.isArray(payload) ? payload[0] : payload)

      const history =
        payload.history ||
        payload.readings ||
        payload.data ||
        (Array.isArray(payload) ? payload : [])

      return {
        latest: normalizeReading(latest),
        history: (history || []).map(normalizeReading).filter(isCompleteReading),
      }
    } catch {
      // graceful fallback to your existing split endpoints
      const [latestRes, histRes] = await Promise.all([
        api.get(`/api/latest-reading/?plot_number=${encodeURIComponent(plotId)}`),
        api.get(`/api/reading-history/?plot_number=${encodeURIComponent(plotId)}`),
      ])

      const latest = normalizeReading(latestRes.data)
      const history = (histRes.data || [])
        .map(normalizeReading)
        .filter(isCompleteReading)

      return { latest, history }
    }
  }

  // refresh when the selected plot changes
  useEffect(() => {
    if (!selectedPlot) {
      setSoilData(null)
      setHistoryData([])
      return
    }
    ;(async () => {
      setIsLoadingPlotData(true)
      try {
        const { latest, history } = await fetchLatestAndHistory(selectedPlot)
        setSoilData(latest)
        setHistoryData(history)
      } catch (err) {
        console.error("Error fetching soil data:", err)
        setSoilData(null)
        setHistoryData([])
      } finally {
        setIsLoadingPlotData(false)
      }
    })()
  }, [selectedPlot])

  /* ---------------- live WS updates ---------------- */
  useEffect(() => {
    if (!selectedPlot) return
    const base = process.env.NEXT_PUBLIC_WS_BASE || "ws://localhost:8000"
    const ws = new WebSocket(`${base}/ws/soil/${encodeURIComponent(selectedPlot)}/`)

    ws.onmessage = (e) => {
      try {
        const m = JSON.parse(e.data)
        if (String(m.plot_id ?? m.plot ?? "") !== String(selectedPlot)) return

        const reading = normalizeReading(m)

        // latest card
        setSoilData(reading)

        // trends array
        setHistoryData((prev = []) => {
          const next = prev.slice()
          next.push(reading)
          return next.slice(-500)
        })
      } catch (err) {
        console.warn("WS parse error", err)
      }
    }

    return () => ws.close()
  }, [selectedPlot])

  /* ---------------- dropdown UX ---------------- */
  useEffect(() => {
    if (!dropdownOpen) return
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false)
    }
    window.addEventListener("mousedown", handleClick)
    return () => window.removeEventListener("mousedown", handleClick)
  }, [dropdownOpen])

  const score = soilData ? calculateSoilScore(soilData) : 0
  const classification = getClassification(score)
  const selectedLabel = plotOptions.find(o => String(o.value) === String(selectedPlot))?.label

  /* ---------------- render ---------------- */
  return (
    <div className="flex flex-col h-full pb-12">
      {/* Header */}
      <div className="p-4 bg-white flex items-center shadow-sm">
        <button onClick={onBackClick} className="mr-2 p-1 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold flex-1 text-center">Soil Health</h1>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#d1e6b2] p-4 space-y-4">
        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={onViewSensorClick}
            className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white w-full py-2 rounded-xl font-medium shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
          >
            View Sensor Data
          </button>
        </div>

        {/* Plot Filter (shows ONLY plots with sensors) */}
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center mb-3">
            <div className="p-2 bg-green-100 rounded-lg mr-3 flex items-center justify-center">
              <Leaf className="w-5 h-5 text-green-600" />
            </div>
            <label className="text-sm font-semibold text-gray-700">Select Plot</label>
          </div>

          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              className={`w-full flex items-center justify-between border-2 ${dropdownOpen ? "border-green-400" : "border-green-300"} rounded-2xl px-4 py-2 text-base font-medium text-gray-800 bg-white shadow-sm focus:ring-2 focus:ring-green-400 transition-all outline-none`}
              onClick={(e) => { e.stopPropagation(); setDropdownOpen(o => !o) }}
              disabled={plotOptions.length === 0}
              aria-haspopup="listbox"
              aria-expanded={dropdownOpen}
            >
              {selectedLabel || "Select a plot"}
              <ChevronDown className="w-5 h-5 text-gray-400 ml-2" />
            </button>

            {dropdownOpen && (
              <div className="absolute z-20 mt-2 w-full bg-white rounded-2xl shadow-lg border border-green-100 animate-fade-in">
                {plotOptions.length > 0 ? (
                  plotOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`w-full text-left px-4 py-2 text-base rounded-2xl transition-all
                        ${String(selectedPlot) === String(opt.value) ? "bg-green-100 text-green-700 font-bold" : "hover:bg-green-50 text-gray-800"}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        const val = String(opt.value)
                        setSelectedPlot(val)
                        localStorage.setItem("selectedSoilPlot", val)
                        setDropdownOpen(false)
                      }}
                    >
                      {opt.label}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-2 text-gray-400 text-base">No plots with sensors yet</div>
                )}
              </div>
            )}
          </div>

          {/* Only show this hint if the selected plot truly has no linked sensor */}
          {selectedPlot && !plotsWithSensors.has(String(selectedPlot)) && (
            <div className="mt-3 flex items-start p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800">
              <AlertTriangle className="w-4 h-4 mt-0.5 mr-2" />
              <span className="text-xs">
                No sensor connected to this plot yet. Connect a sensor to start receiving live data.
              </span>
            </div>
          )}

          {selectedPlot && selectedLabel && (
            <div className="mt-2 flex items-center text-xs text-gray-500">
              <Leaf className="w-4 h-4 text-green-400 mr-1" />
              {selectedLabel}
            </div>
          )}
        </div>

        {/* Body */}
        {isLoadingPlotData ? (
          <div className="bg-white rounded-xl shadow-lg p-5">
            <div className="flex justify-center py-7"><LoadingSpinner /></div>
          </div>
        ) : soilData ? (
          <>
            {/* Last updated */}
            <div className="text-right">
              <div className="inline-flex items-center bg-white px-3 py-2 rounded-lg shadow-sm">
                <span className="text-xs text-gray-500 mr-2">Last updated:</span>
                <span className="text-xs font-medium text-gray-700">
                  {soilData.timestamp ? new Date(soilData.timestamp).toLocaleString() : "—"}
                </span>
              </div>
            </div>

            {/* Score Card */}
            <div className="bg-white rounded-xl shadow-lg p-5">
              <div className="text-center mb-6">
                <div className="flex items-center justify-center mb-2">
                  <span className="text-sm font-medium text-gray-600 mr-1">SOIL HEALTH SCORE</span>
                  <button onClick={() => setShowExplanation(true)} className="text-gray-400 hover:text-gray-600">
                    <Info size={14} />
                  </button>
                </div>
                {showExplanation && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-xl shadow-lg max-w-sm p-5 text-sm text-gray-800">
                      <h2 className="text-lg font-bold mb-3">How Soil Score is Calculated</h2>
                      <p className="mb-2">The Soil Health Score (SHS) is a weighted average of key soil nutrients and pH:</p>
                      <ul className="list-disc list-inside mb-2">
                        <li>pH level: 20%</li>
                        <li>Nitrogen (N): 35%</li>
                        <li>Phosphorus (P): 25%</li>
                        <li>Potassium (K): 20%</li>
                      </ul>
                      <p className="mb-2">Formula: <code>(pH × 0.2) + (N × 0.35) + (P × 0.25) + (K × 0.2)</code></p>
                      <div className="text-right mt-6">
                        <button onClick={() => setShowExplanation(false)} className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition">
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="relative">
                  <div className="text-6xl font-bold mb-2" style={{ color: getScoreColor(score) }}>{score}</div>
                  <div className="text-sm font-semibold text-gray-600">
                    Classification: <span style={{ color: getScoreColor(score) }}>{classification}</span>
                  </div>
                  <div className="w-24 h-2 bg-gray-200 rounded-full mx-auto mt-2 overflow-hidden">
                    <div style={{ width: `${Math.min(score, 100)}%`, background: getScoreColor(score), height: "100%", borderRadius: 8, transition: "width 0.5s" }} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <MetricCard color="yellow" label="pH Level" value={fmt(soilData.pH_level)} unit="pH" />
                <MetricCard color="blue" label="Moisture" value={fmt(soilData.moisture_level)} unit="%" />
                <MetricCard color="green" label="Nitrogen" value={fmt(soilData.N)} unit="ppm" Icon={Leaf} />
                <MetricCard color="purple" label="Phosphorus" value={fmt(soilData.P)} unit="ppm" Icon={Zap} />
                <MetricCard color="orange" label="Potassium" value={fmt(soilData.K)} unit="ppm" Icon={Activity} full />
              </div>
            </div>

            {/* Trends */}
            <SoilHealthGraphs data={historyData} />

            {/* Status */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg p-4">
              <div className="text-center text-white font-semibold">✅ No urgent issues detected</div>
            </div>
          </>
        ) : (
          <>
            {/* Empty states */}
            <div className="bg-white rounded-xl shadow-lg p-5">
              <div className="text-center mb-6">
                <div className="flex items-center justify-center mb-2">
                  <span className="text-sm font-medium text-gray-400 mr-1">SOIL HEALTH SCORE</span>
                  <Info size={14} className="text-gray-300" />
                </div>
                <div className="text-6xl font-bold text-gray-300 mb-2">--</div>
                <div className="w-24 h-2 bg-gray-200 rounded-full mx-auto" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {["pH Level","Moisture","Nitrogen","Phosphorus","Potassium"].map((x, i) => (
                  <div key={x} className={`bg-gray-50 rounded-lg p-4 text-center ${i===4?"col-span-2":""}`}>
                    <div className="flex items-center justify-center mb-2">
                      <div className="w-4 h-4 bg-gray-400 rounded-full mr-1" />
                      <span className="text-xs font-medium text-gray-400">{x}</span>
                    </div>
                    <div className="text-lg font-bold text-gray-400">No data</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-100 rounded-xl shadow-lg p-4">
              <div className="text-center text-gray-500 font-semibold">📊 No data available for analysis</div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-5">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <div className="p-2 bg-gray-100 rounded-lg mr-3"><Info className="w-4 h-4 text-gray-400" /></div>
                Recommendations
              </h2>
              <div className="text-center py-8">
                <div className="p-4 bg-gray-50 rounded-lg inline-block mb-4"><Info className="w-8 h-8 text-gray-400 mx-auto" /></div>
                <p className="text-gray-500 font-medium">No data available</p>
                <p className="text-sm text-gray-400">Connect a sensor to a plot to get live insights</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-5">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <div className="p-2 bg-gray-100 rounded-lg mr-3"><Activity className="w-4 h-4 text-gray-400" /></div>
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

        <div className="h-2" />
      </div>

      {/* Bottom Nav */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-around items-center h-12 border-t bg-white shadow-lg">
        <button onClick={onHomeClick} className="flex flex-col items-center justify-center w-1/3 hover:bg-gray-50 transition-colors py-2"><Home size={20} className="text-gray-600" /></button>
        <button onClick={onProfileClick} className="flex flex-col items-center justify-center w-1/3 hover:bg-gray-50 transition-colors py-2"><User size={20} className="text-gray-600" /></button>
        <button onClick={onMenuClick} className="flex flex-col items-center justify-center w-1/3 hover:bg-gray-50 transition-colors py-2"><Menu size={20} className="text-gray-600" /></button>
      </div>
    </div>
  )
}

/* ---------------- helpers ---------------- */
function cropVarietyFromPlot(p = {}) {
  return (
    p.crop_variety ??
    p.cropVariety ??
    p.crop_name ??
    p.cropName ??
    p.crop_type ??
    p.cropType ??
    p.variety ??
    p.crop ??
    null
  )
}

function normalizeReading(item = {}) {
  if (!item) return null
  const ts =
    item.timestamp || item.ts || item.created_at || item.time || null

  const ph =
    item.pH_level ?? item.ph_level ?? item.ph ?? null
  const n  = item.N ?? item.n ?? null
  const p  = item.P ?? item.p ?? null
  const k  = item.K ?? item.k ?? null
  const moisture = item.moisture_level ?? item.moisture ?? null

  return {
    timestamp: ts,
    pH_level: safeNum(ph),
    N: safeNum(n),
    P: safeNum(p),
    K: safeNum(k),
    moisture_level: safeNum(moisture),
    plot_id: item.plot_id ?? item.plot_number ?? item.plot ?? null,
    sensor_id: item.sensor_id ?? item.sensor ?? null,
  }
}

function isCompleteReading(r) {
  if (!r) return false
  return (
    r.timestamp &&
    r.pH_level != null &&
    r.N != null &&
    r.P != null &&
    r.K != null &&
    r.moisture_level != null
  )
}

function fmt(v) {
  const n = safeNum(v)
  return n == null ? "N/A" : n.toFixed(2)
}

function safeNum(v) {
  if (v === null || v === undefined || v === "") return null
  const n = typeof v === "string" ? Number(v.replace(/,/g, ".")) : Number(v)
  return Number.isFinite(n) ? n : null
}

function calculateSoilScore(d) {
  const pH = safeNum(d.pH_level) || 0
  const N = safeNum(d.N) || 0
  const P = safeNum(d.P) || 0
  const K = safeNum(d.K) || 0
  return Math.round(pH * 0.2 + N * 0.35 + P * 0.25 + K * 0.2)
}
function getClassification(s) { if (s >= 80) return "Healthy"; if (s >= 60) return "Moderate"; return "Poor" }
function getScoreColor(s) { if (s < 60) return "rgb(229,57,53)"; if (s < 80) return "rgb(251,192,45)"; return "rgb(67,160,71)" }

function MetricCard({ color, label, value, unit, Icon, full }) {
  const colors = {
    yellow: ["bg-yellow-50","text-yellow-600","text-yellow-700","text-yellow-500"],
    blue:   ["bg-blue-50","text-blue-600","text-blue-700","text-blue-500"],
    green:  ["bg-green-50","text-green-600","text-green-700","text-green-500"],
    purple: ["bg-purple-50","text-purple-600","text-purple-700","text-purple-500"],
    orange: ["bg-orange-50","text-orange-600","text-orange-700","text-orange-500"],
    gray:   ["bg-gray-50","text-gray-400","text-gray-600","text-gray-400"],
  }[color] || ["bg-gray-50","text-gray-400","text-gray-600","text-gray-400"]

  return (
    <div className={`${colors[0]} rounded-lg p-4 text-center ${full ? "col-span-2" : ""}`}>
      <div className="flex items-center justify-center mb-2">
        {Icon ? <Icon className={`w-4 h-4 ${colors[1]} mr-1`} /> : <div className={`w-4 h-4 rounded-full mr-1 ${colors[1].replace("text","bg")}`} />}
        <span className={`text-xs font-medium ${colors[1]}`}>{label}</span>
      </div>
      <div className={`text-lg font-bold ${colors[2]}`}>{value}</div>
      {unit && <div className={`text-xs ${colors[3]}`}>{unit}</div>}
    </div>
  )
}