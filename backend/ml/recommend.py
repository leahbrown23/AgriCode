import json
from .inference import predict_yield_for_crop, optimal_ranges

def generate_recommendations(input_data: dict):
    """
    Generates recommendations for the current crop based on soil, fertilizer/pesticide,
    and environmental conditions, including yield improvement estimate.
    """
    current_crop = input_data.get("Current_Crop", None)
    
    # Predict current crop yield
    try:
        current_yield = predict_yield_for_crop(input_data, current_crop) if current_crop else None
    except Exception as e:
        current_yield = None
        print(f"[Warning] Current yield prediction failed: {e}")
    
    recommendations = []

    # --- Step 1: Soil nutrient recommendations ---
    soil_keys = ["N", "P", "K", "pH"]
    if current_crop in optimal_ranges:
        for key in soil_keys:
            value = input_data.get(key)
            if value is None:
                continue
            low, high = optimal_ranges[current_crop].get(key, (None, None))
            if low and high:
                if value < low:
                    recommendations.append(
                        f"{key} is below optimal ({value}). Increase {key.lower()} to the {low}-{high} range for {current_crop}."
                    )
                elif value > high:
                    recommendations.append(
                        f"{key} is above optimal ({value}). Reduce {key.lower()} to the {low}-{high} range for {current_crop}."
                    )
    
    # --- Step 2: Fertilizer/Pesticide optimization ---
    best_yield = -1
    best_combo = {}
    if current_crop:
        # Test a small range of fertilizer/pesticide multipliers
        fert_values = [input_data.get("Fertilizer", 100) * factor for factor in [0.5, 1, 1.5, 2]]
        pest_values = [input_data.get("Pesticide", 10) * factor for factor in [0.5, 1, 1.5, 2]]
        for fert in fert_values:
            for pest in pest_values:
                test_input = input_data.copy()
                test_input["Fertilizer"] = fert
                test_input["Pesticide"] = pest
                try:
                    y_pred = predict_yield_for_crop(test_input, current_crop)
                except:
                    y_pred = 0
                if y_pred > best_yield:
                    best_yield = y_pred
                    best_combo = {"Fertilizer": fert, "Pesticide": pest}
        
        # Add fertilizer/pesticide recommendation
        rec_text = (
            f"For your current crop ({current_crop}): Optimal Fertilizer={best_combo['Fertilizer']:.1f}, "
            f"Pesticide={best_combo['Pesticide']:.1f}, predicted yield={best_yield:.2f} units"
        )
        # Compute yield improvement percentage if current yield exists
        if current_yield is not None and current_yield > 0:
            improvement_pct = ((best_yield - current_yield) / current_yield) * 100
            rec_text += f" (Yield improvement: {improvement_pct:.1f}%)"
        recommendations.append(rec_text)
    
    # --- Step 3: Environmental condition checks ---
    if "Rainfall" in input_data:
        rainfall = input_data["Rainfall"]
        if rainfall < 400:
            recommendations.append("Low rainfall detected — consider irrigation or drought-tolerant crops.")
        elif rainfall > 1200:
            recommendations.append("High rainfall detected — ensure proper drainage to avoid root rot.")
    if "Temperature" in input_data:
        temp = input_data["Temperature"]
        if temp < 15:
            recommendations.append("Low temperature — consider cool-season crops like wheat or barley.")
        elif temp > 35:
            recommendations.append("High temperature — consider heat-tolerant crops such as sorghum or millet.")
    if "Humidity" in input_data:
        humidity = input_data["Humidity"]
        if humidity < 40:
            recommendations.append("Low humidity — crops may experience water stress. Ensure adequate soil moisture.")
        elif humidity > 85:
            recommendations.append("High humidity — monitor for fungal diseases and improve airflow if possible.")
    
    # --- Step 4: Current crop yield info ---
    if current_yield is not None:
        recommendations.append(f"Estimated yield for current crop ({current_crop}): {current_yield:.2f} units")
    
    result = {
        "current_crop": current_crop,
        "current_yield": round(float(current_yield), 2) if current_yield else None,
        "recommendations": recommendations
    }
    
    return result


# Optional local test
if __name__ == "__main__":
    sample_input = {
<<<<<<< HEAD
        "N": 12.86,
        "P": 15.5,
        "K": 219.41,
        "pH": 8.06,
        "Temperature": 25.6,
        "Rainfall": 53.3,
        "Humidity": 50.7,
        "Soil_Type": "Sandy",
        "Current_Crop": "rice",
        "Fertilizer": 160,
        "Pesticide": 5
=======
        "N": 85,
        "P": 42,
        "K": 210,
        "pH": 6.1,
        "Temperature": 27,
        "Rainfall": 950,
        "Humidity": 60,
        "Soil_Type": "Loamy",
        "Current_Crop": "Maize",
        "Fertilizer": 100,
        "Pesticide": 10
>>>>>>> 1a72677510c3f2543d1d8cbff9ee6fe7162c4833
    }

    result = generate_recommendations(sample_input)
    print(json.dumps(result, indent=2))
