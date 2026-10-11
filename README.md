# Neighborhood

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.2.0.

## Simple player login

The login screen asks for a username and creates a Supabase anonymous session. Supabase keeps that
session in this browser, so returning to the same browser restores the player's profile without
asking for a password. Passwords are not collected or stored.

Before using login:

1. Enable **Anonymous Sign-Ins** in the Supabase project's Auth provider settings.
2. Review `supabase/migrations/20261009120109_add_anonymous_profile_ownership.sql` against your
   existing database. It assumes the `public.profiles` table has the columns from the SQL you
   supplied (`id`, `username`, `display_name`, and `created_at`). The migration adds a Supabase
   Auth user ID, enforces the username format, removes public `anon` access, and limits profile
   reads/inserts to the owning anonymous session.
3. Review the ordered migrations in `supabase/migrations/`, then link the Supabase CLI to the
   project and apply them with `supabase db push`. No remote migration has been applied by this
   project setup.

This is a playground identity, not a recoverable account. Signing out, clearing browser storage,
or switching devices loses access to that player; usernames do not prove ownership. Do not use
this for sensitive data or treat a username as a password. The `profiles` table has no password
column. Supabase Auth owns the browser session and PostgreSQL RLS enforces profile ownership.

## Neighborhood game

The game migration creates each player's home, eight-lot neighborhood, four starter flowers, and
100-coin wallet idempotently on the first visit. Watering is limited by the database to once per
flower per calendar day in `Asia/Manila`; harvesting, selling, purchases, inventory changes, and
neighbor invitations are handled by transactional database functions. The browser can read
catalog and neighborhood data, but cannot directly change flowers, wallet balances, inventory, or
lot ownership.

After applying the migrations, run the database rule tests with `supabase test db`. The Angular
tests can be run with `npm test`.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Linting and formatting

Run ESLint and Prettier with:

```bash
npm run lint
npm run format:check
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
