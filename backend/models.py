from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(String, default="creator")  # admin (مدير)، auditor (راجع شرعي)، creator (صانع محتوى)
    created_at = Column(DateTime, default=datetime.utcnow)

    # العلاقة مع مشاريع التدقيق
    projects = relationship("AuditProject", back_populates="owner")


class AuditProject(Base):
    __tablename__ = "audit_projects"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # nullable=True تتيح استخدام الزائر للخدمة
    original_text = Column(Text, nullable=False)
    accuracy_score = Column(Integer, default=0)
    sources_data = Column(Text, nullable=True)       # حفظ التخريج والمراجع بصيغة JSON
    adapted_translations = Column(Text, nullable=True) # حفظ البطاقات والترجمات بصيغة JSON
    created_at = Column(DateTime, default=datetime.utcnow)

    # العلاقة مع مالك المشروع
    owner = relationship("User", back_populates="projects")