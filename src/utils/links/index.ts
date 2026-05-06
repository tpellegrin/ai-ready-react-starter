export const ensureHttpUrl = (url: string) =>
  !/^https?:\/\//i.test(url) ? `https://${url}` : url;
