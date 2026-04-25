from flask import Flask, jsonify, request
from flask_cors import CORS
import random

# Try importing Angel One API (optional)
try:
    from SmartApi import SmartConnect
    import pyotp
    SMARTAPI_AVAILABLE = True
except:
    SMARTAPI_AVAILABLE = False

app = Flask(__name__)
CORS(app)

# ---------------- CONFIG ----------------
API_KEY = "YOUR_API_KEY"
CLIENT_ID = "YOUR_CLIENT_ID"
PASSWORD = "YOUR_PASSWORD"
TOTP_SECRET = "YOUR_TOTP_SECRET"

# ---------------- GLOBAL ----------------
obj = None
BROKER_CONNECTED = False

# ---------------- LOGIN ----------------
if SMARTAPI_AVAILABLE:
    try:
        obj = SmartConnect(api_key=API_KEY)
        totp = pyotp.TOTP(TOTP_SECRET).now()
        session = obj.generateSession(CLIENT_ID, PASSWORD, totp)

        BROKER_CONNECTED = True
        print("✅ Angel One LOGIN SUCCESS")

    except Exception as e:
        print("❌ LOGIN FAILED → Running in DEMO mode:", e)
        BROKER_CONNECTED = False
else:
    print("⚠️ SmartAPI not installed → DEMO mode")

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
        "status": "MarketMind Backend Running",
        "broker": "connected" if BROKER_CONNECTED else "demo"
    })

# ---------------- LIVE PRICE ----------------
@app.route("/price/<symbol>")
def price(symbol):
    symbol = symbol.upper()

    # 👉 DEMO MODE fallback
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

# ---------------- BUY ORDER ----------------
@app.route("/buy", methods=["POST"])
def buy():
    data = request.json
    symbol = data.get("symbol", "").upper()
    qty = int(data.get("qty", 0))

    if qty <= 0:
        return jsonify({"error": "Invalid quantity"})

    # 👉 DEMO MODE
    if not BROKER_CONNECTED:
        return jsonify({
            "status": "demo order placed",
            "symbol": symbol,
            "qty": qty,
            "side": "BUY"
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

# ---------------- SELL ORDER ----------------
@app.route("/sell", methods=["POST"])
def sell():
    data = request.json
    symbol = data.get("symbol", "").upper()
    qty = int(data.get("qty", 0))

    if qty <= 0:
        return jsonify({"error": "Invalid quantity"})

    # 👉 DEMO MODE
    if not BROKER_CONNECTED:
        return jsonify({
            "status": "demo order placed",
            "symbol": symbol,
            "qty": qty,
            "side": "SELL"
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
    try:
        # demo AI prediction
        price = round(random.uniform(2500, 2700), 2)

        return jsonify({
            "prediction": price
        })

    except Exception as e:
        return jsonify({"error": str(e)})

# ---------------- RUN ----------------
if __name__ == "__main__":
    app.run(debug=True)