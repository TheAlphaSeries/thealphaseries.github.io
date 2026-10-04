// The site is plain files. This only answers requests for addresses that match no file.
export default {
  fetch(request, env) {
    return env.ASSETS.fetch(request);
  }
};
