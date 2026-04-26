import { useState } from 'react';
import { AuthForm } from '../components/AuthForm';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async ({ email, password }: { email: string; password: string }) => {
    try {
      setLoading(true);
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthForm
      title="Login"
      subtitle="Log in to select devices and view their status."
      submitLabel="Login"
      switchText="Already have an account?"
      switchHref="/register"
      onSubmit={handleSubmit}
      error={error}
      loading={loading}
    />
  );
}