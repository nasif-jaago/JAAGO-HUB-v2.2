import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fnemsvwejymnqpufumhj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuZW1zdndlanltbnFwdWZ1bWhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIzNDY1NywiZXhwIjoyMTAyODEwNjU3fQ.WsvG5oRwqp7U04JnfiKmxIbnEnan1a0TqaY97vlhLVI';
const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

async function verify() {
  console.log('=== 1. VERIFYING CASCADING RENAME ENGINE ===');

  // Insert a test employee with Department "Alpha Department"
  const testEmp = {
    code: 'CASCADE-TEST-01',
    name: 'Cascade Tester',
    status: 'Active',
    organization: 'JAAGO Foundation',
    department: 'Alpha Department',
    designation: 'Alpha Officer',
    branch: 'Head Office (Banani)',
    project: 'Alpha Project',
    team: 'Alpha Team',
    updated_at: new Date().toISOString()
  };

  const { error: insErr } = await supabase.from('employees').upsert([testEmp], { onConflict: 'code' });
  if (insErr) {
    console.error('Failed to insert test employee:', insErr);
    return;
  }
  console.log('✓ Inserted test employee with Department: Alpha Department');

  // Trigger cascade rename API
  const renameRes = await fetch('http://localhost:3000/api/v1/hr/entities/cascade-rename', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      entityType: 'department',
      oldName: 'Alpha Department',
      newName: 'Beta Department'
    })
  });
  const renameJson = await renameRes.json();
  console.log('✓ Cascade rename API response:', renameJson);

  // Check if employee's department updated to "Beta Department"
  const { data: updatedEmp } = await supabase
    .from('employees')
    .select('code, name, department')
    .eq('code', 'CASCADE-TEST-01')
    .single();

  console.log('✓ Updated employee profile in Supabase:', updatedEmp);
  if (updatedEmp?.department === 'Beta Department') {
    console.log('✓ PASS: Bidirectional cascading rename verified successfully!');
  } else {
    console.error('✗ FAIL: Expected Beta Department, got:', updatedEmp?.department);
  }

  // Clean up test employee
  await supabase.from('employees').delete().eq('code', 'CASCADE-TEST-01');
  console.log('✓ Cleaned up test record.');
}

verify();
