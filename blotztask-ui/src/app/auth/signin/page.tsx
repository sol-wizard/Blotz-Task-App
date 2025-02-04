'use client';

import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import styles from './AuthForm.module.css';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { AlertDestructive } from '@/components/ui/alert-destructive';
import { SubmitHandler, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

type LoginFormField = z.infer<typeof loginFormSchema>;

const loginFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(9),
});

const LoginPage = () => {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormField>({
    resolver: zodResolver(loginFormSchema),
  });
  const router = useRouter(); // Get the router instance

  const onSubmit: SubmitHandler<LoginFormField> = async (formData) => {
    try {
      const result = await signIn('credentials', {
        redirect: false,
        email: formData.email,
        password: formData.password,
      });

      if (result?.error) {
        setError('root', {
          message: 'Login Failed. Please check you credential',
        });
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Login failed:', error);
      setError('root', {
        message: error,
      });
    }
  };

  return (
    <div className="h-full justify-center flex flex-col items-center">
      <div className="flex flex-col gap-4 bg-white p-5 rounded-lg w-96">
      <h1 className="text-2xl text-center font-medium text-blue-500">Welcome to Blotz</h1> 
      <p className = "text-center text-gray-600 text-sm" > Enter your email and password to start </p>
        {errors.root && <AlertDestructive title="Error" description={errors.root.message} />}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className={styles.input_group}>
            <input
              type="email"
              {...register('email')}
              className={styles.input}
              placeholder="Email"
            />
          </div>
          {errors.email && <div className="text-warn mb-3">{errors.email.message}</div>}
          <div className={styles.input_group}>
            <input
              type="password"
              {...register('password')}
              className={styles.input}
              placeholder="Password"
            />
          </div>
          {errors.password && <div className="text-warn mb-3">{errors.password.message}</div>}
          <Button className={styles.submitButton} type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Spinner /> : 'Log in'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
