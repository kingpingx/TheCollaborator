import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { APP_CONFIG, appConfigValue } from '../../core/config/app-config';
import { GithubIssue } from '../../core/models/github.model';
import { Project } from '../../core/models/project.model';
import { FeatureIdeas } from './feature-ideas';

function project(overrides: Partial<Project> = {}): Project {
  const now = new Date().toISOString();
  return {
    name: 'Bouncing-Ball',
    displayName: 'Bouncing Ball',
    fullName: 'kingpingx/Bouncing-Ball',
    tagline: 'A bouncing ball.',
    longDescription: null,
    status: 'live',
    statusIsCurated: true,
    repoUrl: 'https://github.com/kingpingx/Bouncing-Ball',
    demoUrl: null,
    embeddable: false,
    selfDemo: false,
    media: [],
    techStack: [],
    primaryLanguage: 'Python',
    languages: {},
    topics: [],
    stars: 0,
    forks: 0,
    openIssues: 0,
    license: null,
    createdAt: now,
    updatedAt: now,
    pushedAt: now,
    archived: false,
    isFork: false,
    featured: false,
    featureRank: Number.MAX_SAFE_INTEGER,
    lookingForHelp: false,
    helpNotes: null,
    roadmap: [],
    goodFirstIssues: [],
    featureIdeas: [],
    hasContributing: false,
    defaultBranch: 'main',
    readmeHtml: null,
    ...overrides,
  };
}

function idea(overrides: Partial<GithubIssue> = {}): GithubIssue {
  return {
    id: 1,
    number: 7,
    title: 'Add a gravity toggle',
    html_url: 'https://github.com/kingpingx/Bouncing-Ball/issues/7',
    state: 'open',
    comments: 0,
    created_at: new Date().toISOString(),
    labels: [{ name: 'enhancement', color: 'a2eeef' }],
    user: {
      login: 'octocat',
      avatar_url: '',
      html_url: 'https://github.com/octocat',
    },
    ...overrides,
  };
}

describe('FeatureIdeas', () => {
  let fixture: ComponentFixture<FeatureIdeas>;
  let ref: ComponentRef<FeatureIdeas>;
  let opened: string[];

  beforeEach(async () => {
    opened = [];
    vi.spyOn(window, 'open').mockImplementation(((url: string) => {
      opened.push(url);
      return null;
    }) as typeof window.open);

    await TestBed.configureTestingModule({
      imports: [FeatureIdeas],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: appConfigValue },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FeatureIdeas);
    ref = fixture.componentRef;
    ref.setInput('project', project());
    fixture.detectChanges();
  });

  const el = () => fixture.nativeElement as HTMLElement;
  const openForm = () => {
    (el().querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
  };
  const setField = (id: string, value: string) => {
    const input = el().querySelector(`[id^="${id}"]`) as HTMLInputElement | HTMLTextAreaElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const submit = () => {
    (el().querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { cancelable: true }),
    );
    fixture.detectChanges();
  };

  it('invites the first idea when there are none', () => {
    expect(el().textContent).toContain('No ideas yet');
  });

  it('lists existing ideas and credits the GitHub handle', () => {
    ref.setInput('project', project({ featureIdeas: [idea()] }));
    fixture.detectChanges();

    const text = el().textContent ?? '';
    expect(text).toContain('Add a gravity toggle');
    expect(text).toContain('suggested by octocat');
  });

  it('never renders an email address in the list', () => {
    ref.setInput('project', project({ featureIdeas: [idea()] }));
    fixture.detectChanges();
    expect(el().textContent).not.toContain('@example.com');
  });

  it('prefers live ideas over the snapshot copy', () => {
    ref.setInput('project', project({ featureIdeas: [idea({ title: 'Stale' })] }));
    ref.setInput('live', [idea({ id: 2, title: 'Fresh' })]);
    fixture.detectChanges();

    expect(el().textContent).toContain('Fresh');
    expect(el().textContent).not.toContain('Stale');
  });

  it('refuses to submit without a title', () => {
    openForm();
    setField('fi-email', 'someone@example.com');
    submit();

    expect(opened).toEqual([]);
    expect(el().textContent).toContain('Give the idea a short title');
  });

  it('refuses to submit without a valid email', () => {
    openForm();
    setField('fi-title', 'Add a gravity toggle');
    setField('fi-email', 'not-an-email');
    submit();

    expect(opened).toEqual([]);
    expect(el().textContent).toContain('Enter an email so the idea can be credited');
  });

  it('opens a pre-filled, labelled GitHub issue carrying the email', () => {
    openForm();
    setField('fi-title', 'Add a gravity toggle');
    setField('fi-detail', 'It would help when demoing orbits.');
    setField('fi-email', 'someone@example.com');
    submit();

    expect(opened.length).toBe(1);
    const url = new URL(opened[0]);

    expect(url.origin + url.pathname).toBe(
      'https://github.com/kingpingx/Bouncing-Ball/issues/new',
    );
    expect(url.searchParams.get('title')).toBe('Add a gravity toggle');
    expect(url.searchParams.get('labels')).toBe('enhancement');

    const body = url.searchParams.get('body') ?? '';
    expect(body).toContain('It would help when demoing orbits.');
    expect(body).toContain('someone@example.com');
  });

  it('still submits when the optional detail is blank', () => {
    openForm();
    setField('fi-title', 'Add a gravity toggle');
    setField('fi-email', 'someone@example.com');
    submit();

    expect(opened.length).toBe(1);
    expect(new URL(opened[0]).searchParams.get('body')).toContain('no extra detail given');
  });

  it('closes the form after a successful submit', () => {
    openForm();
    setField('fi-title', 'Add a gravity toggle');
    setField('fi-email', 'someone@example.com');
    submit();

    expect(el().querySelector('form')).toBeNull();
  });
});
