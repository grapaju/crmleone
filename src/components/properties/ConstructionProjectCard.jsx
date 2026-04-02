
import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Building, MapPin, Eye, Edit, Trash2, CheckCircle, Percent } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { getStatusColor, formatStatus, formatType } from '@/lib/propertyUtils';
import { formatDateForCard } from '@/lib/dateUtils';

const ConstructionProjectCard = ({ project, onDelete }) => {
  // Defensive: garantir arrays default para evitar crashes quando dados da API não incluem estes campos
  const units = Array.isArray(project.units) ? project.units : [];
  const totalUnits = units.length;
  const soldUnits = units.filter(u => u.status_venda === 'vendido').length;
  const salesPercentage = totalUnits > 0 ? (soldUnits / totalUnits) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="group"
    >
      <Card className="glass-effect border-slate-700 overflow-hidden card-hover h-full flex flex-col">
        <div className="relative">
          <img 
            className="w-full h-48 object-cover"
            alt={`Imagem da obra ${project.projectName}`}
            src={project.image || "https://images.unsplash.com/photo-1512917774080-9991f1c4c750"}
          />
          <div className="absolute top-4 left-4">
            <Badge className={getStatusColor(project.projectStatus)}>
              {formatStatus(project.projectStatus)}
            </Badge>
          </div>
          <div className="absolute top-4 right-4">
            <Badge variant="secondary" className="bg-black/50 text-white capitalize">
              {formatType(project.projectType)}
            </Badge>
          </div>
        </div>
        
        <CardContent className="p-6 flex-grow flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-blue-400">{project.developerName}</p>
              <h3 className="text-lg font-semibold text-white mb-2 truncate">{project.projectName}</h3>
            </div>
            
            <div className="flex items-center text-slate-400 text-sm truncate">
              <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
              {project.bairro}, {project.cidade}
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                 <p className="text-sm text-slate-300 font-medium">Unidades Vendidas</p>
                 <p className="text-sm font-bold text-white">{soldUnits} / {totalUnits}</p>
              </div>
              <Progress value={salesPercentage} />
              <p className="text-xs text-right text-slate-400 mt-1">{salesPercentage.toFixed(1)}%</p>
            </div>
            
            <div className="flex items-center justify-between text-slate-300 pt-2">
              <div className="flex items-center">
                <Building className="w-4 h-4 mr-1" />
                <span className="text-sm">{(Array.isArray(project.towers) ? project.towers.length : 1)} Torre(s)</span>
              </div>
                <div className="flex items-center">
                <CheckCircle className="w-4 h-4 mr-1" />
                <span className="text-sm">Entrega: {formatDateForCard(project.deliveryDate)}</span>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-2 pt-4 mt-4">
            <Link to={`/properties/project/${project.id}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full border-slate-600 hover:bg-slate-700/50">
                <Eye className="w-4 h-4 mr-2" />
                Ver Obra
              </Button>
            </Link>
            <Link to={`/properties/edit-project/${project.id}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full border-slate-600 hover:bg-slate-700/50">
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-red-600 text-red-400 hover:bg-red-600/20"
              onClick={() => onDelete(project.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ConstructionProjectCard;
