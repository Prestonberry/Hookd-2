import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/pricing',
  '/affiliates',
  '/terms',
  '/privacy',
  '/accessibility',
  '/contact',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhook(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  // In Clerk v5, `auth` is a function that must be CALLED to get the auth
  // object. Calling `auth.protect()` directly (treating auth as an object)
  // throws "auth.protect is not a function" on EVERY request, which crashes
  // middleware before any route runs. Call auth() first, then protect.
  if (!isPublicRoute(req)) {
    const authObject = await auth();
    await authObject.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
