import { TestBed } from '@angular/core/testing';
import { NeighborhoodGameService } from './neighborhood-game.service';
import { SupabaseService } from '../../services/supabase';

describe('NeighborhoodGameService', () => {
  it('sends only the flower identifier when requesting a watering action', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 1, error: null });
    TestBed.configureTestingModule({
      providers: [
        NeighborhoodGameService,
        { provide: SupabaseService, useValue: { client: { rpc } } },
      ],
    });

    await TestBed.inject(NeighborhoodGameService).waterFlower('flower-id');

    expect(rpc).toHaveBeenCalledWith('water_flower', { p_flower_id: 'flower-id' });
  });

  it('sends only the catalog item identifier when requesting a purchase', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 70, error: null });
    TestBed.configureTestingModule({
      providers: [
        NeighborhoodGameService,
        { provide: SupabaseService, useValue: { client: { rpc } } },
      ],
    });

    await TestBed.inject(NeighborhoodGameService).buyItem('item-id');

    expect(rpc).toHaveBeenCalledWith('buy_item', { p_item_id: 'item-id' });
  });

  it('surfaces server rejections instead of reporting successful actions', async () => {
    const serverError = new Error('This flower cannot be watered today.');
    const rpc = vi.fn().mockResolvedValue({ data: null, error: serverError });
    TestBed.configureTestingModule({
      providers: [
        NeighborhoodGameService,
        { provide: SupabaseService, useValue: { client: { rpc } } },
      ],
    });

    await expect(TestBed.inject(NeighborhoodGameService).waterFlower('flower-id')).rejects.toBe(
      serverError,
    );
  });
});
