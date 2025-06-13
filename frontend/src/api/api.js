import axios from "axios"

const api = axios.create({
  baseURL: "http://localhost:8000",
})

// === Token Refresh Logic with Queue Support ===
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })

  failedQueue = []
}

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

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      localStorage.getItem("refreshToken")
    ) {
      originalRequest._retry = true

      if (isRefreshing) {
        // Wait for token refresh to complete
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = "Bearer " + token
            return api(originalRequest)
          })
          .catch((err) => {
            return Promise.reject(err)
          })
      }

      isRefreshing = true

      try {
        const res = await axios.post("http://localhost:8000/api/token/refresh/", {
          refresh: localStorage.getItem("refreshToken"),
        })

        const newAccessToken = res.data.access
        localStorage.setItem("accessToken", newAccessToken)

        api.defaults.headers.common.Authorization = "Bearer " + newAccessToken
        processQueue(null, newAccessToken)

        return api(originalRequest)
      } catch (err) {
        processQueue(err, null)
        localStorage.removeItem("accessToken")
        localStorage.removeItem("refreshToken")
        window.location.href = "/login"
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api
