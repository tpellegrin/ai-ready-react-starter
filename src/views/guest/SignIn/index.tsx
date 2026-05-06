// DEMO: Replace or remove this view when adopting the boilerplate. See docs/adoption.md.
import React, { useState } from 'react';
import styled from 'styled-components';
import { Flex } from 'components/Flex';
import { Button } from 'components/Button';
import { Input } from 'components/Form/Input';
import { Text } from 'components/Text';
import { useAuth } from 'auth/useAuth';
import { useI18n } from 'i18n/provider';

const Form = styled.form`
  width: 100%;
  max-width: 20rem;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacers.md};
`;

export function SignIn() {
  const { signIn } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await signIn({ email, password });
    } catch {
      setError(t('auth.signIn.error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Flex
      direction="column"
      justifyContent="center"
      alignItems="center"
      height="100vh"
      gap="md"
    >
      <Text as="h1" variant="headingLg">
        {t('auth.signIn.title')}
      </Text>
      <Text variant="bodyMd">{t('auth.signIn.demoMessage')}</Text>

      <Form onSubmit={handleSubmit}>
        <Input
          type="email"
          placeholder={t('common.labels.email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
        />
        <Input
          type="password"
          placeholder={t('common.labels.password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isLoading}
        />

        {error && (
          <Text variant="bodyMd" color="emphasis">
            {error}
          </Text>
        )}

        <Button
          label={
            isLoading ? t('auth.signIn.submitting') : t('auth.signIn.submit')
          }
          type="submit"
          disabled={isLoading}
        />
      </Form>
    </Flex>
  );
}
