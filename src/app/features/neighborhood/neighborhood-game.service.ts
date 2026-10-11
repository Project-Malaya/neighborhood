import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../services/supabase';

export type FlowerStatus = 'growing' | 'harvested' | 'sold';

export interface GameFlower {
  id: string;
  name: string;
  imageKey: string;
  growthStage: number;
  status: FlowerStatus;
  wateredToday: boolean;
  sellPrice: number;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  imageKey: string;
  price: number;
  category: string;
}

export interface InventoryItem {
  itemId: string;
  name: string;
  imageKey: string;
  quantity: number;
}

export interface NeighborhoodLot {
  id: string;
  position: number;
  ownerId: number | null;
  ownerUsername: string | null;
}

export interface NeighborInvitation {
  id: string;
  direction: 'incoming' | 'outgoing';
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  username: string;
  lotPosition: number;
  expiresAt: string;
}

export interface CoinTransaction {
  amount: number;
  type: string;
  createdAt: string;
}

export interface GameState {
  username: string;
  coins: number;
  neighborhoodName: string;
  lotPosition: number;
  flowers: GameFlower[];
  items: ShopItem[];
  inventory: InventoryItem[];
  lots: NeighborhoodLot[];
  invitations: NeighborInvitation[];
  recentTransactions: CoinTransaction[];
}

export interface NeighborVisit {
  username: string;
  flowers: Omit<GameFlower, 'wateredToday' | 'sellPrice'>[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Game data is missing ${field}.`);
  }
  return value;
}

function requiredNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Game data is missing ${field}.`);
  }
  return value;
}

function requiredBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`Game data is missing ${field}.`);
  }
  return value;
}

function flowerStatus(value: unknown): FlowerStatus {
  const status = requiredString(value, 'flower status');
  if (status !== 'growing' && status !== 'harvested' && status !== 'sold') {
    throw new Error('Game data contains an unknown flower status.');
  }
  return status;
}

function invitationStatus(value: unknown): NeighborInvitation['status'] {
  const status = requiredString(value, 'invitation status');
  if (
    status !== 'pending' &&
    status !== 'accepted' &&
    status !== 'declined' &&
    status !== 'expired'
  ) {
    throw new Error('Game data contains an invalid invitation status.');
  }
  return status;
}

function invitationDirection(value: unknown): NeighborInvitation['direction'] {
  const direction = requiredString(value, 'invitation direction');
  if (direction !== 'incoming' && direction !== 'outgoing') {
    throw new Error('Game data contains an invalid invitation direction.');
  }
  return direction;
}

function recordArray(value: unknown, field: string): Record<string, unknown>[] {
  if (!Array.isArray(value) || !value.every(isRecord)) {
    throw new Error(`Game data is missing ${field}.`);
  }
  return value;
}

function parseFlower(value: Record<string, unknown>): GameFlower {
  return {
    id: requiredString(value['id'], 'flower id'),
    name: requiredString(value['name'], 'flower name'),
    imageKey: requiredString(value['imageKey'], 'flower image'),
    growthStage: requiredNumber(value['growthStage'], 'flower growth stage'),
    status: flowerStatus(value['status']),
    wateredToday: requiredBoolean(value['wateredToday'], 'watering status'),
    sellPrice: requiredNumber(value['sellPrice'], 'flower price'),
  };
}

