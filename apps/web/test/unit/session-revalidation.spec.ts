import { describe, expect, it, vi } from 'vitest';
import {
  createRefreshScheduler,
  SESSION_REFRESH_TTL_MS,
} from '../../app/utils/session-revalidation';

/**
 * Scheduler de revalidación: TTL para los disparos normales (`focus`,
 * `visibilitychange`), `force` para las restauraciones de bfcache y dedupe de
 * los eventos simultáneos. El reloj se inyecta para que el TTL sea determinista.
 */

function createClock(start = 0) {
  let current = start;
  return {
    now: () => current,
    advance: (ms: number) => {
      current += ms;
    },
  };
}

describe('createRefreshScheduler', () => {
  it('revalida cuando vence el TTL, no antes', async () => {
    const clock = createClock();
    const refresh = vi.fn(async () => true);
    const scheduler = createRefreshScheduler({
      refresh,
      isEligible: () => true,
      now: clock.now,
    });

    await scheduler.request();
    expect(refresh).toHaveBeenCalledTimes(1);

    clock.advance(SESSION_REFRESH_TTL_MS - 1);
    await scheduler.request();
    expect(refresh).toHaveBeenCalledTimes(1);

    clock.advance(1);
    await scheduler.request();
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('`force` ignora el TTL (restauración desde bfcache)', async () => {
    const clock = createClock();
    const refresh = vi.fn(async () => true);
    const scheduler = createRefreshScheduler({
      refresh,
      isEligible: () => true,
      now: clock.now,
    });

    await scheduler.request();
    await scheduler.request(true);

    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('no revalida sin sesión autenticada', async () => {
    const clock = createClock();
    const refresh = vi.fn(async () => true);
    const scheduler = createRefreshScheduler({
      refresh,
      isEligible: () => false,
      now: clock.now,
    });

    await scheduler.request(true);
    await scheduler.request();

    expect(refresh).not.toHaveBeenCalled();
  });

  it('descarta los disparos que llegan con una revalidación en vuelo', async () => {
    const clock = createClock();
    const resolvers: Array<(updated: boolean) => void> = [];
    const refresh = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          resolvers.push(resolve);
        })
    );
    const scheduler = createRefreshScheduler({
      refresh,
      isEligible: () => true,
      now: clock.now,
    });

    const first = scheduler.request();
    expect(refresh).toHaveBeenCalledTimes(1);

    clock.advance(SESSION_REFRESH_TTL_MS * 2);
    await scheduler.request();
    expect(refresh).toHaveBeenCalledTimes(1);

    resolvers[0]!(true);
    await first;

    clock.advance(SESSION_REFRESH_TTL_MS);
    const second = scheduler.request();
    expect(refresh).toHaveBeenCalledTimes(2);

    resolvers[1]!(true);
    await second;
  });

  it('fija el throttle al iniciar: un fallo no amplifica los disparos', async () => {
    const clock = createClock();
    const refresh = vi.fn(async () => false);
    const scheduler = createRefreshScheduler({
      refresh,
      isEligible: () => true,
      now: clock.now,
    });

    await scheduler.request();
    await scheduler.request();

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('notifica el resultado de cada revalidación efectiva', async () => {
    const clock = createClock();
    const onRevalidated = vi.fn();
    const refresh = vi.fn(async () => false);
    const scheduler = createRefreshScheduler({
      refresh,
      isEligible: () => true,
      onRevalidated,
      now: clock.now,
    });

    await scheduler.request();

    expect(onRevalidated).toHaveBeenCalledWith(false);
  });

  it('deja de revalidar tras dispose()', async () => {
    const clock = createClock();
    const refresh = vi.fn(async () => true);
    const scheduler = createRefreshScheduler({
      refresh,
      isEligible: () => true,
      now: clock.now,
    });

    scheduler.dispose();
    await scheduler.request(true);

    expect(refresh).not.toHaveBeenCalled();
  });
});
