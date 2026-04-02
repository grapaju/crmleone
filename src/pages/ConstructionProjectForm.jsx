import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { projectService } from "@/services/projectService";
import { towerService } from "@/services/towerService";
import { unitService } from "@/services/unitService";
import { propertyOptions } from "@/data/propertyOptions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProjectFormBasic from "@/components/properties/project-form/ProjectFormBasic";
import ProjectFormTowers from "@/components/properties/project-form/ProjectFormTowers";
import ProjectUnitsWizard from "@/components/properties/project-form/ProjectUnitsWizard";
import ProjectFormImages from "@/components/properties/project-form/ProjectFormImages";

const ConstructionProjectForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const isEditing = Boolean(id);

  const getInitialFormData = () => ({
    propertyType: "project",
    projectName: "",
    developerName: "",
    projectType: "torres_blocos",
    projectStatus: "em construção",
    endereco: "",
    bairro: "",
    cidade: "",
    cep: "",
    deliveryDate: "",
    projectFeatures: [],
    featureIdMap: {},
    towers: [{ id: 1, name: "Torre Única", floors: "", unitsPerFloor: "" }],
    units: [],
  });

  const [formData, setFormData] = useState(getInitialFormData());

  useEffect(() => {
    if (!isEditing) return;
    (async () => {
      try {
        const response = await projectService.getProjectById(id);
        const data = response && response.data ? response.data : response;
        if (data) {
          // normalize projectFeatures: API may return array of objects {id,name} or array of ids or array of names
          const allOptions = Object.values(propertyOptions).flat();
          const incomingFeatures =
            data.projectFeatures ?? data.features ?? null;
          // prev não está definido aqui — iniciar com valores seguros
          let normalizedFeatures = [];
          let featureIdMap = {};

          if (incomingFeatures) {
            normalizedFeatures = [];
            featureIdMap = {};
            incomingFeatures.forEach((item) => {
              if (!item) return;
              if (typeof item === "object") {
                const name = item.name ?? item.nome ?? String(item.id ?? "");
                normalizedFeatures.push(name);
                if (item.id) featureIdMap[name] = Number(item.id);
                return;
              }
              if (typeof item === "number" || /^[0-9]+$/.test(String(item))) {
                const idNum = Number(item);
                const found = allOptions.find((o) => o.id === idNum);
                const name = found ? found.nome : String(item);
                normalizedFeatures.push(name);
                featureIdMap[name] = idNum;
                return;
              }
              // string name
              const nameStr = String(item);
              normalizedFeatures.push(nameStr);
              const foundByName = allOptions.find(
                (o) => o.nome === nameStr || o.name === nameStr
              );
              if (foundByName) featureIdMap[foundByName.nome] = foundByName.id;
            });
          }

          setFormData((prev) => ({
            ...prev,
            id: data.id || id,
            projectName:
              data.projectName ||
              data.project_name ||
              data.title ||
              prev.projectName,
            developerName:
              data.developerName ||
              data.developer_name ||
              data.developer ||
              prev.developerName,
            projectType:
              data.projectType || data.project_type || prev.projectType,
            projectStatus:
              data.projectStatus || data.status || prev.projectStatus,
            endereco: data.endereco || data.address || prev.endereco,
            bairro: data.bairro || data.neighborhood || prev.bairro,
            cidade: data.cidade || data.city || prev.cidade,
            cep: data.cep || data.zip_code || prev.cep,
            deliveryDate:
              data.deliveryDate || data.delivery_date || prev.deliveryDate,
            projectFeatures: normalizedFeatures,
            featureIdMap,
            towers: data.towers || prev.towers,
            units: data.units || prev.units,
          }));
        } else {
          toast({
            title: "❌ Erro",
            description: "Obra não encontrada.",
            variant: "destructive",
          });
          navigate("/properties");
        }
      } catch (e) {
        toast({
          title: "❌ Erro",
          description: e.message || "Erro ao buscar obra",
          variant: "destructive",
        });
        navigate("/properties");
      }
    })();
  }, [id, isEditing, navigate, toast]);

  const handleInputChange = (field, value) =>
    setFormData((prev) => ({ ...prev, [field]: value }));
  const handleTowerChange = (towers) =>
    setFormData((prev) => ({ ...prev, towers }));
  const handleUnitsGenerated = async (newUnits) => {
    // If project already saved, persist units immediately to backend
    if (formData.id) {
      const updatedUnits = [...formData.units];
      const successes = [];
      const errors = [];
      for (let i = 0; i < newUnits.length; i++) {
        const u = newUnits[i];
        // build payload with English keys
        const payloadUnit = {
          project_id: formData.id,
          tower_id: u.tower_id ?? u.torre_id ?? null,
          unit_number: u.unit_number ?? u.numero_unidade ?? null,
          floor:
            u.floor ??
            (u.pavimento
              ? parseInt(String(u.pavimento).replace(/[^0-9]/g, ""))
              : null),
          type: u.type ?? u.tipo ?? null,
          area_private: u.area_private ?? u.area_privativa ?? null,
          area_total: u.area_total ?? u.area_total ?? u.area_privativa ?? null,
          price: u.price ?? u.valor ?? null,
          sale_status: u.sale_status ?? u.status_venda ?? null,
          specific_features:
            u.specific_features ?? u.caracteristicas_especificas ?? "",
        };
        try {
          console.debug("Saving generated unit payload:", payloadUnit);
          const res = await unitService.saveUnit(payloadUnit);
          const saved = res && res.data ? res.data : res;
          console.debug("Saved generated unit:", saved);
          if (saved) {
            updatedUnits.push(saved);
            successes.push(saved);
          }
        } catch (e) {
          console.error("Erro salvando unidade gerada:", e);
          errors.push({ unit: u, error: e.message || String(e) });
        }
      }
      setFormData((prev) => ({ ...prev, units: updatedUnits }));
      if (successes.length)
        toast({
          title: "✅ Unidades geradas",
          description: `${successes.length} unidades adicionadas.`,
        });
      if (errors.length)
        toast({
          title: "❌ Alguns erros",
          description: `${errors.length} falhas ao salvar unidades. Verifique console.`,
          variant: "destructive",
        });
    } else {
      // project not yet saved — add temporary units to state
      setFormData((prev) => ({
        ...prev,
        units: [
          ...prev.units,
          ...newUnits.map((u) => ({
            ...u,
            id: u.id ?? `gen_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            obra_id: u.obra_id ?? null,
            project_id: u.project_id ?? null,
            torre_id: u.torre_id ?? u.tower_id ?? null,
            tower_id: u.tower_id ?? u.torre_id ?? null,
            numero_unidade: u.numero_unidade ?? u.unit_number ?? null,
            unit_number: u.unit_number ?? u.numero_unidade ?? null,
          })),
        ],
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.projectName || !formData.developerName) {
      toast({
        title: "❌ Erro de Validação",
        description: "Nome da obra e da incorporadora são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    // convert projectFeatures to array of numeric IDs only
    const allOptions = Object.values(propertyOptions).flat();
    const featureIds = [];
    const unresolved = [];
    (formData.projectFeatures || []).forEach((f) => {
      if (f == null) return;
      // numeric or numeric-string
      if (typeof f === "number" || /^[0-9]+$/.test(String(f))) {
        featureIds.push(Number(f));
        return;
      }
      // object with id
      if (typeof f === "object") {
        if (f.id) {
          featureIds.push(Number(f.id));
          return;
        }
        // try name property
        const nameFromObj = f.name ?? f.nome ?? null;
        if (nameFromObj) f = nameFromObj;
      }
      // try featureIdMap provided by the form (populated by ProjectFormBasic)
      if (formData.featureIdMap && formData.featureIdMap[f]) {
        featureIds.push(Number(formData.featureIdMap[f]));
        return;
      }
      // fallback: try local propertyOptions
      const found = allOptions.find(
        (o) => o.nome === f || o.name === f || String(o.id) === String(f)
      );
      if (found) {
        featureIds.push(Number(found.id));
      } else {
        unresolved.push(String(f));
      }
    });

    if (unresolved.length > 0) {
      toast({
        title: "⚠️ Alguns itens não foram mapeados",
        description: `As seguintes características não foram convertidas para IDs e serão ignoradas: ${unresolved.join(
          ", "
        )}`,
        variant: "destructive",
      });
    }

    const payload = {
      id: formData.id || undefined,
      project_name: formData.projectName,
      developer_name: formData.developerName,
      project_type: formData.projectType,
      status: formData.projectStatus,
      address: formData.endereco,
      neighborhood: formData.bairro,
      city: formData.cidade,
      zip_code: formData.cep,
      delivery_date: formData.deliveryDate,
      features: featureIds,
      property_type: formData.propertyType || "project",
    };

    // Normalize towers and units to include in the payload so they are persisted
    // Remove client-side temporary ids so the backend creates new records.
    const normalizeNewId = (obj) => {
      const copy = { ...obj };
      if (copy.id == null) return copy;
      const idStr = String(copy.id);
      // Remove known client prefixes or any non-numeric id so backend treats as new
      const isTempPrefix =
        idStr.startsWith("new_") ||
        idStr.startsWith("gen_") ||
        idStr.startsWith("import_");
      const isNumericString = /^[0-9]+$/.test(idStr);
      if (isTempPrefix || !isNumericString) delete copy.id;
      return copy;
    };

    if (Array.isArray(formData.towers)) {
      payload.towers = formData.towers.map((t) => normalizeNewId(t));
    }
    if (Array.isArray(formData.units)) {
      payload.units = formData.units.map((u) => {
        const cu = normalizeNewId(u);
        // ensure both Portuguese and English project fields are set
        if (formData.id) {
          if (!cu.obra_id) cu.obra_id = formData.id;
          if (!cu.project_id) cu.project_id = formData.id;
        }
        // ensure tower id keys are set for backend
        if (cu.torre_id && !cu.tower_id) cu.tower_id = cu.torre_id;
        if (cu.unit_number == null && cu.numero_unidade != null)
          cu.unit_number = cu.numero_unidade;
        // ensure floor numeric field
        if ((cu.floor == null || cu.floor === "") && cu.pavimento != null) {
          const parsed = parseInt(String(cu.pavimento).replace(/[^0-9]/g, ""));
          if (!Number.isNaN(parsed)) cu.floor = parsed;
        }
        return cu;
      });
    }

    try {
      const res = await projectService.saveProject(payload);
      // if API returns saved project with id, update local formData so tower component can use it
      const saved = res && res.data ? res.data : res;
      if (saved && saved.id) {
        setFormData((prev) => ({ ...prev, id: saved.id }));
      }
      // Upload project images if any were selected in the images tab
      if (
        saved &&
        saved.id &&
        formData.imagesFiles &&
        formData.imagesFiles.length
      ) {
        try {
          const { propertyImageService } = await import(
            "@/services/propertyImageService"
          );
          for (let i = 0; i < formData.imagesFiles.length; i++) {
            const file = formData.imagesFiles[i];
            const isPrimary =
              Number(formData.primaryImageIndex) === Number(i) ? 1 : 0;
            // client-side debug: ensure project_id is present and show file meta before upload
            try {
              console.debug("Uploading project image", {
                project_id: saved.id,
                fileName: file.name,
                fileSize: file.size,
                isPrimary,
                type: "project",
              });
            } catch (d) {
              console.debug("Uploading project image (name only):", {
                project_id: saved.id,
                fileName: file.name,
                isPrimary,
                type: "project",
              });
            }
            await propertyImageService.uploadImage(
              saved.id,
              file,
              isPrimary,
              "project"
            );
          }
        } catch (imgErr) {
          console.warn("Erro ao enviar imagens do projeto:", imgErr);
          toast({
            title: "⚠️ Atenção",
            description: "Projeto salvo, mas houve erro ao enviar imagens.",
            variant: "destructive",
          });
        }
      }
      // Persist towers and units that have temporary ids (created in UI) since
      // the projects endpoint does not save nested towers/units.
      if (saved && saved.id) {
        const projectIdSaved = saved.id;
        // map from old temp id -> new numeric id
        const tempTowerIdMap = {};
        try {
          // persist towers sequentially
          if (Array.isArray(formData.towers)) {
            const updatedTowers = [...formData.towers];
            for (let i = 0; i < formData.towers.length; i++) {
              const t = formData.towers[i];
              const idStr = t.id != null ? String(t.id) : "";
              const isTemp =
                idStr.startsWith("new_") ||
                idStr.startsWith("gen_") ||
                idStr.startsWith("import_") ||
                !/^[0-9]+$/.test(idStr);
              if (isTemp) {
                const payloadTower = { ...t, project_id: projectIdSaved };
                if (payloadTower.id != null) delete payloadTower.id;
                try {
                  const resT = await towerService.saveTower(payloadTower);
                  const savedT = resT && resT.data ? resT.data : resT;
                  const newId =
                    savedT && (savedT.id ?? savedT.ID)
                      ? savedT.id ?? savedT.ID
                      : null;
                  if (newId) {
                    tempTowerIdMap[t.id] = newId;
                    updatedTowers[i] = { ...t, ...savedT, id: newId };
                  } else {
                    updatedTowers[i] = { ...t, ...savedT };
                  }
                } catch (te) {
                  // non-fatal: notify and continue
                  console.error("Erro salvando torre:", te);
                }
              }
            }
            setFormData((prev) => ({ ...prev, towers: updatedTowers }));
          }

          // persist units
          if (Array.isArray(formData.units)) {
            const updatedUnits = [...formData.units];
            const saveErrors = [];
            const saveSuccesses = [];
            for (let i = 0; i < formData.units.length; i++) {
              const u = formData.units[i];
              const idStr = u.id != null ? String(u.id) : "";
              const isTempUnit =
                idStr.startsWith("new_") ||
                idStr.startsWith("gen_") ||
                idStr.startsWith("import_") ||
                !/^[0-9]+$/.test(idStr);

              // Build clean payload with English keys only (backend expects these)
              const payloadUnit = {
                // set project and tower ids
                project_id: projectIdSaved,
                tower_id: null,
                unit_number: null,
                floor: null,
                type: null,
                area_private: null,
                area_total: null,
                price: null,
                sale_status: null,
                specific_features: null,
              };

              // remap tower id
              if (u.torre_id != null && tempTowerIdMap[u.torre_id]) {
                payloadUnit.tower_id = tempTowerIdMap[u.torre_id];
              } else if (
                u.torre_id != null &&
                /^[0-9]+$/.test(String(u.torre_id))
              ) {
                payloadUnit.tower_id = Number(u.torre_id);
              } else if (
                u.tower_id != null &&
                /^[0-9]+$/.test(String(u.tower_id))
              ) {
                payloadUnit.tower_id = Number(u.tower_id);
              }

              // unit number
              if (u.unit_number != null)
                payloadUnit.unit_number = String(u.unit_number);
              else if (u.numero_unidade != null)
                payloadUnit.unit_number = String(u.numero_unidade);

              // floor
              if (u.floor != null && u.floor !== "")
                payloadUnit.floor = Number(u.floor);
              else if (u.pavimento != null) {
                const parsed = parseInt(
                  String(u.pavimento).replace(/[^0-9]/g, "")
                );
                if (!Number.isNaN(parsed)) payloadUnit.floor = parsed;
              }

              // type/area/price/status/features
              payloadUnit.type = u.type ?? u.tipo ?? null;
              payloadUnit.area_private =
                u.area_private ?? u.area_privativa ?? null;
              payloadUnit.area_total =
                u.area_total ?? u.area_total ?? u.area_privativa ?? null;
              payloadUnit.price = u.price ?? u.valor ?? null;
              payloadUnit.sale_status = u.sale_status ?? u.status_venda ?? null;
              payloadUnit.specific_features =
                u.specific_features ?? u.caracteristicas_especificas ?? "";

              // remove id for temp units so backend creates new
              if (isTempUnit) {
                // ensure we don't send client-side temp id
              } else if (u.id != null) {
                // existing unit: keep id to update
                payloadUnit.id = u.id;
              }

              try {
                console.debug("Saving unit payload:", payloadUnit);
                const resU = await unitService.saveUnit(payloadUnit);
                const savedU = resU && resU.data ? resU.data : resU;
                console.debug("Save unit response:", savedU);
                if (savedU) {
                  // normalize saved response and merge into local
                  updatedUnits[i] = { ...u, ...savedU };
                  saveSuccesses.push(savedU);
                }
              } catch (ue) {
                console.error("Erro salvando unidade:", ue);
                saveErrors.push({ unit: u, error: ue.message || String(ue) });
              }
            }
            setFormData((prev) => ({ ...prev, units: updatedUnits }));

            // show toast summary
            if (saveSuccesses.length > 0) {
              toast({
                title: "✅ Unidades salvas",
                description: `${saveSuccesses.length} unidades gravadas.`,
              });
            }
            if (saveErrors.length > 0) {
              toast({
                title: "❌ Erros ao salvar unidades",
                description: `${saveErrors.length} falhas. Verifique o console para detalhes.`,
                variant: "destructive",
              });
            }
          }
        } catch (pErr) {
          console.error(
            "Erro ao persistir torres/unidades apos salvar projeto",
            pErr
          );
        }
      }
      toast({
        title: isEditing ? "✅ Obra Atualizada" : "✅ Obra Cadastrada",
        description: `A obra "${formData.projectName}" foi salva.`,
      });
      navigate("/properties");
    } catch (e) {
      toast({
        title: "❌ Erro",
        description: e.message || "Erro ao salvar obra",
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
              ? "Editar Obra / Empreendimento"
              : "Cadastrar Nova Obra / Empreendimento"}
          </h1>
          <p className="text-slate-400">
            {isEditing
              ? "Atualize as informações da obra"
              : "Preencha os dados da obra"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-6">
            <TabsTrigger value="basic">Principal</TabsTrigger>
            <TabsTrigger value="towers">Torres</TabsTrigger>
            <TabsTrigger value="smart">
              <Bot className="w-4 h-4 mr-2" />
              Gerador Inteligente
            </TabsTrigger>
            <TabsTrigger value="images">Imagens</TabsTrigger>
          </TabsList>

          <motion.div
            key={id || "new"}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <TabsContent value="basic">
              <ProjectFormBasic
                formData={formData}
                onInputChange={handleInputChange}
              />
            </TabsContent>
            <TabsContent value="towers">
              <ProjectFormTowers
                towers={formData.towers}
                onTowersChange={handleTowerChange}
                projectType={formData.projectType}
                units={formData.units}
                onUnitsChange={(units) => handleInputChange("units", units)}
                projectId={formData.id}
              />
            </TabsContent>
            <TabsContent value="smart">
              <ProjectUnitsWizard
                towers={formData.towers}
                existingUnits={formData.units}
                onUnitsGenerated={handleUnitsGenerated}
                projectId={formData.id}
              />
            </TabsContent>
            <TabsContent value="images">
              <ProjectFormImages
                projectId={formData.id}
                imagesFiles={formData.imagesFiles || []}
                onFilesChange={(files) =>
                  setFormData((prev) => ({ ...prev, imagesFiles: files }))
                }
                selectedPrimaryIndex={formData.primaryImageIndex}
                onPrimarySelect={(idx) =>
                  setFormData((prev) => ({ ...prev, primaryImageIndex: idx }))
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
            {isEditing ? "Atualizar Obra" : "Salvar Obra"}
          </Button>
        </motion.div>
      </form>
    </div>
  );
};

export default ConstructionProjectForm;
