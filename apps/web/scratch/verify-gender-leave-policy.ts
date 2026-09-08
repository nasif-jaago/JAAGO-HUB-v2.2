// Verification test script for Gender-based Leave Policy
import { validateLeaveGenderEligibility } from '../lib/supabase-time-off';

console.log('--- Testing Leave Gender Eligibility ---');

// Test 1: Male attempting Maternity Leave
const maleMaternity = validateLeaveGenderEligibility('MALE', 'Maternity Leave');
console.log('Test 1 (Male -> Maternity):', maleMaternity.valid === false ? 'PASS (Blocked)' : 'FAIL', maleMaternity);

// Test 2: Male applying for Paternity Leave
const malePaternity = validateLeaveGenderEligibility('Male', 'Paternity Leave');
console.log('Test 2 (Male -> Paternity):', malePaternity.valid === true ? 'PASS (Allowed)' : 'FAIL');

// Test 3: Female attempting Paternity Leave
const femalePaternity = validateLeaveGenderEligibility('FEMALE', 'Paternity Leave');
console.log('Test 3 (Female -> Paternity):', femalePaternity.valid === false ? 'PASS (Blocked)' : 'FAIL', femalePaternity);

// Test 4: Female applying for Maternity Leave
const femaleMaternity = validateLeaveGenderEligibility('Female', 'Maternity Leave');
console.log('Test 4 (Female -> Maternity):', femaleMaternity.valid === true ? 'PASS (Allowed)' : 'FAIL');

// Test 5: Casual Leave (Any Gender)
const maleCasual = validateLeaveGenderEligibility('MALE', 'Casual Leave');
const femaleCasual = validateLeaveGenderEligibility('FEMALE', 'Casual Leave');
console.log('Test 5 (Neutral Leave Types):', maleCasual.valid && femaleCasual.valid ? 'PASS (Allowed)' : 'FAIL');

console.log('All verification assertions completed.');
