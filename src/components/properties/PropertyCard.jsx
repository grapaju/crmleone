
import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MapPin, Bed, Bath, Car, Eye, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getStatusColor, formatStatus, formatType } from '@/lib/propertyUtils';
import { API_BASE } from '@/services/propertyImageService';

export const PropertyCard = ({ property, onDelete }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -4 }}
    className="group"
  >
    <Card className="glass-effect border-slate-700 overflow-hidden card-hover">
      <div className="relative">
        {(() => {
          // prioridade: property.image/url, then property.images with is_primary, then placeholder
          const imgSrc = property.image || property.image_url || (property.images && Array.isArray(property.images) ? (property.images.find(i => Number(i.is_primary) === 1) || {}).image_url : null);
          const buildSrc = (s) => {
            const placeholder = 'https://images.unsplash.com/photo-1684419432087-7df72ed168cd';
            if (!s) return placeholder;
            // already absolute HTTP(S) or data URL
            if (s.startsWith('http') || s.startsWith('data:')) return s;
            // already contains the API_BASE prefix
            if (typeof API_BASE === 'string' && s.startsWith(API_BASE)) return s;
            // strip leading slash to avoid double // when concatenating
            const cleaned = s.startsWith('/') ? s.substring(1) : s;
            // ensure single slash between API_BASE and cleaned
            if (API_BASE.endsWith('/')) return API_BASE + cleaned;
            return API_BASE + '/' + cleaned;
          };
          const src = buildSrc(imgSrc);
          return (
            <img className="w-full h-48 object-cover" alt={`Imagem do imóvel ${property.title}`} src={src} />
          );
        })()}
        <div className="absolute top-4 left-4">
          <Badge className={getStatusColor(property.status)}>
            {formatStatus(property.status)}
          </Badge>
        </div>
        <div className="absolute top-4 right-4">
          <Badge variant="secondary" className="bg-black/50 text-white capitalize">
            {formatType(property.type)}
          </Badge>
        </div>
      </div>
      
      <CardContent className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-white mb-2 truncate">{property.title}</h3>
            <p className="text-2xl font-bold text-blue-400">
              R$ {Number(property.price).toLocaleString('pt-BR')}
            </p>
          </div>
          
          <div className="flex items-center text-slate-400 text-sm truncate">
            <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
            {property.address}, {property.city}
          </div>
          
          <div className="flex items-center justify-between text-slate-300">
            {property.bedrooms > 0 && (
              <div className="flex items-center">
                <Bed className="w-4 h-4 mr-1" />
                <span className="text-sm">{property.bedrooms}</span>
              </div>
            )}
            {property.bathrooms > 0 && (
              <div className="flex items-center">
                <Bath className="w-4 h-4 mr-1" />
                <span className="text-sm">{property.bathrooms}</span>
              </div>
            )}
            {property.parking > 0 && (
              <div className="flex items-center">
                <Car className="w-4 h-4 mr-1" />
                <span className="text-sm">{property.parking}</span>
              </div>
            )}
            <div className="text-sm">
              {property.area}m²
            </div>
          </div>
          
          <div className="flex space-x-2 pt-4">
            <Link to={`/properties/${property.id}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full border-slate-600 hover:bg-slate-700/50">
                <Eye className="w-4 h-4 mr-2" />
                Ver
              </Button>
            </Link>
            <Link to={`/properties/edit/${property.id}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full border-slate-600 hover:bg-slate-700/50">
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-red-600 text-red-400 hover:bg-red-600/20"
              onClick={() => onDelete(property.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);
