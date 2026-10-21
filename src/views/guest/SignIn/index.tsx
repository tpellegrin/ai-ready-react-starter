import { Button } from 'components/Button';
import { Field } from 'components/Form/Field';
import { Input } from 'components/Form/Input';
import { InlineAlert } from 'components/InlineAlert';
import { Text } from 'components/Text';
// starter:demo-start
import { appConfig } from 'config';
// starter:demo-end
import { useFieldErrorMessage } from 'forms';
import { useI18n } from 'i18n/provider';

import { useSignInForm } from './logic';
import { _SignInForm, _SignInRoot } from './styles';

export function SignIn() {
  const { t } = useI18n();
  const fieldError = useFieldErrorMessage();
  const { form, formErrorKey, isSubmitting, onSubmit } = useSignInForm();
  const { errors } = form.formState;

  return (
    <_SignInRoot>
      <Text as="h1" variant="headingLg">
        {t('auth.signIn.title')}
      </Text>
      {/* starter:demo-start */}
      {appConfig.demoMode ? (
        <Text variant="bodyMd">{t('auth.signIn.demoMessage')}</Text>
      ) : null}
      {/* starter:demo-end */}

      <_SignInForm noValidate onSubmit={onSubmit}>
        <Field
          label={t('common.labels.email')}
          error={fieldError(errors.email)}
          required
        >
          {(control) => (
            <Input
              {...control}
              {...form.register('email')}
              type="email"
              autoComplete="email"
            />
          )}
        </Field>
        <Field
          label={t('common.labels.password')}
          error={fieldError(errors.password)}
          required
        >
          {(control) => (
            <Input
              {...control}
              {...form.register('password')}
              type="password"
              autoComplete="current-password"
            />
          )}
        </Field>

        {formErrorKey ? (
          <InlineAlert tone="error">{t(formErrorKey)}</InlineAlert>
        ) : null}

        <Button
          type="submit"
          label={t('auth.signIn.submit')}
          isPending={isSubmitting}
          pendingLabel={t('auth.signIn.submitting')}
        />
      </_SignInForm>
    </_SignInRoot>
  );
}
