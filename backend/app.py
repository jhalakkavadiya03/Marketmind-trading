from flask import Flask, jsonify, request
from flask_cors import CORS
import random

app = Flask(__name__)
CORS(app)

# ---------------- DEMO MODE ----------------
BROKER_CONNECTED = False

# ---------------- HOME ----------------
@app.route("/")
def home():
    return jsonify({
        "status": "MarketMind Backend Running 🚀",
        "broker": "demo"
    })

# ---------------- CALLBACK ----------------
@app.route('/callback')
def callback():
    try:
        data = request.args.to_dict()
        return jsonify({
            "status": "success",
            "data": data
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------- PRICE ----------------
@app.route("/price/<symbol>")
def price(symbol):
    return jsonify({
        "symbol": symbol.upper(),
        "price": round(random.uniform(2500, 2700), 2),
        "mode": "demo"
    })

# ---------------- BUY ----------------
@app.route("/buy", methods=["POST"])
def buy():
    data = request.json
    return jsonify({
        "status": "demo BUY order",
        "data": data
    })

# ---------------- SELL ----------------
@app.route("/sell", methods=["POST"])
def sell():
    data = request.json
    return jsonify({
        "status": "demo SELL order",
        "data": data
    })

# ---------------- PREDICT ----------------
@app.route("/predict", methods=["POST"])
def predict():
    return jsonify({
        "prediction": round(random.uniform(2500, 2700), 2)
    })