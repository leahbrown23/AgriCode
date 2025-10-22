import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import classification_report, accuracy_score, mean_squared_error, r2_score
import joblib
import os
import json
import numpy as np

# Paths
DATA_PATH = "data/processed_data.csv"  # can include yield data
MAPPING_PATH = "data/crop_mapping.json"
MODEL_DIR = "backend/ml/models"

os.makedirs(MODEL_DIR, exist_ok=True)

# Load dataset
df = pd.read_csv(DATA_PATH)

# Load crop mapping (for decoding later)
with open(MAPPING_PATH, "r") as f:
    crop_mapping = json.load(f)
print(" Loaded crop mappings:", crop_mapping)

# ---------------------------
# Crop Classification Model
# ---------------------------

# Feature columns for crop classifier
nutrient_dev_cols = ["N_dev", "P_dev", "K_dev", "pH_dev"]
env_cols = ["Temperature", "Humidity", "Rainfall"]
soil_cols = [col for col in df.columns if col.startswith("soil_")]
feature_cols = nutrient_dev_cols + env_cols + soil_cols
X_crop = df[feature_cols]
y_crop = df["crop_encoded"]

# Train/test split
Xc_train, Xc_test, yc_train, yc_test = train_test_split(
    X_crop, y_crop, test_size=0.2, random_state=42, stratify=y_crop
)

# Random Forest Classifier
clf = RandomForestClassifier(
    n_estimators=200, random_state=42, class_weight="balanced"
)
clf.fit(Xc_train, yc_train)

# Evaluate
yc_pred = clf.predict(Xc_test)
acc = accuracy_score(yc_test, yc_pred)
print(f" Accuracy for crop prediction: {acc:.2f}")
print(classification_report(yc_test, yc_pred))

# Save crop classifier
clf_path = os.path.join(MODEL_DIR, "crop_rf_model.pkl")
joblib.dump(clf, clf_path)
print(f" Saved crop prediction model to {clf_path}")

# Save feature columns
feature_cols_path = os.path.join(MODEL_DIR, "crop_feature_columns.json")
with open(feature_cols_path, "w") as f:
    json.dump(feature_cols, f)
print(f" Saved crop feature columns to {feature_cols_path}")


# ---------------------------
# Yield Prediction Model
# ---------------------------

if "Yield" in df.columns:
    print("\n Training yield prediction model...")

    from sklearn.preprocessing import LabelEncoder
    from sklearn.model_selection import RandomizedSearchCV
    from sklearn.ensemble import RandomForestRegressor

    # Encode crop if not already encoded
    if "crop_encoded" not in df.columns:
        crop_encoder = LabelEncoder()
        df["crop_encoded"] = crop_encoder.fit_transform(df["crop"])
    else:
        crop_encoder = LabelEncoder()
        df["crop_encoded"] = crop_encoder.fit_transform(df["crop"])

    # Feature engineering: use raw nutrient values + interactions
    df["N_P_ratio"] = df["N"] / (df["P"] + 1e-6)
    df["K_N_ratio"] = df["K"] / (df["N"] + 1e-6)
    df["pH_squared"] = df["pH"] ** 2

    # Base feature set
    yield_feature_cols = [
        "N", "P", "K", "pH", "Temperature", "Humidity", "Rainfall",
        "Fertilizer", "Pesticide", "crop_encoded",
        "N_P_ratio", "K_N_ratio", "pH_squared"
    ]

    # Include soil type one-hot columns if they exist
    soil_cols = [col for col in df.columns if col.startswith("soil_")]
    yield_feature_cols += soil_cols

    X_yield = df[yield_feature_cols]
    y_yield = df["Yield"]

    # Train/test split
    Xy_train, Xy_test, yy_train, yy_test = train_test_split(
        X_yield, y_yield, test_size=0.2, random_state=42
    )

    # --- Random Forest with hyperparameter search ---
    param_grid = {
        "n_estimators": [100, 200, 300, 500],
        "max_depth": [5, 10, 15, 20, None],
        "min_samples_split": [2, 5, 10],
        "min_samples_leaf": [1, 2, 4],
        "bootstrap": [True, False]
    }

    base_reg = RandomForestRegressor(random_state=42)

    search = RandomizedSearchCV(
        base_reg, param_distributions=param_grid,
        n_iter=25, scoring="r2", cv=5, verbose=1, random_state=42, n_jobs=-1
    )

    search.fit(Xy_train, yy_train)
    best_reg = search.best_estimator_

    # Evaluate
    yy_pred = best_reg.predict(Xy_test)
    rmse = np.sqrt(mean_squared_error(yy_test, yy_pred))
    r2 = r2_score(yy_test, yy_pred)
    print(f" Yield prediction RMSE: {rmse:.2f}, R2: {r2:.2f}")
    print(f" Best Parameters: {search.best_params_}")

    # Feature importances
    importance_df = pd.DataFrame({
        "feature": X_yield.columns,
        "importance": best_reg.feature_importances_
    }).sort_values(by="importance", ascending=False)

    print("\n Feature Importances:")
    print(importance_df)

    # Save model and metadata
    reg_path = os.path.join(MODEL_DIR, "yield_rf_model.pkl")
    joblib.dump(best_reg, reg_path)
    print(f" Saved yield prediction model to {reg_path}")

    encoder_path = os.path.join(MODEL_DIR, "yield_crop_encoder.json")
    crop_encoder_mapping = {
        str(crop): int(enc) for crop, enc in zip(df["crop"].unique(), df["crop_encoded"].unique())
    }
    with open(encoder_path, "w") as f:
        json.dump(crop_encoder_mapping, f, indent=4)
    print(f" Saved crop encoder to {encoder_path}")

    yield_feature_cols_path = os.path.join(MODEL_DIR, "yield_feature_columns.json")
    with open(yield_feature_cols_path, "w") as f:
        json.dump(yield_feature_cols, f, indent=4)
    print(f" Saved yield feature columns to {yield_feature_cols_path}")
else:
    print(" 'Yield' column not found in dataset, skipping yield model training")