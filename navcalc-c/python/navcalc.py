from __future__ import annotations

from ctypes import CDLL, POINTER, Structure, c_double, c_int
from pathlib import Path
from typing import Iterable, NamedTuple


_ROOT = Path(__file__).resolve().parents[1]
_DLL_PATH = _ROOT / "build" / "navcalc.dll"


class NavcalcBuildError(RuntimeError):
    pass


class RoutePoint(NamedTuple):
    name: str
    lat: float
    lon: float


class RouteSummary(NamedTuple):
    total_nm: float
    legs_nm: list[float]


class AircraftState(NamedTuple):
    callsign: str
    lat: float
    lon: float
    altitude_ft: float
    ground_speed_kt: float
    track_deg: float


class ConflictAlert(NamedTuple):
    aircraft_a: AircraftState
    aircraft_b: AircraftState
    time_to_conflict_sec: float
    horizontal_sep_nm: float
    vertical_sep_ft: float


class _CAircraftState(Structure):
    _fields_ = [
        ("lat_deg", c_double),
        ("lon_deg", c_double),
        ("altitude_ft", c_double),
        ("ground_speed_kt", c_double),
        ("track_deg", c_double),
    ]


class _CConflictResult(Structure):
    _fields_ = [
        ("aircraft_a", c_int),
        ("aircraft_b", c_int),
        ("time_to_conflict_sec", c_double),
        ("horizontal_sep_nm", c_double),
        ("vertical_sep_ft", c_double),
    ]


def _load_library() -> CDLL:
    if not _DLL_PATH.exists():
        raise NavcalcBuildError(
            f"Missing {_DLL_PATH}. Build it from navcalc-c with: powershell -File build.ps1"
        )

    lib = CDLL(str(_DLL_PATH))
    argtypes = [c_double, c_double, c_double, c_double]

    lib.navcalc_distance_km.argtypes = argtypes
    lib.navcalc_distance_km.restype = c_double

    lib.navcalc_distance_nm.argtypes = argtypes
    lib.navcalc_distance_nm.restype = c_double

    lib.navcalc_initial_bearing_deg.argtypes = argtypes
    lib.navcalc_initial_bearing_deg.restype = c_double

    route_argtypes = [POINTER(c_double), POINTER(c_double), c_int]

    lib.navcalc_route_total_nm.argtypes = route_argtypes
    lib.navcalc_route_total_nm.restype = c_double

    lib.navcalc_route_legs_nm.argtypes = [*route_argtypes, POINTER(c_double)]
    lib.navcalc_route_legs_nm.restype = c_int

    lib.navcalc_detect_conflicts.argtypes = [
        POINTER(_CAircraftState),
        c_int,
        c_double,
        c_double,
        c_double,
        c_double,
        POINTER(_CConflictResult),
        c_int,
    ]
    lib.navcalc_detect_conflicts.restype = c_int

    return lib


_LIB = _load_library()


def distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    return float(_LIB.navcalc_distance_km(lat1, lon1, lat2, lon2))


def distance_nm(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    return float(_LIB.navcalc_distance_nm(lat1, lon1, lat2, lon2))


def initial_bearing_deg(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    return float(_LIB.navcalc_initial_bearing_deg(lat1, lon1, lat2, lon2))


def route_summary(points: Iterable[RoutePoint]) -> RouteSummary:
    route_points = list(points)
    count = len(route_points)

    if count < 2:
        return RouteSummary(total_nm=0.0, legs_nm=[])

    latitudes = (c_double * count)(*(point.lat for point in route_points))
    longitudes = (c_double * count)(*(point.lon for point in route_points))
    legs = (c_double * (count - 1))()

    leg_count = int(_LIB.navcalc_route_legs_nm(latitudes, longitudes, count, legs))
    total_nm = float(_LIB.navcalc_route_total_nm(latitudes, longitudes, count))

    return RouteSummary(total_nm=total_nm, legs_nm=[float(legs[i]) for i in range(leg_count)])


def load_route_file(path: str | Path) -> list[RoutePoint]:
    route_points: list[RoutePoint] = []

    for line_number, line in enumerate(Path(path).read_text(encoding="utf-8").splitlines(), start=1):
        stripped = line.strip()

        if not stripped or stripped.startswith("#"):
            continue

        parts = stripped.split()

        if len(parts) != 3:
            raise ValueError(f"Line {line_number}: expected NAME LAT LON")

        name, lat, lon = parts
        route_points.append(RoutePoint(name=name, lat=float(lat), lon=float(lon)))

    return route_points


def detect_conflicts(
    aircraft: Iterable[AircraftState],
    lookahead_sec: float = 300.0,
    step_sec: float = 15.0,
    min_horizontal_nm: float = 5.0,
    min_vertical_ft: float = 1000.0,
) -> list[ConflictAlert]:
    traffic = list(aircraft)
    count = len(traffic)

    if count < 2:
        return []

    max_conflicts = count * (count - 1) // 2
    c_aircraft = (_CAircraftState * count)(
        *(
            _CAircraftState(
                item.lat,
                item.lon,
                item.altitude_ft,
                item.ground_speed_kt,
                item.track_deg,
            )
            for item in traffic
        )
    )
    c_conflicts = (_CConflictResult * max_conflicts)()

    conflict_count = int(
        _LIB.navcalc_detect_conflicts(
            c_aircraft,
            count,
            lookahead_sec,
            step_sec,
            min_horizontal_nm,
            min_vertical_ft,
            c_conflicts,
            max_conflicts,
        )
    )

    alerts: list[ConflictAlert] = []

    for index in range(conflict_count):
        result = c_conflicts[index]
        alerts.append(
            ConflictAlert(
                aircraft_a=traffic[result.aircraft_a],
                aircraft_b=traffic[result.aircraft_b],
                time_to_conflict_sec=float(result.time_to_conflict_sec),
                horizontal_sep_nm=float(result.horizontal_sep_nm),
                vertical_sep_ft=float(result.vertical_sep_ft),
            )
        )

    return alerts
