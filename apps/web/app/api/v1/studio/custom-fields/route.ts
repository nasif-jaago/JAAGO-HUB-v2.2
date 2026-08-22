import { createApiHandler } from '@jaago/authz';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const customFields = [
  {
    id: 'cf-001',
    targetEntity: 'hr_employees',
    fieldKey: 'national_id_smart_card',
    label: 'Bangladesh NID (Smart Card Number)',
    fieldType: 'text',
    isRequired: true,
    defaultValue: '',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cf-002',
    targetEntity: 'hr_employees',
    fieldKey: 'blood_group',
    label: 'Blood Group',
    fieldType: 'select',
    optionsJson: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'],
    isRequired: false,
    defaultValue: 'O+',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cf-003',
    targetEntity: 'account_journal_entries',
    fieldKey: 'donor_grant_reference_code',
    label: 'Donor Grant Allocation Code',
    fieldType: 'text',
    isRequired: false,
    defaultValue: '',
    createdAt: new Date().toISOString(),
  },
];

export const GET = createApiHandler({
  requireAuth: true,
  async handler(request) {
    const url = new URL(request.url);
    const target = url.searchParams.get('target');

    const filtered = target ? customFields.filter((f) => f.targetEntity === target) : customFields;

    return Response.json({
      data: filtered,
      meta: {
        total: filtered.length,
      },
    });
  },
});

export const POST = createApiHandler({
  requireAuth: true,
  async handler(request) {
    const body = await request.json();
    const { targetEntity, fieldKey, label, fieldType, optionsJson, isRequired, defaultValue } = body;

    const newField = {
      id: `cf_${Date.now()}`,
      targetEntity: targetEntity || 'hr_employees',
      fieldKey,
      label,
      fieldType: fieldType || 'text',
      optionsJson: optionsJson || [],
      isRequired: Boolean(isRequired),
      defaultValue: defaultValue || '',
      createdAt: new Date().toISOString(),
    };

    customFields.push(newField);

    return Response.json({
      data: newField,
    });
  },
});
