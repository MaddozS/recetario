import { auth } from './lib/auth';
import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
  try {
    const session = await auth.api.getSession({
      headers: context.request.headers,
    });
    if (session?.session && session?.user) {
      context.locals.user = session.user;
      context.locals.session = session.session;
    } else {
      context.locals.user = null;
      context.locals.session = null;
    }
  } catch (error) {
    context.locals.user = null;
    context.locals.session = null;
  }
  
  return next();
});