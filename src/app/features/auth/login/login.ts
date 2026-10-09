import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, UsernameTakenError } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  styleUrl: './login.scss',
  templateUrl: './login.html',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly form = this.formBuilder.group({
    username: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9_]{3,20}$/)]],
  });

  protected async submit(): Promise<void> {
    this.errorMessage.set('');
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    this.loading.set(true);
    try {
      await this.auth.createPlayer(this.form.controls.username.value);
      await this.router.navigateByUrl('/home');
    } catch (error) {
      this.errorMessage.set(
        error instanceof UsernameTakenError
          ? 'That username is already taken. Try another one.'
          : 'We couldn’t create your player. Check that anonymous sign-ins are enabled and the profile migration has been applied.',
      );
    } finally {
      this.loading.set(false);
    }
  }
}
