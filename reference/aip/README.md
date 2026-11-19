# AIP source snapshots

This directory stores local snapshots of the official Mexico AIP sections used to
generate or verify AeroTrack navigation data.

Each snapshot must use its acquisition date as the directory name and contain a
`manifest.json` with file sizes, page counts, and SHA-256 checksums. The original
PDF files are intentionally ignored by Git and excluded from Docker images.

## Current snapshot

- `snapshot-2026-11-17/`
- Source: user-provided USB copy of the Mexico AIP.
- Sections: ENR 2.1, 2.2, 3.2, 3.3, 4.1, and 4.4.

The effective date and AIRAC amendment can vary between pages inside the same
PDF. Always cite the page-specific header when extracting operational data.

## Updating

1. Create a new `snapshot-YYYY-MM-DD` directory; do not overwrite an older snapshot.
2. Copy the new source PDFs into it.
3. calculate a new manifest with page counts and SHA-256 checksums.
4. Compare extracted data with the previous snapshot before regenerating GeoJSON.
5. Record the source snapshot and page-specific AIRAC amendment in generated data.

These documents and the derived map are for development and comparison only and
must not be treated as the sole source for operational navigation.
