#include "geo.h"

#include <math.h>

static const double EARTH_RADIUS_KM = 6371.0088;
static const double KM_PER_NM = 1.852;
static const double PI = 3.14159265358979323846;

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
