'use client';

import styles from '../signin/AuthForm.module.css'; // Import CSS styles
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { AlertDestructive } from '@/components/ui/alert-destructive';
import { fetchWithErrorHandling } from '@/utils/http-client';
import { BadRequestError } from '@/model/error/bad-request-error';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const SignUpPage = () => {
  const router = useRouter();
  const schema = z.object({
    email: z.string().email({ message: 'Invalid email address' }),
    password: z.string().min(9, { message: 'Password must be at least 9 characters' }),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: { email: string; password: string }) => {
    try {
      await fetchWithErrorHandling(`${process.env.NEXT_PUBLIC_API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      router.push('/signin');
      toast('Account registered', {
        description: 'You can now login with the registered account',
        duration: 3000,
        position: 'top-center',
      });
    } catch (error) {
      if (error instanceof BadRequestError) {
        toast.error('Error', {
          description: error.details ? Object.values(error.details.errors).flat().join(' ') : error.message,
        });
      } else {
        console.error('Unexpected error:', error);
        toast.error('Unexpected error occurred. Please try again.');
      }
    }
  };

  return (
    <div className="h-full justify-center flex flex-col items-center">
      <div className="flex flex-col gap-4 bg-white p-5 rounded-lg shadow-md w-96">
        <h1 className={styles.title}>User Sign Up</h1>
        {errors.root && <AlertDestructive title="Error" description={errors.root.message} />}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className={styles.input_group}>
            <label className={styles.label}>Email:</label>
            <input type="email" {...register('email')} placeholder="Enter your email" />
          </div>

          <div className={styles.input_group}>
            <label className={styles.label}>Password:</label>
            <input type="password" {...register('password')} placeholder="Enter your password" />
          </div>
          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Spinner /> : 'Sign Up'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default SignUpPage;
