"""
StreamCSV API Integration Tests
Tests all endpoints of the FastAPI bridge connected to streamcsv.exe.
"""

import unittest
from fastapi.testclient import TestClient
from backend.app import app


class TestStreamCSVAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_health(self):
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "healthy")
        self.assertIn("streamcsv.exe", data["binary_path"])

    def test_sample(self):
        res = self.client.get("/api/sample")
        self.assertEqual(res.status_code, 200)
        self.assertIn("csv_text", res.json())
        self.assertTrue(len(res.json()["csv_text"]) > 0)

    def test_inspect_json(self):
        payload = {
            "csv_text": "id,name,active\n101,Alice,true\n102,Bob,false\n",
            "preview_count": 5,
            "delimiter": ",",
            "has_header": True,
        }
        res = self.client.post("/api/inspect/json", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["total_records"], 2)
        self.assertEqual(data["headers"], ["id", "name", "active"])
        self.assertEqual(len(data["preview_rows"]), 2)

    def test_validate_success(self):
        payload = {
            "csv_text": "id,name,active\n101,Alice,true\n102,Bob,false\n",
            "column_types": ["int", "string", "bool"],
        }
        res = self.client.post("/api/validate/json", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["exit_code"], 0)
        self.assertEqual(data["issues_count"], 0)

    def test_validate_type_mismatch(self):
        payload = {
            "csv_text": "id,name,active\nINVALID_ID,Alice,true\n102,Bob,NOT_A_BOOL\n",
            "column_types": ["int", "string", "bool"],
        }
        res = self.client.post("/api/validate/json", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertFalse(data["success"])
        self.assertEqual(data["exit_code"], 1)
        self.assertGreaterEqual(data["issues_count"], 2)
        self.assertEqual(data["issues"][0]["field_name"], "id")

    def test_write_rfc4180(self):
        payload = {
            "records": [
                ["col1", "col2"],
                ["val,with,commas", 'val "with" quotes'],
            ],
            "delimiter": ",",
            "quote": '"',
        }
        res = self.client.post("/api/write", json=payload)
        self.assertEqual(res.status_code, 200)
        self.assertIn('"val,with,commas"', res.text)
        self.assertIn('"val ""with"" quotes"', res.text)

    def test_static_ui_served(self):
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("StreamCSV", res.text)


if __name__ == "__main__":
    unittest.main()
