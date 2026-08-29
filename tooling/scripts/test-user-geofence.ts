import { verifyGeofenceServerSide } from '../../apps/web/lib/server-attendance';

async function main() {
  console.log('Testing User GPS Coordinates against Server Geofences...');
  const payload = { latitude: 23.85687, longitude: 90.38453, accuracy: 151 };
  const res = await verifyGeofenceServerSide(payload);
  console.log('RESULT:', JSON.stringify(res, null, 2));

  if (res.accepted) {
    console.log(`✅ SUCCESS: Accepted inside "${res.matchedLocationName}" (${res.distanceMeters}m from center, radius: ${res.allowedRadiusMeters}m)`);
  } else {
    console.log(`❌ FAILED: ${res.rejectionReason} (nearest: ${res.matchedLocationName}, ${res.distanceMeters}m away)`);
  }
}

main().catch(console.error);
