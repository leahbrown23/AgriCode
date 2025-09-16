import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score
import joblib
import os
import json

# Paths
DATA_PATH = "data/processed_soil.csv"
MAPPING_PATH = "data/crop_mapping.json"
MODEL_DIR = "backend/ml/models"

os.makedirs(MODEL_DIR, exist_ok=True)

# Load dataset
df = pd.read_csv(DATA_PATH)

# Load crop mapping (for decoding later)
with open(MAPPING_PATH, "r") as f:
    crop_mapping = json.load(f)
print("✅ Loaded crop mappings:", crop_mapping)

# Prepare feature columns
# Nutrient deviations
nutrient_dev_cols = ["N_dev", "P_dev", "K_dev", "pH_dev"]

# Environmental features
env_cols = ["Temperature", "Humidity", "Rainfall"]

# Soil type one-hot columns (any column starting with 'soil_')
soil_cols = [col for col in df.columns if col.startswith("soil_")]

# Combine all features
feature_cols = nutrient_dev_cols + env_cols + soil_cols
X = df[feature_cols]

# Target: best crop for the soil
y = df["crop_encoded"]  # numeric encoding of crops

# Split into train/test
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# Define model
clf = RandomForestClassifier(
    n_estimators=200, random_state=42, class_weight="balanced"
)

# Train
clf.fit(X_train, y_train)

# Evaluate
y_pred = clf.predict(X_test)
acc = accuracy_score(y_test, y_pred)
print(f"✅ Accuracy for crop prediction: {acc:.2f}")
print(classification_report(y_test, y_pred))

# Save model
model_path = os.path.join(MODEL_DIR, "crop_rf_model.pkl")
joblib.dump(clf, model_path)
print(f"💾 Saved crop prediction model to {model_path}")

# Optional: save feature columns for prediction use
feature_cols_path = os.path.join(MODEL_DIR, "feature_columns.json")
with open(feature_cols_path, "w") as f:
    json.dump(feature_cols, f)
print(f"💾 Saved feature columns to {feature_cols_path}")