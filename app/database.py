import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# pool_pre_ping: antes de usar una conexion del pool comprueba que sigue viva.
# Neon suspende la base tras 5 minutos sin uso y las conexiones guardadas en
# el pool mueren; sin esto, la primera peticion despues de la suspension falla.
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()