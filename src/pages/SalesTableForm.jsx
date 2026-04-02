import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Save,
  ArrowLeft,
  User,
  FileText,
  Upload,
  Trash2,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { salesTableService } from "@/services/salesTableService";

const SalesTableForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    observations: "",
    project_id: "",
    attachments: [],
  });

  const [projects, setProjects] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Carregar lista de projetos para o select
    const loadProjects = async () => {
      try {
        const res = await fetch(
          "http://localhost/v4/api/php-api-crm/public/projects.php"
        );
        const data = await res.json();
        setProjects(data);
      } catch (err) {
        console.error("Erro ao carregar projetos", err);
      }
    };

    loadProjects();

    // Carregar dados da tabela no modo edição
    if (isEditing) {
      const doLoad = async () => {
        try {
          const table = await salesTableService.getTableById(id);
          if (table) {
            setFormData({
              name: table.name || "",
              description: table.description || "",
              observations: table.observations || "",
              project_id: table.project_id || "",
              attachments: Array.isArray(table.attachments)
                ? table.attachments
                : [],
            });
          }
        } catch (err) {
          console.error("Error loading sales table", err);
        }
      };
      doLoad();
    }
  }, [id, isEditing]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const newAttachments = files.map((file) => ({
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      fileObject: file,
    }));
    setFormData((prev) => ({
      ...prev,
      attachments: [...prev.attachments, ...newAttachments],
    }));
  };

  const removeAttachment = (index) => {
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      toast({
        title: "❌ Erro de Validação",
        description: "Nome da tabela é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    const tableData = {
      ...formData,
      responsibleAgent: user.name,
      uploadDate: new Date().toISOString(),
      // ensure project_id is either an integer or null (avoid sending empty string -> 0)
      project_id: formData.project_id ? Number(formData.project_id) : null,
    };

    try {
      setSaving(true);

      // Build safe payload: remove transient fileObject and keep metadata for existing attachments
      const attachmentsMeta = (tableData.attachments || []).map((a) => {
        // preserve name, size and path if present
        return {
          name: a.name,
          size: a.size,
          path: a.path || a.url || null,
        };
      });

      const safeTableData = { ...tableData, attachments: attachmentsMeta };

      if (isEditing) {
        await salesTableService.updateTable(id, safeTableData);
      } else {
        await salesTableService.addTable(safeTableData);
      }

      toast({
        title: `✅ Tabela ${isEditing ? "Atualizada" : "Salva"}`,
        description: "A tabela de vendas foi salva com sucesso.",
      });
      navigate("/sales-tables");
    } catch (err) {
      console.error("Error saving table", err);
      toast({
        title: "❌ Erro",
        description: "Falha ao salvar a tabela. Veja o console.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/sales-tables")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-3xl font-bold text-white ml-2">
          {isEditing ? "Editar Tabela de Vendas" : "Nova Tabela de Vendas"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* --------- Detalhes --------- */}
        <Card className="glass-effect border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Detalhes da Tabela</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-300">
                Nome da Tabela *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Ex: Tabela Residencial Julho/2025"
                className="bg-slate-800 border-slate-600"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-slate-300">
                Descrição
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                placeholder="Descrição da tabela ou notas adicionais"
                className="bg-slate-800 border-slate-600"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project" className="text-slate-300">
                Propriedade / Obra
              </Label>
              <select
                id="project"
                value={formData.project_id || ""}
                onChange={(e) =>
                  handleInputChange("project_id", e.target.value)
                }
                className="w-full bg-slate-800 border border-slate-600 text-white rounded-md p-2"
              >
                <option value="">Selecione uma obra</option>
                {projects.map((proj) => (
                  <option key={proj.id} value={proj.id}>
                    {proj.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observations" className="text-slate-300">
                Observações
              </Label>
              <Textarea
                id="observations"
                value={formData.observations}
                onChange={(e) =>
                  handleInputChange("observations", e.target.value)
                }
                placeholder="Detalhes sobre a tabela, validade, etc."
                className="bg-slate-800 border-slate-600"
              />
            </div>

            <div className="flex items-center text-slate-300 text-sm">
              <User className="w-4 h-4 mr-2" />
              Responsável:{" "}
              <span className="font-semibold text-white ml-1">{user.name}</span>
            </div>
            <div className="flex items-center text-slate-300 text-sm">
              <Calendar className="w-4 h-4 mr-2" />
              Data de Envio:{" "}
              <span className="font-semibold text-white ml-1">
                {new Date().toLocaleDateString("pt-BR")}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* --------- Anexos --------- */}
        <Card className="glass-effect border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Anexos (PDFs)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="file-upload"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-600 border-dashed rounded-lg cursor-pointer bg-slate-800/50 hover:bg-slate-700/50"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-3 text-slate-400" />
                    <p className="mb-2 text-sm text-slate-400">
                      <span className="font-semibold text-blue-400">
                        Clique para fazer upload
                      </span>{" "}
                      de PDFs
                    </p>
                  </div>
                  <Input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    multiple
                    accept=".pdf"
                  />
                </label>
              </div>
              <div className="space-y-2">
                {(Array.isArray(formData.attachments)
                  ? formData.attachments
                  : []
                ).map((att, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center bg-slate-700/50 p-2 rounded-md"
                  >
                    <div className="flex items-center space-x-2">
                      <FileText className="w-5 h-5 text-blue-400" />
                      <span className="text-sm text-white">{att.name}</span>
                      <span className="text-xs text-slate-400">
                        ({att.size})
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAttachment(index)}
                      className="text-red-400 hover:bg-red-500/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* --------- Botão Salvar --------- */}
        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={saving}
          >
            <Save className="mr-2 h-4 w-4" />{" "}
            {saving ? "Salvando..." : "Salvar Tabela"}
          </Button>
        </div>
      </form>
    </motion.div>
  );
};

export default SalesTableForm;
