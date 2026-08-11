from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.database.database import init_db
from app import models
from app.routers import (
    auth,
    school_router,
    class_router,
    student_router,
    teacher_router,
    subject_router,
    curriculum_router,
    attendance_router,
    grade_router,
    exam_router,
    assignment_router,
    announcement_router,
    fee_router,
    leave_request_router,
    schedule_router,
    academic_calendar_router,
    notification_router,
    document_router,
    user_router,
    audit_log_router,
    system_setting_router,
    
    # reports
    reports_router,
    exam_submission_router,
    assignment_submission_router,
)

from fastapi.staticfiles import StaticFiles
import os

app = FastAPI(title="School Management System API", version="1.0.0")

# Create uploads directory if it doesn't exist
os.makedirs("/app/uploads/submissions/assignments", exist_ok=True)
os.makedirs("/app/uploads/submissions/exams", exist_ok=True)

# Mount static files
app.mount("/uploads", StaticFiles(directory="/app/uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://frontend:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(school_router, prefix="/api", tags=["schools"])
app.include_router(class_router, prefix="/api", tags=["classes"])
app.include_router(student_router, prefix="/api", tags=["students"])
app.include_router(teacher_router, prefix="/api", tags=["teachers"])
app.include_router(subject_router, prefix="/api", tags=["subjects"])
app.include_router(curriculum_router, prefix="/api", tags=["curriculum"])
app.include_router(system_setting_router, prefix="/api", tags=["system_settings"])
app.include_router(attendance_router, prefix="/api", tags=["attendance"])
app.include_router(grade_router, prefix="/api", tags=["grades"])
app.include_router(exam_router, prefix="/api", tags=["exams"])
app.include_router(assignment_router, prefix="/api", tags=["assignments"])
app.include_router(announcement_router, prefix="/api", tags=["announcements"])
app.include_router(fee_router, prefix="/api", tags=["fees"])
app.include_router(leave_request_router, prefix="/api", tags=["leave_requests"])
app.include_router(schedule_router, prefix="/api", tags=["schedules"])
app.include_router(academic_calendar_router, prefix="/api", tags=["academic_calendar"])
app.include_router(notification_router, prefix="/api", tags=["notifications"])
app.include_router(document_router, prefix="/api", tags=["documents"])
app.include_router(user_router, prefix="/api", tags=["users"])
app.include_router(audit_log_router, prefix="/api", tags=["audit_logs"])
app.include_router(reports_router, prefix="/api/reports", tags=["reports"])
app.include_router(exam_submission_router, prefix="/api", tags=["exam_submissions"])
app.include_router(assignment_submission_router, prefix="/api", tags=["assignment_submissions"])


@app.on_event("startup")
async def startup():
    await init_db()
    from app.seed import seed_data
    await seed_data()


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}