import axios from "axios"
import { ArrowLeft } from "lucide-react"
import { useEffect, useRef, useState } from "react"

export default function ThreadViewScreen({ threadId, onBackClick }) {
  const [thread, setThread] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [nextOffset, setNextOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const messageEndRef = useRef(null)

  const token = localStorage.getItem("accessToken")
  const LIMIT = 10 // number of messages per page

  useEffect(() => {
    fetchThread()
    resetMessages()
  }, [threadId])

  useEffect(() => {
    if (nextOffset === LIMIT && messageEndRef.current) {
      // Only scroll to bottom on initial load or after sending
      messageEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  const fetchThread = async () => {
    try {
      const res = await axios.get(`http://localhost:8000/forum/threads/${threadId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setThread(res.data)
    } catch (err) {
      console.error("Error fetching thread:", err)
    }
  }

  const resetMessages = async () => {
    setMessages([])
    setNextOffset(0)
    setHasMore(true)
    await loadOlderMessages(0)
  }

  const loadOlderMessages = async (offset = nextOffset) => {
    try {
      const container = document.querySelector("#chat-scroll-container")
      const prevScrollHeight = container?.scrollHeight || 0

      const res = await axios.get(`http://localhost:8000/forum/chats/`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          thread: threadId,
          limit: LIMIT,
          offset: offset,
        },
      })

      let newMessages = Array.isArray(res.data.results) ? res.data.results : []

      // Backend returns newest first — reverse to display oldest at top
      newMessages.reverse()

      // Combine and deduplicate
      const combined = [...newMessages, ...messages]
      const uniqueMessagesMap = new Map()
      combined.forEach((msg) => uniqueMessagesMap.set(msg.id, msg))

      const finalMessages = Array.from(uniqueMessagesMap.values())
      setMessages(finalMessages)
      setNextOffset(offset + LIMIT)

      if (newMessages.length < LIMIT) {
        setHasMore(false)
      }

      // Restore previous scroll position
      setTimeout(() => {
        if (container) {
          const newScrollHeight = container.scrollHeight
          container.scrollTop = newScrollHeight - prevScrollHeight
        }
      }, 50)
    } catch (err) {
      console.error("Error loading older messages:", err)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return
    setLoading(true)
    setError(null)

    try {
      await axios.post(
        "http://localhost:8000/forum/chats/",
        { thread: threadId, content: newMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setNewMessage("")
      resetMessages() // Reload messages after sending
    } catch (err) {
      console.error("Error sending message:", err)
      setError("Failed to send message")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 p-4 bg-white flex items-center">
        <button onClick={onBackClick} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold flex-1 text-center">Thread</h1>
      </div>

      {/* Thread Info */}
      {thread && (
        <div className="bg-[#f0fdf4] px-4 py-3 border-b border-green-300">
          <h2 className="text-md font-semibold">{thread.title}</h2>
          <p className="text-xs text-gray-500">{thread.message_count} replies</p>
        </div>
      )}

      {/* Messages */}
      <div
        id="chat-scroll-container"
        className="flex-1 overflow-y-auto px-4 py-2 space-y-3 bg-[#f9f9f9]"
      >
        {hasMore && (
          <div className="text-center">
            <button
              onClick={() => loadOlderMessages()}
              className="text-sm text-blue-600 underline hover:text-blue-800"
            >
              Load older messages
            </button>
          </div>
        )}

        {messages.length === 0 ? (
          <p className="text-center text-gray-400 mt-4">No messages yet</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="bg-white p-3 rounded-lg shadow-sm">
              <div className="flex justify-between">
                <span className="font-semibold text-sm">{msg.user}</span>
                <span className="text-xs text-gray-400">
                  {new Date(msg.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-sm mt-1">{msg.content}</p>
            </div>
          ))
        )}
        <div ref={messageEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t bg-white flex items-center gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
        <button
          onClick={handleSendMessage}
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition"
        >
          Send
        </button>
      </div>

      {error && <p className="text-red-500 text-xs text-center">{error}</p>}
    </div>
  )
}
