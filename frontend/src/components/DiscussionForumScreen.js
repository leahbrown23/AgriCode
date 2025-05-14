"use client"

import { useState } from "react"
import { ArrowLeft, Filter } from "lucide-react"

export default function DiscussionForum({ onBackClick }) {
  const [activeFilter, setActiveFilter] = useState("all")
  const [showFilterMenu, setShowFilterMenu] = useState(false)

  const filterOptions = [
    { id: "all", label: "All Threads" },
    { id: "question", label: "Questions" },
    { id: "discussion", label: "Discussions" },
    { id: "advice", label: "Advice" },
  ]

  // Simplified forum topics data - reduced to 3 topics to fit better
  const forumTopics = [
    {
      id: 1,
      title: "Soil Health",
      color: "#2a9d4a",
      threads: [
        {
          id: 101,
          author: "Rotanda Walnutz",
          avatar: "/placeholder.svg?height=50&width=50",
          title: "Have you noticed improvements in yield after adjusting your soil pH and nutrient levels?",
          replies: 12,
          type: "question",
        },
        {
          id: 102,
          author: "Wine Hill",
          avatar: "/placeholder.svg?height=50&width=50",
          title: "Would you be willing to share soil test results from your farm?",
          replies: 8,
          type: "discussion",
        },
      ],
    },
    {
      id: 2,
      title: "Water Management",
      color: "#3a8fb7",
      threads: [
        {
          id: 201,
          author: "Berry Blaze",
          avatar: "",
          title: "Has anyone used mulch or cover crops to improve moisture retention?",
          replies: 9,
          type: "question",
        },
        {
          id: 202,
          author: "Meadow Farms",
          avatar: "/placeholder.svg?height=50&width=50",
          title: "Best practices for drip irrigation in vegetable gardens?",
          replies: 14,
          type: "advice",
        },
      ],
    },
    {
      id: 3,
      title: "Crop Management",
      color: "#d4a017",
      threads: [
        {
          id: 301,
          author: "Harvest Moon",
          avatar: "/placeholder.svg?height=50&width=50",
          title: "Which crop rotation schedule has worked best for your farm?",
          replies: 11,
          type: "question",
        },
        {
          id: 302,
          author: "Green Thumb",
          avatar: "/placeholder.svg?height=50&width=50",
          title: "Organic pest control methods that actually work",
          replies: 23,
          type: "advice",
        },
      ],
    },
  ]

  const getFilteredThreads = (threads) => {
    if (activeFilter === "all") return threads
    return threads.filter((thread) => thread.type === activeFilter)
  }

  const handleThreadClick = (topicId, threadId) => {
    console.log(`Navigate to thread: ${threadId} in topic: ${topicId}`)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header - Fixed */}
      <div className="sticky top-0 z-10 p-4 bg-white flex items-center">
        <button onClick={onBackClick} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold flex-1 text-center">Discussion Forum</h1>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto bg-[#d1e6b2]">
        <div className="p-4 space-y-4">
          {/* Filter Section */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Community</h2>
            <div className="relative">
              <button
                className="flex items-center space-x-1 bg-white p-2 rounded-lg shadow"
                onClick={() => setShowFilterMenu(!showFilterMenu)}
              >
                <Filter className="h-4 w-4" />
                <span className="text-sm">Filter: {filterOptions.find((opt) => opt.id === activeFilter)?.label}</span>
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

          {/* Topic Bubbles */}
          <div className="grid grid-cols-1 gap-4">
            {forumTopics.map((topic) => (
              <div
                key={topic.id}
                className="rounded-lg shadow overflow-hidden"
                style={{ backgroundColor: topic.color }}
              >
                <div className="p-3 text-white font-semibold">
                  <h3 className="text-lg">Topic: {topic.title}</h3>
                </div>
                <div className="bg-white p-2 space-y-2">
                  {getFilteredThreads(topic.threads).map((thread) => (
                    <div
                      key={thread.id}
                      className="bg-gray-100 p-3 rounded-md cursor-pointer hover:bg-gray-200 transition-colors"
                      onClick={() => handleThreadClick(topic.id, thread.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-300 flex-shrink-0">
                          <img
                            src={thread.avatar || "/placeholder.svg"}
                            alt={thread.author}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <span className="font-semibold">{thread.author}:</span>
                            <span className="text-xs text-gray-500">{thread.replies} replies</span>
                          </div>
                          <p className="text-sm mt-1">{thread.title}</p>
                          <span className="text-xs px-2 py-1 bg-gray-200 rounded-full">{thread.type}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {getFilteredThreads(topic.threads).length === 0 && (
                    <div className="text-center py-4 text-gray-500">No threads match the current filter</div>
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
