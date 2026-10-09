import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService, UsernameTakenError } from './auth.service';
import { SupabaseService } from '../../services/supabase';

describe('AuthService', () => {
  it('creates an anonymous Supabase user and stores their username', async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: 1, username: 'kimi' },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    const from = vi.fn().mockReturnValue({ insert });
    const signInAnonymously = vi.fn().mockResolvedValue({
      data: { user: { id: 'supabase-user-id' } },
      error: null,
    });
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        {
          provide: SupabaseService,
          useValue: {
            client: {
              auth: { signInAnonymously },
              from,
            },
          },
        },
      ],
    });

    const auth = TestBed.inject(AuthService);
    await auth.createPlayer('Kimi_1');

    expect(signInAnonymously).toHaveBeenCalledOnce();
    expect(from).toHaveBeenCalledWith('profiles');
    expect(insert).toHaveBeenCalledWith({
      username: 'kimi_1',
      user_id: 'supabase-user-id',
    });
    expect(auth.user()).toEqual({ id: 1, username: 'kimi' });
  });

  it('restores the profile associated with the persisted session', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: 4, username: 'sia' },
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        {
          provide: SupabaseService,
          useValue: {
            client: {
              auth: {
                getSession: vi.fn().mockResolvedValue({
                  data: { session: { user: { id: 'supabase-user-id' } } },
                  error: null,
                }),
              },
              from,
            },
          },
        },
      ],
    });

    const auth = TestBed.inject(AuthService);
    await expect(auth.hasSession()).resolves.toBe(true);

    expect(eq).toHaveBeenCalledWith('user_id', 'supabase-user-id');
    expect(auth.user()).toEqual({ id: 4, username: 'sia' });
  });

  it('clears a newly-created session when a username is already taken', async () => {
    const duplicateError = { code: '23505' };
    const single = vi.fn().mockResolvedValue({ data: null, error: duplicateError });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    const from = vi.fn().mockReturnValue({ insert });
    const signOut = vi.fn().mockResolvedValue({ error: null });
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        {
          provide: SupabaseService,
          useValue: {
            client: {
              auth: {
                signInAnonymously: vi.fn().mockResolvedValue({
                  data: { user: { id: 'supabase-user-id' } },
                  error: null,
                }),
                signOut,
              },
              from,
            },
          },
        },
      ],
    });

    await expect(TestBed.inject(AuthService).createPlayer('kimi')).rejects.toBeInstanceOf(
      UsernameTakenError,
    );
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('clears local identity when a session is unavailable', async () => {
    const player = signal({ id: 3, username: 'old' });
    const { client } = {
      client: {
        auth: {
          getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        },
      },
    };
    TestBed.configureTestingModule({
      providers: [AuthService, { provide: SupabaseService, useValue: { client } }],
    });

    const auth = TestBed.inject(AuthService);
    auth.user.set(player());
    await expect(auth.hasSession()).resolves.toBe(false);
    expect(auth.user()).toBeNull();
  });
});
