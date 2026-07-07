#!/usr/bin/env bash
set -euo pipefail

mkdir -p build
cc -Wall -Wextra -std=c11 -O2 src/main.c src/geo.c -lm -o build/navcalc

echo "Built build/navcalc"
