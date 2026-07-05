 // Haversine formula to calculate distance between two coordinates
function haversineDistance(coords1, coords2, isNauticalMiles = false) {
    const toRadian = angle => (Math.PI / 180) * angle;
    const distance = (a, b) => (Math.PI / 180) * (b - a);
    const RADIUS_OF_EARTH_IN_KM = 6371;

    const dLat = distance(coords1.lat, coords2.lat);
    const dLon = distance(coords1.lng, coords2.lng);

    const lat1 = toRadian(coords1.lat);
    const lat2 = toRadian(coords2.lat);

    const a = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    let distanceInKm = RADIUS_OF_EARTH_IN_KM * c;

    if (isNauticalMiles) {
        distanceInKm *= 0.539957;
    }

    return distanceInKm;
}

// finaliza funcion de obtener dist haversine