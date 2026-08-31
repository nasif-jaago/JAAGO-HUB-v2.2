async function testCreateUser() {
  try {
    const res = await fetch('http://localhost:3000/api/v1/users/create-from-employee', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Tanvir Ahmed',
        email: 'tanvir.ahmed@jaago.com.bd',
        personalEmail: 'tanvir.personal@gmail.com',
        department: 'People & Culture',
        designation: 'HR Coordinator',
        employeeCode: 'JF-1082',
        branch: 'Head Office (Banani)',
      }),
    });

    const data = await res.json();
    console.log('API Response Status:', res.status);
    console.log('API Response Success:', data.success);
    console.log('User Details:', data.data?.user);
    console.log('Email Payload Subject:', data.data?.emailPayload?.subject);
    console.log('Email Payload To:', data.data?.emailPayload?.to);
    console.log('Email Payload User ID:', data.data?.emailPayload?.userId);
    console.log('Email Payload Temp Pass:', data.data?.emailPayload?.tempPassword);
    console.log('Email Payload Login URL:', data.data?.emailPayload?.loginUrl);
    console.log('HTML Length:', data.data?.emailPayload?.htmlEmail?.length);
    console.log('\n--- Plain Text Email Preview ---\n');
    console.log(data.data?.emailPayload?.fullEmailText);
  } catch (err) {
    console.error('Test error:', err);
  }
}

testCreateUser();
