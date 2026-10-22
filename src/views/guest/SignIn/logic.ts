import { zodResolver } from '@hookform/resolvers/zod';
import { useState, type FormEvent } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { getAuthErrorMessageKey } from 'auth/messages';
import { useAuth } from 'auth/useAuth';
import type { I18nKey } from 'i18n';
import { runDetached } from 'utils/async';

/** Messages are error codes (see forms/messages.ts), translated at render. */
export const signInSchema = z.object({
  email: z.string().trim().min(1, 'required').pipe(z.email('email')),
  password: z.string().min(1, 'required'),
});
export type SignInValues = z.infer<typeof signInSchema>;

export const useSignInForm = () => {
  const { signIn, sessionEndReason } = useAuth();
  const [formErrorKey, setFormErrorKey] = useState<I18nKey | null>(null);
  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const submit = form.handleSubmit(async (values) => {
    setFormErrorKey(null);
    try {
      // On success AppRouter swaps to the next route group; nothing else to do.
      await signIn(values);
    } catch (error) {
      setFormErrorKey(getAuthErrorMessageKey(error));
    }
  });

  return {
    form,
    formErrorKey,
    // Why the user is here again (their session expired on the server).
    noticeKey:
      sessionEndReason === 'expired' ? ('auth.session.expired' as const) : null,
    isSubmitting: form.formState.isSubmitting,
    onSubmit: (event: FormEvent<HTMLFormElement>) => runDetached(submit(event)),
  };
};
