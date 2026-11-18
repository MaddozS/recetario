import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockLogAuditEvent } = vi.hoisted(() => ({ mockLogAuditEvent: vi.fn() }));

vi.mock('@recetario/db', () => ({
  logAuditEvent: mockLogAuditEvent,
}));

const { recordSignInAudit } = await import('./session-audit');

describe('recordSignInAudit', () => {
  beforeEach(() => {
    mockLogAuditEvent.mockReset();
  });

  it('records sign_in with the client IP and user agent', async () => {
    const request = new Request('http://api.local/api/auth/sign-in/email', {
      headers: {
        'x-forwarded-for': '203.0.113.7, 10.0.0.1',
        'user-agent': 'vitest-agent',
      },
    });

    await recordSignInAudit({ userId: 'user-1' }, { request });

    expect(mockLogAuditEvent).toHaveBeenCalledWith({
      userId: 'user-1',
      action: 'sign_in',
      ipAddress: '203.0.113.7',
      userAgent: 'vitest-agent',
    });
  });

  it('records sign_in with nulls when there is no request context', async () => {
    await recordSignInAudit({ userId: 'user-2' }, null);

    expect(mockLogAuditEvent).toHaveBeenCalledWith({
      userId: 'user-2',
      action: 'sign_in',
      ipAddress: null,
      userAgent: null,
    });
  });
});
