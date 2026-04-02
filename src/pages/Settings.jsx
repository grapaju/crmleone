import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, User, Bell, Palette, Mail, Lock, Server } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const Settings = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [settings, setSettings] = useState({
    profileName: user.name,
    profileEmail: user.email,
    emailNotifications: true,
    pushNotifications: false,
    theme: "dark",
  });

  const [smtpSettings, setSmtpSettings] = useState({
    host: "",
    port: "",
    user: "",
    password: "",
    encryption: "tls",
    from: "",
  });

  // Load existing SMTP settings from backend
  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          "http://localhost/v4/api/php-api-crm/public/settings.php"
        );
        if (!res.ok) return;
        const data = await res.json();
        setSmtpSettings((prev) => ({
          host: data.smtp_host || prev.host,
          port: data.smtp_port || prev.port,
          user: data.smtp_user || prev.user,
          password: data.smtp_pass || prev.password,
          encryption: data.smtp_secure === "ssl" ? "ssl" : "tls",
          from: data.smtp_from || prev.from,
        }));
      } catch (err) {
        console.error("Erro carregando SMTP settings", err);
      }
    })();
  }, []);

  const handleInputChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSmtpChange = (field, value) => {
    setSmtpSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = (section) => {
    toast({
      title: `✅ ${section} Salvas`,
      description: `Suas preferências de ${section.toLowerCase()} foram atualizadas!`,
    });
  };

  const handleSaveSmtp = async () => {
    try {
      // basic validation
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!smtpSettings.host) throw new Error("Servidor SMTP obrigatório");
      if (
        !smtpSettings.user ||
        !emailRe.test(String(smtpSettings.user).toLowerCase())
      ) {
        throw new Error("Usuário SMTP deve ser um e-mail válido");
      }

      const payload = {
        smtp_host: smtpSettings.host || "",
        smtp_port: smtpSettings.port || "",
        smtp_user: smtpSettings.user || "",
        smtp_pass: smtpSettings.password || "",
        smtp_secure: smtpSettings.encryption || "tls",
        // ensure smtp_from is set; prefer explicit if user provided one
        smtp_from:
          smtpSettings.from &&
          emailRe.test(String(smtpSettings.from).toLowerCase())
            ? smtpSettings.from
            : smtpSettings.user || "",
      };
      const res = await fetch(
        "http://localhost/v4/api/php-api-crm/public/settings.php",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error("Falha ao salvar SMTP");
      toast({
        title: "✅ SMTP Salvo",
        description: "Configurações SMTP atualizadas.",
      });
    } catch (err) {
      console.error("Erro salvando SMTP", err);
      toast({
        title: "Erro",
        description: "Não foi possível salvar SMTP",
        variant: "destructive",
      });
    }
  };

  const handleTestSmtp = async () => {
    try {
      toast({ title: "⏳ Testando conexão SMTP...", description: "Aguarde" });
      const payload = {
        host: smtpSettings.host,
        port: smtpSettings.port,
        user: smtpSettings.user,
        password: smtpSettings.password,
        encryption: smtpSettings.encryption || "tls",
        from: smtpSettings.from || smtpSettings.user || "",
      };
      const res = await fetch(
        "http://localhost/v4/api/php-api-crm/public/test_smtp.php",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (res.ok && json.ok) {
        toast({ title: "✅ Conexão OK", description: json.message });
      } else {
        toast({
          title: "❌ Falha na conexão",
          description: json.message || "Erro desconhecido",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Erro testando SMTP", err);
      toast({
        title: "Erro",
        description: "Falha ao testar SMTP",
        variant: "destructive",
      });
    }
  };

  React.useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/");
    }
  }, [user, navigate]);

  return (
    <>
      <Helmet>
        <title>Configurações - ImóvelCRM</title>
        <meta
          name="description"
          content="Personalize suas preferências e configurações do sistema."
        />
      </Helmet>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Configurações</h1>
          <p className="text-slate-400">
            Gerencie as preferências da sua conta e do sistema.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass-effect border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Mail className="w-5 h-5 mr-2" /> Configurações de SMTP
              </CardTitle>
              <CardDescription>
                Configure o servidor de e-mail para envios pelo sistema.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtpHost" className="text-slate-300">
                    Servidor SMTP
                  </Label>
                  <Input
                    id="smtpHost"
                    value={smtpSettings.host}
                    onChange={(e) => handleSmtpChange("host", e.target.value)}
                    placeholder="smtp.example.com"
                    className="bg-slate-800 border-slate-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPort" className="text-slate-300">
                    Porta
                  </Label>
                  <Input
                    id="smtpPort"
                    value={smtpSettings.port}
                    onChange={(e) => handleSmtpChange("port", e.target.value)}
                    placeholder="587"
                    className="bg-slate-800 border-slate-600"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtpUser" className="text-slate-300">
                    Usuário
                  </Label>
                  <Input
                    id="smtpUser"
                    value={smtpSettings.user}
                    onChange={(e) => handleSmtpChange("user", e.target.value)}
                    placeholder="seu_email@example.com"
                    className="bg-slate-800 border-slate-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPassword" className="text-slate-300">
                    Senha
                  </Label>
                  <Input
                    id="smtpPassword"
                    type="password"
                    value={smtpSettings.password}
                    onChange={(e) =>
                      handleSmtpChange("password", e.target.value)
                    }
                    placeholder="••••••••"
                    className="bg-slate-800 border-slate-600"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div className="space-y-2">
                  <Label htmlFor="smtpFrom" className="text-slate-300">
                    Remetente (opcional)
                  </Label>
                  <Input
                    id="smtpFrom"
                    value={smtpSettings.from || ""}
                    onChange={(e) => handleSmtpChange("from", e.target.value)}
                    placeholder="remetente@exemplo.com"
                    className="bg-slate-800 border-slate-600"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleTestSmtp()}
                    className="bg-slate-600 hover:bg-slate-700"
                  >
                    <Server className="w-4 h-4 mr-2" /> Testar Conexão SMTP
                  </Button>
                  <Button
                    onClick={() => {
                      handleSave("SMTP");
                      handleSaveSmtp();
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Save className="w-4 h-4 mr-2" /> Salvar SMTP
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass-effect border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Bell className="w-5 h-5 mr-2" /> Notificações
              </CardTitle>
              <CardDescription>
                Escolha como você quer ser notificado.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="emailNotifications" className="text-slate-300">
                  Notificações por E-mail
                </Label>
                <Switch
                  id="emailNotifications"
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) =>
                    handleInputChange("emailNotifications", checked)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="pushNotifications" className="text-slate-300">
                  Notificações Push (em breve)
                </Label>
                <Switch
                  id="pushNotifications"
                  checked={settings.pushNotifications}
                  onCheckedChange={(checked) =>
                    handleInputChange("pushNotifications", checked)
                  }
                  disabled
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="glass-effect border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Palette className="w-5 h-5 mr-2" /> Aparência
              </CardTitle>
              <CardDescription>
                Personalize a aparência do sistema (em breve).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label className="text-slate-300">Tema</Label>
                <p className="text-sm text-slate-400">
                  A personalização de tema estará disponível em breve.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex justify-end"
        >
          <Button
            onClick={() => handleSave("Configurações Gerais")}
            className="bg-green-600 hover:bg-green-700"
          >
            <Save className="w-4 h-4 mr-2" />
            Salvar Configurações Gerais
          </Button>
        </motion.div>
      </div>
    </>
  );
};

export default Settings;
