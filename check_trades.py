import requests

BASE_URL = "http://127.0.0.1:8000"

login_response = requests.post(f"{BASE_URL}/auth/login", json={
    "email": "prueba@trademind.com",
    "password": "MiClave123",
})
token = login_response.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

accounts = requests.get(f"{BASE_URL}/accounts/", headers=headers).json()

for acc in accounts:
    trades = requests.get(
        f"{BASE_URL}/trades/", headers=headers, params={"account_id": acc["id"]}
    ).json()
    print(f"\nCuenta: {acc['name']} ({acc['source']}) -> {len(trades)} trades")
    for t in trades[-3:]:
                print(
            f"  {t['symbol']} {t['direction']} qty={t['quantity']} "
            f"position={t.get('position')} pnl_bruto={t['pnl_bruto']} pnl_neto={t.get('pnl_neto')}"
        )