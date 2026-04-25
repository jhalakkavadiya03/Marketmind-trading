import yfinance as yf
import pandas as pd
import os
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
import pickle

# ---------- STEP 1: DATA FOLDER ----------
os.makedirs("data", exist_ok=True)

# ---------- STEP 2: DOWNLOAD DATA ----------
data = yf.download("RELIANCE.NS", period="3y")

data.to_csv("data/reliance.csv")
print("Data saved ✅")

data = pd.read_csv("data/reliance.csv")

# ❌ remove first 2 rows (Price, Ticker)
data = data.iloc[2:]

# reset index
data.reset_index(drop=True, inplace=True)

# correct column names
data.columns = ['Date','Close','High','Low','Open','Volume']

# convert to numeric
for col in ['Open','High','Low','Close','Volume']:
    data[col] = pd.to_numeric(data[col], errors='coerce')

# remove NaN
data = data.dropna()

print(data.head())  # debug

# ---------- STEP 4: FEATURES ----------
X = data[['Open','High','Low','Volume']]
y = data['Close']

# ---------- STEP 5: SPLIT ----------
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

# ---------- STEP 6: MODEL ----------
model = RandomForestRegressor()
model.fit(X_train, y_train)

# ---------- STEP 7: SAVE MODEL ----------
os.makedirs("model", exist_ok=True)

with open("model/model.pkl", "wb") as f:
    pickle.dump(model, f)

print("Model ready ✅")