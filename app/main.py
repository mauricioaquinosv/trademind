import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth import router as auth_router
from app.trades import router as trades_router
from app.accounts import router as accounts_router

app = FastAPI(title="TradeMind API")

# Origenes admitidos. Por defecto, el servidor de desarrollo de Next en el
# puerto 3000.
#
# CORS solo bloquea el navegador, no las peticiones de curl ni las de servidor a
# servidor: por eso esto no se detecta con una llamada directa a la API, solo
# al abrir la pagina.
#
# En desarrollo se anaden otros puertos con CORS_ORIGINS separados por comas, cada
# uno con su puerto. En produccion se pondra el dominio real, porque ahi el
# frontend se sirve desde el dominio publico y no desde localhost.
_ORIGENES_POR_DEFECTO = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
_ORIGENES = [
    o.strip()
    for o in os.getenv("CORS_ORIGINS", "").split(",")
    if o.strip()
] or _ORIGENES_POR_DEFECTO

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ORIGENES,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(trades_router)
app.include_router(accounts_router)


@app.get("/health")
def health_check():
    return {"status": "ok"}