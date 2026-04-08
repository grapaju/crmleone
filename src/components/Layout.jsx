import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Building2,
  Users,
  UserPlus,
  Calendar,
  FileText,
  BarChart3,
  Settings,
  Menu,
  X,
  Bell,
  Search,
  LogOut,
  Contact,
  Sheet,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { appointmentService } from '@/services/appointmentService';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const userRole = user?.role || 'agente';

  useEffect(() => {
    if (user) {
      (async () => {
        try {
          const today = new Date().toISOString().split('T')[0];
          const allAppointments = await appointmentService.getAppointments();
          const arr = Array.isArray(allAppointments) ? allAppointments : [];
          const userAppointments = arr.filter(app => {
            if (!app || !app.start || isNaN(new Date(app.start))) return false;
            return (userRole === 'admin' || app.agent === user?.name) && new Date(app.start).toISOString().split('T')[0] === today;
          });
          setUpcomingAppointments(userAppointments);
        } catch (e) {
          console.warn('Erro carregando agendamentos no layout:', e);
          setUpcomingAppointments([]);
        }
      })();
    }
  }, [user, userRole, location.pathname]);


  const handleLogout = () => {
    logout();
    navigate('/login');
    toast({
      title: "👋 Até logo!",
      description: "Você saiu do sistema com segurança.",
    });
  };

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home, roles: ['admin', 'agente'] },
    { name: 'Imóveis', href: '/properties', icon: Building2, roles: ['admin', 'agente'] },
    { name: 'Leads', href: '/leads', icon: UserPlus, roles: ['admin', 'agente'] },
    { name: 'Contatos', href: '/contacts', icon: Contact, roles: ['admin', 'agente'] },
    { name: 'Agenda', href: '/calendar', icon: Calendar, roles: ['admin', 'agente'] },
    { name: 'Tabelas de Vendas', href: '/sales-tables', icon: Sheet, roles: ['admin', 'agente'] },
    { name: 'Documentos', href: '/documents', icon: FileText, roles: ['admin', 'agente'] },
    { name: 'Relatórios', href: '/reports', icon: BarChart3, roles: ['admin'] },
    { name: 'Usuários', href: '/agents', icon: Users, roles: ['admin'] },
    { name: 'Permissões', href: '/permissions', icon: Settings, roles: ['admin'] },
    { name: 'Configurações', href: '/settings', icon: Settings, roles: ['admin'] },
  ];

  const filteredNavigation = navigation.filter(item => item.roles.includes(userRole));

  const handleSearchClick = () => {
    toast({
      title: "🔍 Busca Global",
      description: "🚧 Esta funcionalidade ainda não foi implementada—mas não se preocupe! Você pode solicitá-la no seu próximo prompt! 🚀"
    });
  };

  const handleEditProfile = () => {
    if (!user?.id) return;
    navigate(`/agents/edit/${user.id}`);
  };

  const SidebarContent = ({ isCollapsed, setIsCollapsed }) => (
    <div className="flex h-full flex-col">
       <div className={`flex h-16 items-center border-b border-slate-700 ${isCollapsed ? 'justify-center' : 'justify-between px-6'}`}>
        <Link to="/" className={`flex items-center space-x-3 transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold gradient-text whitespace-nowrap">ImóvelCRM</span>
        </Link>
        <div className={`w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 ${!isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
           <Building2 className="w-5 h-5 text-white" />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      <TooltipProvider delayDuration={0}>
        <nav className="flex-1 px-4 py-6 space-y-2">
          {filteredNavigation.map((item) => {
            const isActive = location.pathname.startsWith(item.href) && (item.href !== '/' || location.pathname === '/');
            return (
              <Tooltip key={item.name}>
                <TooltipTrigger asChild>
                  <Link
                    to={item.href}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${isCollapsed ? 'justify-center' : ''} ${
                      isActive
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                        : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <span className={`font-medium transition-all duration-200 ${isCollapsed ? 'opacity-0 -translate-x-4 w-0' : 'opacity-100 translate-x-0'}`}>{item.name}</span>
                  </Link>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right" className="bg-slate-800 border-slate-700 text-white">
                    <p>{item.name}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </nav>
      </TooltipProvider>

      <div className={`p-4 border-t border-slate-700`}>
        <div className={`flex mb-4 ${isCollapsed ? 'justify-center' : 'justify-end'}`}>
            <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(!isCollapsed)} className="text-slate-400 hover:text-white hidden lg:flex">
                {isCollapsed ? <ChevronsRight /> : <ChevronsLeft />}
            </Button>
        </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
               <div className={`flex items-center space-x-3 p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 cursor-pointer transition-colors ${isCollapsed ? 'justify-center' : ''}`}>
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                    {user?.photo ? (
                      <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-white">{user?.name?.charAt(0)}</span>
                    )}
                  </div>
                  <div className={`flex-1 overflow-hidden transition-all duration-200 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                    <p className="text-sm font-medium text-white truncate whitespace-nowrap">{user?.name}</p>
                    <p className="text-xs text-slate-400 truncate whitespace-nowrap">{user?.email}</p>
                  </div>
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" className="w-64 bg-slate-800 border-slate-700 text-white">
              <DropdownMenuLabel>{user?.name}</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-700"/>
              <DropdownMenuItem onClick={handleEditProfile} className="cursor-pointer focus:bg-slate-700">
                <Users className="mr-2 h-4 w-4" />
                <span>Meu Perfil</span>
              </DropdownMenuItem>
              {user?.role === 'admin' && (
                <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer focus:bg-slate-700">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configurações</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer focus:bg-red-500/20 focus:text-red-400">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 flex">
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className={`flex flex-col bg-slate-800/95 backdrop-blur-xl border-r border-slate-700 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-24' : 'w-72'}`}> 
          <SidebarContent isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed}/>
        </div>
      </div>
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-slate-800/95 backdrop-blur-xl border-r border-slate-700 lg:hidden"
            >
              <SidebarContent isCollapsed={false} setIsCollapsed={() => {}} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex flex-col flex-1 min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between px-6 bg-slate-800/95 backdrop-blur-xl border-b border-slate-700">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold text-white hidden sm:block">
              {filteredNavigation.find(item => location.pathname.startsWith(item.href) && item.href !== '/')?.name || filteredNavigation.find(item => item.href === location.pathname)?.name || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSearchClick}
              className="text-slate-400 hover:text-white"
            >
              <Search className="w-5 h-5" />
            </Button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-slate-400 hover:text-white relative"
                    >
                      <Bell className="w-5 h-5" />
                      {upcomingAppointments.length > 0 && (
                         <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                      )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 bg-slate-800 border-slate-700 text-white">
                    <DropdownMenuLabel>Compromissos para Hoje</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-slate-600" />
                    {upcomingAppointments.length > 0 ? (
                        upcomingAppointments.map(app => (
                           <DropdownMenuItem key={app.id} className="focus:bg-slate-700" onSelect={() => navigate(`/calendar/edit/${app.id}`)}>
                                <div className="flex flex-col">
                                   <span className="font-semibold">{app.title}</span>
                                   <span className="text-xs text-slate-400">{new Date(app.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {app.type}</span>
                                </div>
                           </DropdownMenuItem>
                        ))
                    ) : (
                        <DropdownMenuItem disabled>
                            <span className="text-sm text-slate-400 p-4 text-center w-full">Nenhum compromisso para hoje.</span>
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;