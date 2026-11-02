"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import Link from 'next/link';
import { Compass, AlertTriangle, Copy, Check, ExternalLink } from 'lucide-react';
import { firebaseConfig } from '@/lib/firebase';

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props} fill="currentColor">
        <title>Google</title>
        <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.3 1.84-4.25 1.84-5.18 0-9.4-4.22-9.4-9.4s4.22-9.4 9.4-9.4c2.8 0 4.93 1.1 6.38 2.48l2.94-2.94C19.49 1.1 16.2 0 12.48 0 5.6 0 0 5.6 0 12.48s5.6 12.48 12.48 12.48c7.1 0 12.28-4.93 12.28-12.28.0-.8-.08-1.52-.23-2.28H12.48z" />
    </svg>
);

const formSchema = z.object({
  email: z.string().email({ message: 'Введіть дійсну адресу електронної пошти.' }),
  password: z.string().min(6, { message: 'Пароль повинен містити не менше 6 символів.' }),
});

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { signInAsGuest } = useAuth();
  const [loading, setLoading] = useState(false);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setUnauthorizedDomain(null);
    if (!auth) {
        toast({
            variant: "destructive",
            title: "Помилка конфігурації Firebase",
            description: "Конфігурація Firebase не знайдена. Переконайтеся, що змінні середовища налаштовані у вашому хостинг-середовищі.",
        });
        setLoading(false);
        return;
    }
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      router.push('/');
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      if (error.code === 'auth/popup-closed-by-user') {
        console.log("Popup closed by user.");
      } else if (error.code === 'auth/operation-not-allowed') {
        toast({
            variant: 'destructive',
            title: 'Метод входу вимкнено',
            description: 'Будь ласка, увімкніть цей метод входу у вашій консолі Firebase.',
        });
      } else if (error.code === 'auth/unauthorized-domain') {
          const domain = typeof window !== 'undefined' ? window.location.hostname : '';
          setUnauthorizedDomain(domain);
          toast({
              variant: 'destructive',
              title: 'Неавторизований домен',
              description: `Домен "${domain}" не авторизований у Firebase Authentication. Скопіюйте його нижче та додайте в налаштуваннях консолі.`,
          });
      } else {
        toast({
            variant: 'destructive',
            title: 'Помилка входу',
            description: error.message,
        });
      }
    } finally {
        setLoading(false);
    }
  };

  const onEmailSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    if (!auth) {
        toast({
            variant: "destructive",
            title: "Помилка конфігурації Firebase",
            description: "Конфігурація Firebase не знайдена. Переконайтеся, що змінні середовища налаштовані у вашому хостинг-середовищі.",
        });
        setLoading(false);
        return;
    }
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      router.push('/');
    } catch (error: any) {
      console.error("Email sign-in error:", error);
      toast({
        variant: 'destructive',
        title: 'Помилка входу',
        description: 'Неправильна електронна пошта або пароль.',
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
       <Card className="w-full max-w-md">
        <CardHeader className="text-center">
            <div className="flex justify-center items-center gap-2 mb-4">
                <Compass className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-semibold text-foreground">Workday Compass</h1>
            </div>
          <CardTitle>Вхід</CardTitle>
          <CardDescription>Введіть свої дані для входу в акаунт</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onEmailSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Електронна пошта</FormLabel>
                    <FormControl>
                      <Input placeholder="example@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Пароль</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Вхід...' : 'Увійти'}
              </Button>
            </form>
          </Form>
          
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Або продовжити з
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <Button variant="outline" onClick={handleGoogleSignIn} disabled={loading}>
              <GoogleIcon className="mr-2 h-5 w-5" />
              Google
            </Button>
            <Button 
              variant="secondary" 
              type="button" 
              onClick={() => {
                signInAsGuest?.();
                router.push('/');
              }} 
              disabled={loading}
            >
              Продовжити як гість (Демо)
            </Button>
          </div>

          {unauthorizedDomain && (
            <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3.5 text-sm space-y-2.5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-xs text-foreground">
                    Домен не додано в Authorized domains
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Firebase вимагає додати поточний домен до списку дозволених для авторизації через Google:
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-background/80 rounded border p-1.5 text-xs font-mono">
                <span className="flex-1 truncate select-all">{unauthorizedDomain}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-6 text-[11px] px-2"
                  onClick={() => {
                    navigator.clipboard.writeText(unauthorizedDomain);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 mr-1 text-green-600" /> Скопійовано
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" /> Скопіювати
                    </>
                  )}
                </Button>
              </div>

              <div className="flex flex-col gap-1.5 pt-1">
                <a
                  href={`https://console.firebase.google.com/project/${firebaseConfig.projectId || '_'}/authentication/settings`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-xs font-medium text-primary hover:underline gap-1"
                >
                  <span>Відкрити Firebase Console &gt; Authorized domains</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}
          
          <div className="mt-4 text-center text-sm">
            Не маєте акаунту?{' '}
            <Link href="/signup" className="underline">
              Зареєструватися
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
