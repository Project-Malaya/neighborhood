import { Injectable, inject, signal } from '@angular/core';
import type { User } from '@supabase/supabase-js';
import { SupabaseService } from '../../services/supabase';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService);
  readonly user = signal<User | null>(null);

  async hasSession(): Promise<boolean> {
    const { data, error } = await this.supabase.client.auth.getSession();
    if (error) {
      throw error;
    }

    this.user.set(data.session?.user ?? null);
    return this.user() !== null;
  }

  async signIn(email: string, password: string): Promise<void> {
    const { data, error } = await this.supabase.client.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      throw error;
    }

    this.user.set(data.user);
  }

  async signOut(): Promise<void> {
    const { error } = await this.supabase.client.auth.signOut();
    if (error) {
      throw error;
    }

    this.user.set(null);
  }
}
