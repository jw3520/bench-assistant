// This is a dummy worker file to satisfy Wrangler.
// The actual static site serving is handled by the [site] configuration in wrangler.toml.
export default {
  fetch() {
    return new Response("This worker should not be called directly.", { status: 404 });
  },
};
