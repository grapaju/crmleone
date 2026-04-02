import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building,
  MapPin,
  DraftingCompass,
  Sparkles,
  Image,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { propertyService } from "@/services/propertyService";
import { featureService } from "@/services/featureService";
import { propertyFeatureService } from "@/services/propertyFeatureService";
import { propertyImageService } from "@/services/propertyImageService";
import { propertyOptions } from "@/data/propertyOptions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PropertyFormBasicInfo from "@/components/properties/form/PropertyFormBasicInfo";
import PropertyFormLocation from "@/components/properties/form/PropertyFormLocation";
import PropertyFormDetails from "@/components/properties/form/PropertyFormDetails";
import PropertyFormFeatures from "@/components/properties/form/PropertyFormFeatures";
import PropertyFormImages from "@/components/properties/form/PropertyFormImages";

const PropertyForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    propertyType: "property", // Identificador do tipo
    titulo: "",
    tipo: "apartamento",
    status: "Disponível",
    descricao: "",
    tags: [],
    valor: "",
    area_m2: "",
    quartos: "",
    banheiros: "",
    vagas_garagem: "",
    endereco: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    cep: "",
    latitude: "",
    longitude: "",
    tipo_construcao: "",
    acabamentos: [],
    comodidades: [],
    condominio_infraestruturas: [],
    detalhes_adicionais: [],
    primaryImageIndex: null,
  });
  const [featuresByCategory, setFeaturesByCategory] = useState({});
  const [featuresLoading, setFeaturesLoading] = useState(false);
  const [featuresError, setFeaturesError] = useState(null);

  useEffect(() => {
    (async () => {
      setFeaturesLoading(true);
      setFeaturesError(null);
      try {
        const all = await featureService.getFeatures();
        const list = all && all.data ? all.data : all;
        const grouped = {
          acabamentos: [],
          comodidades: [],
          condominio_infraestruturas: [],
        };

        // normalize returned feature objects to a predictable shape
        // { id: Number, nome: string, category: string, ...original }
        if (Array.isArray(list)) {
          list.forEach((raw) => {
            const id =
              raw?.id ?? raw?.ID ?? raw?.feature_id ?? raw?.featureId ?? null;
            const nome =
              raw?.nome ?? raw?.name ?? raw?.title ?? raw?.label ?? "";
            const category =
              raw?.category ??
              raw?.categoria ??
              raw?.group ??
              raw?.tipo ??
              raw?.type ??
              "";
            const item = {
              ...raw,
              id: id !== null ? Number(id) : null,
              nome,
              category,
            };

            if (item.category === "acabamentos") grouped.acabamentos.push(item);
            else if (item.category === "comodidades")
              grouped.comodidades.push(item);
            else if (item.category === "condominio_infraestruturas")
              grouped.condominio_infraestruturas.push(item);
          });
        }

        // Merge with local fallback options to ensure UI always has full option list
        try {
          const fallback = propertyOptions || {};
          const merged = {
            acabamentos: [],
            comodidades: [],
            condominio_infraestruturas: [],
          };
          const mergeList = (serverList = [], fallbackList = []) => {
            const byId = new Map();
            (fallbackList || []).forEach((i) => {
              const id = i?.id ?? null;
              const nome = i?.nome ?? i?.name ?? "";
              const category = i?.category ?? "";
              const key = id !== null ? String(id) : `name:${nome}`;
              byId.set(key, {
                ...i,
                id: id !== null ? Number(id) : id,
                nome,
                category,
              });
            });
            (serverList || []).forEach((i) => {
              const id = i?.id ?? i?.ID ?? i?.feature_id ?? null;
              const nome = i?.nome ?? i?.name ?? i?.title ?? "";
              const category =
                i?.category ??
                i?.categoria ??
                i?.group ??
                i?.tipo ??
                i?.type ??
                "";
              const key = id !== null ? String(Number(id)) : `name:${nome}`;
              byId.set(key, {
                ...i,
                id: id !== null ? Number(id) : id,
                nome,
                category,
              });
            });
            return Array.from(byId.values());
          };

          merged.acabamentos = mergeList(
            grouped.acabamentos,
            fallback.acabamentos
          );
          merged.comodidades = mergeList(
            grouped.comodidades,
            fallback.comodidades
          );
          merged.condominio_infraestruturas = mergeList(
            grouped.condominio_infraestruturas,
            fallback.condominio_infraestruturas
          );
          setFeaturesByCategory(merged);
        } catch (mergeErr) {
          // fallback to whatever grouped produced
          setFeaturesByCategory(grouped);
        }
      } catch (e) {
        console.error("Não foi possível carregar features:", e);
        // include full error message/text to show in UI
        setFeaturesError(e.message || String(e));
        // non-fatal notice: use fallback local options
        toast({
          title: "⚠️ Não foi possível carregar características do servidor",
          description: "Usando opções locais como fallback.",
          variant: "default",
        });
      } finally {
        setFeaturesLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // after features are loaded, if editing load saved associations to populate formData
  useEffect(() => {
    if (!isEditing) return;
    if (!Object.keys(featuresByCategory).length) return; // wait until features loaded
    (async () => {
      try {
        const pfRes = await propertyFeatureService.getPropertyFeatures(id);
        const pfListRaw =
          pfRes && pfRes.features
            ? pfRes.features
            : pfRes && pfRes.data
            ? pfRes.data
            : Array.isArray(pfRes)
            ? pfRes
            : [];

        // Merge any returned feature objects into featuresByCategory so options exist
        try {
          const current = { ...featuresByCategory };
          let added = false;
          (pfListRaw || []).forEach((f) => {
            if (!f || typeof f !== "object") return;
            const fid = Number(
              f.id ?? f.ID ?? f.feature_id ?? f.featureId ?? null
            );
            if (!fid) return;
            const cat = f.category || f.categoria || f.group || f.tipo || "";
            const nome = f.nome || f.name || f.title || "";
            const targetKey =
              cat === "acabamentos" ||
              cat === "comodidades" ||
              cat === "condominio_infraestruturas"
                ? cat
                : null;
            if (!targetKey) return;
            const exists = (current[targetKey] || []).some(
              (x) =>
                Number(x.id) === fid ||
                Number(x.ID) === fid ||
                Number(x.feature_id) === fid
            );
            if (!exists) {
              const item = { ...f, id: fid, nome, category: cat };
              current[targetKey] = [...(current[targetKey] || []), item];
              added = true;
            }
          });
          if (added) setFeaturesByCategory(current);
        } catch (mergeErr) {
          console.warn(
            "Erro ao mesclar property_features em featuresByCategory:",
            mergeErr
          );
        }

        const allFeatures = Object.values(featuresByCategory).flat();
        const ids = (pfListRaw || [])
          .map((f) => {
            if (!f) return null;
            if (typeof f === "object")
              return Number(
                f.id ?? f.ID ?? f.feature_id ?? f.featureId ?? null
              );
            return Number(f);
          })
          .filter(Boolean);
        const byCategory = {
          acabamentos: [],
          comodidades: [],
          condominio_infraestruturas: [],
        };
        ids.forEach((fid) => {
          const found = allFeatures.find(
            (x) =>
              Number(x.id) === Number(fid) ||
              Number(x.ID) === Number(fid) ||
              Number(x.feature_id) === Number(fid)
          );
          const cat = found
            ? found.category || found.categoria || found.tipo || ""
            : "";
          if (cat === "acabamentos") byCategory.acabamentos.push(Number(fid));
          else if (cat === "comodidades")
            byCategory.comodidades.push(Number(fid));
          else if (cat === "condominio_infraestruturas")
            byCategory.condominio_infraestruturas.push(Number(fid));
        });
        setFormData((prev) => ({ ...prev, ...byCategory }));
      } catch (e) {
        console.warn(
          "Erro carregando property features after featuresByCategory:",
          e
        );
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featuresByCategory, isEditing, id]);

  useEffect(() => {
    if (isEditing) {
      (async () => {
        try {
          const response = await propertyService.getPropertyById(id);
          const data = response && response.data ? response.data : response;
          const propType =
            data.property_type || data.propertyType || "property";
          if (data && propType === "property") {
            // normalize incoming features to arrays of IDs using featuresByCategory when possible
            const allFeatures = Object.values(featuresByCategory).flat();
            const normalizeListToIds = (incoming) => {
              if (!incoming) return [];
              // incoming may be array of ids or names or objects
              return (incoming || [])
                .map((item) => {
                  if (!item) return null;
                  if (typeof item === "number" || /^[0-9]+$/.test(String(item)))
                    return Number(item);
                  if (typeof item === "object") return item.id ?? null;
                  // string name -> find id
                  const found = allFeatures.find(
                    (f) => f.nome === item || f.name === item
                  );
                  return found ? found.id : null;
                })
                .filter(Boolean);
            };

            setFormData((prev) => ({
              ...prev,
              id: data.id || id,
              propertyType: propType,
              titulo: data.title || data.titulo || "",
              tipo: data.type || data.tipo || prev.tipo,
              status: data.status || prev.status,
              descricao: data.description || data.descricao || "",
              valor: data.price || data.valor || "",
              area_m2: data.area || data.area_m2 || prev.area_m2,
              quartos: data.bedrooms || data.quartos || prev.quartos,
              banheiros: data.bathrooms || data.banheiros || prev.banheiros,
              vagas_garagem:
                data.parking || data.vagas_garagem || prev.vagas_garagem,
              endereco: data.address || data.endereco || prev.endereco,
              numero: data.numero || data.number || prev.numero,
              complemento: data.complemento || prev.complemento,
              bairro: data.bairro || data.neighborhood || prev.bairro,
              cidade: data.city || data.cidade || prev.cidade,
              estado: data.state || data.estado || prev.estado,
              cep: data.zip_code || data.cep || prev.cep,
              latitude: data.latitude || prev.latitude,
              longitude: data.longitude || prev.longitude,
              tipo_construcao:
                data.tipo_construcao ||
                data.construction_type ||
                prev.tipo_construcao,
              tags: data.tags || data.tags_list || prev.tags || [],
              acabamentos: normalizeListToIds(
                data.acabamentos || data.finishes || prev.acabamentos
              ),
              comodidades: normalizeListToIds(
                data.comodidades || data.features || prev.comodidades
              ),
              condominio_infraestruturas: normalizeListToIds(
                data.condominio_infraestruturas ||
                  data.condo_infra ||
                  prev.condominio_infraestruturas
              ),
              detalhes_adicionais:
                data.detalhes_adicionais ||
                data.additional_details ||
                prev.detalhes_adicionais,
            }));

            // also load saved property_features associations
            try {
              const pfRes = await propertyFeatureService.getPropertyFeatures(
                id
              );
              const pfListRaw =
                pfRes && pfRes.features
                  ? pfRes.features
                  : pfRes && pfRes.data
                  ? pfRes.data
                  : Array.isArray(pfRes)
                  ? pfRes
                  : [];
              // pfList may be full feature objects or ids
              // Merge any returned feature objects into featuresByCategory so options exist
              try {
                const current = { ...featuresByCategory };
                let added = false;
                (pfListRaw || []).forEach((f) => {
                  if (!f || typeof f !== "object") return;
                  const fid = Number(
                    f.id ?? f.ID ?? f.feature_id ?? f.featureId ?? null
                  );
                  if (!fid) return;
                  const cat =
                    f.category || f.categoria || f.group || f.tipo || "";
                  const nome = f.nome || f.name || f.title || "";
                  const targetKey =
                    cat === "acabamentos" ||
                    cat === "comodidades" ||
                    cat === "condominio_infraestruturas"
                      ? cat
                      : null;
                  if (!targetKey) return;
                  const exists = (current[targetKey] || []).some(
                    (x) =>
                      Number(x.id) === fid ||
                      Number(x.ID) === fid ||
                      Number(x.feature_id) === fid
                  );
                  if (!exists) {
                    const item = { ...f, id: fid, nome, category: cat };
                    current[targetKey] = [...(current[targetKey] || []), item];
                    added = true;
                  }
                });
                if (added) setFeaturesByCategory(current);
              } catch (mergeErr) {
                console.warn(
                  "Erro ao mesclar property_features em featuresByCategory:",
                  mergeErr
                );
              }

              const allFeatures = Object.values(featuresByCategory).flat();
              const ids = (pfListRaw || [])
                .map((f) => {
                  if (!f) return null;
                  if (typeof f === "object")
                    return Number(
                      f.id ?? f.ID ?? f.feature_id ?? f.featureId ?? null
                    );
                  return Number(f);
                })
                .filter(Boolean);
              const byCategory = {
                acabamentos: [],
                comodidades: [],
                condominio_infraestruturas: [],
              };
              ids.forEach((fid) => {
                const found = allFeatures.find(
                  (x) =>
                    Number(x.id) === Number(fid) ||
                    Number(x.ID) === Number(fid) ||
                    Number(x.feature_id) === Number(fid)
                );
                const cat = found
                  ? found.category || found.categoria || found.tipo || ""
                  : "";
                if (cat === "acabamentos")
                  byCategory.acabamentos.push(Number(fid));
                else if (cat === "comodidades")
                  byCategory.comodidades.push(Number(fid));
                else if (cat === "condominio_infraestruturas")
                  byCategory.condominio_infraestruturas.push(Number(fid));
              });

              setFormData((prev) => ({ ...prev, ...byCategory }));
            } catch (pfErr) {
              console.warn("Erro carregando property_features:", pfErr);
            }
          } else {
            toast({
              title: "❌ Erro",
              description:
                "Imóvel não encontrado ou não é um imóvel individual.",
              variant: "destructive",
            });
            navigate("/properties");
          }
        } catch (e) {
          toast({
            title: "❌ Erro",
            description: e.message || "Erro ao buscar imóvel",
            variant: "destructive",
          });
          navigate("/properties");
        }
      })();
    }
  }, [id, isEditing, navigate, toast]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.titulo ||
      !formData.tipo ||
      !formData.status ||
      !formData.valor ||
      !formData.endereco
    ) {
      toast({
        title: "❌ Erro de Validação",
        description: "Por favor, preencha todos os campos obrigatórios (*).",
        variant: "destructive",
      });
      return;
    }

    // Mapeia campos do formulário para o payload esperado pela API
    const payload = {
      id: formData.id || undefined,
      title: formData.titulo,
      description: formData.descricao,
      tags: formData.tags,
      price: formData.valor,
      address: formData.endereco,
      city: formData.cidade,
      state: formData.estado,
      zip_code: formData.cep,
      bedrooms: formData.quartos,
      bathrooms: formData.banheiros,
      parking: formData.vagas_garagem,
      area: formData.area_m2,
      type: formData.tipo,
      status: formData.status,
      property_type: formData.propertyType || "property",
      // campos adicionais podem ser enviados conforme a API suportar
    };

    try {
      const res = await propertyService.saveProperty(payload);
      const saved = res && res.data ? res.data : res;

      // upload imagens (se houver arquivos em formData.imagesFiles)
      if (
        saved &&
        saved.id &&
        formData.imagesFiles &&
        formData.imagesFiles.length
      ) {
        try {
          for (let i = 0; i < formData.imagesFiles.length; i++) {
            const file = formData.imagesFiles[i];
            const isPrimary =
              Number(formData.primaryImageIndex) === Number(i) ? 1 : 0;
            // client-side debug: ensure property_id is present and show file meta before upload
            try {
              console.debug('Uploading property image', { property_id: saved.id, fileName: file.name, fileSize: file.size, isPrimary, type: 'property' });
            } catch (d) {
              console.debug('Uploading property image (name only):', { property_id: saved.id, fileName: file.name, isPrimary, type: 'property' });
            }
            // envia como multipart/form-data usando uploadImage com isPrimary
            await propertyImageService.uploadImage(saved.id, file, isPrimary);
          }
        } catch (imgErr) {
          console.warn("Erro ao enviar imagens:", imgErr);
          toast({
            title: "⚠️ Atenção",
            description: "Imóvel salvo, mas houve erro ao enviar imagens.",
            variant: "destructive",
          });
        }
      }
      // persist selected features (property_features)
      if (saved && saved.id) {
        const allSelectedFeatureIds = [
          ...(formData.acabamentos || []),
          ...(formData.comodidades || []),
          ...(formData.condominio_infraestruturas || []),
        ].filter(Boolean);
        try {
          // debug: log payload sent
          console.log("Saving property_features payload", {
            property_id: saved.id,
            features: allSelectedFeatureIds,
          });
          const pfRes = await propertyFeatureService.savePropertyFeatures(
            saved.id,
            allSelectedFeatureIds
          );
          console.log("property_features response", pfRes);
          // show brief toast with counts for quick feedback
          if (
            pfRes &&
            (pfRes.inserted !== undefined || pfRes.deleted !== undefined)
          ) {
            toast({
              title: "Características: atualizadas",
              description: `removidas=${pfRes.deleted || 0} inseridas=${
                pfRes.inserted || 0
              }`,
            });
          }
          // update local formData to reflect saved associations grouped by category
          try {
            const allFeatures = Object.values(featuresByCategory).flat();
            const ids = allSelectedFeatureIds.map(Number);
            const byCategory = {
              acabamentos: [],
              comodidades: [],
              condominio_infraestruturas: [],
            };
            ids.forEach((fid) => {
              const found = allFeatures.find(
                (x) =>
                  Number(x.id) === Number(fid) || Number(x.ID) === Number(fid)
              );
              const cat = found
                ? found.category || found.categoria || found.tipo || ""
                : "";
              if (cat === "acabamentos")
                byCategory.acabamentos.push(Number(fid));
              else if (cat === "comodidades")
                byCategory.comodidades.push(Number(fid));
              else if (cat === "condominio_infraestruturas")
                byCategory.condominio_infraestruturas.push(Number(fid));
            });
            setFormData((prev) => ({ ...prev, ...byCategory }));
          } catch (mapErr) {
            // fallback: just set raw arrays
            setFormData((prev) => ({
              ...prev,
              acabamentos: formData.acabamentos || [],
              comodidades: formData.comodidades || [],
              condominio_infraestruturas:
                formData.condominio_infraestruturas || [],
            }));
          }
          // notify success
          toast({
            title: "✅ Características salvas",
            description:
              pfRes && pfRes.message
                ? String(pfRes.message)
                : "Características atualizadas.",
          });
        } catch (pfErr) {
          console.warn("Erro salvando property_features:", pfErr);
          // non-fatal: notify user
          toast({
            title: "⚠️ Atenção",
            description:
              "Imóvel salvo, mas não foi possível salvar as características. Verifique o console.",
            variant: "destructive",
          });
        }
      }

      toast({
        title: isEditing ? "✅ Imóvel Atualizado" : "✅ Imóvel Cadastrado",
        description: `O imóvel "${formData.titulo}" foi salvo com sucesso!`,
      });
      navigate("/properties");
    } catch (e) {
      toast({
        title: "Erro ao salvar",
        description: e.message || "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/properties")}
          className="text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">
            {isEditing
              ? "Editar Imóvel Individual"
              : "Cadastrar Novo Imóvel Individual"}
          </h1>
          <p className="text-slate-400">
            {isEditing
              ? "Atualize as informações do imóvel"
              : "Preencha os dados do novo imóvel"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 mb-6">
            <TabsTrigger value="basic">
              <Building className="w-4 h-4 mr-2" />
              Principal
            </TabsTrigger>
            <TabsTrigger value="location">
              <MapPin className="w-4 h-4 mr-2" />
              Endereço
            </TabsTrigger>
            <TabsTrigger value="details">
              <DraftingCompass className="w-4 h-4 mr-2" />
              Detalhes
            </TabsTrigger>
            <TabsTrigger value="features">
              <Sparkles className="w-4 h-4 mr-2" />
              Características
            </TabsTrigger>
            <TabsTrigger value="images">
              <Image className="w-4 h-4 mr-2" />
              Imagens
            </TabsTrigger>
          </TabsList>

          <motion.div
            key={id || "new"}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <TabsContent value="basic">
              <PropertyFormBasicInfo
                formData={formData}
                onInputChange={handleInputChange}
              />
            </TabsContent>
            <TabsContent value="location">
              <PropertyFormLocation
                formData={formData}
                onInputChange={handleInputChange}
              />
            </TabsContent>
            <TabsContent value="details">
              <PropertyFormDetails
                formData={formData}
                onInputChange={handleInputChange}
              />
            </TabsContent>
            <TabsContent value="features">
              <PropertyFormFeatures
                formData={formData}
                onInputChange={handleInputChange}
                featuresByCategory={featuresByCategory}
                loading={featuresLoading}
                error={featuresError}
              />
            </TabsContent>
            <TabsContent value="images">
              <PropertyFormImages
                propertyId={formData.id}
                imagesFiles={formData.imagesFiles || []}
                selectedPrimaryIndex={formData.primaryImageIndex}
                onPrimarySelect={(index) =>
                  setFormData((prev) => ({ ...prev, primaryImageIndex: index }))
                }
                onFilesChange={(files) =>
                  setFormData((prev) => ({ ...prev, imagesFiles: files }))
                }
              />
            </TabsContent>
          </motion.div>
        </Tabs>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex justify-end space-x-4 mt-8"
        >
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/properties")}
            className="border-slate-600 hover:bg-slate-700/50"
          >
            Cancelar
          </Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 mr-2" />
            {isEditing ? "Atualizar Imóvel" : "Salvar Imóvel"}
          </Button>
        </motion.div>
      </form>
    </div>
  );
};

export default PropertyForm;
