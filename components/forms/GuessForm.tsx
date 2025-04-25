'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation'; // Use next/navigation
import { useTranslations } from 'next-intl';

import Input from '../ui/Input';
import Button from '../ui/Button';
import ErrorMessage from '../feedback/ErrorMessage';
import LoadingSpinner from '../ui/LoadingSpinner'; // Maybe show overlay spinner

const GuessForm: React.FC = () => {
  const t = useTranslations('GuessForm'); // Namespace in messages/*.json
  const router = useRouter();
  const searchParams = useSearchParams(); // Hook to get query params

  // State
  const [token, setToken] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string>('');
  const [nic, setNic] = useState<string>('');
  const [contactNumber, setContactNumber] = useState<string>('');
  const [guess, setGuess] = useState<string | number>(''); // Store as string initially for easier input handling
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

   // --- Get token from URL on component mount ---
   useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      setToken(urlToken);
    } else {
      // Handle missing token - maybe redirect back or show error
      setError(t('Errors.tokenMissing')); // Add a suitable error key
      console.error("Token missing from URL parameters.");
    }
  }, [searchParams, t]); // Re-run if searchParams changes

  // --- Handle Form Submission ---
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null); // Clear previous errors

    // --- Basic Client-Side Validation ---
    if (!token) {
        setError(t('Errors.tokenMissing'));
        return;
    }
     if (!fullName.trim()) {
         setError(t('Errors.nameRequired'));
         return;
     }
      if (!contactNumber.trim()) {
         setError(t('Errors.contactRequired'));
         return;
     }
      if (guess === '' || guess === null) {
           setError(t('Errors.guessRequiredPapaya'));
           return;
     }

     // --- Type specific guess validation (basic) ---
     const numGuess = parseInt(String(guess), 10);
     if (isNaN(numGuess) || numGuess <= 0) {
        setError(t('Errors.guessInvalidFormat')); // Maybe a specific "must be positive number" error
        return;
     }
     const formattedGuess = numGuess;

    // --- Prepare Payload ---
    const payload = {
      tokenCode: token,
      contestType: 'papaya', // Always papaya now
      fullName: fullName.trim(),
      nic: nic.trim() || undefined, // Send undefined if empty
      contactNumber: contactNumber.trim(),
      guess: formattedGuess,
    };

    // --- API Call ---
    setIsLoading(true);
    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        // Use the error message from the API response if available
        setError(result.message || t('Errors.submissionError')); // Generic fallback
      } else {
        // Success! Navigate to confirmation page
        console.log('Submission successful:', result);
        router.push('/confirmation'); // Assumes simple confirmation route
      }
    } catch (err) {
      console.error('Network or fetch error:', err);
      setError(t('Errors.networkError'));
    } finally {
      setIsLoading(false);
    }
  };


   // If token is missing on load, maybe render an error message instead of the form
   if (!token && !error) {
      return <div className="text-center p-6"><LoadingSpinner /></div>; // Show loading initially while checking token
   }
   if (error === t('Errors.tokenMissing')) {
       return <div className="max-w-md mx-auto p-6"><ErrorMessage message={error}/></div>;
   }


  return (
    <form onSubmit={handleSubmit} className="space-y-4">
       <h2 className="text-xl font-semibold text-center mb-4 text-white">{t('papayaSeedTitle')}</h2>

       {/* Display errors */}
       <ErrorMessage message={error}/>

       {/* Removed Contest Type Selection */}

      {/* User Information Inputs */}
      <Input
        id="fullName"
        label={t('nameLabel')}
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        required
        disabled={isLoading}
      />
       <Input
        id="nic"
        label={t('nicLabel')}
        value={nic}
        onChange={(e) => setNic(e.target.value)}
         disabled={isLoading}
      />
      <Input
        id="contactNumber"
        label={t('contactLabel')}
        value={contactNumber}
        onChange={(e) => setContactNumber(e.target.value)}
        type="tel" // Use tel type for contact numbers
        required
         disabled={isLoading}
      />

       {/* Papaya Seed Count Guess Input */}
       <Input
         id="guess"
         label={t('guessLabelPapaya')}
         type="number"
         value={guess}
         onChange={(e) => setGuess(e.target.value)}
         required
         disabled={isLoading}
         min="1" // Basic number constraint
       />

      {/* Submission Button */}
      <Button type="submit" isLoading={isLoading} disabled={isLoading} className="w-full">
        {isLoading ? t('submittingButton') : t('submitButton')}
      </Button>
    </form>
  );
};

export default GuessForm;