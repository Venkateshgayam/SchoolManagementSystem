import asyncio
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database.database import async_session_factory
from app.models.fee import Fee
from app.models.student import Student
from app.models.class_model import Class

async def reset_fees():
    async with async_session_factory() as db:
        result = await db.execute(select(Fee).options(selectinload(Fee.student).selectinload(Student.class_ref)))
        fees = result.scalars().all()
        
        updated_count = 0
        for fee in fees:
            if not fee.student or not fee.student.class_ref:
                continue
                
            base_fee = fee.student.class_ref.fee_amount or 0.0
            waiver = fee.waiver_percentage or 0.0
            total_fee = base_fee * (1 - (waiver / 100))
            
            amount_due = max(0.0, total_fee - fee.amount_paid)
            
            # Note: actual amount_due isn't explicitly saved to the DB in Fee model, but status is!
            # We must recompute status based on the new total_fee
            
            if total_fee == 0:
                fee.status = "paid"
            elif fee.amount_paid == 0:
                fee.status = "unpaid"
            elif fee.amount_paid >= total_fee:
                fee.status = "paid"
            else:
                fee.status = "partial"
                
            db.add(fee)
            updated_count += 1
            
        await db.commit()
        print(f"Successfully migrated {updated_count} fee records.")

if __name__ == "__main__":
    asyncio.run(reset_fees())
