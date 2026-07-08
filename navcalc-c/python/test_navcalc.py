from navcalc import distance_km, distance_nm, initial_bearing_deg


def main() -> None:
    lat1 = 17.54
    lon1 = -92.03
    lat2 = 16.57
    lon2 = -93.03

    print(f"Distance: {distance_km(lat1, lon1, lat2, lon2):.3f} km")
    print(f"Distance: {distance_nm(lat1, lon1, lat2, lon2):.3f} NM")
    print(f"Initial bearing: {initial_bearing_deg(lat1, lon1, lat2, lon2):.1f} deg")


if __name__ == "__main__":
    main()
