import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  styleUrl: './home.scss',
  templateUrl: './home.html',
})
export class Home {
  private readonly auth = inject(AuthService);

  protected readonly username = computed(() => this.auth.user()?.username ?? 'Neighbor');
}
