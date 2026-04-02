import React, { useState, useEffect } from "react";
import CameraCapture from "../components/CameraCapture";
import { jsPDF } from "jspdf";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Upload,
  FileText,
  Building2,
  Calendar,
  Save,
  Type,
  Tag,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { documentService } from "@/services/documentService";
import { propertyService } from "@/services/propertyService";
import { useAuth } from "@/contexts/AuthContext";

const DocumentForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const { user } = useAuth();

  const [properties, setProperties] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    propertyId: "",
    category: "",
    status: "Válido",
    expiryDate: "",
    description: "",
    file: null,
  });

  // Estado para captura por câmera
  const [showCamera, setShowCamera] = useState(false);
  const [cameraImages, setCameraImages] = useState([]);

  useEffect(() => {
    const load = async () => {
      const props = await propertyService.getProperties();
      setProperties(props || []);

      if (isEditing) {
        const doc = await documentService.getDocumentById(id);
        if (doc) {
          // use the shape returned by documentService (doc.name)
          setFormData({
            name: doc.name || "",
            description: doc.description || "",
            category: doc.category || "",
            status: doc.status || "Válido",
            type: doc.type || "",
            file: null,
            propertyId: doc.propertyId?.toString() || "",
            expiryDate: doc.expiryDate ? doc.expiryDate.split("T")[0] : "",
          });
        } else {
          toast({
            title: "Erro",
            description: "Documento não encontrado.",
            variant: "destructive",
          });
          navigate("/documents");
        }
      }
    };

    load();
  }, [isEditing, id, navigate]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleInputChange("file", file);
      handleInputChange("name", file.name.split(".").slice(0, -1).join("."));
      setCameraImages([]); // Limpa imagens da câmera se fizer upload
    }
  };

  // Captura de imagem da câmera
  const handleCameraCapture = (imgSrc) => {
    setCameraImages((prev) => [...prev, imgSrc]);
  };
  const handleCameraClose = () => {
    setShowCamera(false);
  };
  const handleRemoveCameraImage = (idx) => {
    setCameraImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name || !formData.propertyId || !formData.category) {
      toast({
        title: "❌ Erro de Validação",
        description:
          "Por favor, preencha os campos obrigatórios: Nome, Imóvel e Categoria.",
        variant: "destructive",
      });
      return;
    }

    (async () => {
      const property = await propertyService.getPropertyById(formData.propertyId);
      const fd = new FormData();
      fd.append("title", formData.name);
      fd.append("name", formData.name);
      fd.append("description", formData.description || "");
      fd.append("category", formData.category);
      const statusToSend = formData.status || "Válido";
      fd.append("status", statusToSend);
      fd.append("propertyId", formData.propertyId);
      if (formData.expiryDate) fd.append("expiryDate", formData.expiryDate);
      if (user && user.id) fd.append("uploaded_by", user.id);

      // Se houver imagens da câmera, gera PDF
      if (cameraImages.length > 0) {
        const pdf = new jsPDF();
        for (let i = 0; i < cameraImages.length; i++) {
          if (i > 0) pdf.addPage();
          // Adiciona imagem na página (ajusta tamanho para caber)
          pdf.addImage(cameraImages[i], 'JPEG', 10, 10, 190, 277); // A4: 210x297mm, margens
        }
        const pdfBlob = pdf.output('blob');
        const pdfFile = new File([pdfBlob], `${formData.name || 'documento'}.pdf`, { type: 'application/pdf' });
        fd.append("file", pdfFile);
        fd.append("type", "pdf");
      } else if (formData.file) {
        fd.append("file", formData.file);
        if (formData.type) fd.append("type", formData.type);
      }

      if (isEditing) {
        fd.append("id", id);
        fd.append("_method", "PUT");
      }

      const res = await documentService.saveDocument(fd);

      if (res) {
        toast({
          title: isEditing ? "✅ Documento Atualizado" : "✅ Documento Salvo",
          description: isEditing
            ? "As informações do documento foram atualizadas com sucesso!"
            : "O novo documento foi salvo com sucesso!",
        });
        navigate("/documents");
      }
    })();
  };

  return (
    <div className="space-y-6">
      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={handleCameraClose}
          images={cameraImages}
        />
      )}
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/documents")}
          className="text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">
            {isEditing ? "Editar Documento" : "Upload de Novo Documento"}
          </h1>
          <p className="text-slate-400">
            {isEditing
              ? "Atualize as informações do documento"
              : "Preencha os dados e anexe o arquivo"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass-effect border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Informações do Documento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="file-upload" className="text-slate-300">
                  Arquivo
                </Label>
                <div className="flex items-center justify-center w-full gap-2">
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
                        ou arraste e solte
                      </p>
                      <p className="text-xs text-slate-500">
                        PDF, DOCX, JPG, PNG, etc. (MAX. 10MB)
                      </p>
                    </div>
                    <Input
                      id="file-upload"
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-slate-600 h-32 min-w-[120px] flex flex-col justify-center items-center"
                    onClick={() => setShowCamera(true)}
                  >
                    <span className="mb-2"><Upload className="w-6 h-6 text-blue-400" /></span>
                    Capturar via Câmera
                  </Button>
                </div>
                {formData.file && (
                  <p className="text-sm text-green-400">
                    Arquivo selecionado: {formData.file.name}
                  </p>
                )}
                {cameraImages.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {cameraImages.map((img, idx) => (
                      <div key={idx} className="relative">
                        <img src={img} alt={`Página ${idx+1}`} className="w-16 h-16 object-cover rounded border" />
                        <button type="button" className="absolute top-0 right-0 bg-red-600 text-white rounded-full w-5 h-5 text-xs" onClick={() => handleRemoveCameraImage(idx)}>×</button>
                      </div>
                    ))}
                  </div>
                )}
                {isEditing && !formData.file && (
                  <p className="text-sm text-slate-400">
                    Arquivo atual: {formData.name}.
                    {formData.type?.toLowerCase()}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="name"
                    className="text-slate-300 flex items-center"
                  >
                    <Type className="w-4 h-4 mr-2" />
                    Nome do Documento *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Ex: Contrato de Compra e Venda"
                    className="bg-slate-800 border-slate-600"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="propertyId"
                    className="text-slate-300 flex items-center"
                  >
                    <Building2 className="w-4 h-4 mr-2" />
                    Imóvel Associado *
                  </Label>
                  <Select
                    value={formData.propertyId}
                    onValueChange={(value) =>
                      handleInputChange("propertyId", value)
                    }
                    required
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600">
                      <SelectValue placeholder="Selecione um imóvel" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map((prop) => (
                        <SelectItem key={prop.id} value={prop.id.toString()}>
                          {prop.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="category"
                    className="text-slate-300 flex items-center"
                  >
                    <Tag className="w-4 h-4 mr-2" />
                    Categoria *
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      handleInputChange("category", value)
                    }
                    required
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600">
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Matrícula">Matrícula</SelectItem>
                      <SelectItem value="Escritura">Escritura</SelectItem>
                      <SelectItem value="Contrato">Contrato</SelectItem>
                      <SelectItem value="Fiscal">Fiscal (IPTU, etc)</SelectItem>
                      <SelectItem value="Técnico">
                        Técnico (Plantas, etc)
                      </SelectItem>
                      <SelectItem value="Outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-slate-300">
                    Status
                  </Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      handleInputChange("status", value)
                    }
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Válido">Válido</SelectItem>
                      <SelectItem value="Vencendo">Vencendo</SelectItem>
                      <SelectItem value="Vencido">Vencido</SelectItem>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="expiryDate"
                    className="text-slate-300 flex items-center"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Data de Vencimento
                  </Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) =>
                      handleInputChange("expiryDate", e.target.value)
                    }
                    className="bg-slate-800 border-slate-600"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-slate-300">
                  Descrição / Observações
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  placeholder="Adicione detalhes sobre o documento..."
                  className="bg-slate-800 border-slate-600 min-h-[100px]"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex space-x-4 mt-6"
        >
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/documents")}
            className="border-slate-600 hover:bg-slate-700/50"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 flex-1"
          >
            <Save className="w-4 h-4 mr-2" />
            {isEditing ? "Salvar Alterações" : "Salvar Documento"}
          </Button>
        </motion.div>
      </form>
    </div>
  );
};

export default DocumentForm;
