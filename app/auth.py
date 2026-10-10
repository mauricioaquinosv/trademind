from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app import errors
from app import login_freno
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
def login(
    request: Request,
    user_in: UserCreate,
    db: Session = Depends(get_db),
):
    """
    El freno de intentos va AQUI, antes de mirar la contrasena.

    Va antes a proposito: si se comprobara despues, el bcrypt habria tardado los
    ~100 ms de cada intento para nada, que es justo lo que se intenta evitar.

    La IP se saca de `request.client.host`. Detras de un proxy eso da la del
    proxy, no la del visitante, asi que todos cuentan como uno solo: el freno
    seguiria frenando, pero un proxy delante haria que cualquiera bloqueara a
    todos los demas. Cuando se ponga detras de un proxy habra que leer la
    cabecera `X-Forwarded-For`.ESTA DECISION SE TOMA CUANDO HAYA PROXY.
    """
    ip = request.client.host if request.client else "desconocida"

    if login_freno.esta_bloqueado(db, user_in.email, ip):
        raise errors.error(
            errors.AUTH_TOO_MANY_ATTEMPTS,
            f"Demasiados intentos fallidos. Inténtalo en {login_freno.VENTANA_MINUTOS} minutos.",
            status_code=429,
        )

    user = db.query(User).filter(User.email == user_in.email).first()

    if not user or not verify_password(user_in.password, user.hashed_password):
        login_freno.registra_fallo(db, user_in.email, ip)
        raise errors.error(
            errors.AUTH_BAD_CREDENTIALS, "Email o contraseña incorrectos", status_code=401
        )

    # Acertar borra el historial de fallos: si no, bastaría con fallar diez
    # veces, acertar la undécima, y empezar de cero con la cuenta atacada.
    login_freno.limpia(db, user_in.email, ip)

    token = create_access_token(data={"sub": str(user.id)})
    return Token(access_token=token)