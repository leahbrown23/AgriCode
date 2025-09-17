"use client"

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Brush,
} from "recharts"
import { Activity } from "lucide-react"

const graphDefs = [
  { key: "pH_level", label: "pH Level", color: "#a78bfa" },
  { key: "N", label: "Nitrogen (ppm)", color: "#22c55e" },
  { key: "P", label: "Phosphorus (ppm)", color: "#a78bfa" },
  { key: "K", label: "Potassium (ppm)", color: "#fb923c" },
]

export default function SoilHealthGraphs({ data }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
      <div className="flex items-center mb-4 justify-between">
        <div className="flex items-center">
          <div className="p-2 bg-purple-100 rounded-lg mr-3">
            <Activity className="w-4 h-4 text-purple-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-800">Soil Trends</h2>
        </div>
      </div>

      {!data?.length ? (
        <div className="bg-gray-50 rounded-xl border border-gray-200 py-8 flex flex-col items-center justify-center">
          <span className="text-3xl mb-2">📉</span>
          <div className="text-gray-500 font-medium mb-1">No data available</div>
          <div className="text-xs text-gray-400">Upload sensor data to see trends</div>
        </div>
      ) : (
        <div className="space-y-6">
          {graphDefs.map(g => (
            <div key={g.key}>
              <div className="font-semibold text-xs text-gray-700 mb-1">{g.label}</div>
              <div className="bg-gray-50 rounded-xl p-2">
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="timestamp"
                      fontSize={12}
                      tick={{ fill: "#64748b" }}
                    />
                    <YAxis
                      fontSize={12}
                      tick={{ fill: "#64748b" }}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip
                      formatter={(value) =>
                        typeof value === 'number' ? value.toFixed(2) : value
                      }
                      contentStyle={{
                        backgroundColor: "#fff",
                        borderRadius: "12px",
                        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                        border: "1px solid #ddd",
                        padding: "8px",
                      }}
                      labelStyle={{ fontWeight: 600 }}
                    />
                    <Line
                      type="monotone"
                      dataKey={g.key}
                      stroke={g.color}
                      strokeWidth={3}
                      dot={false}
                    />
                    <Brush
                      dataKey="timestamp"
                      height={18}
                      stroke="#4ade80" // Tailwind green-400
                      travellerWidth={10}
                      fill="#d1fae5" // light green fill
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}