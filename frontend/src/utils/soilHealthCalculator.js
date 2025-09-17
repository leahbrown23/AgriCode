// Crop-specific optimal ranges
const CROP_OPTIMAL_RANGES = {
  wheat: { N: [80, 200], P: [30, 80], K: [40, 120], pH_level: [6.0, 6.8] },
  tomato: { N: [100, 250], P: [50, 120], K: [80, 250], pH_level: [5.5, 6.8] },
  sugarcane: { N: [90, 200], P: [50, 100], K: [40, 150], pH_level: [5.0, 8.0] },
  maize: { N: [60, 200], P: [20, 100], K: [20, 150], pH_level: [5.5, 7.0] },
  potato: { N: [100, 300], P: [50, 120], K: [150, 250], pH_level: [5.5, 6.5] },
  rice: { N: [100, 200], P: [20, 70], K: [65, 120], pH_level: [5.5, 6.5] },
}

const DEFAULT_RANGES = {
  pH_level: [6.0, 7.5],
  N: [30, 70],
  P: [20, 50],
  K: [150, 300],
}

/**
 * Get optimal ranges based on crop type and custom settings
 * @param {Object} plotInfo - Plot information containing crop type
 * @returns {Object} Optimal ranges for the crop
 */
export function getOptimalRanges(plotInfo) {
  // Check for custom ranges first
  const customRanges = localStorage.getItem("customSoilRanges")
  if (customRanges) {
    return JSON.parse(customRanges)
  }

  // If no plot info, return default ranges
  if (!plotInfo?.crop) {
    return DEFAULT_RANGES
  }

  // Get crop-specific ranges
  const cropType = plotInfo.crop.toLowerCase()
  const cropRanges = CROP_OPTIMAL_RANGES[cropType]
  
  return cropRanges || DEFAULT_RANGES
}

/**
 * Calculate soil health score using the same logic as InsightsScreen
 * @param {Object} soilData - Current soil measurements
 * @param {Object} optimalRanges - Optimal ranges for each metric
 * @param {string} plotId - Plot ID for storing per-plot scores
 * @returns {number} Calculated soil health score
 */
export function calculateSoilScore(soilData, optimalRanges, plotId) {
  if (!soilData) return 0

  const WEIGHTS = { pH_level: 0.15, N: 0.40, P: 0.25, K: 0.20 }

  function safeNum(v) {
    if (v == null || v === "") return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }

  function getMetricHealthPercentage(value, range) {
    if (value == null || !range) return 50
    const [min, max] = range
    const mid = (min + max) / 2
    
    if (value >= min && value <= max) {
      const distanceFromCenter = Math.abs(value - mid)
      const maxDistanceFromCenter = (max - min) / 2
      const centerScore = 100 - (distanceFromCenter / maxDistanceFromCenter) * 10
      return Math.max(85, centerScore)
    } else if (value < min) {
      const deficit = min - value
      const penalty = (deficit / min) * 100
      return Math.max(20, 100 - penalty * 1.2)
    } else {
      const excess = value - max
      const penalty = (excess / max) * 100
      return Math.max(30, 100 - penalty * 1.0)
    }
  }

  const pHHealth = getMetricHealthPercentage(safeNum(soilData.pH_level), optimalRanges.pH_level)
  const nHealth = getMetricHealthPercentage(safeNum(soilData.N), optimalRanges.N)
  const pHealth = getMetricHealthPercentage(safeNum(soilData.P), optimalRanges.P)
  const kHealth = getMetricHealthPercentage(safeNum(soilData.K), optimalRanges.K)

  const weightedScore = (pHHealth * WEIGHTS.pH_level) +
                       (nHealth * WEIGHTS.N) +
                       (pHealth * WEIGHTS.P) +
                       (kHealth * WEIGHTS.K)

  const finalScore = Math.round(weightedScore)
  
  let classification = "Poor"
  if (finalScore >= 85) classification = "Excellent"
  else if (finalScore >= 70) classification = "Good"
  else if (finalScore >= 55) classification = "Moderate"
  else if (finalScore >= 40) classification = "Fair"

  // Save per-plot scores if plotId is provided
  if (plotId) {
    localStorage.setItem(`soilHealthScore_${plotId}`, finalScore.toString())
    localStorage.setItem(`soilHealthClassification_${plotId}`, classification)
  }

  return { score: finalScore, classification }
}

/**
 * Get classification text based on score
 * @param {number} score - Soil health score
 * @returns {string} Classification text
 */
export function getScoreClassification(score) {
  if (score >= 85) return "Excellent"
  if (score >= 70) return "Good" 
  if (score >= 55) return "Moderate"
  if (score >= 40) return "Fair"
  return "Poor"
}