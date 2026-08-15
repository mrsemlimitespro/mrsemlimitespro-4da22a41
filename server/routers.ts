import { COOKIE_NAME } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { evolutionRouter } from "./routers/evolution";
import { workspacesRouter } from "./routers/workspaces";
import { contactsRouter } from "./routers/contacts";
import { campaignsRouter } from "./routers/campaigns";
import { webhooksRouter } from "./routers/webhooks";


export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  evolution: evolutionRouter,
  workspaces: workspacesRouter,
  contacts: contactsRouter,
  campaigns: campaignsRouter,
  webhooks: webhooksRouter,
});


export type AppRouter = typeof appRouter;
