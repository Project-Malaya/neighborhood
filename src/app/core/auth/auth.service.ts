import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from '../../services/supabase';

export interface PlayerProfile {
  id: number;
  username: string;
}

export class UsernameTakenError extends Error {
  constructor() {
    super('That username is already taken.');
    this.name = 'UsernameTakenError';
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService);
  readonly user = signal<PlayerProfile | null>(null);

  async hasSession(): Promise<boolean> {
    const { data, error } = await this.supabase.client.auth.getSession();
    if (error) {
      throw error;
    }

    const userId = data.session?.user.id;
    if (!userId) {
      this.user.set(null);
      return false;
    }

    const { data: profile, error: profileError } = await this.supabase.client
      .from('profiles')
      .select('id, username')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (!profile) {
      const { error: signOutError } = await this.supabase.client.auth.signOut({ scope: 'local' });
      if (signOutError) {
        throw signOutError;
      }
    }

    this.user.set(profile);
    return profile !== null;
  }

  async createPlayer(username: string): Promise<void> {
    const normalizedUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) {
      throw new Error('Username must be 3–20 characters using letters, numbers, or underscores.');
    }

    const { data: authData, error: authError } =
      await this.supabase.client.auth.signInAnonymously();
    if (authError) {
      throw authError;
    }

    if (!authData.user) {
      throw new Error('Supabase did not return a player session.');
    }

    const { data: profile, error } = await this.supabase.client
      .from('profiles')
      .insert({
        username: normalizedUsername,
        user_id: authData.user.id,
      })
      .select('id, username')
      .single();

    if (error) {
      const { error: cleanupError } = await this.supabase.client.auth.signOut({ scope: 'local' });
      if (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          'Could not save the profile or clear the new session.',
        );
      }
      if (error.code === '23505') {
        throw new UsernameTakenError();
      }
      throw error;
    }

    this.user.set(profile);
  }
}
