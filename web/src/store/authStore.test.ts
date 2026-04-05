import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from './authStore';

const user = { id: '1', email: 'a@b.com', displayName: 'Alice', role: 'user' };

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, user: null });
  });

  it('initial state has null token and user', () => {
    const { token, user: u } = useAuthStore.getState();
    expect(token).toBeNull();
    expect(u).toBeNull();
  });

  it('setAuth stores token and user', () => {
    useAuthStore.getState().setAuth('tok-123', user);

    const state = useAuthStore.getState();
    expect(state.token).toBe('tok-123');
    expect(state.user).toEqual(user);
  });

  it('logout clears token and user', () => {
    useAuthStore.setState({ token: 'tok-123', user });

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
  });

  it('setAuth replaces a previously stored session', () => {
    useAuthStore.getState().setAuth('old-tok', user);
    const newUser = { id: '2', email: 'b@c.com' };
    useAuthStore.getState().setAuth('new-tok', newUser);

    expect(useAuthStore.getState().token).toBe('new-tok');
    expect(useAuthStore.getState().user?.email).toBe('b@c.com');
  });
});
