import datetime as dt
from pydantic import BaseModel, Field, ConfigDict, field_validator, model_validator
from typing import Optional, Literal, Union


class HolidayCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    type: str  # "recurring" or "specific"
    day: Optional[str] = None
    date: Optional[dt.date] = None
    class_id: Optional[int] = Field(None, alias="classId")
    reason: Optional[str] = Field(None, max_length=255)

    @model_validator(mode="after")
    def validate_holiday_scope(self):
        if self.type == "recurring":
            self.class_id = None
        return self

    @field_validator("day", mode="before")
    @classmethod
    def validate_day(cls, v):
        if v is not None and isinstance(v, str) and v.strip():
            day_str = v.strip().capitalize()
            valid_days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            if day_str not in valid_days:
                raise ValueError(f"Invalid day '{v}'. Must be one of {', '.join(valid_days)}")
            return day_str
        return None

    @field_validator("date", mode="before")
    @classmethod
    def validate_date(cls, v):
        if v is None or (isinstance(v, str) and not v.strip()):
            return None
        if isinstance(v, dt.date):
            return v
        if isinstance(v, str):
            v_clean = v.strip()
            for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y", "%Y/%m/%d"):
                try:
                    return dt.datetime.strptime(v_clean, fmt).date()
                except ValueError:
                    continue
            try:
                return dt.date.fromisoformat(v_clean)
            except ValueError:
                pass
            raise ValueError("Invalid date format. Use YYYY-MM-DD or DD/MM/YYYY")
        return v


class HolidayResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    type: str
    day: Optional[str] = None
    date: Optional[dt.date] = None
    class_id: Optional[int] = None
    reason: Optional[str] = None
    created_by: Optional[int] = None
    created_at: dt.datetime


class HolidayCalendarEntry(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    date: str  # YYYY-MM-DD
    day: str   # Day name e.g. "Saturday"
    reason: Optional[str] = None
    type: str  # "recurring" or "specific"
    class_id: Optional[int] = None

