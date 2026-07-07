# navcalc-c

Small C command-line project for learning geospatial and aviation calculations.

This first version calculates:

- Haversine distance in kilometers
- Haversine distance in nautical miles
- Initial bearing in degrees

## Build

From this folder:

```bash
./build.sh
```

Equivalent direct command:

```bash
cc -Wall -Wextra -std=c11 -O2 src/main.c src/geo.c -lm -o build/navcalc
```

Windows/MSYS2 command used in this workspace:

```powershell
C:\msys64\ucrt64\bin\gcc.exe -Wall -Wextra -std=c11 -O2 src\main.c src\geo.c -o build\navcalc.exe
```

## Use

```bash
./build/navcalc distance 17.54 -92.03 16.57 -93.03
```

On Windows:

```powershell
build\navcalc.exe distance 17.54 -92.03 16.57 -93.03
```

Expected output shape:

```text
From: 17.540000, -92.030000
To:   16.570000, -93.030000
Distance: ...
Distance: ... NM
Initial bearing: ... deg
```

## File Structure

```text
src/geo.h    Function declarations and the GeoPoint struct
src/geo.c    Geodesy math implementation
src/main.c   Command-line interface
examples/    Example route data for later steps
```

## Next Step

Read `examples/pqe_tgz.txt` and calculate route legs and total route distance.
