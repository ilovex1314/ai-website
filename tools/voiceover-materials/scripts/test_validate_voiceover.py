#!/usr/bin/env python3
import json
import tempfile
import unittest
from pathlib import Path

from validate_voiceover import analyze_project, analyze_script, count_spoken_chars


class VoiceoverValidatorTest(unittest.TestCase):
    def test_counts_only_spoken_content(self):
        text = "[0-8s] 大家好，[停 0.5s] manifest-first（清单优先）！"
        self.assertEqual(count_spoken_chars(text), 20)

    def test_estimates_duration_and_budget(self):
        report = analyze_script("这" * 250, target_seconds=60, chars_per_minute=250)
        self.assertEqual(report["spoken_chars"], 250)
        self.assertEqual(report["estimated_seconds"], 60.0)
        self.assertEqual(report["budget_status"], "within")

    def test_checks_manifest_first_contract(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "animation-manifest.json").write_text(
                json.dumps(
                    {
                        "durationInFrames": 300,
                        "fps": 30,
                        "scenes": [{"id": "scene-a", "fromFrame": 0, "durationFrames": 300}],
                        "animations": [
                            {
                                "id": "title-enter",
                                "sceneId": "scene-a",
                                "targetElementId": "title",
                                "fromFrame": 0,
                                "durationFrames": 15,
                            }
                        ],
                    }
                ),
                encoding="utf-8",
            )
            (root / "element-map.json").write_text(
                json.dumps(
                    {
                        "elements": {
                            "title": {
                                "id": "title",
                                "sceneId": "scene-a",
                                "visibility": {"fromFrame": 0, "toFrame": 300},
                            }
                        }
                    }
                ),
                encoding="utf-8",
            )

            report = analyze_project(root)

        self.assertEqual(report["duration_seconds"], 10.0)
        self.assertEqual(report["errors"], [])


if __name__ == "__main__":
    unittest.main()
