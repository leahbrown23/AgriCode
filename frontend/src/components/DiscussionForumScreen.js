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
  
  const [loading, setLoading] = useState(true)
  
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

  useEffect(() => {
    async function fetchUserAndFavorites() {
      try {
        const profileRes = await api.get("/api/profile/")
        setUser(profileRes.data)

        const favRes = await api.get("/api/favorites/")
        const favs = favRes.data
        setFavoriteThreadIds(favs.map((fav) => fav.thread_id))

        const favMap = {}
        favs.forEach(fav => {
          favMap[fav.thread_id] = fav.id
        })
        setFavoriteRecords(favMap)
      } catch (err) {
        console.error("Error fetching user or favorites:", err)
      }
    }
    fetchUserAndFavorites()
  }, [])

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

    setTopicLoading(prev => ({ ...prev, [topicId]: true }))
    try {
      const res = await api.get(url)
      let threadList = Array.isArray(res.data.results) ? res.data.results : []
      if (sort === "favorites") {
        threadList = threadList.filter(t => favoriteThreadIds.includes(t.id))
      }
      setThreadsByTopic(prev => ({ ...prev, [topicId]: threadList }))
    } catch (err) {
      console.error(`Failed to fetch threads for topic ${topicId}:`, err)
      setThreadsByTopic(prev => ({ ...prev, [topicId]: [] }))
    } finally {
      setTopicLoading(prev => ({ ...prev, [topicId]: false }))
    }
  }

  const toggleFavorite = async (threadId) => {
    if (!user) {
      alert("You must be logged in to favorite threads.")
      return
    }
    if (favoriteThreadIds.includes(threadId)) {
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
        if (activeFilter === "favorites") {
          setThreadsByTopic(prev => {
            const updated = { ...prev }
            Object.keys(updated).forEach(topicId => {
              updated[topicId] = updated[topicId].filter(thread => thread.id !== threadId)
            })
            return updated
          })
        }
      } catch (err) {
        console.error("Failed to remove favorite:", err)
      }
    } else {
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

  const handleThreadClick = (topicId, threadId) => onThreadClick(threadId)

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
      fetchThreadsForTopic(newThreadTopic, activeFilter)
    } catch (err) {
      console.error("Error creating thread:", err)
      alert("Failed to create thread.")
    }
  }

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
                
                <div className="p-4">
                  {topicLoading[topic.id] ? (
                    <div className="flex justify-center py-4">
                      <LoadingSpinner small />
                    </div>
                  ) : (
                    <div className="space-y-3">
                    
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
                                    <StarOff className="text-gray-400 w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                              <div className="text-xs text-gray-600 mt-1 flex space-x-2">
                                <span>{thread.replies_count ?? 0} Replies</span>
                                <span>•</span>
                                <span>{thread.views_count ?? 0} Views</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {(threadsByTopic[topic.id] || []).length === 0 && (
                        <div className="text-center py-4 text-gray-500">No threads found</div>
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
