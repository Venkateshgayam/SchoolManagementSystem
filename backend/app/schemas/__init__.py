from app.schemas.auth import LoginRequest, UserResponse
from app.schemas.school import SchoolCreate, SchoolUpdate, SchoolResponse
from app.schemas.class_schema import ClassCreate, ClassUpdate, ClassResponse
from app.schemas.student import StudentCreate, StudentUpdate, StudentResponse
from app.schemas.teacher import TeacherCreate, TeacherUpdate, TeacherResponse
from app.schemas.subject import SubjectCreate, SubjectUpdate, SubjectResponse
from app.schemas.curriculum import CurriculumCreate, CurriculumUpdate, CurriculumResponse
from app.schemas.attendance import AttendanceCreate, AttendanceUpdate, AttendanceResponse
from app.schemas.grade import GradeCreate, GradeUpdate, GradeResponse
from app.schemas.exam import ExamCreate, ExamUpdate, ExamResponse
from app.schemas.assignment import AssignmentCreate, AssignmentUpdate, AssignmentResponse
from app.schemas.announcement import AnnouncementCreate, AnnouncementUpdate, AnnouncementResponse
from app.schemas.fee import FeeCreate, FeeUpdate, FeeResponse
from app.schemas.leave_request import LeaveRequestCreate, LeaveRequestUpdate, LeaveRequestResponse
from app.schemas.schedule import ScheduleCreate, ScheduleUpdate, ScheduleResponse
from app.schemas.academic_calendar import AcademicCalendarCreate, AcademicCalendarUpdate, AcademicCalendarResponse
from app.schemas.notification import NotificationCreate, NotificationUpdate, NotificationResponse
from app.schemas.document import DocumentCreate, DocumentUpdate, DocumentResponse
from app.schemas.user import UserAdminUpdate
from app.schemas.audit_log import AuditLogResponse

__all__ = [
    "LoginRequest",
    "UserResponse",
    "SchoolCreate",
    "SchoolUpdate",
    "SchoolResponse",
    "ClassCreate",
    "ClassUpdate",
    "ClassResponse",
    "StudentCreate",
    "StudentUpdate",
    "StudentResponse",
    "TeacherCreate",
    "TeacherUpdate",
    "TeacherResponse",
    "SubjectCreate",
    "SubjectUpdate",
    "SubjectResponse",
    "CurriculumCreate",
    "CurriculumUpdate",
    "CurriculumResponse",
    "AttendanceCreate",
    "AttendanceUpdate",
    "AttendanceResponse",
    "GradeCreate",
    "GradeUpdate",
    "GradeResponse",
    "ExamCreate",
    "ExamUpdate",
    "ExamResponse",
    "AssignmentCreate",
    "AssignmentUpdate",
    "AssignmentResponse",
    "AnnouncementCreate",
    "AnnouncementUpdate",
    "AnnouncementResponse",
    "FeeCreate",
    "FeeUpdate",
    "FeeResponse",
    "LeaveRequestCreate",
    "LeaveRequestUpdate",
    "LeaveRequestResponse",
    "ScheduleCreate",
    "ScheduleUpdate",
    "ScheduleResponse",
    "AcademicCalendarCreate",
    "AcademicCalendarUpdate",
    "AcademicCalendarResponse",
    "NotificationCreate",
    "NotificationUpdate",
    "NotificationResponse",
    "DocumentCreate",
    "DocumentUpdate",
    "DocumentResponse",
    "UserAdminUpdate",
    "AuditLogResponse",
]