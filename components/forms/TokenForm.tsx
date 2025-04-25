'use client'; // This component uses client-side hooks (useState, useRouter)

import React, { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import Input from '../ui/Input';
import Button from '../ui/Button';
import ErrorMessage from '../feedback/ErrorMessage';

const TokenForm: React.FC = () => {
  const t = useTranslations('TokenEntry'); // Assuming 'TokenEntry' namespace in your messages/*.json
  const errors = useTranslations('Errors');
  const router = useRouter();
  const [token, setToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null); // Clear previous errors

    if (!token.trim()) {
      setError(errors('tokenRequired'));
      return;
    }

    setIsLoading(true);

    try {
      // Call the token validation API
      const response = await fetch('/api/validate-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tokenCode: token.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle HTTP error
        setError(errors('submissionError'));
        return;
      }

      if (!data.valid) {
        // Handle invalid token
        if (data.message.includes("already been used")) {
          setError(errors('tokenUsed'));
        } else if (data.message.includes("not valid")) {
          setError(errors('tokenNotValid'));
        } else {
          setError(errors('invalidToken'));
        }
        return;
      }

      // Token is valid, navigate to the guess form page
      console.log('Valid token, navigating with token:', token);
      router.push(`/submit-guess?token=${encodeURIComponent(token.trim())}`);

    } catch (error) {
      console.error('Network error:', error);
      setError(errors('networkError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      <h2 className="text-xl font-semibold text-center mb-4 text-white">{t('title')}</h2>
      <p className="text-sm text-white/80 text-center mb-4">{t('instructions')}</p>

      <ErrorMessage message={error} />

      <Input
        id="tokenCode"
        label={t('tokenLabel')} // Make sure you have tokenLabel in your json
        value={token}
        onChange={(e) => setToken(e.target.value.toUpperCase())} // Example: auto uppercase
        placeholder={t('placeholder')}
        required
        disabled={isLoading}
      />

      <Button type="submit" isLoading={isLoading} disabled={isLoading} className="w-full">
        {isLoading ? t('validatingButton') : t('validateButton')}
      </Button>
    </form>
  );
};

export default TokenForm;