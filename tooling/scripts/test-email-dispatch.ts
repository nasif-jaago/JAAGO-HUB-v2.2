import { verifyServerConnection, createTransporterForServer, emailStore, sendEmail } from '../../apps/web/lib/email-service';

async function runTest() {
  console.log('====================================================');
  console.log('JAAGO HUB — SMTP Connection & Test Email Diagnostic');
  console.log('====================================================\n');

  const servers = await emailStore.getServers();
  console.log(`Found ${servers.length} configured server(s):`);
  for (const s of servers) {
    console.log(`- [${s.id}] ${s.name} (Priority: ${s.priority}, Host: ${s.host}:${s.port}, User: ${s.username})`);
  }

  const primary = servers[0];
  if (!primary) {
    console.error('No SMTP servers available.');
    process.exit(1);
  }

  console.log(`\n1. Verifying SMTP Connection Handshake for: ${primary.name}...`);
  try {
    const verifyRes = await verifyServerConnection(primary.id);
    console.log('Result:', verifyRes);
  } catch (err: any) {
    console.error('Verify error:', err.message);
  }

  console.log('\n2. Testing Centralized Outbound Mail Pipeline with starter template (pnc.employee_welcome)...');
  const targetEmail = 'hub.jaago@jaago.com.bd';
  console.log(`Dispatching test message to: ${targetEmail}`);

  try {
    const dispatchRes = await sendEmail({
      templateKey: 'pnc.employee_welcome',
      to: targetEmail,
      variables: {
        employeeName: 'System Administrator',
        employeeCode: 'ADMIN-001',
        designation: 'Lead Architect',
        department: 'Operations',
        workEmail: targetEmail,
        loginUrl: 'http://localhost:3000/login',
      },
      module: 'admin.settings',
    });

    console.log('\nSend Result:', dispatchRes);
    const logs = await emailStore.getLogs();
    console.log(`\nTotal logs recorded in Supabase: ${logs.total}`);
    if (logs.logs.length > 0) {
      console.log('Latest Supabase log entry:', {
        id: logs.logs[0]?.id,
        status: logs.logs[0]?.status,
        to: logs.logs[0]?.toAddress,
        subject: logs.logs[0]?.subjectRendered,
        serverName: logs.logs[0]?.serverName,
        providerMessageId: logs.logs[0]?.providerMessageId,
        errorReason: logs.logs[0]?.errorReason,
      });
    }
  } catch (err: any) {
    console.error('Send error:', err.message);
  }
}

runTest();
