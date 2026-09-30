import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  styleUrl: './home.scss',
  templateUrl: './home.html',
})
export class Home {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly email = this.auth.user()?.email ?? 'Neighbor';
  protected readonly loggingOut = signal(false);
  protected readonly errorMessage = signal('');

  protected async logout(): Promise<void> {
    this.errorMessage.set('');
    this.loggingOut.set(true);
    try {
      await this.auth.signOut();
      await this.router.navigateByUrl('/login');
    } catch {
      this.errorMessage.set('We couldn’t log you out just yet. Please try again.');
    } finally {
      this.loggingOut.set(false);
    }
  }
}
