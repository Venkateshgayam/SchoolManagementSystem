import json
import urllib.request
import http.cookiejar
import urllib.error

BASE_URL = "http://localhost:8000"
LOGIN_PAYLOAD = {
    "email": "management@school.edu",
    "password": "Management123!",
    "remember_me": False,
}

paths = [
    "/api/auth/login",
    "/api/auth/me",
    "/api/students/",
    "/api/teachers/",
    "/api/classes/",
    "/api/subjects/",
    "/api/attendance/",
    "/api/fees/",
    "/api/reports/attendance-summary",
]

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

login_data = json.dumps(LOGIN_PAYLOAD).encode("utf-8")
request = urllib.request.Request(
    BASE_URL + "/api/auth/login",
    data=login_data,
    headers={"Content-Type": "application/json"},
    method="POST",
)

try:
    resp = opener.open(request)
    print("LOGIN OK", resp.getcode())
    print(resp.read().decode("utf-8"))
except urllib.error.HTTPError as e:
    print("LOGIN FAILED", e.code)
    print(e.read().decode("utf-8"))
    raise SystemExit(1)

for path in paths[1:]:
    print("---", path)
    request = urllib.request.Request(BASE_URL + path)
    try:
        resp = opener.open(request)
        body = resp.read().decode("utf-8")
        try:
            data = json.loads(body)
            if isinstance(data, list):
                print("COUNT", len(data))
            else:
                print(json.dumps(data, indent=2))
        except json.JSONDecodeError:
            print(body)
    except urllib.error.HTTPError as e:
        print("ERROR", e.code)
        print(e.read().decode("utf-8"))
        continue
