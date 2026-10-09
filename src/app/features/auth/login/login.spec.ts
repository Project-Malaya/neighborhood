import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { signal } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { routes } from '../../../app.routes';
import { Login } from './login';

describe('Login', () => {
  it('renders the username form and creates a player when submitted', async () => {
    const user = signal<{ id: number; username: string } | null>(null);
    const createPlayer = vi.fn(async (username: string) => {
      user.set({ id: 1, username: username.toLowerCase() });
    });
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        {
          provide: AuthService,
          useValue: {
            user,
            hasSession: vi.fn(async () => user() !== null),
            createPlayer,
          },
        },
      ],
    });

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/login', Login);
    const element = harness.routeNativeElement as HTMLElement;
    const input = element.querySelector('#username') as HTMLInputElement;
    input.value = 'Kimi';
    input.dispatchEvent(new Event('input'));
    element.querySelector('form')?.dispatchEvent(new Event('submit'));
    await harness.fixture.whenStable();

    expect(element.querySelector('label[for="username"]')?.textContent).toContain('username');
    expect(createPlayer).toHaveBeenCalledWith('Kimi');
    expect(TestBed.inject(Router).url).toBe('/home');
  });
});
