import os
import pandas as pd
from backend.ml.processing import preprocess_soil_data

# Step 1: Load your raw dataset

BASE_DIR = os.path.dirname(__file__)  # folder of this test script
file_path = os.path.join(BASE_DIR, "data", "test-sensor-crop.xlsx")
df = pd.read_excel(file_path)  # or .csv if that’s your format
print("📂 Raw dataset preview:")
print(df.head())

# Step 2: Preprocess
processed_df, encoders = preprocess_soil_data(df, save_path="preprocessed_soil.csv")

# Step 3: Show results
print("\n✅ Processed dataset preview:")
print(processed_df.head())

# Step 4: Confirm file was saved
print("\n💾 Preprocessed file saved as preprocessed_soil.csv")
