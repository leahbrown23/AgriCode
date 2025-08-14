"use client"

import { ArrowLeft, Filter, Star, StarOff, Plus, Send, X } from "lucide-react"
import { useEffect, useState } from "react"
import api from "../api/api"
import LoadingSpinner from "./LoadingSpinner"

export default function DiscussionForumScreen({ onBackClick, onThreadClick }) {
  const [topics, setTopics] = useState([])
  const [threadsByTopic, setThreadsByTopic] = useState({})
  const [topicLoading, setTopicLoading] = useState({})
  const [activeFilter, setActiveFilter] = useState("all")
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newThreadTitle, setNewThreadTitle] = useState("")
  const [newThreadMessage, setNewThreadMessage] = useState("")
  const [newThreadTopic, setNewThreadTopic] = useState("")

  const [favoriteThreadIds, setFavoriteThreadIds] = useState([])
  const [user, setUser] = useState(null)
  const [favoriteRecords, setFavoriteRecords] = useState({})

  const filterOptions = [
    { id: "all", label: "All Threads" },
    { id: "new", label: "New" },
    { id: "trending", label: "Trending" },
    { id: "popular", label: "Popular" },
    { id: "favorites", label: "Favorites" },
  ]

  // Step 1: Fetch user & favorites first
  useEffect(() => {
    async function fetchUserAndFavorites() {
      try {
        const profileRes = await api.get("/api/profile/")
        setUser(profileRes.data)

        const favRes = await api.get("/api/favorites/")
        const favs = favRes.data
        setFavoriteThreadIds(favs.map((fav) => fav.thread_id))

        const favMap = {}
        favs.forEach((fav) => {
          favMap[fav.thread_id] = fav.id
        })
        setFavoriteRecords(favMap)
      } catch (err) {
        console.error("Error fetching user or favorites:", err)
      }
    }
    fetchUserAndFavorites()
  }, [])

  // Step 2: Fetch topics AFTER favorites have loaded
  useEffect(() => {
    if (user === null) return

    async function fetchTopics() {
      try {
        const res = await api.get("/forum/topics/")
        const topicData = Array.isArray(res.data.results) ? res.data.results : []
        setTopics(topicData)
      } catch (err) {
        console.error("Failed to fetch topics:", err)
      }
    }
    fetchTopics()
  }, [user])

  // Step 3: Fetch threads AFTER topics and favorites loaded
  useEffect(() => {
    if (topics.length === 0) return

    async function fetchAllThreads() {
      try {
        await Promise.all(
          topics.map((topic) => fetchThreadsForTopic(topic.id, activeFilter))
        )
      } catch (e) {
        // errors handled inside fetchThreadsForTopic; swallow here
      }
    }
    fetchAllThreads()
  }, [topics, activeFilter])

  const fetchThreadsForTopic = async (topicId, sort = "all") => {
    let url = `/forum/threads/?topic=${topicId}`
    if (sort !== "all") url += `&sort=${sort}`

    setTopicLoading((prev) => ({ ...prev, [topicId]: true }))

    try {
      const res = await api.get(url)
      let threadList = Array.isArray(res.data.results) ? res.data.results : []

      if (sort === "favorites") {
        threadList = threadList.filter((thread) => favoriteThreadIds.includes(thread.id))
      }

      setThreadsByTopic((prev) => ({ ...prev, [topicId]: threadList }))
    } catch (err) {
      console.error(`Failed to fetch threads for topic ${topicId}:`, err)
      setThreadsByTopic((prev) => ({ ...prev, [topicId]: [] }))
    } finally {
      setTopicLoading((prev) => ({ ...prev, [topicId]: false }))
    }
  }

  const toggleFavorite = async (threadId) => {
    if (!user) {
      alert("You must be logged in to favorite threads.")
      return
    }

    if (favoriteThreadIds.includes(threadId)) {
      // Remove favorite
      const favoriteId = favoriteRecords[threadId]
      if (!favoriteId) return

      try {
        await api.delete(`/api/favorites/${favoriteId}/`)

        // Update local state immediately
        setFavoriteThreadIds((ids) => ids.filter((id) => id !== threadId))
        setFavoriteRecords((recs) => {
          const newRecs = { ...recs }
          delete newRecs[threadId]
          return newRecs
        })

        // If we're on favorites filter, remove the thread from view
        if (activeFilter === "favorites") {
          setThreadsByTopic((prev) => {
            const updated = { ...prev }
            Object.keys(updated).forEach((topicId) => {
              updated[topicId] = updated[topicId].filter((thread) => thread.id !== threadId)
            })
            return updated
          })
        }
      } catch (err) {
        console.error("Failed to remove favorite:", err)
      }
    } else {
      // Add favorite
      try {
        const res = await api.post("/api/favorites/add/", { thread_id: threadId })
        const newFavorite = res.data

        // Update local state immediately
        setFavoriteThreadIds((ids) => [...ids, threadId])
        setFavoriteRecords((recs) => ({ ...recs, [threadId]: newFavorite.id }))
      } catch (err) {
        console.error("Failed to add favorite:", err)
      }
    }
  }

  const handleThreadClick = (topicId, threadId) => {
    onThreadClick(threadId)
  }

  const handleCreateThread = async () => {
    if (!newThreadTitle.trim() || !newThreadMessage.trim() || !newThreadTopic) {
      alert("Please fill in all fields.")
      return
    }

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
      // Re-fetch only the specific topic where thread was created
      if (newThreadTopic) {
        fetchThreadsForTopic(newThreadTopic, activeFilter)
      }
    } catch (err) {
      console.error("Error creating thread:", err)
      alert("Failed to create thread.")
    }
  }

  return (
    <div className="flex flex-col h-full pb-16 bg-[#d1e6b2]">
      {/* Header */}
      <div className="p-5 bg-white rounded-b-2xl shadow">
        <div className="flex items-center">
          <button onClick={onBackClick} className="mr-3">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-center text-gray-800 flex-1">Discussion Forum</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-5 space-y-4">
          {/* Filter and Create Button Section */}
          <div className="flex justify-between items-center gap-3">
            <div className="relative flex-1">
              <button
                className="flex items-center justify-center space-x-2 bg-white p-3 rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 w-full"
                onClick={() => setShowFilterMenu(!showFilterMenu)}
              >
                <Filter className="h-4 w-4 text-green-600" />
                <span className="text-sm font-semibold text-gray-800">
                  {filterOptions.find((opt) => opt.id === activeFilter)?.label}
                </span>
              </button>
              {showFilterMenu && (
                <div className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-lg z-10 overflow-hidden">
                  {filterOptions.map((option) => (
                    <button
                      key={option.id}
                      className={`block px-4 py-3 text-sm w-full text-left hover:bg-gray-50 transition-colors ${
                        activeFilter === option.id ? "bg-green-50 text-green-600 font-semibold" : "text-gray-800"
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
              )}
            </div>
            
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center justify-center p-3 bg-green-600 rounded-2xl shadow-md hover:shadow-lg hover:bg-green-700 transition-all duration-200"
            >
              <Plus className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Create Thread Form */}
          {showCreateForm && (
            <div className="bg-white p-5 rounded-2xl shadow-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">Start a New Thread</h3>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Topic</label>
                  <select
                    className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Title</label>
                  <input
                    type="text"
                    placeholder="Enter thread title..."
                    className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    value={newThreadTitle}
                    onChange={(e) => setNewThreadTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Message</label>
                  <textarea
                    placeholder="Share your thoughts or ask a question..."
                    className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent h-24 resize-none"
                    value={newThreadMessage}
                    onChange={(e) => setNewThreadMessage(e.target.value)}
                  />
                </div>

                <button
                  onClick={handleCreateThread}
                  className="flex items-center justify-center space-x-2 w-full bg-green-600 text-white p-3 rounded-xl hover:bg-green-700 transition-all duration-200 font-semibold"
                >
                  <Send className="h-4 w-4" />
                  <span>Create Thread</span>
                </button>
              </div>
            </div>
          )}

          {/* Topics and Threads */}
          <div className="space-y-4">
            {topics.map((topic) => (
              <div key={topic.id} className="bg-white rounded-2xl shadow-md overflow-hidden">
                <div className="p-4 bg-green-600">
                  <h3 className="text-lg font-bold text-white">{topic.title}</h3>
                </div>
                
                <div className="p-4">
                  {topicLoading[topic.id] ? (
                    <div className="flex justify-center py-8">
                      <LoadingSpinner small />
                    </div>
                  ) : (
                    <div className="space-y-3">
                    
                      {(threadsByTopic[topic.id] || []).slice(0, 3).map((thread) => (
                        <div
                          key={thread.id}
                          className="bg-gray-50 p-3 rounded-xl cursor-pointer hover:bg-gray-100 transition-all duration-200 hover:shadow-sm"
                          onClick={() => handleThreadClick(topic.id, thread.id)}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {thread.title.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start gap-2">
                                <h4 className="font-semibold text-gray-800 text-sm leading-5 line-clamp-2">{thread.title}</h4>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleFavorite(thread.id)
                                  }}
                                  className="p-1 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0"
                                >
                                  {favoriteThreadIds.includes(thread.id) ? (
                                    <Star className="text-yellow-500 w-4 h-4 fill-current" />
                                  ) : (
                                    <StarOff className="text-gray-400 w-4 h-4" />
                                  )}
                                </button>
                              </div>
                              <div className="flex items-center space-x-2 mt-2 text-xs text-gray-600">
                                <span className="bg-gray-200 px-2 py-1 rounded-full text-xs">
                                  {thread.replies_count ?? 0} Replies
                                </span>
                                <span className="bg-gray-200 px-2 py-1 rounded-full text-xs">
                                  {thread.views_count ?? 0} Views
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {(threadsByTopic[topic.id] || []).length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <div className="text-lg mb-2">🌱</div>
                          <p>No threads found in this topic</p>
                        </div>
                      )}
                    </div>
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