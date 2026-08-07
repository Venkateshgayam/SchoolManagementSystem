# School Management System

A modern, full-stack School Management System / School ERP built with Next.js, FastAPI, and PostgreSQL.

## Technology Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, React Hook Form, Zod, Recharts
- **Backend**: Python, FastAPI, SQLAlchemy, Alembic
- **Database**: PostgreSQL
- **Infrastructure**: Docker, Docker Compose

## Prerequisites

- Docker Desktop
- Docker Compose
- Node.js (for local development)
- Python (for local development)

## Quick Start

```bash
docker compose up --build
```

This will start all services:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- PostgreSQL: localhost:5432

## Environment Setup

Copy `.env.example` to `.env` and configure the variables:

```
DATABASE_URL=postgresql+asyncpg://sms_user:sms_password@postgres:5432/school_management
JWT_SECRET_KEY=change-me-in-production-super-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Database Migrations

```bash
# Run migrations
docker compose exec backend alembic upgrade head

# Create a new migration
docker compose exec backend alembic revision --autogenerate -m "description"
```

## Seed Data

Development seed data is created automatically when the backend starts with the `init_db()` function.

## URLs

### Public Pages

| URL | Description |
|-----|-------------|
| `/` | Home page |
| `/about` | About page |
| `/contact` | Contact page |
| `/login` | Public login (Student, Teacher, Management) |

### Private Admin Pages

| URL | Description |
|-----|-------------|
| `/admin/login` | Admin login |
| `/dashboard/admin` | Admin dashboard |

### Private Super Admin Pages

| URL | Description |
|-----|-------------|
| `/super-admin/login` | Super Admin login |
| `/dashboard/super-admin` | Super Admin dashboard |

### Dashboard Routes

| Role | Dashboard URL |
|------|--------------|
| Student | `/dashboard/student` |
| Teacher | `/dashboard/teacher` |
| Management | `/dashboard/management` |
| Admin | `/dashboard/admin` |
| Super Admin | `/dashboard/super-admin` |

## Development Credentials

The seed script creates the following development accounts:

- **Super Admin**: superadmin@school.edu / SuperAdmin123!
- **Admin**: admin@school.edu / Admin123!
- **Management**: management@school.edu / Management123!
- **Teacher**: teacher1@school.edu / Teacher123!
- **Teacher**: teacher2@school.edu / Teacher123!
- **Student**: student1@school.edu / Student123!
- **Student**: student2@school.edu / Student123!
- **Student**: student3@school.edu / Student123!
- **Student**: student4@school.edu / Student123!
- **Student**: student5@school.edu / Student123!

## Project Structure

```
SchoolManagementSystem/
├── frontend/              # Next.js frontend
│   ├── app/              # App Router pages
│   ├── components/       # Reusable components
│   ├── lib/              # API client, auth utilities
│   ├── hooks/            # Custom React hooks
│   └── types/            # TypeScript types
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── main.py       # Application entry point
│   │   ├── core/         # Config, security, dependencies
│   │   ├── database/     # Database setup
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── routers/      # API route handlers
│   │   ├── services/     # Business logic
│   │   ├── repositories/ # Data access layer
│   │   └── utils/        # Utility functions
│   ├── alembic/          # Database migrations
│   └── Dockerfile
├── alembic/              # Alembic config
├── docker-compose.yml
└── .env.example
```

## Role Architecture

### Public Roles (visible on portal)
- Student
- Teacher
- Management

### Private Roles (separate login portals)
- Admin (`/admin/login`)
- Super Admin (`/super-admin/login`)

## Security

- JWT authentication with access and refresh tokens
- Password hashing with bcrypt
- Role-Based Access Control (RBAC)
- Backend authorization on all protected endpoints
- School data isolation for multi-school support
- Student data isolation
- Teacher class restrictions

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh-token` - Refresh access token
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/me` - Get current user

### Common
- `GET /api/announcements` - Get announcements
- `GET /api/notifications` - Get notifications
- `PUT /api/notifications/{id}/read` - Mark notification as read