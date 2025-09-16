import pandas as pd
import joblib
import json
import os

MODEL_DIR = "backend/ml/models"

# Load trained model
model_path = os.path.join(MODEL_DIR, "crop_rf_model.pkl")
clf = joblib.load(model_path)

# Load crop mapping
with open(os.path.join(MODEL_DIR, "feature_colu.json"), "r") as f:
    feature_cols = json.load(f)

with open(os.path.join("data/crop_mapping.json"), "r") as f:
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
        min_val = input_df[nutrient].values[0]  # placeholder
        # We assume deviation is relative to mean of each crop's optimal range
        mean_vals = {crop: (r[nutrient][0] + r[nutrient][1]) / 2 for crop, r in optimal_ranges.items()}
        # For simplicity, compute deviation against overall mean
        overall_mean = sum(mean_vals.values()) / len(mean_vals)
        input_df[f"{nutrient}_dev"] = abs(input_df[nutrient] - overall_mean) / (max(input_df[nutrient]) - min(input_df[nutrient]) + 1e-5)
    return input_df

def preprocess_input(data: dict):
    """
    Convert input dict to dataframe with same features as training.
    Example input dict:
    {
        "N": 100, "P": 50, "K": 40, "pH": 6.0,
        "Temperature": 25, "Humidity": 70, "Rainfall": 200,
        "Soil_Type": "Loamy"
    }
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

def predict_crop(input_data: dict):
    """
    Return recommended crop name for given soil/environment input.
    """
    df_input = preprocess_input(input_data)
    pred_encoded = clf.predict(df_input)[0]
    return crop_reverse_mapping[str(pred_encoded)]

# Example usage
if __name__ == "__main__":
    sample = {
        "N": 120, "P": 40, "K": 60, "pH": 6.2,
        "Temperature": 28, "Humidity": 65, "Rainfall": 180,
        "Soil_Type": "Loamy"
    }
    print("Recommended crop:", predict_crop(sample))
