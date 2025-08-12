"use client"

import { ArrowLeft, Filter, Star, StarOff } from "lucide-react"
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
        setFavoriteThreadIds(favs.map(fav => fav.thread_id))

        const favMap = {}
        favs.forEach(fav => { favMap[fav.thread_id] = fav.id })
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
      setLoading(true)
      for (const topic of topics) {
        await fetchThreadsForTopic(topic.id, activeFilter)
      }
      setLoading(false)
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
        setFavoriteThreadIds(ids => ids.filter(id => id !== threadId))
        setFavoriteRecords(recs => {
          const r = { ...recs }; delete r[threadId]; return r
        })
        if (activeFilter === "favorites") {
          setThreadsByTopic(prev => {
            const updated = { ...prev }
            Object.keys(updated).forEach(tid => {
              updated[tid] = updated[tid].filter(th => th.id !== threadId)
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
        setFavoriteThreadIds(ids => [...ids, threadId])
        setFavoriteRecords(recs => ({ ...recs, [threadId]: newFavorite.id }))
      } catch (err) {
        console.error("Failed to add favorite:", err)
      }
    }
  }

  const handleThreadClick = (topicId, threadId) => onThreadClick(threadId)

  const handleCreateThread = async () => {
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
      {/* Header smaller */}
      <div className="sticky top-0 z-10 px-3 py-2.5 bg-white flex items-center">
        <button onClick={onBackClick} className="mr-1.5 p-1 rounded hover:bg-gray-100">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-base font-semibold flex-1 text-center">Discussion Forum</h1>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#d1e6b2]">
        <div className="p-3 space-y-3 pb-20">
          {/* Title + Filter row smaller */}
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold">Community</h2>
            <div className="relative">
              <button
                className="flex items-center space-x-1 bg-white px-2.5 py-1.5 rounded-md shadow"
                onClick={() => setShowFilterMenu(!showFilterMenu)}
              >
                <Filter className="h-3.5 w-3.5" />
                <span className="text-xs">
                  Filter: {filterOptions.find((opt) => opt.id === activeFilter)?.label}
                </span>
              </button>
              {showFilterMenu && (
                <div className="absolute right-0 mt-1 w-36 bg-white rounded-md shadow-lg z-10">
                  <div className="py-1">
                    {filterOptions.map((option) => (
                      <button
                        key={option.id}
                        className={`block px-3 py-1.5 text-xs w-full text-left ${
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

          {/* Create button smaller */}
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-green-600 text-white px-3 py-1.5 rounded-md mt-2 hover:bg-green-700 text-sm"
          >
            + Create New Thread
          </button>

          {/* Create form smaller */}
          {showCreateForm && (
            <div className="bg-white p-3 mt-3 rounded-md shadow space-y-2">
              <h3 className="text-sm font-semibold">Start a New Thread</h3>
              <select
                className="w-full p-2 border rounded text-sm"
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
                className="w-full p-2 border rounded text-sm"
                value={newThreadTitle}
                onChange={(e) => setNewThreadTitle(e.target.value)}
              />
              <textarea
                placeholder="Description or message..."
                className="w-full p-2 border rounded text-sm"
                value={newThreadMessage}
                onChange={(e) => setNewThreadMessage(e.target.value)}
              />
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleCreateThread}
                  className="bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 text-sm"
                >
                  Submit
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-xs text-gray-600 underline"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Topic cards smaller */}
          <div className="grid grid-cols-1 gap-3">
            {topics.map((topic, index) => (
              <div
                key={topic.id}
                className="rounded-md shadow overflow-hidden"
                style={{ backgroundColor: ["#2a9d4a", "#3a8fb7", "#d4a017"][index % 3] }}
              >
                <div className="px-3 py-2 text-white font-semibold">
                  <h3 className="text-base">Topic: {topic.title}</h3>
                </div>
                <div className="bg-white p-2 space-y-2">
                  {topicLoading[topic.id] ? (
                    <div className="flex justify-center py-3">
                      <LoadingSpinner small />
                    </div>
                  ) : (
                    <>
                      {(threadsByTopic[topic.id] || []).slice(0, 3).map((thread) => (
                        <div
                          key={thread.id}
                          className="bg-gray-100 p-2.5 rounded cursor-pointer hover:bg-gray-200 transition-colors"
                          onClick={() => handleThreadClick(topic.id, thread.id)}
                        >
                          <div className="flex items-start space-x-2.5">
                            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white text-[10px]">
                              {thread.title.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-center">
                                <span className="font-semibold text-sm leading-snug">{thread.title}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleFavorite(thread.id)
                                  }}
                                  className="p-1"
                                >
                                  {favoriteThreadIds.includes(thread.id) ? (
                                    <Star className="text-yellow-400 w-3.5 h-3.5" />
                                  ) : (
                                    <StarOff className="text-gray-400 w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                              <div className="text-[11px] text-gray-600 mt-0.5 flex space-x-1.5">
                                <span>{thread.replies_count ?? 0} Replies</span>
                                <span>•</span>
                                <span>{thread.views_count ?? 0} Views</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {(threadsByTopic[topic.id] || []).length === 0 && (
                        <div className="text-center py-3 text-gray-500 text-sm">No threads found</div>
                      )}
                    </>
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
