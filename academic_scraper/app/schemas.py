from pydantic import BaseModel, Field
from typing import List, Optional, Any

class ERPRegisterRequest(BaseModel):
    password: str

class SubjectAttendance(BaseModel):
    name: str
    held: int
    attended: int
    percentage: float

class AttendanceData(BaseModel):
    overallPercentage: float
    held: int
    attended: int
    subjects: List[SubjectAttendance]

class ExamItem(BaseModel):
    code: Optional[str] = None
    name: str
    scored: Optional[str] = None
    grade: Optional[str] = None
    credits: Optional[str] = None

class ExamData(BaseModel):
    examId: str
    title: str
    term: str
    sgpa: Optional[float] = None
    items: List[ExamItem]

class SpfBandData(BaseModel):
    semesterLabel: str
    cycle: int
    band: str
    academicYear: Optional[int] = None
    semester: Optional[int] = None

class SemesterAttendanceSubject(BaseModel):
    name: str
    held: int
    attended: int
    percentage: float

class SemesterAttendanceData(BaseModel):
    semesterLabel: str
    academicYear: Optional[int] = None
    semester: Optional[int] = None
    totalHeld: int
    totalAttended: int
    percentage: float
    subjects: List[SemesterAttendanceSubject]

class StudentProfileData(BaseModel):
    name: Optional[str] = None
    branch: Optional[str] = None
    program: str = "B.Tech"
    currentTermId: Optional[str] = None
    cgpa: Optional[float] = None
    cgpaCredits: Optional[str] = None
    cgpaPercentage: Optional[float] = None

# Unified Academic Data Pydantic Model
class AcademicData(BaseModel):
    profile: StudentProfileData
    attendance: AttendanceData
    exams: List[ExamData]
    spf_bands: List[SpfBandData]
    semester_attendance: List[SemesterAttendanceData]
