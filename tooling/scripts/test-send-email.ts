async function testSendEmail() {
  try {
    const res = await fetch('http://localhost:3000/api/v1/notifications/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: 'tanvir.ahmed@jaago.com.bd',
        cc: 'tanvir.personal@gmail.com',
        subject: 'Welcome to JAAGO HUB — Official Account Credentials for Tanvir Ahmed',
        recipientName: 'Tanvir Ahmed',
        loginUrl: 'http://localhost:3000/login?email=tanvir.ahmed%40jaago.com.bd',
        bodyText: 'Test body',
      }),
    });

    const data = await res.json();
    console.log('Send Email Status:', res.status);
    console.log('Send Email Response:', data);
  } catch (err) {
    console.error('Send email test error:', err);
  }
}

testSendEmail();
