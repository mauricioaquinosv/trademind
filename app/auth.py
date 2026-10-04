from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app import errors
from app.database import get_db
from app.models import User
from app.schemas import UserCreate, UserOut, Token
from app.security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise errors.error(
            errors.AUTH_EMAIL_TAKEN, "El email ya está registrado", status_code=400
        )

    user = User(email=user_in.email, hashed_password=hash_password(user_in.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(user_in: UserCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_in.email).first()
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise errors.error(
            errors.AUTH_BAD_CREDENTIALS, "Email o contraseña incorrectos", status_code=401
        )

    token = create_access_token(data={"sub": str(user.id)})
    return Token(access_token=token)