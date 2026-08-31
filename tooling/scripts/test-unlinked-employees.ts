async function test() {
  const res = await fetch('http://localhost:3000/api/v1/users/unlinked-employees');
  const json = await res.json();
  console.log('--- UNLINKED EMPLOYEES API RESULT ---');
  console.log('Success:', json.success);
  console.log('Total Count:', json.totalCount);
  console.log('Organizations:', json.organizations);
  console.log('Departments (first 5):', json.departments?.slice(0, 5));
  console.log('First 3 Non-User Employees:');
  console.log(json.data?.slice(0, 3));
}

test();
