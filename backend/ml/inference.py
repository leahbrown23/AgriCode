import pandas as pd
import joblib
import json
import os
import numpy as np

# get the folder this file is in
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_DIR = os.path.join(BASE_DIR, "models")
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, "..", ".."))
DATA_DIR = os.path.join(PROJECT_ROOT, "data")
model_path = os.path.join(MODEL_DIR, "crop_rf_model.pkl")
feature_cols_path = os.path.join(MODEL_DIR, "feature_columns.json")

#load model
clf = joblib.load(model_path)

# Load crop mapping
with open(os.path.join(MODEL_DIR, "feature_columns.json"), "r") as f:
    feature_cols = json.load(f)

with open(os.path.join(DATA_DIR, "crop_mapping.json"), "r") as f:
    crop_mapping = json.load(f)
    crop_reverse_mapping = crop_mapping["crop"]["reverse"]

# Load soil type encoder mapping
soil_type_mapping = crop_mapping["soil_type"]["forward"]

def compute_nutrient_devs(input_df):
    """
    Compute nutrient deviations from optimal ranges for each crop in input_df.
    """
    optimal_ranges = {
        "wheat": {"N": (80, 200), "P": (30, 80), "K": (40, 120), "pH": (6.0, 6.8)},
        "tomato": {"N": (100, 250), "P": (50, 120), "K": (80, 250), "pH": (5.5, 6.8)},
        "sugarcane": {"N": (90, 200), "P": (50, 100), "K": (40, 150), "pH": (5.0, 8.0)},
        "maize": {"N": (60, 200), "P": (20, 100), "K": (20, 150), "pH": (5.5, 7.0)},
        "potato": {"N": (100, 300), "P": (50, 120), "K": (150, 250), "pH": (5.5, 6.5)},
        "rice": {"N": (100, 200), "P": (20, 70), "K": (65, 120), "pH": (5.5, 6.5)},
    }

    # Compute deviations per nutrient per crop
    for nutrient in ["N", "P", "K", "pH"]:
        min_val = input_df[nutrient].values[0]
        # We assume deviation is relative to mean of each crop's optimal range
        mean_vals = {crop: (r[nutrient][0] + r[nutrient][1]) / 2 for crop, r in optimal_ranges.items()}
        # For simplicity, compute deviation against overall mean
        overall_mean = sum(mean_vals.values()) / len(mean_vals)
        input_df[f"{nutrient}_dev"] = abs(input_df[nutrient] - overall_mean) / (max(input_df[nutrient]) - min(input_df[nutrient]) + 1e-5)
    return input_df

def preprocess_input(data: dict):
    """
    Convert input dict to dataframe with same features as training.
    """
    df = pd.DataFrame([data])

    # One-hot encode Soil_Type
    for soil in soil_type_mapping.keys():
        df[f"soil_{soil}"] = 1 if data["Soil_Type"] == soil else 0

    # Compute nutrient deviations
    df = compute_nutrient_devs(df)

    # Keep only the feature columns used in training
    df = df.reindex(columns=feature_cols, fill_value=0)
    return df

def get_crop_compatibility_score(crop_name: str, input_data: dict):
    """
    Calculate compatibility score for a specific crop based on soil conditions.
    Used to analyze both ML recommendation and current crop.
    """
    optimal_ranges = {
        "wheat": {"N": (80, 200), "P": (30, 80), "K": (40, 120), "pH": (6.0, 6.8)},
        "tomato": {"N": (100, 250), "P": (50, 120), "K": (80, 250), "pH": (5.5, 6.8)},
        "sugarcane": {"N": (90, 200), "P": (50, 100), "K": (40, 150), "pH": (5.0, 8.0)},
        "maize": {"N": (60, 200), "P": (20, 100), "K": (20, 150), "pH": (5.5, 7.0)},
        "potato": {"N": (100, 300), "P": (50, 120), "K": (150, 250), "pH": (5.5, 6.5)},
        "rice": {"N": (100, 200), "P": (20, 70), "K": (65, 120), "pH": (5.5, 6.5)},
    }
    
    if crop_name not in optimal_ranges:
        return 50  # Default score for unknown crops
    
    ranges = optimal_ranges[crop_name]
    score = 0
    total_metrics = 0
    
    for nutrient, (min_val, max_val) in ranges.items():
        current_value = input_data.get(nutrient, input_data.get(nutrient.replace("pH", "pH_level")))
        if current_value is not None:
            total_metrics += 1
            if min_val <= current_value <= max_val:
                score += 100
            else:
                # Calculate partial score based on distance from optimal range
                mid = (min_val + max_val) / 2
                range_size = max_val - min_val
                distance = abs(current_value - mid)
                normalized_distance = distance / (range_size / 2)
                partial_score = max(0, 100 - (normalized_distance * 40))
                score += partial_score
    
    if total_metrics > 0:
        return round(score / total_metrics, 1)
    return 50

def predict_crop(input_data: dict):
    """
    Return single ML crop recommendation with confidence score.
    Pure ML prediction - no multiple recommendations.
    """
    try:
        # Preprocess input for ML model
        df_input = preprocess_input(input_data)
        
        # Get ML prediction and confidence
        pred_encoded = clf.predict(df_input)[0]
        pred_probabilities = clf.predict_proba(df_input)[0]
        
        # Get the predicted crop name
        predicted_crop = crop_reverse_mapping[str(pred_encoded)]
        
        # Get confidence score (probability of the predicted class)
        max_probability = max(pred_probabilities)
        confidence_score = round(max_probability * 100, 1)
        
        # Get compatibility score for soil conditions
        compatibility_score = get_crop_compatibility_score(predicted_crop, input_data)
        
        return {
            "crop": predicted_crop,
            "ml_confidence": confidence_score,
            "compatibility_score": compatibility_score,
            "ml_probability": max_probability
        }
        
    except Exception as e:
        print(f"ML model error: {e}")
        return None

# Example usage
if __name__ == "__main__":
    sample = {
        "N": 120, "P": 40, "K": 60, "pH": 6.2,
        "Temperature": 28, "Humidity": 65, "Rainfall": 180,
        "Soil_Type": "Loamy"
    }
    recommendation = predict_crop(sample)
    print("ML recommendation:", recommendation)