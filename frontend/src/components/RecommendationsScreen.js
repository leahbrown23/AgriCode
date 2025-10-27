"use client"

import { useState, useEffect, useMemo } from "react"
import {
  ArrowLeft,
  Home,
  Menu,
  User,
  AlertTriangle,
  Leaf,
  CheckCircle,
} from "lucide-react"
import LoadingSpinner from "./LoadingSpinner"
import api from "../api/api"

export default function RecommendationsScreen({
  onBackClick,
  setCurrentScreen,
  currentScreen,
}) {
  const [loading, setLoading] = useState(true)
  const [plotRecs, setPlotRecs] = useState([])

  useEffect(() => {
    async function fetchRecs() {
      try {
        const res = await api.get("/api/recommendations/plots/")
        setPlotRecs(res.data || [])
      } catch (err) {
        console.error("Failed to load recommendations", err)
        setPlotRecs([])
      } finally {
        setLoading(false)
      }
    }
    fetchRecs()
  }, [])

  const urgentWarnings = useMemo(() => {
    const out = []
    plotRecs.forEach((plot) => {
      if (plot.severity === "high" && Array.isArray(plot.warnings)) {
        plot.warnings.forEach((msg) => {
          out.push({ plot: plot.plot_name, msg })
        })
      }
    })
    return out
  }, [plotRecs])

  // Format all numbers to 2 decimal points
  function fmt2(v) {
    if (v === null || v === undefined || v === "—") return "—"
    const n = Number(v)
    return Number.isFinite(n) ? n.toFixed(2) : "—"
  }

  // Process and emphasize Optimal Fert/Pest lines
  function processActionText(raw) {
    if (!raw || typeof raw !== "string") return { text: raw, isOptimal: false }

    // Remove predicted yield info
    let cleaned = raw.replace(/[, ]*predicted yield=.*$/i, "").trim()

    const isOptimal =
      /optimal\s+fertilizer/i.test(cleaned) ||
      /optimal\s+pesticide/i.test(cleaned)

    // Split Optimal values into two lines if both are mentioned
    if (isOptimal && /fertilizer=.*pesticide=.*/i.test(cleaned)) {
      const match = cleaned.match(/Optimal.*Fertilizer=([\d.]+).*Pesticide=([\d.]+)/i)
      if (match) {
        cleaned = `Optimal Fertilizer: ${match[1]}\nOptimal Pesticide: ${match[2]}`
      }
    }

    return { text: cleaned, isOptimal }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="flex flex-col h-full pb-12">
      {/* Header */}
      <div className="p-4 bg-white flex items-center shadow">
        <button onClick={onBackClick} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold flex-1 text-center">
          Recommendations
        </h1>
        <div className="w-5" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 bg-[#d1e6b2] space-y-6">
        {/* Immediate Attention */}
        {urgentWarnings.length > 0 && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg shadow">
            <h2 className="flex items-center text-red-600 font-bold mb-2">
              <AlertTriangle className="h-5 w-5 mr-2" /> Immediate Attention
            </h2>
            <ul className="text-gray-600 text-sm space-y-2">
              {urgentWarnings.map((item, idx) => (
                <li key={idx}>
                  <span className="font-semibold text-red-700">
                    {item.plot}:
                  </span>{" "}
                  {item.msg}
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-red-400 mt-3">
              These issues may affect yield or crop health if not handled soon.
            </p>
          </div>
        )}

        {/* Per-Plot Recommendations */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-semibold text-green-700 mb-2 flex items-center">
            <Leaf className="h-5 w-5 mr-2 text-green-600" /> Per Plot / Crop
          </h2>

          {plotRecs.length === 0 && (
            <p className="text-gray-600 text-sm mb-2">
              📍 No plot recommendations available.
            </p>
          )}

          {plotRecs.map((plot) => (
            <div
              key={plot.plot_id}
              className="border rounded p-3 mb-3 bg-gray-50 last:mb-0"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-800 text-sm font-semibold">
                    {plot.plot_name} – {plot.crop_name}
                  </p>
                  {plot.days_in_cycle != null && (
                    <p className="text-gray-400 text-[11px]">
                      Day {plot.days_in_cycle} of growth
                    </p>
                  )}
                </div>

                {plot.severity === "high" && (
                  <span className="text-[10px] font-semibold text-red-600 bg-red-100 border border-red-300 rounded px-2 py-[2px]">
                    urgent
                  </span>
                )}
                {plot.severity === "medium" && (
                  <span className="text-[10px] font-semibold text-yellow-700 bg-yellow-100 border border-yellow-300 rounded px-2 py-[2px]">
                    check soon
                  </span>
                )}
                {plot.severity === "low" && (
                  <span className="text-[10px] font-semibold text-green-700 bg-green-100 border border-green-300 rounded px-2 py-[2px] flex items-center">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    stable
                  </span>
                )}
              </div>

              {/* Latest Conditions */}
              {plot.metrics && (
                <div className="mt-2 text-[11px] text-gray-600 grid grid-cols-3 gap-x-4">
                  <div>
                    <span className="font-semibold text-gray-700">Temp:</span>{" "}
                    {plot.metrics.temperature != null
                      ? `${fmt2(plot.metrics.temperature)}°C`
                      : "—"}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">
                      Humidity:
                    </span>{" "}
                    {plot.metrics.humidity != null
                      ? `${fmt2(plot.metrics.humidity)}%`
                      : "—"}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">
                      Rainfall:
                    </span>{" "}
                    {plot.metrics.rainfall != null
                      ? `${fmt2(plot.metrics.rainfall)}mm`
                      : "—"}
                  </div>
                </div>
              )}

              {/* Fertilizer & Pesticide totals */}
              {plot.chemicals && (
                <div className="mt-3 text-[11px] text-gray-600 bg-white border border-gray-200 rounded p-2">
                  <div className="flex justify-between">
                    <div>
                      <div className="font-semibold text-gray-700">
                        Fertilizer
                      </div>
                      <div className="text-gray-500">
                        Total: {fmt2(plot.chemicals.fert_total)}
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-700">
                        Pesticide
                      </div>
                      <div className="text-gray-500">
                        Total: {fmt2(plot.chemicals.pest_total)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Warnings / Suggested Actions */}
              <div className="mt-3 text-[12px]">
                {Array.isArray(plot.warnings) && plot.warnings.length > 0 && (
                  <div className="mb-2">
                    <div className="text-red-600 font-semibold flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      Warnings
                    </div>
                    <ul className="text-red-700 text-[12px] list-disc ml-5">
                      {plot.warnings.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {(plot.soil_actions?.length > 0 ||
                  plot.chemical_actions?.length > 0) && (
                  <div className="mb-2">
                    <div className="text-green-700 font-semibold flex items-center">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Suggested Actions
                    </div>
                    <ul className="text-gray-700 text-[12px] list-disc ml-5 space-y-1">
                      {[...(plot.soil_actions || []), ...(plot.chemical_actions || [])].map(
                        (a, idx) => {
                          const { text, isOptimal } = processActionText(a)
                          const lines = text.split("\n")
                          return (
                            <li
                              key={idx}
                              className={
                                isOptimal
                                  ? "font-semibold text-green-700 bg-green-50 border border-green-300 rounded px-2 py-1 whitespace-pre-line"
                                  : ""
                              }
                            >
                              {lines.join("\n")}
                            </li>
                          )
                        }
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Nav */}
      {["dashboard", "soilHealth", "insights", "recommendations", "userProfile"].includes(
        currentScreen
      ) && (
        <div className="absolute bottom-0 left-0 right-0 flex justify-around items-center h-12 border-t bg-white">
          <button
            onClick={() => setCurrentScreen("dashboard")}
            className="flex flex-col items-center justify-center w-1/3"
          >
            <Home size={20} />
          </button>
          <button
            onClick={() => setCurrentScreen("userProfile")}
            className="flex flex-col items-center justify-center w-1/3"
          >
            <User size={20} />
          </button>
          <button className="flex flex-col items-center justify-center w-1/3">
            <Menu size={20} />
          </button>
        </div>
      )}
    </div>
  )
}
