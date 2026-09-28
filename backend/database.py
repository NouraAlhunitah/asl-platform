from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# مسار قاعدة البيانات المحلية SQLite
SQLALCHEMY_DATABASE_URL = "sqlite:///./islamic_studio.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# دالة الجلسة المعتمدة للحقن (Dependency Injection) في FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()