function parseGameState(value: unknown): GameState {
  if (!isRecord(value)) {
    throw new Error('The game returned an invalid player state.');
  }

  const lots = recordArray(value['lots'], 'neighborhood lots').map((lot) => {
    const ownerId = lot['ownerId'];
    const ownerUsername = lot['ownerUsername'];
    if (ownerId !== null && typeof ownerId !== 'number') {
      throw new Error('Game data contains an invalid lot owner.');
    }
    if (ownerUsername !== null && typeof ownerUsername !== 'string') {
      throw new Error('Game data contains an invalid lot username.');
    }
    return {
      id: requiredString(lot['id'], 'lot id'),
      position: requiredNumber(lot['position'], 'lot position'),
      ownerId,
      ownerUsername,
    };
  });

  const invitations = recordArray(value['invitations'], 'invitations').map((invitation) => {
    return {
      id: requiredString(invitation['id'], 'invitation id'),
      direction: invitationDirection(invitation['direction']),
      status: invitationStatus(invitation['status']),
      username: requiredString(invitation['username'], 'invitation username'),
      lotPosition: requiredNumber(invitation['lotPosition'], 'invitation lot'),
      expiresAt: requiredString(invitation['expiresAt'], 'invitation expiry'),
    };
  });

  return {
    username: requiredString(value['username'], 'player username'),
    coins: requiredNumber(value['coins'], 'coin balance'),
    neighborhoodName: requiredString(value['neighborhoodName'], 'neighborhood name'),
    lotPosition: requiredNumber(value['lotPosition'], 'home lot'),
    flowers: recordArray(value['flowers'], 'flowers').map(parseFlower),
    items: recordArray(value['items'], 'shop items').map((item) => ({
      id: requiredString(item['id'], 'item id'),
      name: requiredString(item['name'], 'item name'),
      description: requiredString(item['description'], 'item description'),
      imageKey: requiredString(item['imageKey'], 'item image'),
      price: requiredNumber(item['price'], 'item price'),
      category: requiredString(item['category'], 'item category'),
    })),
    inventory: recordArray(value['inventory'], 'inventory').map((item) => ({
      itemId: requiredString(item['itemId'], 'inventory item id'),
      name: requiredString(item['name'], 'inventory item name'),
      imageKey: requiredString(item['imageKey'], 'inventory item image'),
      quantity: requiredNumber(item['quantity'], 'inventory quantity'),
    })),
    lots,
    invitations,
    recentTransactions: recordArray(value['recentTransactions'], 'coin history').map(
      (transaction) => ({
        amount: requiredNumber(transaction['amount'], 'transaction amount'),
        type: requiredString(transaction['type'], 'transaction type'),
        createdAt: requiredString(transaction['createdAt'], 'transaction date'),
      }),
    ),
  };
}

function parseNeighborVisit(value: unknown): NeighborVisit {
  if (!isRecord(value)) {
    throw new Error('The neighbor garden could not be loaded.');
  }

  const flowers = recordArray(value['flowers'], 'neighbor flowers').map((flower) => {
    return {
      id: requiredString(flower['id'], 'flower id'),
      name: requiredString(flower['name'], 'flower name'),
      imageKey: requiredString(flower['imageKey'], 'flower image'),
      growthStage: requiredNumber(flower['growthStage'], 'flower growth stage'),
      status: flowerStatus(flower['status']),
    };
  });

  return {
    username: requiredString(value['username'], 'neighbor username'),
    flowers,
  };
}

@Injectable({ providedIn: 'root' })
export class NeighborhoodGameService {
  private readonly supabase = inject(SupabaseService);

  async initializeAndLoad(): Promise<GameState> {
    await this.callRpc('initialize_player');
    return this.loadState();
  }

  async loadState(): Promise<GameState> {
    return parseGameState(await this.callRpc('get_game_state'));
  }

  async waterFlower(flowerId: string): Promise<void> {
    await this.callRpc('water_flower', { p_flower_id: flowerId });
  }

  async harvestFlower(flowerId: string): Promise<void> {
    await this.callRpc('harvest_flower', { p_flower_id: flowerId });
  }

  async sellFlower(flowerId: string): Promise<void> {
    await this.callRpc('sell_flower', { p_flower_id: flowerId });
  }

  async buyItem(itemId: string): Promise<void> {
    await this.callRpc('buy_item', { p_item_id: itemId });
  }

  async sendInvitation(username: string, lotId: string): Promise<void> {
    await this.callRpc('send_neighbor_invitation', {
      p_username: username,
      p_lot_id: lotId,
    });
  }

  async acceptInvitation(invitationId: string): Promise<void> {
    await this.callRpc('accept_neighbor_invitation', {
      p_invitation_id: invitationId,
    });
  }

  async declineInvitation(invitationId: string): Promise<void> {
    await this.callRpc('decline_neighbor_invitation', {
      p_invitation_id: invitationId,
    });
  }

  async visitNeighbor(ownerId: number): Promise<NeighborVisit> {
    return parseNeighborVisit(await this.callRpc('visit_neighbor', { p_owner_id: ownerId }));
  }

  private async callRpc(
    functionName: string,
    args?: Record<string, string | number>,
  ): Promise<unknown> {
    const { data, error } = await this.supabase.client.rpc(functionName, args);
    if (error) {
      throw error;
    }
    return data;
  }
}
