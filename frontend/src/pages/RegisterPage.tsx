import { useState } from 'react';
import { AuthForm } from '../components/AuthForm';
import { useAuth } from '../context/AuthContext';

export function RegisterPage() {
  const { register } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async ({ name, email, password }: { name?: string; email: string; password: string }) => {
    try {
      setLoading(true);
      await register(email, password, name ?? 'User');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Register failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthForm
      title="Register"
      subtitle="Create an account, then return to Home to select a device and view its status."
      submitLabel="Register"
      switchText="Already have an account?"
      switchHref="/login"
      onSubmit={handleSubmit}
      showName
      error={error}
      loading={loading}
    />
  );
}