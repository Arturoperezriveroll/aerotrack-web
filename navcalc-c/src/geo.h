#ifndef GEO_H
#define GEO_H

typedef struct {
    double lat_deg;
    double lon_deg;
} GeoPoint;

double deg_to_rad(double degrees);
double rad_to_deg(double radians);
double km_to_nm(double kilometers);
double normalize_degrees(double degrees);
double haversine_km(GeoPoint a, GeoPoint b);
double haversine_nm(GeoPoint a, GeoPoint b);
double initial_bearing_deg(GeoPoint a, GeoPoint b);

#endif
