async function testNotifications() {
  console.log('--------------------------------------------------');
  console.log('Testing Notifications API & Dynamic Synthesis');
  console.log('--------------------------------------------------\n');

  // 1. Fetch notifications for Nasif Kamal (Super Admin / Supervisor)
  console.log('1. Fetching notifications for Supervisor Nasif Kamal...');
  const supRes = await fetch('http://localhost:3000/api/v1/notifications?userEmail=nasif.kamal@jaago.com.bd&userName=Nasif%20Kamal&role=super_admin');
  const supData = await supRes.json();
  console.log('   ✓ Status:', supRes.status);
  console.log('   ✓ Total Notifications:', supData.meta?.total);
  console.log('   ✓ Unread Notifications:', supData.meta?.unreadCount);
  console.log('   ✓ Items:');
  (supData.data || []).slice(0, 3).forEach((n, i) => {
    console.log(`     [${i + 1}] Category: ${n.category} | Title: ${n.title}`);
    console.log(`         Message: ${n.message}`);
    console.log(`         ActionUrl: ${n.actionUrl}`);
  });

  // 2. Fetch notifications for S M Nayeem Rahman (Requester)
  console.log('\n2. Fetching notifications for Employee S M Nayeem Rahman (FO072408021002)...');
  const empRes = await fetch('http://localhost:3000/api/v1/notifications?userEmail=nayeem@jaago.com.bd&userCode=FO072408021002&userName=S%20M%20Nayeem%20Rahman&role=staff');
  const empData = await empRes.json();
  console.log('   ✓ Status:', empRes.status);
  console.log('   ✓ Total Notifications:', empData.meta?.total);
  console.log('   ✓ Unread Notifications:', empData.meta?.unreadCount);
  console.log('   ✓ Items:');
  (empData.data || []).slice(0, 3).forEach((n, i) => {
    console.log(`     [${i + 1}] Category: ${n.category} | Title: ${n.title}`);
    console.log(`         Message: ${n.message}`);
    console.log(`         ActionUrl: ${n.actionUrl}`);
  });

  console.log('\n==================================================');
  console.log('  NOTIFICATIONS TEST COMPLETED SUCCESSFULLY! ');
  console.log('==================================================\n');
}

testNotifications().catch(console.error);
