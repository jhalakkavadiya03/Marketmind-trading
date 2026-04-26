from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import random
import pyotp
from SmartApi import SmartConnect
from dotenv import load_dotenv

# Load env
load_dotenv()

app = Flask(__name__)
CORS(app)

# ---------------- CONFIG ----------------
API_KEY = os.getenv("API_KEY")
CLIENT_ID = os.getenv("CLIENT_ID")
PASSWORD = os.getenv("PASSWORD")   # may be None
TOTP_SECRET = os.getenv("TOTP_SECRET")

# ---------------- GLOBAL ----------------
obj = None
BROKER_CONNECTED = False

# ---------------- LOGIN ----------------
def login_broker():
    global obj, BROKER_CONNECTED

    try:
        if not all([API_KEY, CLIENT_ID, PASSWORD, TOTP_SECRET]):
            print("⚠️ Missing credentials → DEMO mode")
            BROKER_CONNECTED = False
            return

        obj = SmartConnect(api_key=API_KEY)

        totp = pyotp.TOTP(TOTP_SECRET.strip()).now()

        data = obj.generateSession(CLIENT_ID, PASSWORD, totp)

        if not data or not data.get("status"):
            raise Exception(data)

        BROKER_CONNECTED = True
        print("✅ LIVE MODE ENABLED")

    except Exception as e:
        BROKER_CONNECTED = False
        print("❌ LOGIN FAILED → DEMO MODE:", e)

# Auto login
login_broker()

# ---------------- TOKENS ----------------
token_map = {
    "RELIANCE": "2885",
    "TCS": "11536",
    "INFY": "1594"
}

# ---------------- HOME ----------------
@app.route("/")
def home():
    return jsonify({
        "status": "MarketMind Running 🚀",
        "mode": "LIVE" if BROKER_CONNECTED else "DEMO"
    })

# ---------------- PRICE ----------------
@app.route("/price/<symbol>")
def price(symbol):
    symbol = symbol.upper()

    # DEMO MODE
    if not BROKER_CONNECTED:
        return jsonify({
            "symbol": symbol,
            "price": round(random.uniform(2000, 3000), 2),
            "mode": "demo"
        })

    try:
        token = token_map.get(symbol)
        if not token:
            return jsonify({"error": "Invalid symbol"})

        data = obj.ltpData("NSE", f"{symbol}-EQ", token)
        ltp = data["data"]["ltp"]

        return jsonify({
            "symbol": symbol,
            "price": float(ltp),
            "mode": "live"
        })

    except Exception as e:
        return jsonify({"error": str(e)})

# ---------------- BUY ----------------
@app.route("/buy", methods=["POST"])
def buy():
    data = request.json
    symbol = data.get("symbol", "").upper()
    qty = int(data.get("qty", 0))

    if qty <= 0:
        return jsonify({"error": "Invalid quantity"})

    if not BROKER_CONNECTED:
        return jsonify({
            "status": "demo BUY",
            "symbol": symbol,
            "qty": qty
        })

    try:
        token = token_map.get(symbol)

        order = obj.placeOrder({
            "variety": "NORMAL",
            "tradingsymbol": f"{symbol}-EQ",
            "symboltoken": token,
            "transactiontype": "BUY",
            "exchange": "NSE",
            "ordertype": "MARKET",
            "producttype": "INTRADAY",
            "duration": "DAY",
            "quantity": qty
        })

        return jsonify(order)

    except Exception as e:
        return jsonify({"error": str(e)})

# ---------------- SELL ----------------
@app.route("/sell", methods=["POST"])
def sell():
    data = request.json
    symbol = data.get("symbol", "").upper()
    qty = int(data.get("qty", 0))

    if qty <= 0:
        return jsonify({"error": "Invalid quantity"})

    if not BROKER_CONNECTED:
        return jsonify({
            "status": "demo SELL",
            "symbol": symbol,
            "qty": qty
        })

    try:
        token = token_map.get(symbol)

        order = obj.placeOrder({
            "variety": "NORMAL",
            "tradingsymbol": f"{symbol}-EQ",
            "symboltoken": token,
            "transactiontype": "SELL",
            "exchange": "NSE",
            "ordertype": "MARKET",
            "producttype": "INTRADAY",
            "duration": "DAY",
            "quantity": qty
        })

        return jsonify(order)

    except Exception as e:
        return jsonify({"error": str(e)})

# ---------------- PREDICT ----------------
@app.route("/predict", methods=["POST"])
def predict():
    return jsonify({
        "prediction": round(random.uniform(2000, 3000), 2)
    })

# ---------------- RUN ----------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)