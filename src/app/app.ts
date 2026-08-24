import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Footer } from './layout/footer';
import { Header } from './layout/header';
import { ProjectService } from './core/services/project.service';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, Header, Footer],
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly projects = inject(ProjectService);

  constructor() {
    // Kick the load off once, at boot; every route reuses the same result.
    void this.projects.load();
  }
}
