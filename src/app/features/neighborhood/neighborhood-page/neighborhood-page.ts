import { Component, computed, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import {
  FlowerStatus,
  NeighborhoodGameService,
  NeighborhoodLot,
  NeighborhoodView,
} from '../neighborhood-game.service';

@Component({
  selector: 'app-neighborhood-page',
  imports: [RouterLink],
  styleUrl: './neighborhood-page.scss',
  templateUrl: './neighborhood-page.html',
  host: {
    '(document:keydown.escape)': 'closeDetails()',
  },
})
export class NeighborhoodPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly game = inject(NeighborhoodGameService);
  private readonly drawer = viewChild<ElementRef<HTMLElement>>('drawer');
  private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');

  protected readonly username = computed(() => this.auth.user()?.username ?? 'Neighbor');
  protected readonly neighborhood = signal<NeighborhoodView | null>(null);
  protected readonly selectedLot = signal<NeighborhoodLot | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');

  private opener: HTMLElement | null = null;

  async ngOnInit(): Promise<void> {
    try {
      this.neighborhood.set(await this.game.loadNeighborhood());
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'The neighborhood could not be loaded.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  protected openDetails(lot: NeighborhoodLot, event: Event): void {
    this.opener = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    this.selectedLot.set(lot);
    setTimeout(() => this.closeButton()?.nativeElement.focus());
  }

  protected closeDetails(): void {
    if (!this.selectedLot()) {
      return;
    }
    this.selectedLot.set(null);
    this.opener?.focus();
    this.opener = null;
  }

  protected trapTab(event: Event): void {
    if (!(event instanceof KeyboardEvent)) {
      return;
    }

    const drawer = this.drawer()?.nativeElement;
    if (!drawer) {
      return;
    }

    const focusable = Array.from(
      drawer.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input, select, textarea',
      ),
    );
    const first = focusable[0];
    const last = focusable.at(-1);

    if (!first || !last) {
      event.preventDefault();
      drawer.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  protected flowerEmoji(imageKey: string): string {
    switch (imageKey) {
      case 'daisy':
        return '🌼';
      case 'tulip':
        return '🌷';
      case 'sunflower':
        return '🌻';
      default:
        return '🌹';
    }
  }

  protected growthLabel(status: FlowerStatus, stage: number): string {
    if (status === 'harvested') {
      return 'Ready to sell';
    }
    if (status === 'sold') {
      return 'Sold';
    }
    return stage >= 2 ? 'Mature' : stage === 1 ? 'Growing' : 'Seedling';
  }
}
