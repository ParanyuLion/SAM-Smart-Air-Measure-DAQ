import os
import shutil
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
import joblib

RANDOM_STATE = 42
FEATURE_COLS = [
    'temp', 'humidity', 'gas_co',
    'temp_tmd', 'humidity_tmd', 'rainfall_tmd',
    'place_enc', 'pm25', 'pm10',
]
TARGET = 'pm25_aqi'

df = pd.read_csv('output/integrated_air_quality_data.csv', parse_dates=['ts'])

le = LabelEncoder()
df['place_enc'] = le.fit_transform(df['place'].astype(str))
print('Label encoding:', dict(zip(le.classes_, le.transform(le.classes_))))
# Expected: {'inside': 0, 'outdoor': 1}

data = df[FEATURE_COLS + [TARGET]].dropna()
X = data[FEATURE_COLS]
y = data[TARGET]
print(f'Training on {len(data)} rows, {len(FEATURE_COLS)} features')

rf_model = RandomForestRegressor(n_estimators=100, max_depth=5, random_state=RANDOM_STATE)
rf_model.fit(X, y)
print(f'Training R2 (full dataset): {rf_model.score(X, y):.4f}')

os.makedirs('../backend/models', exist_ok=True)
joblib.dump(rf_model, '../backend/models/rf_model.pkl')
print('Saved -> ../backend/models/rf_model.pkl')

os.makedirs('../backend/static', exist_ok=True)
shutil.copy('output/feature_importance.png', '../backend/static/feature_importance.png')
print('Copied -> ../backend/static/feature_importance.png')
