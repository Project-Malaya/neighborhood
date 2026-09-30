import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { routes } from '../../../app.routes';
import { Login } from '../../auth/login/login';
import { Home } from './home';

describe('Home routing', () => {
  it('redirects guests from home to login', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        {
          provide: AuthService,
          useValue: {
            user: signal(null),
            hasSession: vi.fn().mockResolvedValue(false),
            signIn: vi.fn(),
            signOut: vi.fn(),
          },
        },
      ],
    });

    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/home');

    expect(page).toBeInstanceOf(Login);
  });

  it('redirects signed-in users from login to home', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        {
          provide: AuthService,
          useValue: {
            user: signal({ email: 'kimi@example.com' }),
            hasSession: vi.fn().mockResolvedValue(true),
            signOut: vi.fn(),
          },
        },
      ],
    });

    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/login');

    expect(page).toBeInstanceOf(Home);
  });

  it('shows the house and initial flower for signed-in users', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        {
          provide: AuthService,
          useValue: {
            user: signal({ email: 'kimi@example.com' }),
            hasSession: vi.fn().mockResolvedValue(true),
            signOut: vi.fn(),
          },
        },
      ],
    });

    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/home', Home);
    const element = harness.routeNativeElement as HTMLElement;

    expect(page).toBeInstanceOf(Home);
    expect(element.textContent).toContain('kimi@example.com');
    expect(element.textContent).toContain('My House');
    expect(element.textContent).toContain('My Flower');
  });
});
