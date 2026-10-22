/**
 * Public API of the Invoices feature. Code outside this folder imports
 * only from here (enforced by eslint/boundaries.js).
 */
export { InvoicesPanel } from './components/InvoicesPanel';
export type { Invoice } from './model';
export { InvoiceTotal } from './components/InvoiceTotal';
export { InvoiceForm } from './components/InvoiceForm';
// starter:gen exports (`pnpm gen component --feature` adds exports above)
