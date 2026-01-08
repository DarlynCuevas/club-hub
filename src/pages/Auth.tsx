import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useClub } from '@/contexts/ClubContext';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
export default function Auth() {
  const { t } = useTranslation();
  const { club } = useClub();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const location = useLocation();

  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (!isLogin && !name) {
      setError('Please enter your name');
      return;
    }

    try {
      if (isLogin) {
        await login(email, password);
        // No redirección aquí. El router decide tras login.
      } else {
        // Registro: signup_type = 'player' por defecto
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              signup_type: 'player',
              full_name: name,
              temp_password: true,
            },
          },
        });
        if (error) throw error;
        setIsLogin(true);
        setError('Cuenta creada. Revisa tu email para activar la cuenta.');
      }
    } catch (err) {
      setError('Invalid credentials. Please try again.');
    }
  };


  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12">
        <div className="mx-auto w-full max-w-sm">
          {/* Logo/Brand */}
          <div className="text-center mb-10">
            {club?.logoUrl || club?.name ? (
              <>
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground mb-4 overflow-hidden">
                  {club.logoUrl ? (
                    <img src={club.logoUrl} alt="Club logo" className="w-12 h-12 object-contain" />
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-7 h-7"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                  )}
                </div>
                <h1 className="text-2xl font-semibold text-foreground">
                  {club.name}
                </h1>
              </>
            ) : (
              <>
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground mb-4">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-7 h-7"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                </div>
                <h1 className="text-2xl font-semibold text-foreground">
                  {club?.name || t('auth.title')}
                </h1>
              </>
            )}
            <p className="text-muted-foreground mt-2">
              {isLogin ? t('auth.welcome') : t('auth.createAccount')}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  {t('auth.fullName')}
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder={t('auth.fullNamePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 bg-card"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                {t('auth.email')}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={t('auth.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 bg-card"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                {t('auth.password')}
              </Label>
              <Input
                id="password"
                type="password"
                placeholder={t('auth.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 bg-card"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{t(error)}</p>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isLogin ? (
                t('auth.signIn')
              ) : (
                t('auth.createAccountBtn')
              )}
            </Button>
          </form>

          {/* Toggle */}
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLogin ? (
                <>
                  {t('auth.noAccount')}{' '}
                  <span className="text-primary font-medium">{t('auth.signUp')}</span>
                </>
              ) : (
                <>
                  {t('auth.hasAccount')}{' '}
                  <span className="text-primary font-medium">{t('auth.signIn')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-6 text-center">
        <p className="text-xs text-muted-foreground">
          {t('auth.terms')}
        </p>
      </div>
    </div>
  );
}
