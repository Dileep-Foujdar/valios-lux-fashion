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
  const displayName = data.display_name || "";
  const formatted = [houseNo, street, city, state, zipCode].filter(Boolean).join(", ") || displayName;

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
    displayName,
    formatted
  };
};

/**
 * Lookup Indian PIN → city/state via India Post public API.
 */
export const lookupPincode = async (pin) => {
  const zip = String(pin || "").trim();
  if (!/^\d{6}$/.test(zip)) {
    throw new Error("Enter a valid 6-digit PIN code");
  }

  const res = await fetch(`https://api.postalpincode.in/pincode/${zip}`, {
    headers: { Accept: "application/json" }
  });
  if (!res.ok) {
    throw new Error("PIN lookup failed");
  }
  const data = await res.json();
  const block = Array.isArray(data) ? data[0] : null;
  if (!block || block.Status !== "Success" || !Array.isArray(block.PostOffice) || !block.PostOffice.length) {
    throw new Error("PIN code not found");
  }
  const po = block.PostOffice[0];
  return {
    zipCode: zip,
    city: po.District || po.Block || po.Name || "",
    state: po.State || "",
    country: po.Country || "India",
    area: po.Name || "",
    offices: block.PostOffice.map((o) => ({
      name: o.Name,
      district: o.District,
      state: o.State
    }))
  };
};
