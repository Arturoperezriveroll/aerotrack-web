"""Generate AeroTrack navigation datasets from Mexico AIP ENR PDFs.

The parser intentionally imports only records with an unambiguous identifier and
complete latitude/longitude pair. It does not attempt to infer airspace polygons.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import OrderedDict
from datetime import date
from pathlib import Path

from pypdf import PdfReader


FIX_PATTERN = re.compile(
    r"(?m)^\s*([A-Z]{5})\s+"
    r"(\d{2})\s+(\d{2})\s+(\d{2}(?:\.\d+)?)\s*([NS])\s+"
    r"(\d{2,3})\s+(\d{2})\s+(\d{2}(?:\.\d+)?)\s*([EW])\s+(.+?)\s*$"
)
NAVAID_PATTERN = re.compile(
    r"^(.+?)\s+(VOR/DME|DVOR/DME|NDB)/([A-Z]{3})\s+"
    r"([0-9.]+)\s+(MHZ|KHZ)\s+(\S+)\s+(.+)$",
    re.IGNORECASE,
)
DMS_PATTERN = re.compile(
    r"(\d{2})\s*(\d{2})\s*(\d{2}(?:\.\d+)?)\s*N\s+"
    r"(\d{3})\s*(\d{2})\s*(\d{2}(?:\.\d+)?)\s*W",
    re.IGNORECASE,
)
COMPACT_COORD_PATTERN = re.compile(
    r"(\d{6}(?:\.\d+)?N)\s+(\d{7}(?:\.\d+)?W)", re.IGNORECASE
)


def read_pdf_text(path: Path) -> list[str]:
    return [(page.extract_text() or "") for page in PdfReader(str(path)).pages]


def dms_to_decimal(degrees: str, minutes: str, seconds: str, hemisphere: str) -> float:
    value = float(degrees) + float(minutes) / 60 + float(seconds) / 3600
    return -value if hemisphere.upper() in {"S", "W"} else value


def compact_to_decimal(value: str) -> float:
    hemisphere = value[-1].upper()
    digits = value[:-1]
    degree_digits = 2 if hemisphere in {"N", "S"} else 3
    degrees = digits[:degree_digits]
    minutes = digits[degree_digits : degree_digits + 2]
    seconds = digits[degree_digits + 2 :]
    return dms_to_decimal(degrees, minutes, seconds, hemisphere)


def parse_fixes(path: Path) -> list[dict]:
    text = "\n".join(read_pdf_text(path))
    records = []
    for match in FIX_PATTERN.finditer(text):
        name, ld, lm, ls, lh, od, om, os, oh, routes = match.groups()
        records.append(
            {
                "name": name,
                "lat": round(dms_to_decimal(ld, lm, ls, lh), 8),
                "lon": round(dms_to_decimal(od, om, os, oh), 8),
                "routes": [item.strip() for item in routes.split(",") if item.strip()],
                "source": "ENR 4.4",
                "airac": "11/26",
                "effective": "2026-10-29",
            }
        )
    return list(OrderedDict((record["name"], record) for record in records).values())


def parse_navaids(path: Path) -> list[dict]:
    records = []
    for page_text in read_pdf_text(path):
        for raw_line in page_text.splitlines():
            line = " ".join(raw_line.split())
            match = NAVAID_PATTERN.match(line)
            if not match:
                continue
            station, kind, identifier, frequency, unit, schedule, remainder = match.groups()
            coordinates = DMS_PATTERN.search(remainder)
            if not coordinates:
                continue
            ld, lm, ls, od, om, os = coordinates.groups()
            records.append(
                {
                    "name": identifier,
                    "station": station.title(),
                    "type": kind.upper(),
                    "frequency": f"{frequency} {unit.upper()}",
                    "schedule": schedule.upper(),
                    "lat": round(dms_to_decimal(ld, lm, ls, "N"), 8),
                    "lon": round(dms_to_decimal(od, om, os, "W"), 8),
                    "source": "ENR 4.1",
                    "airac": "08/26",
                    "effective": "2026-08-06",
                }
            )
    return list(OrderedDict((record["name"], record) for record in records).values())


def route_header_pattern(prefixes: str) -> re.Pattern:
    return re.compile(rf"({prefixes}\d{{1,3}}[A-Z]?)(?:\s*\(cont\.\))?", re.IGNORECASE)


def parse_routes(path: Path, prefixes: str, category: str, section: str) -> list[dict]:
    header_pattern = route_header_pattern(prefixes)
    routes: OrderedDict[str, list[dict]] = OrderedDict()
    current_route: str | None = None

    for page_text in read_pdf_text(path):
        lines = [" ".join(line.split()) for line in page_text.splitlines()]
        for index, line in enumerate(lines):
            header = header_pattern.fullmatch(line)
            if header:
                current_route = header.group(1).upper()
                routes.setdefault(current_route, [])
                continue
            if not current_route:
                continue

            found: list[tuple[int, str, str, str]] = []
            patterns = (
                re.compile(
                    r"\b(?:VOR(?:TAC)?|NDB)\s+[A-ZÁÉÍÓÚÑ ]+\(([A-Z]{3})\)\s+"
                    r"(\d{6}(?:\.\d+)?N)\s+(\d{7}(?:\.\d+)?W)",
                    re.IGNORECASE,
                ),
                re.compile(
                    r"\b([A-Z]{5})\s+(\d{6}(?:\.\d+)?N)\s+(\d{7}(?:\.\d+)?W)",
                    re.IGNORECASE,
                ),
            )
            for pattern in patterns:
                for match in pattern.finditer(line):
                    found.append((match.start(), match.group(1).upper(), match.group(2), match.group(3)))

            if not found:
                name = None
                fix_name = re.fullmatch(r"(?:[▲#S]\s*)?([A-Z]{5})", line, re.IGNORECASE)
                navaid_name = re.search(
                    r"\b(?:VOR(?:TAC)?|NDB)\s+[A-ZÁÉÍÓÚÑ ]+\(([A-Z]{3})\)",
                    line,
                    re.IGNORECASE,
                )
                if fix_name:
                    name = fix_name.group(1).upper()
                elif navaid_name:
                    name = navaid_name.group(1).upper()
                if name:
                    coordinate = COMPACT_COORD_PATTERN.search(" ".join(lines[index + 1 : index + 4]))
                    if coordinate:
                        found.append((0, name, coordinate.group(1), coordinate.group(2)))

            for _, name, latitude, longitude in sorted(found):
                point = {
                    "name": name,
                    "lat": round(compact_to_decimal(latitude), 8),
                    "lon": round(compact_to_decimal(longitude), 8),
                }
                if not routes[current_route] or routes[current_route][-1]["name"] != name:
                    routes[current_route].append(point)

    result = []
    for name, points in routes.items():
        if len(points) < 2:
            continue
        result.append(
            {
                "name": name,
                "category": category,
                "points": points,
                "source": section,
                "snapshot": "2026-11-17",
            }
        )
    return result


def point_feature(record: dict, description: str) -> dict:
    return {
        "type": "Feature",
        "properties": {
            "Name": record["name"],
            "description": description,
            "source": record.get("source"),
            "airac": record.get("airac"),
            "effective": record.get("effective"),
        },
        "geometry": {"type": "Point", "coordinates": [record["lon"], record["lat"]]},
    }


def route_feature(route: dict) -> dict:
    return {
        "type": "Feature",
        "properties": {
            "Name": route["name"],
            "description": f"{route['category']} route - {route['source']}",
            "source": route["source"],
            "snapshot": route["snapshot"],
        },
        "geometry": {
            "type": "LineString",
            "coordinates": [[point["lon"], point["lat"]] for point in route["points"]],
        },
    }


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_runtime_data(path: Path, fixes: list[dict], navaids: list[dict], routes: list[dict]) -> None:
    combined_points = OrderedDict()
    for record in fixes + navaids:
        combined_points[record["name"]] = {
            "nombre": record["name"],
            "coordenadas": {"latitud": str(record["lat"]), "longitud": str(record["lon"])},
        }
    for route in routes:
        for point in route["points"]:
            combined_points.setdefault(
                point["name"],
                {
                    "nombre": point["name"],
                    "coordenadas": {"latitud": str(point["lat"]), "longitud": str(point["lon"])},
                },
            )

    airway_records = [{route["name"]: [point["name"] for point in route["points"]]} for route in routes]
    payload = {
        "metadata": {
            "source": "AIP México ENR 3.2, ENR 3.3, ENR 4.1 and ENR 4.4",
            "generated": date.today().isoformat(),
            "snapshot": "2026-11-17",
            "fixCount": len(fixes),
            "navaidCount": len(navaids),
            "airwayCount": len(routes),
        },
        "fixes": list(combined_points.values()),
        "airways": airway_records,
    }
    serialized = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    source = f"""// Generated by scripts/generate_aip_data.py. Do not edit manually.\n(function (root) {{\n  const update = {serialized};\n  const deduplicatedFixes = new Map();\n  fixesData.forEach((fix) => deduplicatedFixes.set(String(fix.nombre || '').toUpperCase(), fix));\n  fixesData.splice(0, fixesData.length, ...deduplicatedFixes.values());\n  const fixIndex = new Map(fixesData.map((fix, index) => [String(fix.nombre || '').toUpperCase(), index]));\n  update.fixes.forEach((fix) => {{\n    const name = String(fix.nombre || '').toUpperCase();\n    const index = fixIndex.get(name);\n    if (index === undefined) {{\n      fixIndex.set(name, fixesData.length);\n      fixesData.push(fix);\n    }} else {{\n      fixesData[index] = fix;\n    }}\n  }});\n  const airwayIndex = new Map(airways.map((airway, index) => [String(Object.keys(airway)[0] || '').toUpperCase(), index]));\n  update.airways.forEach((airway) => {{\n    const name = String(Object.keys(airway)[0] || '').toUpperCase();\n    const index = airwayIndex.get(name);\n    if (index === undefined) {{\n      airwayIndex.set(name, airways.length);\n      airways.push(airway);\n    }} else {{\n      airways[index] = airway;\n    }}\n  }});\n  root.AeroTrackAipData = update.metadata;\n}})(typeof window !== 'undefined' ? window : globalThis);\n"""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(source, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--enr-3-2", type=Path, default=Path(r"D:\ENR_3.2.pdf"))
    parser.add_argument("--enr-3-3", type=Path, default=Path(r"D:\ENR_3.3.pdf"))
    parser.add_argument("--enr-4-1", type=Path, default=Path(r"D:\ENR_4.1.pdf"))
    parser.add_argument("--enr-4-4", type=Path, default=Path(r"D:\ENR_4.4.pdf"))
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()

    fixes = parse_fixes(args.enr_4_4)
    navaids = parse_navaids(args.enr_4_1)
    conventional = parse_routes(
        args.enr_3_2, r"(?:A|B|G|J|R|V|UA|UB|UG|UJ|UR|UV)", "Conventional", "ENR 3.2"
    )
    rnav = parse_routes(args.enr_3_3, r"(?:L|M|T|UL|UM|UT)", "RNAV", "ENR 3.3")
    routes = conventional + rnav

    geojson_root = args.root / "JS" / "geojson"
    write_json(
        geojson_root / "FIXES1.json",
        {
            "type": "FeatureCollection",
            "name": "AIP Mexico ENR 4.4 fixes",
            "features": [
                point_feature(record, f"Routes: {', '.join(record['routes'])} | ENR 4.4 AIRAC 11/26")
                for record in fixes
            ],
        },
    )
    write_json(
        geojson_root / "vores_full.geojson",
        {
            "type": "FeatureCollection",
            "name": "AIP Mexico ENR 4.1 navaids",
            "features": [
                point_feature(
                    record,
                    f"{record['station']} {record['type']} | {record['frequency']} | {record['schedule']} | ENR 4.1",
                )
                for record in navaids
            ],
        },
    )
    write_json(
        geojson_root / "airways_conventional.geojson",
        {
            "type": "FeatureCollection",
            "name": "AIP Mexico ENR 3.2 upper ATS routes",
            "features": [route_feature(route) for route in conventional],
        },
    )
    write_json(
        geojson_root / "airways_rnav.geojson",
        {
            "type": "FeatureCollection",
            "name": "AIP Mexico ENR 3.3 RNAV routes",
            "features": [route_feature(route) for route in rnav],
        },
    )
    write_runtime_data(args.root / "JS" / "mapaProject" / "aip_2026_data.js", fixes, navaids, routes)
    write_json(
        args.root / "data" / "aip_2026_manifest.json",
        {
            "generated": date.today().isoformat(),
            "snapshot": "2026-11-17",
            "sources": {
                "ENR 3.2": args.enr_3_2.name,
                "ENR 3.3": args.enr_3_3.name,
                "ENR 4.1": args.enr_4_1.name,
                "ENR 4.4": args.enr_4_4.name,
            },
            "counts": {
                "fixes": len(fixes),
                "navaids": len(navaids),
                "conventionalRoutes": len(conventional),
                "rnavRoutes": len(rnav),
                "routeSegments": sum(len(route["points"]) - 1 for route in routes),
            },
            "excluded": {
                "airspace": "ENR 2 geometry requires separate manual validation",
                "lowerRoutes": "ENR 3.1 was not supplied",
                "routesWithFewerThanTwoParsedPoints": True,
            },
        },
    )
    print(
        json.dumps(
            {
                "fixes": len(fixes),
                "navaids": len(navaids),
                "conventionalRoutes": len(conventional),
                "rnavRoutes": len(rnav),
                "segments": sum(len(route["points"]) - 1 for route in routes),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
