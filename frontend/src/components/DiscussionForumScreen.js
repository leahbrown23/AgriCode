import axios from "axios"
import { ArrowLeft, Filter } from "lucide-react"
import { useEffect, useState } from "react"

export default function DiscussionForumScreen({ onBackClick, onThreadClick}) {
  const [topics, setTopics] = useState([])
  const [threadsByTopic, setThreadsByTopic] = useState({})
  const [activeFilter, setActiveFilter] = useState("all")
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const token = localStorage.getItem("accessToken")

  const filterOptions = [
    { id: "all", label: "All Threads" },
    { id: "new", label: "New" },
    { id: "trending", label: "Trending" },
    { id: "popular", label: "Popular" },
  ]

  useEffect(() => {
    axios.get("/forum/topics/", {
  headers: {
    Authorization: `Bearer ${token}`
  }
})
      .then(res => {
        setTopics(res.data)
        res.data.forEach(topic => {
          fetchThreadsForTopic(topic.id, activeFilter)
        })
      })
      .catch(err => console.error("Failed to fetch topics:", err))
  }, [])

  useEffect(() => {
    topics.forEach(topic => fetchThreadsForTopic(topic.id, activeFilter))
  }, [activeFilter])

const fetchThreadsForTopic = async (topicId, sort = "all") => {
  const token = localStorage.getItem("accessToken") // ✅ Your JWT token
  let url = `/forum/threads/?topic=${topicId}`
  if (sort !== "all") url += `&sort=${sort}`

  try {
    const res = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}` // ✅ Correct header for JWT
      }
    })
    setThreadsByTopic(prev => ({ ...prev, [topicId]: res.data }))
  } catch (err) {
    console.error(`Failed to fetch threads for topic ${topicId}:`, err)
  }
}

  const handleThreadClick = (topicId, threadId) => {
  onThreadClick(threadId)
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
        <div className="p-4 space-y-4">
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
                        className={`block px-4 py-2 text-sm w-full text-left ${activeFilter === option.id ? "bg-gray-100" : ""}`}
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

          {/* Topics Grid */}
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
                          <div className="flex justify-between">
                            <span className="font-semibold">{thread.title}</span>
                            <span className="text-xs text-gray-500">{thread.message_count} replies</span>
                          </div>
                          <span className="text-xs px-2 py-1 bg-gray-200 rounded-full">
                            {activeFilter}
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
