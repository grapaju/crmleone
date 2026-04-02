import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, Mail, Lock, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    const user = await login(email, password);
    setIsLoading(false);
    if (user) {
      toast({
        title: `🎉 Bem-vindo(a) de volta, ${user.name}!`,
        description: "Você foi autenticado com sucesso.",
      });
      navigate('/dashboard', { replace: true });
    } else {
      setError('E-mail ou senha inválidos. Tente novamente.');
      toast({
        title: "❌ Falha na Autenticação",
        description: "Credenciais inválidas. Verifique seus dados.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-slate-700/[0.1] bg-[bottom_1px_center] [mask-image:linear-gradient(to_bottom,transparent,white,transparent)]"></div>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full max-w-md glass-effect border-slate-700 z-10">
          <CardHeader className="text-center">
            <div className="flex justify-center items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Building2 className="w-7 h-7 text-white" />
              </div>
              <span className="text-3xl font-bold gradient-text">ImóvelCRM</span>
            </div>
            <CardTitle className="text-2xl font-bold text-white">Acesse sua Conta</CardTitle>
            <CardDescription>Bem-vindo de volta! Insira suas credenciais.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300 flex items-center">
                  <Mail className="w-4 h-4 mr-2" /> E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-800 border-slate-600"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300 flex items-center">
                  <Lock className="w-4 h-4 mr-2" /> Senha
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-800 border-slate-600"
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-red-400 text-center">{error}</p>
              )}
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Entrando...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <LogIn className="w-4 h-4 mr-2" /> Entrar no Sistema
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Login;