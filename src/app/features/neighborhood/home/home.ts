import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import {
  GameFlower,
  GameState,
  NeighborVisit,
  NeighborhoodLot,
  NeighborhoodGameService,
} from '../neighborhood-game.service';

@Component({
  selector: 'app-home',
  imports: [ReactiveFormsModule, RouterLink, TitleCasePipe],
  styleUrl: './home.scss',
  templateUrl: './home.html',
})
export class Home implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly game = inject(NeighborhoodGameService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  protected readonly username = computed(() => this.auth.user()?.username ?? 'Neighbor');
  protected readonly state = signal<GameState | null>(null);
  protected readonly hasEmptyLots = computed(
    () => this.state()?.lots.some((lot) => lot.ownerId === null) ?? false,
  );
  protected readonly canInvite = computed(
    () =>
      this.state()?.invitations.every(
        (invitation) => invitation.direction !== 'outgoing' || invitation.status !== 'pending',
      ) ?? true,
  );
  protected readonly selectedNeighbor = signal<NeighborVisit | null>(null);
  protected readonly loading = signal(true);
  protected readonly activeAction = signal<string | null>(null);
  protected readonly errorMessage = signal('');
  protected readonly statusMessage = signal('');
  protected readonly invitationForm = this.formBuilder.group({
    username: ['', [Validators.required, Validators.maxLength(20)]],
    lotId: ['', Validators.required],
  });

  async ngOnInit(): Promise<void> {
    try {
      const state = await this.game.initializeAndLoad();
      this.state.set(state);

      const section = window.location.pathname.replace(/^\//, '');
      if (section && section !== 'home') {
        const target = section === 'garden' ? 'garden' : section;
        setTimeout(() => document.getElementById(target)?.scrollIntoView?.({ block: 'start' }), 0);
      }
    } catch (error) {
      this.errorMessage.set(this.messageFor(error, 'Your neighborhood could not be loaded.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected growthLabel(flower: Pick<GameFlower, 'status' | 'growthStage'>): string {
    if (flower.status === 'harvested') {
      return 'Ready to sell';
    }
    if (flower.status === 'sold') {
      return 'Sold';
    }
    return flower.growthStage === 2 ? 'Mature' : flower.growthStage === 1 ? 'Growing' : 'Seedling';
  }

  protected isOwnLot(lot: NeighborhoodLot, game: GameState): boolean {
    return lot.ownerUsername === game.username;
  }

  protected async waterFlower(flowerId: string): Promise<void> {
    await this.perform(`water-${flowerId}`, 'Flower watered. A little more growth!', () =>
      this.game.waterFlower(flowerId),
    );
  }

  protected async harvestFlower(flowerId: string): Promise<void> {
    await this.perform(`harvest-${flowerId}`, 'Your flower is ready to sell.', () =>
      this.game.harvestFlower(flowerId),
    );
  }

  protected async sellFlower(flowerId: string): Promise<void> {
    await this.perform(`sell-${flowerId}`, 'Flower sold. Coins added to your wallet.', () =>
      this.game.sellFlower(flowerId),
    );
  }

  protected async buyItem(itemId: string): Promise<void> {
    await this.perform(`buy-${itemId}`, 'A new item was added to your inventory.', () =>
      this.game.buyItem(itemId),
    );
  }

  protected async sendInvitation(): Promise<void> {
    this.invitationForm.markAllAsTouched();
    if (this.invitationForm.invalid) {
      return;
    }

    const { username, lotId } = this.invitationForm.getRawValue();
    await this.perform('invite', `Invitation sent to @${username}.`, () =>
      this.game.sendInvitation(username, lotId),
    );
    if (!this.errorMessage()) {
      this.invitationForm.controls.username.reset();
    }
  }

  protected async respondToInvitation(
    invitationId: string,
    response: 'accept' | 'decline',
  ): Promise<void> {
    await this.perform(
      `${response}-${invitationId}`,
      response === 'accept' ? 'Welcome to your new neighborhood!' : 'Invitation declined.',
      () =>
        response === 'accept'
          ? this.game.acceptInvitation(invitationId)
          : this.game.declineInvitation(invitationId),
    );
  }

  protected async visitNeighbor(ownerId: number): Promise<void> {
    this.errorMessage.set('');
    this.statusMessage.set('');
    this.activeAction.set(`visit-${ownerId}`);
    try {
      this.selectedNeighbor.set(await this.game.visitNeighbor(ownerId));
    } catch (error) {
      this.errorMessage.set(this.messageFor(error, 'That garden could not be opened.'));
    } finally {
      this.activeAction.set(null);
    }
  }

  private async perform(
    action: string,
    successMessage: string,
    operation: () => Promise<void>,
  ): Promise<void> {
    this.errorMessage.set('');
    this.statusMessage.set('');
    this.activeAction.set(action);
    try {
      await operation();
      this.state.set(await this.game.loadState());
      this.statusMessage.set(successMessage);
    } catch (error) {
      this.errorMessage.set(this.messageFor(error, 'That action could not be completed.'));
    } finally {
      this.activeAction.set(null);
    }
  }

  private messageFor(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
  }
}
