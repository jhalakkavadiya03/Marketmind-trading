from flask import Flask, jsonify, request
from flask_cors import CORS
import random
import os

# Angel One
from SmartApi import SmartConnect
import pyotp

app = Flask(__name__)
CORS(app)

# ---------------- CONFIG ----------------
API_KEY = os.getenv("API_KEY")
CLIENT_ID = os.getenv("CLIENT_ID")
PASSWORD = os.getenv("PASSWORD")
TOTP_SECRET = os.getenv("TOTP_SECRET")

# ---------------- GLOBAL ----------------
obj = None
BROKER_CONNECTED = False

# ---------------- AUTO LOGIN ----------------
def login_broker():
    global obj, BROKER_CONNECTED

    try:
        obj = SmartConnect(api_key=API_KEY)

        # CLEAN SECRET KEY
        secret = TOTP_SECRET.replace(" ", "").upper()

        totp = pyotp.TOTP(secret).now()

        obj.generateSession(CLIENT_ID, PASSWORD, totp)

        BROKER_CONNECTED = True
        print("✅ Angel One LOGIN SUCCESS")

    except Exception as e:
        BROKER_CONNECTED = False
        print("❌ LOGIN FAILED:", e)

# Call at startup
login_broker()

# ---------------- TOKEN MAP ----------------
token_map = {
    "RELIANCE": "2885",
    "TCS": "11536",
    "INFY": "1594"
}

# ---------------- HOME ----------------
@app.route("/")
def home():
    return jsonify({
        "status": "MarketMind Backend Running 🚀",
        "broker": "live" if BROKER_CONNECTED else "demo"
    })

# ---------------- LOGIN (manual trigger) ----------------
@app.route("/login")
def login():
    login_broker()
    return jsonify({
        "status": "connected" if BROKER_CONNECTED else "failed"
    })

# ---------------- PRICE ----------------
@app.route("/price/<symbol>")
def price(symbol):
    symbol = symbol.upper()

    # DEMO fallback
    if not BROKER_CONNECTED:
        return jsonify({
            "symbol": symbol,
            "price": round(random.uniform(2500, 2700), 2),
            "mode": "demo"
        })

    try:
        token = token_map.get(symbol, "2885")

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
    data = request.get_json(silent=True) or {}

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
        token = token_map.get(symbol, "2885")

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
    data = request.get_json(silent=True) or {}

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
        token = token_map.get(symbol, "2885")

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
        "prediction": round(random.uniform(2500, 2700), 2)
    })

# ---------------- GLOBAL ERROR HANDLER ----------------
@app.errorhandler(Exception)
def handle_error(e):
    return jsonify({"error": str(e)}), 500

# ---------------- RUN ----------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)