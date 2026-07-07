#include "geo.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static void print_usage(const char *program_name) {
    printf("Usage:\n");
    printf("  %s distance LAT1 LON1 LAT2 LON2\n", program_name);
    printf("\nExample:\n");
    printf("  %s distance 17.54 -92.03 16.57 -93.03\n", program_name);
}

static int parse_double(const char *text, double *value) {
    char *end = NULL;
    double parsed = strtod(text, &end);

    if (end == text || *end != '\0') {
        return 0;
    }

    *value = parsed;
    return 1;
}

static int run_distance(int argc, char **argv) {
    GeoPoint a;
    GeoPoint b;

    if (argc != 6) {
        print_usage(argv[0]);
        return 1;
    }

    if (!parse_double(argv[2], &a.lat_deg) ||
        !parse_double(argv[3], &a.lon_deg) ||
        !parse_double(argv[4], &b.lat_deg) ||
        !parse_double(argv[5], &b.lon_deg)) {
        fprintf(stderr, "Error: coordinates must be valid numbers.\n");
        return 1;
    }

    printf("From: %.6f, %.6f\n", a.lat_deg, a.lon_deg);
    printf("To:   %.6f, %.6f\n", b.lat_deg, b.lon_deg);
    printf("Distance: %.3f km\n", haversine_km(a, b));
    printf("Distance: %.3f NM\n", haversine_nm(a, b));
    printf("Initial bearing: %.1f deg\n", initial_bearing_deg(a, b));

    return 0;
}

int main(int argc, char **argv) {
    if (argc < 2) {
        print_usage(argv[0]);
        return 1;
    }

    if (strcmp(argv[1], "distance") == 0) {
        return run_distance(argc, argv);
    }

    fprintf(stderr, "Error: unknown command '%s'.\n", argv[1]);
    print_usage(argv[0]);
    return 1;
}
