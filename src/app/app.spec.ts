import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';
import { APP_CONFIG, appConfigValue } from './core/config/app-config';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...appConfigValue, githubUsername: '' } },
      ],
    }).compileComponents();
  });

  it('creates the app shell', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the header, main landmark and footer', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('header')).toBeTruthy();
    expect(el.querySelector('main#main')).toBeTruthy();
    expect(el.querySelector('footer')).toBeTruthy();
  });

  it('offers a skip link as the first focusable element', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const skip = (fixture.nativeElement as HTMLElement).querySelector('a.skip-link');
    expect(skip?.getAttribute('href')).toBe('#main');
  });
});
