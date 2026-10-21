import { zodResolver } from '@hookform/resolvers/zod';
import { useState, type FormEvent } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { getErrorMessageKey } from 'api/http';
import { AuthError } from 'auth/types';
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
  const { signIn } = useAuth();
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
      setFormErrorKey(
        error instanceof AuthError && error.code === 'invalid_credentials'
          ? 'auth.signIn.error'
          : getErrorMessageKey(error),
      );
    }
  });

  return {
    form,
    formErrorKey,
    isSubmitting: form.formState.isSubmitting,
    onSubmit: (event: FormEvent<HTMLFormElement>) => runDetached(submit(event)),
  };
};
