// src/components/CreateThreadCard.js
"use client"

import { useState } from "react"
import { MessageSquarePlus, X } from "lucide-react"

export default function CreateThreadCard({
  topics = [],                 // [{value:"soil", label:"Soil Health"}, ...]
  onSubmit,                    // async ({topic, title, body}) => {}
  onCancel,                    // () => {}
  loading = false,
}) {
  const [topic, setTopic] = useState("")
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!topic || !title.trim() || !body.trim()) {
      setError("Please fill in all fields.")
      return
    }
    setError("")
    await onSubmit?.({ topic, title: title.trim(), body: body.trim() })
    setTitle("")
    setBody("")
    setTopic("")
  }

  const inputBase =
    "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm " +
    "placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"

  return (
    <div className="bg-white rounded-2xl shadow-lg">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-green-100 text-green-700">
            <MessageSquarePlus size={18} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Start a New Thread</h3>
            <p className="text-xs text-gray-500">Share a question, tip, or update with the community</p>
          </div>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <X size={16} />
            Cancel
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Topic</label>
          <select
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className={`${inputBase} appearance-none`}
          >
            <option value="">Select a topic</option>
            {topics.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Thread title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Best cover crop for winter?"
            className={inputBase}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Description or message</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add details, context, or a specific question…"
            rows={4}
            className={`${inputBase} resize-y`}
          />
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex justify-center rounded-xl px-4 py-2.5 text-sm font-medium text-white
                       bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700
                       shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Posting…" : "Submit"}
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
