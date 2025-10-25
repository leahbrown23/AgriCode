import axios from "axios"

// Base URL for the backend API.
// In dev, we point to the local Django server.
const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // safe to keep; doesn't break local JWT flow
})

// === Token Refresh with Queue Support ===
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })

  failedQueue = []
}

// Attach Authorization header on every request if we have an access token
api.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem("accessToken")
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    const status = error?.response?.status
    const hasTriedRefresh = originalRequest?._retry
    const refreshToken = localStorage.getItem("refreshToken")

    // If 401, we have a refresh token, and we haven't retried yet — try refresh
    if (status === 401 && !hasTriedRefresh && refreshToken) {
      originalRequest._retry = true

      if (isRefreshing) {
        // queue up requests while we refresh so we don't spam the server
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject })
        })
          .then((newToken) => {
            originalRequest.headers.Authorization = "Bearer " + newToken
            return api(originalRequest)
          })
          .catch((err) => {
            return Promise.reject(err)
          })
      }

      isRefreshing = true

      try {
        // dynamically build refresh URL against the same backend baseURL
        const refreshUrl = `${API_BASE_URL}/api/token/refresh/`

        const res = await axios.post(refreshUrl, {
          refresh: refreshToken,
        })

        const newAccessToken = res.data.access
        localStorage.setItem("accessToken", newAccessToken)

        // update default header for future requests
        api.defaults.headers.common.Authorization = "Bearer " + newAccessToken

        // resolve anything waiting in the queue
        processQueue(null, newAccessToken)

        // retry the original request
        return api(originalRequest)
      } catch (err) {
        // refresh failed, nuke tokens and bounce to login
        processQueue(err, null)
        localStorage.removeItem("accessToken")
        localStorage.removeItem("refreshToken")

        console.log("Token refresh failed:", err)

        if (
          window.location.pathname !== "/login" &&
          window.location.pathname !== "/"
        ) {
          window.location.href = "/"
        }

        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }

    // If it's not a refreshable 401, just reject
    return Promise.reject(error)
  }
)

export default api
