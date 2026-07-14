import pytest
from bs4 import BeautifulSoup
from app.scraper.parsers.profile import parse_profile
from app.scraper.parsers.attendance import parse_attendance
from app.scraper.parsers.marks import parse_marks_data
from app.scraper.parsers.spf import parse_spf
from app.scraper.parsers.semester import parse_previous_semesters_attendance
from app import schemas

MOCK_ATTENDANCE_HTML = """
<html>
<body>
    <table>
        <tr><td>Student Name</td><td>: TEST STUDENT</td></tr>
        <tr><td>S.No</td><td>Subject</td><td>Held</td><td>Attended</td></tr>
        <tr><td>1</td><td>Mathematics</td><td>40</td><td>36</td></tr>
        <tr><td>2</td><td>Physics</td><td>30</td><td>25</td></tr>
        <tr><td>TOTAL</td><td></td><td>70</td><td>61</td></tr>
    </table>
</body>
</html>
"""

MOCK_PROFILE_HTML = """
<html>
<body>
    <table>
        <tr><td>Student Name</td><td>: TEST STUDENT</td></tr>
        <tr><td>Branch</td><td>: Computer Science and Engineering (Artificial Intelligence & Machine Learning)</td></tr>
        <tr><td>Semester</td><td>: III/IV II SEMESTER</td></tr>
    </table>
    
    <span class="reportHeading2">CGPA: 8.56 Credits:120/120 85.60 %</span>
    
    <h2>EXTERNAL MARKS</h2>
    <span class="reportHeading2">I/IV I SEMESTER</span>
    <table>
        <tr><td>Subject</td><td>Mathematics</td><td>Physics</td><td>SGPA</td></tr>
        <tr><td>Grade</td><td>A</td><td>O</td><td>8.75</td></tr>
        <tr><td>Credits</td><td>4</td><td>3</td><td></td></tr>
    </table>
    
    <table>
        <tr><td>PREVIOUS SEMESTERS INTERNAL MARKS</td></tr>
        <tr class="reportHeading2"><td>I/IV I SEMESTER</td></tr>
        <tr>
            <td>
                <table>
                    <tr><td>Exam Name</td><td>Mathematics</td><td>Physics</td></tr>
                    <tr><td>CIE A1</td><td>24</td><td>25</td></tr>
                    <tr><td>CIE B1</td><td>20</td><td>22</td></tr>
                </table>
            </td>
        </tr>
    </table>
    
    <div id="divProfile_SPF">
        <table>
            <tr><td>Semester</td><td>Cycle</td><td>SPF Band</td></tr>
            <tr><td rowspan="2">I/IV I SEMESTER</td><td>1</td><td>A</td></tr>
            <tr><td>2</td><td>B</td></tr>
        </table>
    </div>
    
    <table>
        <tr><td>PREVIOUS SEMESTERS ATTENDANCE</td></tr>
        <tr class="reportHeading2"><td>I/IV I SEMESTER</td></tr>
        <tr>
            <td>
                <table>
                    <tr><td>Subject</td><td>Mathematics</td><td>Physics</td><td>Total</td></tr>
                    <tr><td>Held</td><td>40</td><td>30</td><td>70</td></tr>
                    <tr><td>Attended</td><td>38</td><td>27</td><td>65</td></tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""

def test_profile_parser():
    profile = parse_profile(MOCK_PROFILE_HTML)
    assert profile["name"] == "TEST STUDENT"
    assert profile["branch"] == "CSE-AIML"
    assert profile["currentTermId"] == "III/IV II SEMESTER"
    assert profile["cgpa"] == 8.56
    assert profile["cgpaCredits"] == "120/120"
    assert profile["cgpaPercentage"] == 85.6

def test_attendance_parser():
    att = parse_attendance(MOCK_ATTENDANCE_HTML)
    assert att["studentName"] == "TEST STUDENT"
    assert att["overallPercentage"] == 87.14  # (61/70) * 100
    assert att["held"] == 70
    assert att["attended"] == 61
    assert len(att["subjects"]) == 2
    assert att["subjects"][0]["name"] == "Mathematics"
    assert att["subjects"][0]["held"] == 40
    assert att["subjects"][0]["attended"] == 36
    assert att["subjects"][0]["percentage"] == 90.0

def test_marks_parser():
    marks = parse_marks_data(MOCK_PROFILE_HTML)
    
    # Check External Marks
    assert len(marks["externalMarks"]) == 1
    ext = marks["externalMarks"][0]
    assert ext["semesterLabel"] == "I/IV I SEMESTER"
    assert ext["sgpa"] == 8.75
    assert len(ext["subjects"]) == 2
    assert ext["subjects"][0]["name"] == "Mathematics"
    assert ext["subjects"][0]["grade"] == "A"
    assert ext["subjects"][0]["credits"] == "4"
    
    # Check Internal Marks
    assert len(marks["internalMarks"]) == 1
    internal = marks["internalMarks"][0]
    assert internal["semesterLabel"] == "I/IV I SEMESTER"
    assert len(internal["exams"]) == 2
    assert internal["exams"][0]["examName"] == "CIE A1"
    assert internal["exams"][0]["subjects"][0]["name"] == "Mathematics"
    assert internal["exams"][0]["subjects"][0]["marks"] == "24"

def test_spf_parser():
    spf = parse_spf(MOCK_PROFILE_HTML)
    assert len(spf) == 2
    assert spf[0]["semesterLabel"] == "I/IV I SEMESTER"
    assert spf[0]["cycle"] == 1
    assert spf[0]["band"] == "A"
    assert spf[0]["academicYear"] == 1
    assert spf[0]["semester"] == 1
    
    # Check row spanning fallback
    assert spf[1]["semesterLabel"] == "I/IV I SEMESTER"
    assert spf[1]["cycle"] == 2
    assert spf[1]["band"] == "B"

def test_semester_attendance_parser():
    sem = parse_previous_semesters_attendance(MOCK_PROFILE_HTML)
    assert len(sem) == 1
    s = sem[0]
    assert s["semesterLabel"] == "I/IV I SEMESTER"
    assert s["totalHeld"] == 70
    assert s["totalAttended"] == 65
    assert s["percentage"] == 92.86 # (65/70) * 100
    assert len(s["subjects"]) == 2
    assert s["subjects"][0]["name"] == "Mathematics"
    assert s["subjects"][0]["held"] == 40
    assert s["subjects"][0]["attended"] == 38
    assert s["subjects"][0]["percentage"] == 95.0

def test_unified_academic_data_model():
    profile = parse_profile(MOCK_PROFILE_HTML)
    att = parse_attendance(MOCK_ATTENDANCE_HTML)
    marks_raw = parse_marks_data(MOCK_PROFILE_HTML)
    spf_bands_raw = parse_spf(MOCK_PROFILE_HTML)
    semester_attendance_raw = parse_previous_semesters_attendance(MOCK_PROFILE_HTML)
    
    exams = []
    for sem in marks_raw["externalMarks"]:
        exams.append(schemas.ExamData(
            examId=f"EXTERNAL-{sem['semesterLabel']}",
            title="External Marks",
            term=sem["semesterLabel"],
            sgpa=sem["sgpa"],
            items=[schemas.ExamItem(name=s["name"], grade=s["grade"], credits=s["credits"]) for s in sem["subjects"]]
        ))
        
    for sem in marks_raw["internalMarks"]:
        for exam in sem["exams"]:
            exams.append(schemas.ExamData(
                examId=f"INTERNAL-{exam['examName']}-{sem['semesterLabel']}",
                title=exam['examName'],
                term=sem['semesterLabel'],
                items=[schemas.ExamItem(name=s["name"], scored=s["marks"]) for s in exam["subjects"]]
            ))

    # Construct unified pydantic model
    payload = schemas.AcademicData(
        profile=schemas.StudentProfileData(**profile),
        attendance=schemas.AttendanceData(
            overallPercentage=att["overallPercentage"],
            held=att["held"],
            attended=att["attended"],
            subjects=[schemas.SubjectAttendance(**s) for s in att["subjects"]]
        ),
        exams=exams,
        spf_bands=[schemas.SpfBandData(**b) for b in spf_bands_raw],
        semester_attendance=[schemas.SemesterAttendanceData(
            semesterLabel=s["semesterLabel"],
            academicYear=s["academicYear"],
            semester=s["semester"],
            totalHeld=s["totalHeld"],
            totalAttended=s["totalAttended"],
            percentage=s["percentage"],
            subjects=[schemas.SemesterAttendanceSubject(**sub) for sub in s["subjects"]]
        ) for s in semester_attendance_raw]
    )
    
    assert payload.profile.name == "TEST STUDENT"
    assert payload.attendance.overallPercentage == 87.14
    assert len(payload.exams) == 3 # 1 external + 2 internals (CIE A1, CIE B1)
    assert len(payload.spf_bands) == 2
    assert len(payload.semester_attendance) == 1
