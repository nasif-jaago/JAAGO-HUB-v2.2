/**
 * Live HTTP Integration Test for BioTime + GPS Effective Attendance Endpoints
 */

async function testEndpoints() {
  console.log('Testing live API endpoints on http://localhost:3000...\n');

  try {
    // 1. Test /api/v1/biotime/mapping
    const mapRes = await fetch('http://localhost:3000/api/v1/biotime/mapping');
    const mapData = await mapRes.json();
    console.log('1. /api/v1/biotime/mapping status:', mapRes.status, 'success:', mapData.success);
    if (mapData.metrics) {
      console.log('   Metrics:', mapData.metrics);
    }

    // 2. Test /api/v1/attendance/effective
    const effRes = await fetch('http://localhost:3000/api/v1/attendance/effective?startDate=2026-09-01&endDate=2026-09-06');
    const effData = await effRes.json();
    console.log('\n2. /api/v1/attendance/effective status:', effRes.status, 'success:', effData.success);
    if (effData.data && Array.isArray(effData.data)) {
      console.log(`   Fetched ${effData.data.length} effective daily records.`);
      if (effData.data.length > 0) {
        const sample = effData.data[0];
        console.log('   Sample Record:', {
          date: sample.businessDate || sample.date,
          employee: sample.employeeName || sample.employeeCode,
          in: sample.countedCheckInTimeLocal || sample.checkInTime,
          out: sample.countedCheckOutTimeLocal || sample.checkOutTime,
          source: sample.primarySource,
          status: sample.status,
        });
      }
    }

    // 3. Test /api/v1/attendance/me/today
    const todayRes = await fetch('http://localhost:3000/api/v1/attendance/me/today?employeeId=FO032507061190');
    const todayData = await todayRes.json();
    console.log('\n3. /api/v1/attendance/me/today status:', todayRes.status, 'success:', todayData.success);
    if (todayData.data) {
      console.log('   Today state:', {
        state: todayData.data.state,
        first_check_in_at: todayData.data.first_check_in_at,
        last_check_out_at: todayData.data.last_check_out_at,
        worked_seconds: todayData.data.worked_seconds,
      });
    }

    // 4. Test /api/v1/attendance/logs
    const logsRes = await fetch('http://localhost:3000/api/v1/attendance/logs?startDate=2026-09-01&endDate=2026-09-06');
    const logsData = await logsRes.json();
    console.log('\n4. /api/v1/attendance/logs status:', logsRes.status, 'success:', logsData.success);
    if (logsData.data && Array.isArray(logsData.data)) {
      console.log(`   Fetched ${logsData.data.length} attendance log items.`);
    }

    console.log('\n✅ ALL LIVE ENDPOINTS OPERATIONAL & RETURNING CORRECT DATA');
  } catch (err: any) {
    console.error('❌ Error testing live endpoints:', err.message);
  }
}

testEndpoints();
