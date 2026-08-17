from datetime import datetime, date, time
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.database import Base, engine, async_session_factory
from app.models.user import User, RoleEnum
from app.models.school import School
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.class_model import Class
from app.models.subject import Subject
from app.models.curriculum import Curriculum
from app.models.attendance import Attendance
from app.models.grade import Grade
from app.models.exam import Exam
from app.models.assignment import Assignment
from app.models.announcement import Announcement
from app.models.fee import Fee, FeeStatusEnum
from app.models.leave_request import LeaveRequest, LeaveRequestStatus
from app.models.schedule import Schedule
from app.models.academic_calendar import AcademicCalendar
from app.models.notification import Notification
from app.core.security import hash_password


async def seed_data():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Idempotently add 'type' column
        try:
            from sqlalchemy import text
            await conn.execute(text("ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'string';"))
        except Exception as e:
            print(f"Schema migration error: {e}")

    async with async_session_factory() as db:
        # Seed system settings idempotently
        from app.models.system_setting import SystemSetting
        default_settings = [
            # Tier 1
            {"key": "default_exam_marks_scale", "value": "100", "type": "number", "description": "Default total marks for exams"},
            {"key": "default_assignment_marks_scale", "value": "30", "type": "number", "description": "Default total marks for assignments"},
            {"key": "current_academic_year", "value": "2026-27", "type": "string", "description": "The current active academic year for the school"},
            {"key": "grading_scale", "value": '[{"grade":"A","min_percent":90},{"grade":"B","min_percent":80},{"grade":"C","min_percent":70},{"grade":"D","min_percent":60},{"grade":"F","min_percent":0}]', "type": "json", "description": "Grading scale mapping percentages to letter grades"},
            {"key": "attendance_at_risk_threshold", "value": "75", "type": "percentage", "description": "Threshold below which attendance is flagged as at-risk"},
            {"key": "late_fee_type", "value": "flat", "type": "string", "description": "Type of late fee: 'flat' or 'percentage'"},
            {"key": "late_fee_amount", "value": "15", "type": "number", "description": "Amount or percentage of late fee"},
            {"key": "late_fee_grace_period_days", "value": "7", "type": "number", "description": "Days after due date before late fee applies"},
            {"key": "max_leave_days_per_term", "value": "10", "type": "number", "description": "Maximum approved leave days allowed per term"},
            
            # Tier 2
            {"key": "school_name", "value": "Greenfield Academy", "type": "string", "description": "Name of the school"},
            {"key": "school_address", "value": "123 Education Lane, Springfield", "type": "string", "description": "Address of the school"},
            {"key": "school_contact_email", "value": "info@greenfieldacademy.edu", "type": "string", "description": "School contact email"},
            {"key": "school_contact_phone", "value": "+1-555-1001", "type": "string", "description": "School contact phone number"},
            {"key": "currency_symbol", "value": "$", "type": "string", "description": "Currency symbol for fees"},
        ]
        
        for ds in default_settings:
            res = await db.execute(select(SystemSetting).where(SystemSetting.key == ds["key"]))
            if not res.scalar_one_or_none():
                db.add(SystemSetting(**ds))
        await db.commit()

        result = await db.execute(select(User))
        existing_users = result.scalars().all()

        if existing_users:
            print("Seed data already exists, skipping.")
            return

        school = School(
            name="Greenfield Academy",
            address="123 Education Lane, Springfield, IL 62701",
            phone="+1-555-1001",
            email="info@greenfieldacademy.edu",
            principal_name="Dr. Emily Richardson",
            established_year=1995,
            is_active=True,
        )
        db.add(school)
        await db.flush()

        users_data = [
            {
                "email": "superadmin@school.edu",
                "username": "superadmin",
                "password": "SuperAdmin123!",
                "role": RoleEnum.admin,
                "full_name": "Super Administrator",
                "phone_number": "+1-555-0001",
                "is_active": True,
            },
            {
                "email": "admin@school.edu",
                "username": "admin",
                "password": "Admin123!",
                "role": RoleEnum.admin,
                "full_name": "School Administrator",
                "phone_number": "+1-555-0002",
                "is_active": True,
            },
            {
                "email": "teacher1@school.edu",
                "username": "teacher1",
                "password": "Teacher123!",
                "role": RoleEnum.teacher,
                "full_name": "John Smith",
                "phone_number": "+1-555-0004",
                "is_active": True,
            },
            {
                "email": "teacher2@school.edu",
                "username": "teacher2",
                "password": "Teacher123!",
                "role": RoleEnum.teacher,
                "full_name": "Jane Doe",
                "phone_number": "+1-555-0005",
                "is_active": True,
            },
            {
                "email": "teacher3@school.edu",
                "username": "teacher3",
                "password": "Teacher123!",
                "role": RoleEnum.teacher,
                "full_name": "Robert Johnson",
                "phone_number": "+1-555-0006",
                "is_active": True,
            },
            {
                "email": "student1@school.edu",
                "username": "student1",
                "password": "Student123!",
                "role": RoleEnum.student,
                "full_name": "Alice Johnson",
                "phone_number": "+1-555-0007",
                "is_active": True,
            },
            {
                "email": "student2@school.edu",
                "username": "student2",
                "password": "Student123!",
                "role": RoleEnum.student,
                "full_name": "Bob Williams",
                "phone_number": "+1-555-0008",
                "is_active": True,
            },
            {
                "email": "student3@school.edu",
                "username": "student3",
                "password": "Student123!",
                "role": RoleEnum.student,
                "full_name": "Charlie Brown",
                "phone_number": "+1-555-0009",
                "is_active": True,
            },
            {
                "email": "student4@school.edu",
                "username": "student4",
                "password": "Student123!",
                "role": RoleEnum.student,
                "full_name": "Diana Prince",
                "phone_number": "+1-555-0010",
                "is_active": True,
            },
            {
                "email": "student5@school.edu",
                "username": "student5",
                "password": "Student123!",
                "role": RoleEnum.student,
                "full_name": "Edward Norton",
                "phone_number": "+1-555-0011",
                "is_active": True,
            },
        ]

        users = []
        for user_data in users_data:
            user = User(
                email=user_data["email"],
                username=user_data["username"],
                password_hash=hash_password(user_data["password"]),
                role=user_data["role"],
                full_name=user_data["full_name"],
                phone_number=user_data["phone_number"],
                is_active=user_data["is_active"],
            )
            db.add(user)
            users.append(user)

        await db.flush()

        teacher1 = Teacher(
            user_id=users[2].id,
            qualification="M.Sc. Mathematics",
            experience_years=8,
            employment_date=datetime(2019, 8, 15),
            status="active",
        )
        teacher2 = Teacher(
            user_id=users[3].id,
            qualification="B.Ed. English Literature",
            experience_years=5,
            employment_date=datetime(2021, 1, 10),
            status="active",
        )
        teacher3 = Teacher(
            user_id=users[4].id,
            qualification="M.Sc. Physics",
            experience_years=6,
            employment_date=datetime(2020, 3, 22),
            status="active",
        )
        db.add_all([teacher1, teacher2, teacher3])
        await db.flush()

        class_1 = Class(
            name="Grade 10",
            section="A",
            academic_year="2025-2026",
            teacher_id=teacher1.id,
            school_id=school.id,
            capacity=30,
        )
        class_2 = Class(
            name="Grade 10",
            section="B",
            academic_year="2025-2026",
            teacher_id=teacher2.id,
            school_id=school.id,
            capacity=30,
        )
        class_3 = Class(
            name="Grade 11",
            section="A",
            academic_year="2025-2026",
            teacher_id=teacher3.id,
            school_id=school.id,
            capacity=25,
        )
        db.add_all([class_1, class_2, class_3])
        await db.flush()

        student1 = Student(
            user_id=users[5].id,
            roll_number="GR10A-001",
            class_id=class_1.id,
            parent_email="parent1@example.com",
            enrollment_date=datetime(2024, 6, 1),
            status="active",
        )
        student2 = Student(
            user_id=users[6].id,
            roll_number="GR10A-002",
            class_id=class_1.id,
            parent_email="parent2@example.com",
            enrollment_date=datetime(2024, 6, 1),
            status="active",
        )
        student3 = Student(
            user_id=users[7].id,
            roll_number="GR10B-001",
            class_id=class_2.id,
            parent_email="parent3@example.com",
            enrollment_date=datetime(2024, 6, 1),
            status="active",
        )
        student4 = Student(
            user_id=users[8].id,
            roll_number="GR11A-001",
            class_id=class_3.id,
            parent_email="parent4@example.com",
            enrollment_date=datetime(2023, 6, 1),
            status="active",
        )
        student5 = Student(
            user_id=users[9].id,
            roll_number="GR10B-002",
            class_id=class_2.id,
            parent_email="parent5@example.com",
            enrollment_date=datetime(2024, 6, 1),
            status="active",
        )
        db.add_all([student1, student2, student3, student4, student5])
        await db.flush()

        math_subject = Subject(
            name="Mathematics",
            code="MATH",
            description="Core mathematics curriculum",
            school_id=school.id,
        )
        english_subject = Subject(
            name="English Literature",
            code="ENG",
            description="English language and literature",
            school_id=school.id,
        )
        physics_subject = Subject(
            name="Physics",
            code="PHY",
            description="Core physics curriculum",
            school_id=school.id,
        )
        db.add_all([math_subject, english_subject, physics_subject])
        await db.flush()

        curriculum_math = Curriculum(
            subject_id=math_subject.id,
            class_id=class_1.id,
            description="Algebra, Geometry, and Statistics",
            teaching_hours=180,
            created_by=users[0].id,
        )
        curriculum_english = Curriculum(
            subject_id=english_subject.id,
            class_id=class_1.id,
            description="Grammar, Composition, and Literature",
            teaching_hours=150,
            created_by=users[0].id,
        )
        curriculum_physics = Curriculum(
            subject_id=physics_subject.id,
            class_id=class_3.id,
            description="Mechanics, Thermodynamics, and Waves",
            teaching_hours=160,
            created_by=users[0].id,
        )
        db.add_all([curriculum_math, curriculum_english, curriculum_physics])
        await db.flush()

        attendance_records = [
            Attendance(student_id=student1.id, class_id=class_1.id, date=date(2025, 8, 1), status="present", marked_by=users[2].id),
            Attendance(student_id=student2.id, class_id=class_1.id, date=date(2025, 8, 1), status="present", marked_by=users[2].id),
            Attendance(student_id=student3.id, class_id=class_2.id, date=date(2025, 8, 1), status="absent", marked_by=users[3].id),
            Attendance(student_id=student4.id, class_id=class_3.id, date=date(2025, 8, 1), status="present", marked_by=users[4].id),
            Attendance(student_id=student5.id, class_id=class_2.id, date=date(2025, 8, 1), status="present", marked_by=users[3].id),
            Attendance(student_id=student1.id, class_id=class_1.id, date=date(2025, 8, 4), status="present", marked_by=users[2].id),
            Attendance(student_id=student2.id, class_id=class_1.id, date=date(2025, 8, 4), status="late", marked_by=users[2].id),
            Attendance(student_id=student3.id, class_id=class_2.id, date=date(2025, 8, 4), status="present", marked_by=users[3].id),
        ]
        db.add_all(attendance_records)

        grade_records = [
            Grade(student_id=student1.id, subject_id=math_subject.id, marks_obtained=85.0, total_marks=100.0, created_by=users[2].id),
            Grade(student_id=student2.id, subject_id=math_subject.id, marks_obtained=72.0, total_marks=100.0, created_by=users[2].id),
            Grade(student_id=student1.id, subject_id=english_subject.id, marks_obtained=90.0, total_marks=100.0, created_by=users[3].id),
            Grade(student_id=student3.id, subject_id=math_subject.id, marks_obtained=68.0, total_marks=100.0, created_by=users[3].id),
            Grade(student_id=student4.id, subject_id=physics_subject.id, marks_obtained=95.0, total_marks=100.0, created_by=users[4].id),
        ]
        db.add_all(grade_records)

        from app.models.exam import ExamStatus
        exam = Exam(
            name="Midterm Examination",
            exam_type="Midterm",
            academic_year="2025-2026",
            status=ExamStatus.SCHEDULED,
            created_by=users[0].id,
        )
        db.add(exam)
        await db.flush()

        # Need to import ExamSubjectSlot at the top of seed.py if not already done
        from app.models.exam import ExamSubjectSlot
        slot1 = ExamSubjectSlot(
            exam_id=exam.id,
            subject_id=math_subject.id,
            date=datetime(2025, 9, 15),
            start_time=datetime(2025, 9, 15, 9, 0),
            end_time=datetime(2025, 9, 15, 12, 0),
        )
        db.add(slot1)
        await db.flush()

        from app.models.assignment import AssignmentStatus
        assignment = Assignment(
            title="Algebra Homework Set 1",
            description="Complete exercises 1-20 from Chapter 3",
            subject_id=math_subject.id,
            class_id=class_1.id,
            teacher_id=teacher1.id,
            due_date=datetime(2025, 8, 15, 23, 59),
            status=AssignmentStatus.PUBLISHED,
        )
        db.add(assignment)
        await db.flush()

        announcement = Announcement(
            title="Welcome Back to School",
            content="Welcome to the new academic year 2025-2026. Please ensure all fees are paid by August 15.",
            created_by=users[1].id,
            target_role="all",
            is_pinned=True,
        )
        db.add(announcement)

        from app.models.fee import FeeStatusEnum
        fee1 = Fee(
            student_id=student1.id,
            amount_paid=500.00,
            due_date=datetime(2025, 8, 15).date(),
            academic_year="2025-2026",
            status=FeeStatusEnum.PENDING,
        )
        fee2 = Fee(
            student_id=student2.id,
            amount_paid=500.00,
            due_date=datetime(2025, 8, 15).date(),
            academic_year="2025-2026",
            status=FeeStatusEnum.PAID,
        )
        fee3 = Fee(
            student_id=student3.id,
            amount_paid=500.00,
            due_date=datetime(2025, 8, 15).date(),
            academic_year="2025-2026",
            status=FeeStatusEnum.PENDING,
        )
        fee4 = Fee(
            student_id=student4.id,
            amount_paid=600.00,
            due_date=datetime(2025, 8, 15).date(),
            academic_year="2025-2026",
            status=FeeStatusEnum.PAID,
        )
        fee5 = Fee(
            student_id=student5.id,
            amount_paid=500.00,
            due_date=datetime(2025, 8, 15).date(),
            academic_year="2025-2026",
            status=FeeStatusEnum.OVERDUE,
        )
        fee_records = [fee1, fee2, fee3, fee4, fee5]
        db.add_all(fee_records)

        leave_request = LeaveRequest(
            student_id=student3.id,
            from_date=date(2025, 8, 5),
            to_date=date(2025, 8, 7),
            reason="Family emergency",
            status=LeaveRequestStatus.APPROVED,
            approved_by=users[1].id,
            remarks="Approved. Please ensure makeup work is submitted.",
        )
        db.add(leave_request)

        schedule_records = [
            Schedule(class_id=class_1.id, subject_id=math_subject.id, teacher_id=teacher1.id, room="101", day_of_week=1, start_time=time(9, 0), end_time=time(10, 0), academic_year="2025-2026"),
            Schedule(class_id=class_1.id, subject_id=english_subject.id, teacher_id=teacher2.id, room="102", day_of_week=1, start_time=time(10, 15), end_time=time(11, 15), academic_year="2025-2026"),
            Schedule(class_id=class_1.id, subject_id=math_subject.id, teacher_id=teacher1.id, room="101", day_of_week=3, start_time=time(9, 0), end_time=time(10, 0), academic_year="2025-2026"),
            Schedule(class_id=class_3.id, subject_id=physics_subject.id, teacher_id=teacher3.id, room="201", day_of_week=2, start_time=time(11, 0), end_time=time(12, 0), academic_year="2025-2026"),
        ]
        db.add_all(schedule_records)

        calendar_event = AcademicCalendar(
            title="First Day of School",
            description="Start of the 2025-2026 academic year",
            event_date=date(2025, 8, 1),
            event_type="academic",
            school_id=school.id,
        )
        db.add(calendar_event)

        notification = Notification(
            user_id=student1.user_id,
            title="Welcome to Greenfield Academy",
            message="Your enrollment for Grade 10 Section A has been confirmed.",
            type="enrollment",
        )
        db.add(notification)

        from app.models.teacher_class_assignment import TeacherClassAssignment
        teacher_assignments = [
            TeacherClassAssignment(teacher_id=teacher1.id, class_id=class_1.id, subject_id=math_subject.id),
            TeacherClassAssignment(teacher_id=teacher1.id, class_id=class_2.id, subject_id=math_subject.id),
            TeacherClassAssignment(teacher_id=teacher2.id, class_id=class_1.id, subject_id=english_subject.id),
            TeacherClassAssignment(teacher_id=teacher2.id, class_id=class_2.id, subject_id=english_subject.id),
            TeacherClassAssignment(teacher_id=teacher3.id, class_id=class_3.id, subject_id=physics_subject.id),
        ]
        db.add_all(teacher_assignments)

        await db.commit()

        print("Seed data created successfully.")
        print("\nDevelopment Credentials:")
        print("=" * 50)
        print("Admin 1:     superadmin@school.edu / SuperAdmin123!")
        print("Admin:       admin@school.edu / Admin123!")
        print("Teacher 1:   teacher1@school.edu / Teacher123!")
        print("Teacher 2:   teacher2@school.edu / Teacher123!")
        print("Teacher 3:   teacher3@school.edu / Teacher123!")
        print("Student 1:   student1@school.edu / Student123!")
        print("Student 2:   student2@school.edu / Student123!")
        print("Student 3:   student3@school.edu / Student123!")
        print("Student 4:   student4@school.edu / Student123!")
        print("Student 5:   student5@school.edu / Student123!")
        print("=" * 50)