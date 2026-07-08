#include "geo.h"

#include <math.h>
#include <stddef.h>

static const double EARTH_RADIUS_KM = 6371.0088;
static const double KM_PER_NM = 1.852;
static const double PI = 3.14159265358979323846;

static double normalize_longitude_deg(double degrees) {
    double result = fmod(degrees + 180.0, 360.0);

    if (result < 0.0) {
        result += 360.0;
    }

    return result - 180.0;
}

static GeoPoint project_point(GeoPoint start, double track_deg, double distance_nm) {
    double lat1 = deg_to_rad(start.lat_deg);
    double lon1 = deg_to_rad(start.lon_deg);
    double bearing = deg_to_rad(track_deg);
    double angular_distance = (distance_nm * KM_PER_NM) / EARTH_RADIUS_KM;

    double sin_lat1 = sin(lat1);
    double cos_lat1 = cos(lat1);
    double sin_distance = sin(angular_distance);
    double cos_distance = cos(angular_distance);

    double lat2 = asin(sin_lat1 * cos_distance + cos_lat1 * sin_distance * cos(bearing));
    double lon2 = lon1 + atan2(
        sin(bearing) * sin_distance * cos_lat1,
        cos_distance - sin_lat1 * sin(lat2)
    );

    GeoPoint projected = {
        rad_to_deg(lat2),
        normalize_longitude_deg(rad_to_deg(lon2))
    };

    return projected;
}

double deg_to_rad(double degrees) {
    return degrees * PI / 180.0;
}

double rad_to_deg(double radians) {
    return radians * 180.0 / PI;
}

double km_to_nm(double kilometers) {
    return kilometers / KM_PER_NM;
}

double normalize_degrees(double degrees) {
    double result = fmod(degrees, 360.0);

    if (result < 0.0) {
        result += 360.0;
    }

    return result;
}

double haversine_km(GeoPoint a, GeoPoint b) {
    double lat1 = deg_to_rad(a.lat_deg);
    double lat2 = deg_to_rad(b.lat_deg);
    double dlat = deg_to_rad(b.lat_deg - a.lat_deg);
    double dlon = deg_to_rad(b.lon_deg - a.lon_deg);

    double sin_dlat = sin(dlat / 2.0);
    double sin_dlon = sin(dlon / 2.0);
    double h = sin_dlat * sin_dlat + cos(lat1) * cos(lat2) * sin_dlon * sin_dlon;
    double central_angle = 2.0 * atan2(sqrt(h), sqrt(1.0 - h));

    return EARTH_RADIUS_KM * central_angle;
}

double haversine_nm(GeoPoint a, GeoPoint b) {
    return km_to_nm(haversine_km(a, b));
}

double initial_bearing_deg(GeoPoint a, GeoPoint b) {
    double lat1 = deg_to_rad(a.lat_deg);
    double lat2 = deg_to_rad(b.lat_deg);
    double dlon = deg_to_rad(b.lon_deg - a.lon_deg);

    double y = sin(dlon) * cos(lat2);
    double x = cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(dlon);

    return normalize_degrees(rad_to_deg(atan2(y, x)));
}

double navcalc_distance_km(double lat1, double lon1, double lat2, double lon2) {
    GeoPoint a = { lat1, lon1 };
    GeoPoint b = { lat2, lon2 };

    return haversine_km(a, b);
}

double navcalc_distance_nm(double lat1, double lon1, double lat2, double lon2) {
    GeoPoint a = { lat1, lon1 };
    GeoPoint b = { lat2, lon2 };

    return haversine_nm(a, b);
}

double navcalc_initial_bearing_deg(double lat1, double lon1, double lat2, double lon2) {
    GeoPoint a = { lat1, lon1 };
    GeoPoint b = { lat2, lon2 };

    return initial_bearing_deg(a, b);
}

double navcalc_route_total_nm(const double *latitudes, const double *longitudes, int count) {
    double total_nm = 0.0;

    if (latitudes == NULL || longitudes == NULL || count < 2) {
        return 0.0;
    }

    for (int i = 0; i < count - 1; i++) {
        GeoPoint a = { latitudes[i], longitudes[i] };
        GeoPoint b = { latitudes[i + 1], longitudes[i + 1] };

        total_nm += haversine_nm(a, b);
    }

    return total_nm;
}

int navcalc_route_legs_nm(const double *latitudes, const double *longitudes, int count, double *out_legs_nm) {
    if (latitudes == NULL || longitudes == NULL || out_legs_nm == NULL || count < 2) {
        return 0;
    }

    for (int i = 0; i < count - 1; i++) {
        GeoPoint a = { latitudes[i], longitudes[i] };
        GeoPoint b = { latitudes[i + 1], longitudes[i + 1] };

        out_legs_nm[i] = haversine_nm(a, b);
    }

    return count - 1;
}

int navcalc_detect_conflicts(
    const AircraftState *aircraft,
    int count,
    double lookahead_sec,
    double step_sec,
    double min_horizontal_nm,
    double min_vertical_ft,
    ConflictResult *out_conflicts,
    int max_conflicts
) {
    int conflict_count = 0;

    if (aircraft == NULL || out_conflicts == NULL || count < 2 || max_conflicts <= 0) {
        return 0;
    }

    if (lookahead_sec < 0.0) {
        return 0;
    }

    if (step_sec <= 0.0) {
        step_sec = 30.0;
    }

    for (int i = 0; i < count - 1; i++) {
        for (int j = i + 1; j < count; j++) {
            for (double time_sec = 0.0; time_sec <= lookahead_sec; time_sec += step_sec) {
                double distance_a_nm = aircraft[i].ground_speed_kt * time_sec / 3600.0;
                double distance_b_nm = aircraft[j].ground_speed_kt * time_sec / 3600.0;

                GeoPoint point_a = { aircraft[i].lat_deg, aircraft[i].lon_deg };
                GeoPoint point_b = { aircraft[j].lat_deg, aircraft[j].lon_deg };
                GeoPoint projected_a = project_point(point_a, aircraft[i].track_deg, distance_a_nm);
                GeoPoint projected_b = project_point(point_b, aircraft[j].track_deg, distance_b_nm);

                double horizontal_sep_nm = haversine_nm(projected_a, projected_b);
                double vertical_sep_ft = fabs(aircraft[i].altitude_ft - aircraft[j].altitude_ft);

                if (horizontal_sep_nm < min_horizontal_nm && vertical_sep_ft < min_vertical_ft) {
                    out_conflicts[conflict_count].aircraft_a = i;
                    out_conflicts[conflict_count].aircraft_b = j;
                    out_conflicts[conflict_count].time_to_conflict_sec = time_sec;
                    out_conflicts[conflict_count].horizontal_sep_nm = horizontal_sep_nm;
                    out_conflicts[conflict_count].vertical_sep_ft = vertical_sep_ft;
                    conflict_count++;
                    break;
                }
            }

            if (conflict_count >= max_conflicts) {
                return conflict_count;
            }
        }
    }

    return conflict_count;
}
