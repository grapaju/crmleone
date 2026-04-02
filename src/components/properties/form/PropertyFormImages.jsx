import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, Trash } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { propertyImageService, API_BASE } from '@/services/propertyImageService';

const PropertyFormImages = ({ imagesFiles = [], onFilesChange, propertyId = null, selectedPrimaryIndex = null, onPrimarySelect = null }) => {
  const { toast } = useToast();
  const inputRef = useRef(null);
  const [existingImages, setExistingImages] = useState([]);
  const [loading, setLoading] = useState(false);
    const [primaryImageId, setPrimaryImageId] = useState(null);
    // selectedPrimaryIndex vem do pai quando necessário; se onPrimarySelect fornecido, usaremos o lifting

  useEffect(() => {
    const fetch = async () => {
      if (!propertyId) return;
      setLoading(true);
      try {
        const res = await propertyImageService.getImagesByProperty(propertyId);
        // backend may return { data: [...] } or array
        const list = res && res.data ? res.data : (Array.isArray(res) ? res : (res.images || []));
        setExistingImages(list || []);
      } catch (e) {
        console.warn('Erro carregando imagens existentes:', e);
        toast({ title: 'Erro', description: 'Não foi possível carregar imagens existentes.' });
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [propertyId]);

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (onFilesChange) onFilesChange(files);
  };

  const handleDeleteExisting = async (imgId) => {
    if (!confirm('Excluir imagem?')) return;
    try {
      await propertyImageService.deleteImage(imgId);
      setExistingImages(prev => prev.filter(i => Number(i.id || i.ID) !== Number(imgId)));
      toast({ title: 'Imagem excluída' });
    } catch (e) {
      console.warn('Erro excluindo imagem:', e);
      toast({ title: 'Erro', description: 'Não foi possível excluir a imagem.' });
    }
  };

  const handleSetPrimaryExisting = async (imgId) => {
    try {
      // atualiza localmente
      setPrimaryImageId(imgId);
      // opcional: chamar API para marcar como primary (PUT)
      await propertyImageService.saveImage({ id: imgId, is_primary: 1 });
      // desmarcar outras imagens no frontend
      setExistingImages(prev => prev.map(i => ({ ...i, is_primary: Number(i.id || i.ID) === Number(imgId) ? 1 : 0 })));
      toast({ title: 'Imagem marcada como capa' });
    } catch (e) {
      console.warn('Erro marcando capa:', e);
      toast({ title: 'Erro', description: 'Não foi possível marcar como capa.' });
    }
  };

  const handleSelectPrimaryForNew = (index) => {
    if (typeof onPrimarySelect === 'function') return onPrimarySelect(index);
    // se não houver handler no pai, mantemos local como fallback
    // (não implementado para manter simplicidade)
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
      <Card className="glass-effect border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Imagens</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center">
            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Upload de Imagens</h3>
            <p className="text-slate-400 mb-4">Arraste e solte as imagens aqui ou clique para selecionar</p>
            <div className="flex flex-col items-center">
              {/* usar ref e disparar input.click() para garantir compatibilidade com estilos que definem display:none */}
              <input id="property-images" ref={inputRef} type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
              {/* botão controla o input via ref para abrir o file picker */}
              <label htmlFor="property-images">
                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-600 hover:bg-slate-700/50"
                  onClick={(e) => {
                    e.preventDefault();
                    if (inputRef && inputRef.current) inputRef.current.click();
                  }}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Selecionar Imagens
                </Button>
              </label>
              <div className="mt-4 w-full">
                {existingImages && existingImages.length > 0 && (
                  <div className="mb-4">
                    <div className="text-sm text-slate-300 mb-2">Imagens existentes</div>
                    <div className="grid grid-cols-3 gap-2">
                      {existingImages.map((img, idx) => (
                        <div key={idx} className="bg-slate-800 p-2 rounded relative">
                          <img src={img.image_url ? (img.image_url.startsWith('http') ? img.image_url : API_BASE + img.image_url) : img.imageUrl || ''} alt={img.image_url || img.imageUrl} className="w-full h-24 object-cover rounded" />
                          <div className="absolute top-1 right-1 flex space-x-1">
                            <button type="button" className="bg-blue-600 rounded p-1" onClick={() => handleSetPrimaryExisting(img.id || img.ID)} title="Marcar como capa">
                              <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2l2.39 4.85L18 8.18l-4 3.9.95 5.5L10 14.77 5.05 17.58 6 12.08 2 8.18l5.61-.83L10 2z"/></svg>
                            </button>
                            <button type="button" className="bg-red-600 rounded p-1" onClick={() => handleDeleteExisting(img.id || img.ID)}>
                              <Trash className="w-3 h-3 text-white" />
                            </button>
                          </div>
                          {Number(img.is_primary) === 1 && (
                            <div className="absolute bottom-1 left-1 bg-yellow-500 text-black text-xs px-2 py-0.5 rounded">Capa</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {imagesFiles && imagesFiles.length > 0 ? (
                  <div>
                    <div className="grid grid-cols-3 gap-2">
                      {imagesFiles.map((f, idx) => (
                        <div key={idx} className="bg-slate-800 p-2 rounded relative">
                          <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-24 object-cover rounded" />
                          <div className="text-xs text-slate-300 mt-1">{f.name}</div>
                          <button type="button" className={`absolute top-1 right-1 rounded p-1 ${selectedPrimaryIndex === idx ? 'bg-yellow-400' : 'bg-slate-700'}`} onClick={() => handleSelectPrimaryForNew(idx)} title="Marcar como capa">
                            <svg className="w-3 h-3 text-black" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2l2.39 4.85L18 8.18l-4 3.9.95 5.5L10 14.77 5.05 17.58 6 12.08 2 8.18l5.61-.83L10 2z"/></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="text-slate-300 text-sm mt-2">Clique na estrela para escolher qual imagem será a capa ao enviar.</div>
                  </div>
                ) : (
                  <div className="text-slate-400 mt-3">Nenhuma imagem selecionada</div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PropertyFormImages;