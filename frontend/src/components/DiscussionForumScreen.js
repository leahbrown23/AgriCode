"use client"

import { ArrowLeft, Filter, Star, StarOff } from "lucide-react"
import { useEffect, useState } from "react"
import api from "../api/api"
import LoadingSpinner from "./LoadingSpinner"

export default function DiscussionForumScreen({ onBackClick, onThreadClick }) {
  const [topics, setTopics] = useState([])
  const [threadsByTopic, setThreadsByTopic] = useState({})
  const [activeFilter, setActiveFilter] = useState("all")
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newThreadTitle, setNewThreadTitle] = useState("")
  const [newThreadMessage, setNewThreadMessage] = useState("")
  const [newThreadTopic, setNewThreadTopic] = useState("")
  const [loading, setLoading] = useState(true)
  const [favoriteThreadIds, setFavoriteThreadIds] = useState(() => {
    const stored = localStorage.getItem("favorites")
    return stored ? JSON.parse(stored) : []
  })

  const filterOptions = [
    { id: "all", label: "All Threads" },
    { id: "new", label: "New" },
    { id: "trending", label: "Trending" },
    { id: "popular", label: "Popular" },
    { id: "favorites", label: "Favorites" },
  ]

  useEffect(() => {
    api
      .get("/forum/topics/")
      .then((res) => {
        const topicData = Array.isArray(res.data.results) ? res.data.results : []
        setTopics(topicData)
        topicData.forEach((topic) => fetchThreadsForTopic(topic.id, activeFilter))
        setLoading(false)
      })
      .catch((err) => {
        console.error("Failed to fetch topics:", err)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    topics.forEach((topic) => fetchThreadsForTopic(topic.id, activeFilter))
  }, [activeFilter])

  const fetchThreadsForTopic = async (topicId, sort = "all") => {
    let url = `/forum/threads/?topic=${topicId}`
    if (sort !== "all") url += `&sort=${sort}`

    try {
      const res = await api.get(url)
      let threadList = Array.isArray(res.data.results) ? res.data.results : []

      if (sort === "favorites") {
        threadList = threadList.filter((thread) => favoriteThreadIds.includes(thread.id))
      }

      setThreadsByTopic((prev) => ({ ...prev, [topicId]: threadList }))
    } catch (err) {
      console.error(`Failed to fetch threads for topic ${topicId}:`, err)
    }
  }

  const toggleFavorite = (threadId) => {
    const updated = favoriteThreadIds.includes(threadId)
      ? favoriteThreadIds.filter((id) => id !== threadId)
      : [...favoriteThreadIds, threadId]

    setFavoriteThreadIds(updated)
    localStorage.setItem("favorites", JSON.stringify(updated))
  }

  const handleThreadClick = (topicId, threadId) => {
    onThreadClick(threadId)
  }

  const handleCreateThread = async () => {
    // no need to check token here because interceptor will handle unauthenticated requests gracefully
    try {
      await api.post("/forum/threads/", {
        topic: newThreadTopic,
        title: newThreadTitle,
        message: newThreadMessage,
      })
      alert("Thread created successfully!")
      setShowCreateForm(false)
      setNewThreadTitle("")
      setNewThreadMessage("")
      setNewThreadTopic("")
      fetchThreadsForTopic(newThreadTopic, activeFilter)
    } catch (err) {
      console.error("Error creating thread:", err)
      alert("Failed to create thread.")
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 p-4 bg-white flex items-center">
        <button onClick={onBackClick} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold flex-1 text-center">Discussion Forum</h1>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#d1e6b2]">
        <div className="p-4 space-y-4 pb-24">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Community</h2>
            <div className="relative">
              <button
                className="flex items-center space-x-1 bg-white p-2 rounded-lg shadow"
                onClick={() => setShowFilterMenu(!showFilterMenu)}
              >
                <Filter className="h-4 w-4" />
                <span className="text-sm">
                  Filter: {filterOptions.find((opt) => opt.id === activeFilter)?.label}
                </span>
              </button>
              {showFilterMenu && (
                <div className="absolute right-0 mt-1 w-40 bg-white rounded-md shadow-lg z-10">
                  <div className="py-1">
                    {filterOptions.map((option) => (
                      <button
                        key={option.id}
                        className={`block px-4 py-2 text-sm w-full text-left ${
                          activeFilter === option.id ? "bg-gray-100" : ""
                        }`}
                        onClick={() => {
                          setActiveFilter(option.id)
                          setShowFilterMenu(false)
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-green-600 text-white px-4 py-2 rounded mt-3 hover:bg-green-700"
          >
            + Create New Thread
          </button>

          {showCreateForm && (
            <div className="bg-white p-4 mt-4 rounded shadow">
              <h3 className="text-md font-semibold mb-2">Start a New Thread</h3>
              <select
                className="w-full p-2 border rounded mb-2"
                value={newThreadTopic}
                onChange={(e) => setNewThreadTopic(e.target.value)}
              >
                <option value="">Select Topic</option>
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.title}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Thread title"
                className="w-full p-2 border rounded mb-2"
                value={newThreadTitle}
                onChange={(e) => setNewThreadTitle(e.target.value)}
              />
              <textarea
                placeholder="Description or message..."
                className="w-full p-2 border rounded mb-2"
                value={newThreadMessage}
                onChange={(e) => setNewThreadMessage(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateThread}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Submit
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-sm text-gray-600 underline"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {topics.map((topic, index) => (
              <div
                key={topic.id}
                className="rounded-lg shadow overflow-hidden"
                style={{ backgroundColor: ["#2a9d4a", "#3a8fb7", "#d4a017"][index % 3] }}
              >
                <div className="p-3 text-white font-semibold">
                  <h3 className="text-lg">Topic: {topic.title}</h3>
                </div>
                <div className="bg-white p-2 space-y-2">
                  {(threadsByTopic[topic.id] || []).slice(0, 3).map((thread) => (
                    <div
                      key={thread.id}
                      className="bg-gray-100 p-3 rounded-md cursor-pointer hover:bg-gray-200 transition-colors"
                      onClick={() => handleThreadClick(topic.id, thread.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs">
                          {thread.title.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold">{thread.title}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleFavorite(thread.id)
                              }}
                            >
                              {favoriteThreadIds.includes(thread.id) ? (
                                <Star className="text-yellow-400 w-4 h-4" />
                              ) : (
                                <StarOff className="text-gray-400 w-4 h-4" />
                              )}
                            </button>
                          </div>
                          <span className="text-xs px-2 py-1 bg-gray-200 rounded-full capitalize">
                            {activeFilter === "trending"
                              ? "Views"
                              : activeFilter === "popular"
                              ? "Replies"
                              : "Replies"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(threadsByTopic[topic.id] || []).length === 0 && (
                    <div className="text-center py-4 text-gray-500">No threads found</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
