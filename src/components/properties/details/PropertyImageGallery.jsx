import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getStatusColor } from '@/lib/propertyUtils';
import { propertyImageService, API_BASE } from '@/services/propertyImageService';

const placeholder = 'https://images.unsplash.com/photo-1684419432087-7df72ed168cd';

const buildSrc = (s) => {
  if (!s) return placeholder;
  if (s.startsWith('http') || s.startsWith('data:')) return s;
  if (typeof API_BASE === 'string' && s.startsWith(API_BASE)) return s;
  const cleaned = s.startsWith('/') ? s.substring(1) : s;
  if (API_BASE.endsWith('/')) return API_BASE + cleaned;
  return API_BASE + '/' + cleaned;
};

const PropertyImageGallery = ({ property }) => {
  const [images, setImages] = useState([]);
  const [mainSrc, setMainSrc] = useState(placeholder);

  useEffect(() => {
    let mounted = true;

    const attachImages = (imgs) => {
      if (!Array.isArray(imgs)) return;
      setImages(imgs);
      // prefer image marked as primary
      const primary = imgs.find(i => Number(i.is_primary) === 1) || imgs[0];
      if (primary && primary.image_url) setMainSrc(buildSrc(primary.image_url));
    };

    // if backend already sent images array, use it
    if (property.images && Array.isArray(property.images) && property.images.length > 0) {
      attachImages(property.images);
      return () => { mounted = false; };
    }

    // if property has image/image_url field, use it as main
    if (property.image || property.image_url) {
      setMainSrc(buildSrc(property.image || property.image_url));
    }

    // fetch images from API as fallback
    (async () => {
      try {
        const imgs = await propertyImageService.getImagesByProperty(property.id);
        if (!mounted) return;
        if (Array.isArray(imgs) && imgs.length > 0) {
          attachImages(imgs);
        }
      } catch (e) {
        // silently ignore fetch errors to avoid breaking UI
      }
    })();

    return () => { mounted = false; };
  }, [property]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
      <Card className="glass-effect border-slate-700 overflow-hidden">
        <div className="relative">
          <img className="w-full h-96 object-cover" alt={`Imagem principal do imóvel ${property.title}`} src={mainSrc} />
          <div className="absolute top-4 left-4">
            <Badge className={getStatusColor(property.status)}>{property.status}</Badge>
          </div>
          <div className="absolute top-4 right-4">
            <Badge variant="secondary" className="bg-black/50 text-white">{property.type}</Badge>
          </div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-3 gap-2">
            {images && images.length > 0 ? (
              images.map((img) => {
                const thumbSrc = buildSrc(img.image_url);
                const isPrimary = Number(img.is_primary) === 1;
                return (
                  <img
                    key={img.id}
                    className={`w-full h-20 object-cover rounded cursor-pointer ${isPrimary ? 'border-2 border-blue-500' : 'border border-slate-600 hover:border-blue-500'}`}
                    alt={img.description || `Imagem ${img.id}`}
                    src={thumbSrc}
                    onClick={() => setMainSrc(buildSrc(img.image_url))}
                  />
                );
              })
            ) : (
              // fallback placeholders if no images
              [0,1,2].map(i => (
                <img key={i} className="w-full h-20 object-cover rounded border border-slate-600" alt={`placeholder-${i}`} src={placeholder} />
              ))
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default PropertyImageGallery;