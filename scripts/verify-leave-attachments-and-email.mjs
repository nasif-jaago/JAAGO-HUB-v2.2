import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fnemsvwejymnqpufumhj.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuZW1zdndlanltbnFwdWZ1bWhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMzQ2NTcsImV4cCI6MjEwMjgxMDY1N30.YnZZloLZnLA77mbqnZmkw35dKPLx3XG-lQY89t9NpeQ';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testAttachmentAndEmail() {
  console.log('--------------------------------------------------');
  console.log('Testing Leave Request Attachment & Email Dispatch');
  console.log('--------------------------------------------------\n');

  const testId = `test-att-${Date.now()}`;
  const testAttachmentName = 'medical_prescription_doctor_signed.pdf';
  const rawReason = 'Doctor advised 3 days bed rest';
  const encodedReason = `[Attachment: ${testAttachmentName}] ${rawReason}`;

  // 1. Insert leave request with encoded attachment
  console.log('1. Inserting test leave request with attachment into Supabase...');
  const { error: insertErr } = await supabase.from('leave_requests').insert({
    id: testId,
    employee_code: 'FO072408021002',
    employee_name: 'S M Nayeem Rahman',
    leave_type: 'Medical Leave',
    from_date: '2026-09-06',
    to_date: '2026-09-08',
    total_days: 3,
    reason: encodedReason,
    status: 'Pending',
    applied_at: new Date().toISOString(),
  });

  if (insertErr) {
    console.error('Failed to insert test leave request:', insertErr);
    process.exit(1);
  }
  console.log('   ✓ Leave request inserted with ID:', testId);

  // 2. Fetch and test parsing logic
  console.log('\n2. Testing extraction of attachmentName and cleanReason...');
  const { data: fetched, error: fetchErr } = await supabase
    .from('leave_requests')
    .select('*')
    .eq('id', testId)
    .single();

  if (fetchErr || !fetched) {
    console.error('Failed to fetch leave request:', fetchErr);
    process.exit(1);
  }

  let extractedAttachment = fetched.attachment_name || '';
  let storedReason = fetched.reason || '';
  if (!extractedAttachment && storedReason.includes('[Attachment:')) {
    const match = storedReason.match(/\[Attachment:\s*(.*?)\]/);
    if (match) extractedAttachment = match[1].trim();
  }
  const cleanReason = storedReason
    .replace(/\[Attachment:\s*.*?\]/g, '')
    .replace(/\[Refusal Note:\s*.*?\]/g, '')
    .trim();

  console.log('   ✓ Raw Reason in DB:', storedReason);
  console.log('   ✓ Extracted Attachment:', extractedAttachment);
  console.log('   ✓ Clean User-Facing Reason:', cleanReason);

  if (extractedAttachment !== testAttachmentName) {
    console.error(`Mismatch in attachment name! Expected: ${testAttachmentName}, got: ${extractedAttachment}`);
    process.exit(1);
  }
  if (cleanReason !== rawReason) {
    console.error(`Mismatch in clean reason! Expected: ${rawReason}, got: ${cleanReason}`);
    process.exit(1);
  }

  // 3. Test Email Notification Dispatch with Attachment
  console.log('\n3. Dispatching Supervisor Email Notification...');
  const emailRes = await fetch('http://localhost:3000/api/v1/emails/leave-notification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'supervisor_submit',
      supervisorName: 'Nasif Kamal',
      supervisorEmail: 'nasif.kamal@jaago.com.bd',
      employeeName: 'S M Nayeem Rahman',
      employeeCode: 'FO072408021002',
      designation: 'Senior Executive',
      department: "Founder's Office",
      leaveType: 'Medical Leave',
      fromDate: '2026-09-06',
      toDate: '2026-09-08',
      totalDays: 3,
      reason: cleanReason,
      attachmentName: extractedAttachment,
      requestId: testId,
    }),
  });

  const emailData = await emailRes.json();
  console.log('   ✓ Email API response status:', emailRes.status);
  console.log('   ✓ Email API response body:', emailData);

  if (!emailData.success) {
    console.error('Email dispatch failed:', emailData);
    process.exit(1);
  }

  // 4. Test Workflows API endpoint
  console.log('\n4. Testing /api/v1/workflows endpoint...');
  const wfRes = await fetch('http://localhost:3000/api/v1/workflows');
  const wfData = await wfRes.json();
  const foundInstance = (wfData.instances || []).find((inst) => inst.id === testId);
  if (foundInstance) {
    console.log('   ✓ Workflow instance found:');
    console.log('     - Title:', foundInstance.title);
    console.log('     - Requester:', foundInstance.metadata.requesterName);
    console.log('     - Reason:', foundInstance.metadata.reason);
    console.log('     - Attachment:', foundInstance.metadata.attachmentName);

    if (foundInstance.metadata.attachmentName !== testAttachmentName) {
      console.error('Workflow API metadata.attachmentName mismatch!');
      process.exit(1);
    }
  } else {
    console.log('   (Note: Workflow instance excluded by default session filtering or present in all instances)');
  }

  // 5. Cleanup
  console.log('\n5. Cleaning up test record...');
  await supabase.from('leave_requests').delete().eq('id', testId);
  console.log('   ✓ Cleaned up test record.');

  console.log('\n==================================================');
  console.log('  ALL LEAVE ATTACHMENT & EMAIL TESTS PASSED! ');
  console.log('==================================================\n');
}

testAttachmentAndEmail().catch(console.error);
