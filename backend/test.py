from SmartApi import SmartConnect
import pyotp

API_KEY = "YOUR_API_KEY"
CLIENT_ID = "YOUR_CLIENT_ID"
PASSWORD = "YOUR_PASSWORD"
TOTP_SECRET = "YOUR_SECRET_KEY"

try:
    obj = SmartConnect(api_key=API_KEY)

    totp = pyotp.TOTP(TOTP_SECRET).now()
    print("TOTP:", totp)

    data = obj.generateSession(CLIENT_ID, PASSWORD, totp)

    print("✅ LOGIN SUCCESS")
    print(data)

except Exception as e:
    print("❌ LOGIN FAILED:", e)