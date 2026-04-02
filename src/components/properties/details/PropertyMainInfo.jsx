import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Bed, Bath, Car, Maximize } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const PropertyMainInfo = ({ property }) => {
  const features = property.features || [];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <Card className="glass-effect border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Informações do Imóvel</CardTitle>
            <div className="text-2xl font-bold text-blue-400">
              R$ {Number(property.price).toLocaleString('pt-BR')}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center text-slate-300">
            <MapPin className="w-5 h-5 mr-2 text-slate-400" />
            <span>{property.address}, {property.city} - {property.state}, {property.zipCode}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {property.bedrooms > 0 && (
              <div className="flex items-center space-x-2 p-3 rounded-lg bg-slate-700/30">
                <Bed className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-sm text-slate-400">Quartos</p>
                  <p className="font-semibold text-white">{property.bedrooms}</p>
                </div>
              </div>
            )}
            {property.bathrooms > 0 && (
              <div className="flex items-center space-x-2 p-3 rounded-lg bg-slate-700/30">
                <Bath className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-sm text-slate-400">Banheiros</p>
                  <p className="font-semibold text-white">{property.bathrooms}</p>
                </div>
              </div>
            )}
            {property.parking > 0 && (
              <div className="flex items-center space-x-2 p-3 rounded-lg bg-slate-700/30">
                <Car className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-sm text-slate-400">Vagas</p>
                  <p className="font-semibold text-white">{property.parking}</p>
                </div>
              </div>
            )}
            <div className="flex items-center space-x-2 p-3 rounded-lg bg-slate-700/30">
              <Maximize className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-sm text-slate-400">Área</p>
                <p className="font-semibold text-white">{property.area}m²</p>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Descrição</h3>
            <p className="text-slate-300 leading-relaxed">{property.description}</p>
          </div>
          {features.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Características</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-2 p-2 rounded bg-slate-700/30">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-slate-300">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PropertyMainInfo;