import pandas as pd
import joblib
import json
import os
import numpy as np

# === Optimal nutrient ranges for compatibility scoring ===
optimal_ranges = {
    "wheat": {"N": (80, 200), "P": (30, 80), "K": (40, 120), "pH": (6.0, 6.8)},
    "tomato": {"N": (100, 250), "P": (50, 120), "K": (80, 250), "pH": (5.5, 6.8)},
    "sugarcane": {"N": (90, 200), "P": (50, 100), "K": (40, 150), "pH": (5.0, 8.0)},
    "maize": {"N": (60, 200), "P": (20, 100), "K": (20, 150), "pH": (5.5, 7.0)},
    "potato": {"N": (100, 300), "P": (50, 120), "K": (150, 250), "pH": (5.5, 6.5)},
    "rice": {"N": (100, 200), "P": (20, 70), "K": (65, 120), "pH": (5.5, 6.5)},
}

# === Paths ===
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "models")
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, "..", ".."))
DATA_DIR = os.path.join(PROJECT_ROOT, "data")

# === Load Models ===
crop_model_path = os.path.join(MODEL_DIR, "crop_rf_model.pkl")
clf = joblib.load(crop_model_path)

yield_model_path = os.path.join(MODEL_DIR, "yield_rf_model.pkl")
yield_model = joblib.load(yield_model_path)

# === Load Metadata ===
with open(os.path.join(MODEL_DIR, "feature_columns.json"), "r") as f:
    feature_cols = json.load(f)

with open(os.path.join(MODEL_DIR, "yield_feature_columns.json"), "r") as f:
    yield_feature_cols = json.load(f)

with open(os.path.join(DATA_DIR, "crop_mapping.json"), "r") as f:
    crop_mapping = json.load(f)
    crop_reverse_mapping = crop_mapping["crop"]["reverse"]
    soil_type_mapping = crop_mapping["soil_type"]["forward"]


# === Helper: Compute nutrient deviations ===
def compute_nutrient_devs(input_df):
    for nutrient in ["N", "P", "K", "pH"]:
        mean_vals = {crop: (r[nutrient][0] + r[nutrient][1]) / 2 for crop, r in optimal_ranges.items()}
        overall_mean = sum(mean_vals.values()) / len(mean_vals)
        input_df[f"{nutrient}_dev"] = abs(input_df[nutrient] - overall_mean) / (
            input_df[nutrient].max() - input_df[nutrient].min() + 1e-5
        )
    return input_df


# === Preprocessing for crop model ===
def preprocess_input(data: dict):
    df = pd.DataFrame([data])

    # Ensure all expected environmental features exist
    for key in ["Temperature", "Humidity", "Rainfall", "Fertilizer", "Pesticide"]:
        if key not in df.columns:
            df[key] = 0  # default fallback if missing

    # One-hot encode soil types
    for soil in soil_type_mapping.keys():
        df[f"soil_{soil}"] = 1 if data.get("Soil_Type") == soil else 0

    df = compute_nutrient_devs(df)
    df = df.reindex(columns=feature_cols, fill_value=0)
    return df


# === Compatibility scoring ===
def get_crop_compatibility_score(crop_name: str, input_data: dict):
    if crop_name not in optimal_ranges:
        return 50
    ranges = optimal_ranges[crop_name]
    score, total = 0, 0
    for nutrient, (min_val, max_val) in ranges.items():
        val = input_data.get(nutrient, input_data.get(nutrient.replace("pH", "pH_level")))
        if val is not None:
            total += 1
            if min_val <= val <= max_val:
                score += 100
            else:
                mid = (min_val + max_val) / 2
                range_size = max_val - min_val
                distance = abs(val - mid)
                normalized_distance = distance / (range_size / 2)
                score += max(0, 100 - (normalized_distance * 40))
    return round(score / total, 1) if total > 0 else 50


# === Predict crop ===
def predict_crop(input_data: dict):
    try:
        df_input = preprocess_input(input_data)
        pred_encoded = clf.predict(df_input)[0]
        pred_probabilities = clf.predict_proba(df_input)[0]
        predicted_crop = crop_reverse_mapping[str(pred_encoded)]
        max_probability = max(pred_probabilities)
        compatibility_score = get_crop_compatibility_score(predicted_crop, input_data)
        return {
            "crop": predicted_crop,
            "ml_confidence": round(max_probability * 100, 1),
            "compatibility_score": compatibility_score,
            "ml_probability": max_probability,
        }
    except Exception as e:
        print(f"ML model error: {e}")
        return None


# === Predict yield for a crop ===
def predict_yield_for_crop(input_data: dict, crop_name: str):
    df = pd.DataFrame([input_data])

    # Ensure fertilizer and pesticide exist (model expects them)
    for key in ["Fertilizer", "Pesticide"]:
        if key not in df.columns:
            df[key] = 0

    # Feature engineering (match training.py)
    df["N_P_ratio"] = df["N"] / (df["P"] + 1e-6)
    df["K_N_ratio"] = df["K"] / (df["N"] + 1e-6)
    df["pH_squared"] = df["pH"] ** 2

    # Encode crop
    reverse_mapping = {v: k for k, v in crop_reverse_mapping.items()}
    if crop_name not in reverse_mapping:
        raise ValueError(f"Crop '{crop_name}' not found in crop mapping.")
    encoded = int(reverse_mapping[crop_name])
    df["crop_encoded"] = encoded

    # Align with feature columns
    df = df.reindex(columns=yield_feature_cols, fill_value=0)

    predicted_yield = yield_model.predict(df)[0]
    return round(float(predicted_yield), 2)


# === Combined recommendation comparison ===
def recommend_and_compare(input_data: dict):
    crop_rec = predict_crop(input_data)
    recommended_crop = crop_rec["crop"] if crop_rec else None

    # Predict yields
    predicted_yield_rec = (
        predict_yield_for_crop(input_data, recommended_crop) if recommended_crop else None
    )

    current_crop = input_data.get("Current_Crop", None)
    predicted_yield_current = (
        predict_yield_for_crop(input_data, current_crop) if current_crop else None
    )

    return {
        "crop_recommendation": crop_rec,
        "predicted_yield_recommended_crop": predicted_yield_rec,
        "predicted_yield_current_crop": predicted_yield_current,
        "comparison": (
            None
            if not all([predicted_yield_rec, predicted_yield_current])
            else "Higher"
            if predicted_yield_rec > predicted_yield_current
            else "Lower"
        ),
    }


# === Example usage ===
if __name__ == "__main__":
    sample_input = {
        "N": 120,
        "P": 40,
        "K": 60,
        "pH": 6.2,
        "Temperature": 28,
        "Humidity": 65,
        "Rainfall": 180,
        "Fertilizer": 50,
        "Pesticide": 2,
        "Soil_Type": "Loamy",
        "Current_Crop": "maize",
    }

    result = recommend_and_compare(sample_input)
    print(json.dumps(result, indent=4))
