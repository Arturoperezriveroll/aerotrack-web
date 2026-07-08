# navcalc-c

Small C command-line project for learning geospatial and aviation calculations.

This first version calculates:

- Haversine distance in kilometers
- Haversine distance in nautical miles
- Initial bearing in degrees
- Route leg distances and total route distance from Python through the C DLL
- Basic airborne conflict detection using straight-line projected traffic

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

Windows PowerShell build for the executable and DLL:

```powershell
powershell -ExecutionPolicy Bypass -File .\build.ps1
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

## Python DLL Test

From this folder:

```powershell
python .\python\test_navcalc.py
python .\python\test_route.py
python .\python\test_conflicts.py
```

Route output example:

```text
PQE -> SAXAV: 37.731 NM
SAXAV -> TGZ: 44.048 NM
Total: 81.780 NM
```

Conflict output example:

```text
AMX101 / VOI202: conflict in 180s, 4.26 NM, 400 ft
```

The first conflict detector assumes each aircraft keeps its current position,
altitude, ground speed, and track. It uses 5 NM horizontal and 1000 ft vertical
separation by default from the Python wrapper.

## File Structure

```text
src/geo.h    Function declarations and the GeoPoint struct
src/geo.c    Geodesy math implementation
src/main.c   Command-line interface
examples/    Example route data for later steps
python/      Python ctypes wrapper and smoke tests
```

## Next Step

Add vertical rate and closest-point-of-approach calculations.
