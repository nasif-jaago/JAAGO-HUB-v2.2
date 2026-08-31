import { emailStore } from '../../apps/web/lib/email-service';

async function testUpdate() {
  const servers = await emailStore.getServers();
  console.log('Current Servers before update:', servers);

  const primary = servers[0];
  if (!primary) return;

  const updated = await emailStore.updateServer(primary.id, {
    username: 'hub.jaago@jaago.com.bd',
    passwordPlain: '2026$PasswordKey?',
    senderEmail: 'noreply@jaago.com.bd',
    senderName: 'JAAGO HUB v2.0',
    host: 'smtp-relay.brevo.com',
    port: 587,
    encryption: 'starttls',
  });

  console.log('Updated server result:', updated);

  const reloaded = await emailStore.getServerById(primary.id);
  console.log('Reloaded server from Supabase:', reloaded);
}

testUpdate();
