import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email-service';
import { logger } from '@jaago/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/procurement/requests/notify-step
 *
 * Dispatches an automated approval request email to a designated approver
 * for a specific step in the purchase or general requisition approval chain.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      actionType = 'approval_request',
      requestId,
      prNumber,
      requisitionType = 'General',
      title,
      stepNumber,
      stepName,
      approverName,
      approverEmail,
      requesterName,
      requesterEmail,
      department,
      totalAmount,
      refusalReason,
    } = body;

    if (!prNumber) {
      return NextResponse.json(
        { success: false, error: 'prNumber is required' },
        { status: 400 }
      );
    }

    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
    const proto = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const origin = process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;

    const typeRoute = String(requisitionType).toLowerCase() === 'purchase' ? 'purchase' : 'general';

    // ── 1. REFUSAL NOTIFICATION TO REQUEST OWNER ───────────────────────────────
    if (actionType === 'refusal_notice') {
      let recipientEmail = (requesterEmail || '').trim().toLowerCase();
      if (!recipientEmail || !recipientEmail.includes('@')) {
        const slug = (requesterName || 'user').toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.');
        recipientEmail = `${slug}@jaago.com.bd`;
      }

      const queryParams = new URLSearchParams();
      if (requestId) queryParams.set('id', String(requestId));
      if (prNumber) queryParams.set('pr', String(prNumber));
      queryParams.set('open', 'form');

      const actionUrl = `${origin}/requests/${typeRoute}?${queryParams.toString()}`;
      const shortRequestTitle = `${requisitionType} Requisition ${prNumber}`;

      const mailResult = await sendEmail({
        templateKey: 'approvals.request_refused',
        to: recipientEmail,
        variables: {
          requesterName: requesterName || 'Staff Member',
          requestTitle: shortRequestTitle,
          stepNumber: stepNumber || 1,
          stepName: stepName || 'Supervisor',
          approverName: approverName || 'Approver',
          refusalReason: refusalReason || 'Requisition refused by approver.',
          actionUrl,
        },
        module: 'procurement',
        relatedEntity: { type: 'procurement_request', id: requestId || prNumber },
      });

      logger.info('SYSTEM', 'procurement.approval_step_refused_notified', {
        metadata: {
          prNumber,
          stepNumber,
          stepName,
          approverName,
          recipientEmail,
          mailSuccess: mailResult.success,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Refusal notice dispatched to Request Owner: ${requesterName} (${recipientEmail})`,
        recipient: recipientEmail,
        stepNumber,
        stepName,
        providerMessageId: mailResult.providerMessageId || null,
        sentAt: new Date().toISOString(),
      });
    }

    // ── 2. APPROVAL REQUEST TO DESIGNATED APPROVER ────────────────────────────
    if (!approverName) {
      return NextResponse.json(
        { success: false, error: 'approverName is required for approval requests' },
        { status: 400 }
      );
    }

    // Resolve clean recipient email address
    let cleanEmail = (approverEmail || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      // Fallback to institutional pattern: firstname.lastname@jaago.com.bd
      const slug = approverName.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.');
      cleanEmail = `${slug}@jaago.com.bd`;
    }

    const queryParams = new URLSearchParams();
    if (requestId) queryParams.set('id', String(requestId));
    if (prNumber) queryParams.set('pr', String(prNumber));
    queryParams.set('open', 'form');
    if (stepNumber) queryParams.set('step', String(stepNumber));
    if (approverName) queryParams.set('approver', approverName);

    const actionUrl = `${origin}/requests/${typeRoute}?${queryParams.toString()}`;

    const formattedAmount = totalAmount ? ` (Est. ৳ ${Number(totalAmount).toLocaleString()})` : '';
    // Short user-friendly subject title matching user screenshot: "Pending Approval Request for General Requisition JFT/GR/26/09/755685"
    const shortRequestTitle = `${requisitionType} Requisition ${prNumber}`;
    const detailedRequestSummary = `${requisitionType} Requisition ${prNumber} - Step ${stepNumber || 1} (${stepName || 'Supervisor'}): ${title || 'Procurement Order'}${formattedAmount}`;

    const mailResult = await sendEmail({
      templateKey: 'approvals.pending_request',
      to: cleanEmail,
      variables: {
        approverName: approverName || 'Approver',
        requestTitle: shortRequestTitle,
        requestDetails: detailedRequestSummary,
        requesterName: requesterName || 'Staff Member',
        department: department || 'General',
        actionUrl,
      },
      module: 'procurement',
      relatedEntity: { type: 'procurement_request', id: requestId || prNumber },
    });

    logger.info('SYSTEM', 'procurement.approval_step_notified', {
      metadata: {
        prNumber,
        stepNumber,
        stepName,
        approverName,
        approverEmail: cleanEmail,
        mailSuccess: mailResult.success,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Approval request dispatched to Step ${stepNumber || 1} Approver: ${approverName} (${cleanEmail})`,
      recipient: cleanEmail,
      stepNumber,
      stepName,
      providerMessageId: mailResult.providerMessageId || null,
      errorReason: mailResult.errorReason || null,
      sentAt: new Date().toISOString(),
    });
  } catch (err: any) {
    logger.error('SYSTEM', 'procurement.approval_notification_failed', {
      metadata: { error: err?.message },
    });
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to dispatch approval notification email' },
      { status: 500 }
    );
  }
}
