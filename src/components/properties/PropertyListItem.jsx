
import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MapPin, Bed, Bath, Car, Eye, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getStatusColor, formatStatus, formatType } from '@/lib/propertyUtils';

export const PropertyListItem = ({ property, onDelete }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    className="group"
  >
    <Card className="glass-effect border-slate-700 card-hover">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
          <img 
            className="w-full sm:w-28 h-28 object-cover rounded-lg"
            alt={`Imagem do imóvel ${property.title}`}
           src="https://images.unsplash.com/photo-1684419432087-7df72ed168cd" />
          
          <div className="flex-1 space-y-2 w-full">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
              <h3 className="text-lg font-semibold text-white truncate">{property.title}</h3>
              <div className="flex space-x-2 mt-2 sm:mt-0">
                <Badge className={getStatusColor(property.status)}>
                  {formatStatus(property.status)}
                </Badge>
                <Badge variant="secondary" className="bg-slate-700 text-slate-300 capitalize">
                  {formatType(property.type)}
                </Badge>
              </div>
            </div>
            
            <p className="text-xl font-bold text-blue-400">
              R$ {Number(property.price).toLocaleString('pt-BR')}
            </p>
            
            <div className="flex items-center text-slate-400 text-sm truncate">
              <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
              {property.address}, {property.city}
            </div>
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-300">
              {property.bedrooms > 0 && (
                <div className="flex items-center">
                  <Bed className="w-4 h-4 mr-1" />
                  <span className="text-sm">{property.bedrooms} quartos</span>
                </div>
              )}
              {property.bathrooms > 0 && (
                <div className="flex items-center">
                  <Bath className="w-4 h-4 mr-1" />
                  <span className="text-sm">{property.bathrooms} banheiros</span>
                </div>
              )}
              {property.parking > 0 && (
                <div className="flex items-center">
                  <Car className="w-4 h-4 mr-1" />
                  <span className="text-sm">{property.parking} vagas</span>
                </div>
              )}
              <div className="text-sm">
                {property.area}m²
              </div>
            </div>
          </div>
          
          <div className="flex flex-row sm:flex-col space-x-2 sm:space-x-0 sm:space-y-2 w-full sm:w-auto">
            <Link to={`/properties/${property.id}`} className="flex-1 sm:flex-none">
              <Button variant="outline" size="sm" className="border-slate-600 hover:bg-slate-700/50 w-full">
                <Eye className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Ver</span>
              </Button>
            </Link>
            <Link to={`/properties/edit/${property.id}`} className="flex-1 sm:flex-none">
              <Button variant="outline" size="sm" className="border-slate-600 hover:bg-slate-700/50 w-full">
                <Edit className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Editar</span>
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
