import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { routes } from '../../../app.routes';
import { Login } from '../../auth/login/login';
import { GameState, NeighborhoodGameService } from '../neighborhood-game.service';
import { Home } from './home';

const flowers: GameState['flowers'] = [
  {
    id: 'flower-1',
    name: 'Daisy',
    imageKey: 'daisy',
    growthStage: 0,
    status: 'growing',
    wateredToday: false,
    sellPrice: 10,
  },
  {
    id: 'flower-2',
    name: 'Tulip',
    imageKey: 'tulip',
    growthStage: 0,
    status: 'growing',
    wateredToday: false,
    sellPrice: 12,
  },
  {
    id: 'flower-3',
    name: 'Sunflower',
    imageKey: 'sunflower',
    growthStage: 0,
    status: 'growing',
    wateredToday: false,
    sellPrice: 15,
  },
  {
    id: 'flower-4',
    name: 'Rose',
    imageKey: 'rose',
    growthStage: 0,
    status: 'growing',
    wateredToday: false,
    sellPrice: 18,
  },
];

const gameState: GameState = {
  username: 'kimi',
  coins: 100,
  neighborhoodName: "kimi's Neighborhood",
  lotPosition: 1,
  flowers,
  items: [],
  inventory: [],
  lots: [
    { id: 'lot-1', position: 1, ownerId: 1, ownerUsername: 'kimi' },
    { id: 'lot-2', position: 2, ownerId: null, ownerUsername: null },
  ],
  invitations: [],
  recentTransactions: [],
};

function gameService() {
  return {
    initializeAndLoad: vi.fn().mockResolvedValue(gameState),
    loadState: vi.fn().mockResolvedValue(gameState),
    waterFlower: vi.fn().mockResolvedValue(undefined),
    harvestFlower: vi.fn().mockResolvedValue(undefined),
    sellFlower: vi.fn().mockResolvedValue(undefined),
    buyItem: vi.fn().mockResolvedValue(undefined),
    sendInvitation: vi.fn().mockResolvedValue(undefined),
    acceptInvitation: vi.fn().mockResolvedValue(undefined),
    declineInvitation: vi.fn().mockResolvedValue(undefined),
    visitNeighbor: vi.fn().mockResolvedValue({ username: 'sia', flowers: [] }),
  };
}

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
          },
        },
        { provide: NeighborhoodGameService, useValue: gameService() },
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
            user: signal({ username: 'kimi' }),
            hasSession: vi.fn().mockResolvedValue(true),
          },
        },
        { provide: NeighborhoodGameService, useValue: gameService() },
      ],
    });

    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/login');

    expect(page).toBeInstanceOf(Home);
  });

  it('shows the player dashboard and four starting flowers', async () => {
    const game = gameService();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        {
          provide: AuthService,
          useValue: {
            user: signal({ username: 'kimi' }),
            hasSession: vi.fn().mockResolvedValue(true),
          },
        },
        { provide: NeighborhoodGameService, useValue: game },
      ],
    });

    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/home', Home);
    const element = harness.routeNativeElement as HTMLElement;
    await vi.waitFor(() => {
      harness.fixture.detectChanges();
      expect(element.textContent).toContain('My House');
    });

    expect(page).toBeInstanceOf(Home);
    expect(element.textContent).toContain('Hello, kimi!');
    expect(element.textContent).toContain('@kimi');
    expect(element.textContent).toContain('My House');
    expect(element.textContent).toContain('Daisy');
    expect(element.textContent).toContain('Tulip');
    expect(element.textContent).toContain('Sunflower');
    expect(element.textContent).toContain('Rose');
    expect(element.textContent).toContain('100 coins');
    expect(game.initializeAndLoad).toHaveBeenCalledOnce();
  });

  it('requests watering from the game service instead of advancing growth locally', async () => {
    const game = gameService();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        {
          provide: AuthService,
          useValue: {
            user: signal({ id: 1, username: 'kimi' }),
            hasSession: vi.fn().mockResolvedValue(true),
          },
        },
        { provide: NeighborhoodGameService, useValue: game },
      ],
    });

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/home', Home);
    await vi.waitFor(() => {
      harness.fixture.detectChanges();
      expect(harness.routeNativeElement?.textContent).toContain('Water');
    });
    const button = Array.from(
      (harness.routeNativeElement as HTMLElement).querySelectorAll('button'),
    ).find((candidate) => candidate.textContent?.includes('Water'));
    button?.click();
    await harness.fixture.whenStable();

    expect(game.waterFlower).toHaveBeenCalledWith('flower-1');
    expect(game.loadState).toHaveBeenCalledOnce();
  });
});
