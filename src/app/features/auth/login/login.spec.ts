import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { signal } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { routes } from '../../../app.routes';
import { Login } from './login';

describe('Login', () => {
  it('renders email and password fields', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        {
          provide: AuthService,
          useValue: {
            user: signal(null),
            hasSession: vi.fn().mockResolvedValue(false),
            signIn: vi.fn(),
          },
        },
      ],
    });

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/login', Login);
    const element = harness.routeNativeElement as HTMLElement;

    expect(element.querySelector('#email')).toBeTruthy();
    expect(element.querySelector('#password')).toBeTruthy();
    expect(element.querySelector('button[type="submit"]')?.textContent).toContain('Come on in');
  });
});
