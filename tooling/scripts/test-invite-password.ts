import { emailStore, substituteVariables } from '../../apps/web/lib/email-service';

async function testInvitePassword() {
  console.log('===========================================================');
  console.log('JAAGO HUB — Testing Auto-Generated Password In Invite Email');
  console.log('===========================================================\n');

  // 1. Fetch template from store
  const template = await emailStore.getTemplateByKey('pnc.employee_welcome');
  if (!template) {
    console.error('Error: pnc.employee_welcome template not found in emailStore');
    process.exit(1);
  }

  console.log(`✓ Template Resolved: "${template.name}" (Key: ${template.templateKey}, Version: ${template.version})`);
  console.log(`✓ Subject: "${template.subject}"`);

  // 2. Check variables schema
  const hasTempPassVar = template.variablesSchema.some((v) => v.key === 'tempPassword');
  console.log(`✓ Variables schema includes tempPassword: ${hasTempPassVar ? 'YES' : 'NO'}`);

  // 3. Test substitution with test variables
  const testVariables = {
    employeeName: 'Md Nayeem Hossain',
    employeeCode: 'FNG02230101545',
    designation: 'Assistant Manager',
    department: 'Program Implementation',
    workEmail: 'nayeem.hossain@jaago.com.bd',
    tempPassword: 'Jaago@2026!7X9K',
    loginUrl: 'https://hub.jaago.com.bd/login?email=nayeem.hossain%40jaago.com.bd',
  };

  const subjectRendered = substituteVariables(template.subject, testVariables);
  const bodyHtmlRendered = substituteVariables(template.bodyHtml, testVariables);
  const bodyTextRendered = substituteVariables(template.bodyText, testVariables);

  console.log(`\nRendered Subject: ${subjectRendered}`);

  // Verify that tempPassword is in HTML and text
  const passInHtml = bodyHtmlRendered.includes('Jaago@2026!7X9K');
  const passInText = bodyTextRendered.includes('Jaago@2026!7X9K');
  const emailInHtml = bodyHtmlRendered.includes('nayeem.hossain@jaago.com.bd');
  const invitationInHtml = bodyHtmlRendered.includes('Account Invitation');

  console.log(`✓ Password rendered in HTML body: ${passInHtml ? 'YES' : 'FAILED'}`);
  console.log(`✓ Password rendered in Plain text body: ${passInText ? 'YES' : 'FAILED'}`);
  console.log(`✓ Work email rendered in HTML body: ${emailInHtml ? 'YES' : 'FAILED'}`);
  console.log(`✓ Header is "Account Invitation": ${invitationInHtml ? 'YES' : 'FAILED'}`);

  if (passInHtml && passInText && emailInHtml && invitationInHtml) {
    console.log('\n SUCCESS: All checks passed for Auto-Generated Password in User Invite Email Template!\n');
  } else {
    console.error('\n FAILURE: Some checks failed.');
    process.exit(1);
  }
}

testInvitePassword().catch((err) => {
  console.error('Diagnostic error:', err);
  process.exit(1);
});
