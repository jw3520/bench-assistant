import { serve } from 'wrangler:site';

export default {
  async fetch(request, env, ctx) {
    // This function will automatically serve static assets from the [site] bucket
    // and handle routing, including serving index.html for the root path.
    return serve(request, env, ctx);
  },
};
