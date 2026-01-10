import { Component } from '@angular/core';
import { DeadlineCountdownComponent } from './components/deadline-countdown/deadline-countdown.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DeadlineCountdownComponent],
  template: `
    <div class="app-container">
      <h1>Deadline Countdown Demo</h1>
      <app-deadline-countdown></app-deadline-countdown>
    </div>
  `,
  styles: [`
    .app-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      padding: 20px;
    }

    h1 {
      color: white;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      margin-bottom: 30px;
      font-size: 2.5rem;
      text-align: center;
    }
  `]
})
export class AppComponent {
  title = 'deadline-countdown-app';
}
