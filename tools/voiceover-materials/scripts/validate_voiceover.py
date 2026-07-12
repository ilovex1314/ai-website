#!/usr/bin/env python3
"""Validate narration duration and a minimal manifest-first HyperFrames contract."""

import argparse
import json
import re
import sys
from pathlib import Path


MARKER_RE = re.compile(r"\[[^\]]*\]")
SPEAKABLE_RE = re.compile(r"[\u3400-\u9fffA-Za-z0-9]")
PAUSE_RE = re.compile(r"\[停\s*([0-9]+(?:\.[0-9]+)?)s\]")


def count_spoken_chars(text: str) -> int:
    """Count CJK characters, Latin letters, and digits after removing cues."""
    return len(SPEAKABLE_RE.findall(MARKER_RE.sub("", text)))


def analyze_script(text: str, target_seconds: float, chars_per_minute: float) -> dict:
    spoken_chars = count_spoken_chars(text)
    pause_seconds = sum(float(value) for value in PAUSE_RE.findall(text))
    estimated_seconds = spoken_chars / chars_per_minute * 60 + pause_seconds
    target_chars = chars_per_minute * max(target_seconds - pause_seconds, 0) / 60
    lower = round(target_chars * 0.92)
    upper = round(target_chars * 1.08)
    status = "within" if lower <= spoken_chars <= upper else "short" if spoken_chars < lower else "long"
    return {
        "spoken_chars": spoken_chars,
        "pause_seconds": round(pause_seconds, 2),
        "pace_chars_per_minute": chars_per_minute,
        "target_seconds": round(target_seconds, 2),
        "estimated_seconds": round(estimated_seconds, 2),
        "target_char_range": [lower, upper],
        "budget_status": status,
    }


def _load_json(path: Path) -> dict:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def analyze_project(project_dir: Path) -> dict:
    errors = []
    warnings = []
    manifest_path = project_dir / "animation-manifest.json"
    map_path = project_dir / "element-map.json"
    if not manifest_path.exists():
        return {"duration_seconds": None, "errors": ["missing animation-manifest.json"], "warnings": []}

    manifest = _load_json(manifest_path)
    fps = manifest.get("fps")
    duration_frames = manifest.get("durationInFrames")
    if not isinstance(fps, (int, float)) or fps <= 0:
        errors.append("manifest fps must be positive")
    if not isinstance(duration_frames, (int, float)) or duration_frames <= 0:
        errors.append("manifest durationInFrames must be positive")
    duration_seconds = duration_frames / fps if not errors else None

    scenes = manifest.get("scenes", [])
    scene_ids = {scene.get("id") for scene in scenes if scene.get("id")}
    for scene in scenes:
        end = scene.get("fromFrame", 0) + scene.get("durationFrames", 0)
        if duration_frames and end > duration_frames:
            errors.append(f"scene {scene.get('id')} exceeds composition duration")

    elements = {}
    if map_path.exists():
        raw_elements = _load_json(map_path).get("elements", {})
        if isinstance(raw_elements, list):
            elements = {item.get("id"): item for item in raw_elements if item.get("id")}
        elif isinstance(raw_elements, dict):
            elements = raw_elements
    else:
        errors.append("missing element-map.json")

    for animation in manifest.get("animations", []):
        animation_id = animation.get("id", "<unnamed>")
        if animation.get("sceneId") not in scene_ids:
            errors.append(f"animation {animation_id} references unknown sceneId")
        if animation.get("targetElementId") not in elements:
            errors.append(f"animation {animation_id} references unknown targetElementId")
        end = animation.get("fromFrame", 0) + animation.get("durationFrames", 0)
        if duration_frames and end > duration_frames:
            errors.append(f"animation {animation_id} exceeds composition duration")

    if not scenes:
        warnings.append("manifest has no scenes; timed narration cannot map to scene IDs")
    return {
        "duration_seconds": round(duration_seconds, 2) if duration_seconds is not None else None,
        "fps": fps,
        "duration_frames": duration_frames,
        "scene_count": len(scenes),
        "element_count": len(elements),
        "animation_count": len(manifest.get("animations", [])),
        "errors": errors,
        "warnings": warnings,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project-dir", type=Path)
    parser.add_argument("--narration", type=Path)
    parser.add_argument("--target-seconds", type=float)
    parser.add_argument("--pace", type=float, default=255)
    parser.add_argument("--json", action="store_true", dest="as_json")
    args = parser.parse_args()

    if not args.project_dir and not args.target_seconds:
        parser.error("provide --project-dir or --target-seconds")
    if args.pace <= 0:
        parser.error("--pace must be positive")

    report = {}
    target_seconds = args.target_seconds
    if args.project_dir:
        report["project"] = analyze_project(args.project_dir)
        target_seconds = target_seconds or report["project"]["duration_seconds"]
    if args.narration:
        if target_seconds is None:
            parser.error("could not determine target duration")
        report["narration"] = analyze_script(
            args.narration.read_text(encoding="utf-8"), target_seconds, args.pace
        )

    print(json.dumps(report, ensure_ascii=False, indent=2))
    project_errors = report.get("project", {}).get("errors", [])
    return 1 if project_errors else 0


if __name__ == "__main__":
    sys.exit(main())
