// @fixture-path src/views/__arch__/rememberToken.ts
// @expect no-restricted-globals: Browser storage is limited to allow-listed modules
// @expect no-restricted-properties: Browser storage is limited to allow-listed modules
// Tokens never go to app-readable storage, and views never touch storage.
export const remember = (token: string) => {
  localStorage.setItem('token', token);
  document.cookie = `token=${token}`;
};
