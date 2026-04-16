// Pure matching algorithm - no dependencies

function scoreBudget(price, min, max) {
  if (min == null && max == null) return 50;
  const lo = min ?? 0;
  const hi = max ?? Infinity;
  if (price >= lo && price <= hi) return 100;
  const ref = price < lo ? lo : hi;
  const diff = Math.abs(price - ref) / ref;
  if (diff <= 0.10) return Math.round(100 - diff * 10 * 50); // 100→50
  if (diff <= 0.25) return Math.round(50 - ((diff - 0.10) / 0.15) * 30); // 50→20
  return 0;
}

function scoreLocation(district, neighborhood, prefDistricts, prefNeighborhoods) {
  if (!prefDistricts?.length && !prefNeighborhoods?.length) return 50;
  const districtMatch = prefDistricts?.length
    ? prefDistricts.some(d => d.trim().toLowerCase() === (district || '').toLowerCase())
    : false;
  const neighborhoodMatch = prefNeighborhoods?.length
    ? prefNeighborhoods.some(n => n.trim().toLowerCase() === (neighborhood || '').toLowerCase())
    : false;
  if (districtMatch && neighborhoodMatch) return 100;
  if (districtMatch) return 70;
  if (neighborhoodMatch) return 50;
  return 0;
}

function scoreM2(m2, min, max) {
  if (min == null && max == null) return 50;
  const lo = min ?? 0;
  const hi = max ?? Infinity;
  if (m2 >= lo && m2 <= hi) return 100;
  const ref = m2 < lo ? lo : hi;
  const diff = Math.abs(m2 - ref) / ref;
  if (diff <= 0.10) return Math.round(100 - diff * 10 * 50);
  if (diff <= 0.25) return Math.round(50 - ((diff - 0.10) / 0.15) * 30);
  return 0;
}

const ROOM_ORDER = ['1+0', '1+1', '2+1', '3+1', '4+1', '4+2', '5+1', '5+2', '6+'];
function roomDistance(a, b) {
  const ia = ROOM_ORDER.indexOf(a);
  const ib = ROOM_ORDER.indexOf(b);
  if (ia === -1 || ib === -1) return 2;
  return Math.abs(ia - ib);
}

function scoreRooms(propRoom, desiredRooms) {
  if (!desiredRooms?.length) return 50;
  let best = Infinity;
  for (const r of desiredRooms) {
    const d = roomDistance(propRoom, r);
    if (d < best) best = d;
  }
  if (best === 0) return 100;
  if (best === 1) return 60;
  if (best === 2) return 20;
  return 0;
}

function scoreFeatures(propFeatures, desiredFeatures) {
  if (!desiredFeatures?.length) return 50;
  const pf = propFeatures || [];
  const intersection = desiredFeatures.filter(f => pf.includes(f));
  return Math.round((intersection.length / desiredFeatures.length) * 100);
}

export function computeMatch(property, client) {
  const w = { budget: 40, location: 30, squareMeters: 15, roomCount: 10, features: 5, ...client.matchWeights };
  const total = w.budget + w.location + w.squareMeters + w.roomCount + w.features || 100;

  const scores = {
    budget: scoreBudget(property.price, client.budgetMin, client.budgetMax),
    location: scoreLocation(property.district, property.neighborhood, client.preferredDistricts, client.preferredNeighborhoods),
    squareMeters: scoreM2(property.squareMeters, client.desiredMinM2, client.desiredMaxM2),
    roomCount: scoreRooms(property.roomCount, client.desiredRoomCounts),
    features: scoreFeatures(property.features, client.desiredFeatures),
  };

  const overall = Math.round(
    (scores.budget * w.budget +
     scores.location * w.location +
     scores.squareMeters * w.squareMeters +
     scores.roomCount * w.roomCount +
     scores.features * w.features) / total
  );

  return {
    propertyId: property.id,
    clientId: client.id,
    overallScore: overall,
    breakdown: {
      budget: { score: scores.budget, weight: w.budget },
      location: { score: scores.location, weight: w.location },
      squareMeters: { score: scores.squareMeters, weight: w.squareMeters },
      roomCount: { score: scores.roomCount, weight: w.roomCount },
      features: { score: scores.features, weight: w.features },
    }
  };
}

export function scoreLabel(score) {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
}

export function scoreColor(score) {
  if (score >= 80) return 'var(--color-success)';
  if (score >= 60) return 'var(--color-info)';
  if (score >= 40) return 'var(--color-warning)';
  return 'var(--color-muted)';
}
