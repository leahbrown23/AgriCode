import pandas as pd
from sklearn.preprocessing import LabelEncoder
import json

# Define optimal ranges per crop
optimal_ranges = {
    "wheat": {"N": (80, 200), "P": (30, 80), "K": (40, 120), "pH": (6.0, 6.8)},
    "tomato": {"N": (100, 250), "P": (50, 120), "K": (80, 250), "pH": (5.5, 6.8)},
    "sugarcane": {"N": (90, 200), "P": (50, 100), "K": (40, 150), "pH": (5.0, 8.0)},
    "maize": {"N": (60, 200), "P": (20, 100), "K": (20, 150), "pH": (5.5, 7.0)},
    "potato": {"N": (100, 300), "P": (50, 120), "K": (150, 250), "pH": (5.5, 6.5)},
    "rice": {"N": (100, 200), "P": (20, 70), "K": (65, 120), "pH": (5.5, 6.5)},
}


def preprocess_soil_data(df: pd.DataFrame, save_path: str = None, mapping_path: str = None):
    """
    Preprocess soil data or yield dataset:
    - Encode crop and soil type
    - Compute nutrient deviations from optimal ranges
    - One-hot encode soil type
    - Keep relevant features only
    """

    # Rename columns to standard names
    df = df.rename(columns={
        "Nitrogen": "N",
        "Phosphorus": "P",
        "Potassium": "K",
        "pH_Value": "pH",
        "Crop": "crop",  # standardize crop name
    })

    # Lowercase crop names
    df["crop"] = df["crop"].str.lower()

    # Drop unwanted columns if present
    for col in ["Area", "Production", "Variety"]:
        if col in df.columns:
            df = df.drop(columns=[col])

    # Encode crop
    le_crop = LabelEncoder()
    df["crop_encoded"] = le_crop.fit_transform(df["crop"])

    # Encode soil type
    le_soil = LabelEncoder()
    df["Soil_Type_encoded"] = le_soil.fit_transform(df["Soil_Type"])

    # Feature engineering: nutrient deviations from optimal range per crop
    for nutrient in ["N", "P", "K", "pH"]:
        def dev(row):
            crop_name = le_crop.inverse_transform([row["crop_encoded"]])[0]
            min_val, max_val = optimal_ranges[crop_name][nutrient]
            mean_val = (min_val + max_val) / 2
            range_val = max_val - min_val
            if range_val == 0:
                return 0
            return abs(row[nutrient] - mean_val) / range_val
        df[f"{nutrient}_dev"] = df.apply(dev, axis=1)

    # One-hot encode Soil_Type
    soil_dummies = pd.get_dummies(df["Soil_Type"], prefix="soil")
    df = pd.concat([df, soil_dummies], axis=1)

    # Save processed data
    if save_path:
        df.to_csv(save_path, index=False)

    # Save encoder mappings
    if mapping_path:
        mapping = {
            "crop": {
                "forward": {cls: int(enc) for cls, enc in zip(le_crop.classes_, le_crop.transform(le_crop.classes_))},
                "reverse": {int(enc): cls for cls, enc in zip(le_crop.classes_, le_crop.transform(le_crop.classes_))}
            },
            "soil_type": {
                "forward": {cls: int(enc) for cls, enc in zip(le_soil.classes_, le_soil.transform(le_soil.classes_))},
                "reverse": {int(enc): cls for cls, enc in zip(le_soil.classes_, le_soil.transform(le_soil.classes_))}
            }
        }
        with open(mapping_path, "w") as f:
            json.dump(mapping, f, indent=4)

    return df, le_crop, le_soil


if __name__ == "__main__":
    import os

    os.makedirs("data", exist_ok=True)

    RAW_PATH = "data/yield.xlsx"  # can be soil or yield dataset
    PROCESSED_PATH = "data/processed_data.csv"
    MAPPING_PATH = "data/crop_mapping.json"

    df = pd.read_excel(RAW_PATH)

    processed_df, le_crop, le_soil = preprocess_soil_data(
        df, save_path=PROCESSED_PATH, mapping_path=MAPPING_PATH
    )

    print(f"✅ Processed data saved to {PROCESSED_PATH}")
    print(f"✅ Mapping saved to {MAPPING_PATH}")
    print(processed_df.head())
