// @fixture-path src/auth/adapters/__arch__/sdkStorage.ts
// @expect none
// Auth adapters own whatever storage their provider needs.
export const read = () => sessionStorage.getItem('provider.state');
