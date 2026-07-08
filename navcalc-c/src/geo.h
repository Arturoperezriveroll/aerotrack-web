#ifndef GEO_H
#define GEO_H

#if defined(_WIN32)
#define NAVCALC_API __declspec(dllexport)
#else
#define NAVCALC_API
#endif

typedef struct {
    double lat_deg;
    double lon_deg;
} GeoPoint;

typedef struct {
    double lat_deg;
    double lon_deg;
    double altitude_ft;
    double ground_speed_kt;
    double track_deg;
} AircraftState;

typedef struct {
    int aircraft_a;
    int aircraft_b;
    double time_to_conflict_sec;
    double horizontal_sep_nm;
    double vertical_sep_ft;
} ConflictResult;

double deg_to_rad(double degrees);
double rad_to_deg(double radians);
double km_to_nm(double kilometers);
double normalize_degrees(double degrees);
double haversine_km(GeoPoint a, GeoPoint b);
double haversine_nm(GeoPoint a, GeoPoint b);
double initial_bearing_deg(GeoPoint a, GeoPoint b);

NAVCALC_API double navcalc_distance_km(double lat1, double lon1, double lat2, double lon2);
NAVCALC_API double navcalc_distance_nm(double lat1, double lon1, double lat2, double lon2);
NAVCALC_API double navcalc_initial_bearing_deg(double lat1, double lon1, double lat2, double lon2);
NAVCALC_API double navcalc_route_total_nm(const double *latitudes, const double *longitudes, int count);
NAVCALC_API int navcalc_route_legs_nm(const double *latitudes, const double *longitudes, int count, double *out_legs_nm);
NAVCALC_API int navcalc_detect_conflicts(
    const AircraftState *aircraft,
    int count,
    double lookahead_sec,
    double step_sec,
    double min_horizontal_nm,
    double min_vertical_ft,
    ConflictResult *out_conflicts,
    int max_conflicts
);

#endif
