/**
 * Reverse-geocode lat/lng via OpenStreetMap Nominatim (no API key).
 * Respect Nominatim usage policy: identify app via User-Agent.
 */
export const reverseGeocode = async (latitude, longitude) => {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("Invalid coordinates");
  }

  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "KirnyaEcommerce/1.0 (delivery-checkout)",
      Accept: "application/json"
    }
  });

  if (!res.ok) {
    throw new Error("Reverse geocoding failed");
  }

  const data = await res.json();
  const a = data.address || {};

  const houseNo = [a.house_number, a.building].filter(Boolean).join(", ");
  const street = [a.road, a.neighbourhood, a.suburb, a.residential]
    .filter(Boolean)
    .join(", ") || a.pedestrian || "";
  const landmark = a.amenity || a.tourism || a.attraction || "";
  const city = a.city || a.town || a.village || a.county || "";
  const state = a.state || "";
  const country = a.country || "India";
  const zipCode = a.postcode || "";

  return {
    houseNo,
    street,
    landmark,
    city,
    state,
    country,
    zipCode,
    latitude: lat,
    longitude: lng,
    displayName: data.display_name || ""
  };
};
