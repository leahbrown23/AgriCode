import axios from "axios"
import { ArrowLeft } from "lucide-react"
import { useEffect, useState } from "react"

export default function ThreadViewScreen({ threadId, onBackClick }) {
  const [thread, setThread] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const token = localStorage.getItem("accessToken")

  useEffect(() => {
    fetchThread()
    fetchMessages()
  }, [threadId])

 const fetchThread = async () => {
  const token = localStorage.getItem("accessToken")
  if (!token) return console.error("No access token found")

  try {
    const res = await axios.get(`/forum/threads/${threadId}/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      }
    })
    setThread(res.data)
  } catch (err) {
    console.error("Error fetching thread:", err)
  }
}

const fetchMessages = async () => {
  const token = localStorage.getItem("accessToken")
  if (!token) return console.error("No access token found")

  try {
    const res = await axios.get(`/forum/chats/?thread=${threadId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      }
    })
    setMessages(res.data)
  } catch (err) {
    console.error("Error fetching messages:", err)
  }
}

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return
    setLoading(true)
    setError(null)

    try {
await axios.post("/forum/chats/", {
  thread: threadId,
  content: newMessage
}, {
  headers: {
    Authorization: `Bearer ${token}`
  }
})

      setNewMessage("")
      fetchMessages()
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
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3 bg-[#f9f9f9]">
        {messages.length === 0 ? (
          <p className="text-center text-gray-400 mt-4">No messages yet</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="bg-white p-3 rounded-lg shadow-sm">
              <div className="flex justify-between">
                <span className="font-semibold text-sm">{msg.user}</span>
                <span className="text-xs text-gray-400">{new Date(msg.created_at).toLocaleString()}</span>
              </div>
              <p className="text-sm mt-1">{msg.content}</p>
            </div>
          ))
        )}
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
