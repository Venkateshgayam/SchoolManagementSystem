import asyncio
import sys
sys.path.insert(0, "/app")
from app.database.database import async_session_factory
from sqlalchemy import text
from app.core.security import create_access_token

async def main():
    async with async_session_factory() as session:
        result = await session.execute(text("SELECT id, role, email FROM users WHERE role='admin' LIMIT 1"))
        row = result.fetchone()
        if row:
            print("ADMIN ROW:", row)
            token = create_access_token({"sub": str(row.id), "role": str(row.role.value if hasattr(row.role, 'value') else row.role), "is_active": True})
            print("TOKEN:", token)

if __name__ == "__main__":
    asyncio.run(main())
