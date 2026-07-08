from navcalc import AircraftState, detect_conflicts


def main() -> None:
    traffic = [
        AircraftState("AMX101", 20.000, -90.000, 35000, 420, 90),
        AircraftState("VOI202", 20.000, -89.180, 35400, 420, 270),
        AircraftState("TAR303", 20.500, -90.300, 37000, 390, 180),
    ]

    alerts = detect_conflicts(traffic, lookahead_sec=300, step_sec=15)

    if not alerts:
        print("No conflicts detected")
        return

    for alert in alerts:
        print(
            f"{alert.aircraft_a.callsign} / {alert.aircraft_b.callsign}: "
            f"conflict in {alert.time_to_conflict_sec:.0f}s, "
            f"{alert.horizontal_sep_nm:.2f} NM, "
            f"{alert.vertical_sep_ft:.0f} ft"
        )


if __name__ == "__main__":
    main()
