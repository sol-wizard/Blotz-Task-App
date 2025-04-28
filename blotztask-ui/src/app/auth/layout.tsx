import BrandingSection from './components/branding-section';
import AuthButton from './components/auth-button';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex container relative h-screen flex-rows items-center justify-center lg:max-w-none lg:px-0">
      <div className="absolute inset-0 z-0 bg-[url('/assets/images/sign_in.png')] bg-cover bg-no-repeat bg-center"></div>

      <BrandingSection />
      <AuthButton />
      <div className="flex-[3] lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px] relative z-10">
          {children}
        </div>
      </div>
    </div>
  );
}
