from pathlib import Path

from navcalc import load_route_file, route_summary


def main() -> None:
    route_path = Path(__file__).resolve().parents[1] / "examples" / "pqe_tgz.txt"
    points = load_route_file(route_path)
    summary = route_summary(points)

    for index, distance_nm in enumerate(summary.legs_nm):
        origin = points[index]
        destination = points[index + 1]
        print(f"{origin.name} -> {destination.name}: {distance_nm:.3f} NM")

    print(f"Total: {summary.total_nm:.3f} NM")


if __name__ == "__main__":
    main()
