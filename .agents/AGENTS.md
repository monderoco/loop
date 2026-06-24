# Loop Project Guidelines

## Build Verification
- Always run `npm run build` to verify TypeScript and Vite build passes successfully before pushing changes to GitHub. This prevents the GitHub Actions deployment pipeline from failing due to strict TS checks (like unused variables).
