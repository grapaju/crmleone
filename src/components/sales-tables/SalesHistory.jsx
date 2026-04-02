import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Clock,
  Sheet,
  User,
  Mail,
  MessageCircle,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import { salesTableService } from "@/services/salesTableService";
import { Link } from "react-router-dom";

const SalesHistory = ({ history }) => {
  const safeHistory = Array.isArray(history) ? history : [];
  const [tableNames, setTableNames] = useState({});
  useEffect(() => {
    if (!safeHistory.length) return;
    // coletar ids únicos
    const ids = Array.from(new Set(safeHistory.map(e => e.table_id ?? e.tableId ?? e.tableId).filter(Boolean)));
    if (!ids.length) return;
    // buscar em paralelo, ignorando erros individuais
    Promise.all(ids.map(id => salesTableService.getTableById(id).catch(() => null))).then(results => {
      const map = {};
      results.forEach((res, idx) => {
        const id = ids[idx];
        if (res && (res.name || res.title)) map[id] = res.name || res.title;
      });
      setTableNames(map);
    }).catch(() => {});
  }, [safeHistory]);

  if (safeHistory.length === 0) {
    return (
      <div className="text-center py-16">
        <Clock className="w-12 h-12 mx-auto text-slate-400 mb-4" />
        <h3 className="text-xl font-semibold text-white">
          Nenhum Envio Registrado
        </h3>
        <p className="text-slate-400">O histórico de envios aparecerá aqui.</p>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case "Enviado":
        return (
          <Badge className="bg-green-500/20 text-green-400">
            <CheckCircle className="w-3 h-3 mr-1" />
            {status}
          </Badge>
        );
      case "Erro":
        return (
          <Badge className="bg-red-500/20 text-red-400">
            <AlertTriangle className="w-3 h-3 mr-1" />
            {status}
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getTypeBadge = (type) => {
    if (!type) return null;
    const t = String(type).toLowerCase();
    switch (t) {
      case 'manual':
        return (
          <Badge className="bg-slate-700/30 text-slate-200">
            Manual
          </Badge>
        );
      case 'automation':
      case 'automacao':
      case 'automação':
        return (
          <Badge className="bg-blue-600/20 text-blue-400">
            Automação
          </Badge>
        );
      default:
        return <Badge>{String(type)}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {safeHistory.map((entry) => (
        <motion.div
          key={entry.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="p-4 rounded-lg bg-slate-800/50 border border-slate-700"
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center text-white font-semibold">
                <Sheet className="w-4 h-4 mr-2" />
                {/* Mostrar nome resolvido ou fallback para id */}
                {(() => {
                  const id = entry.table_id ?? entry.tableId ?? entry.tableId;
                  const resolved = entry.tableName || tableNames[id] || (id ? `Tabela #${id}` : "—");
                  const linkTo = id ? `/sales-tables/edit/${id}` : null; // Assumimos rota de edição neste formato
                  return linkTo ? (
                    <Link to={linkTo} className="hover:underline text-white">
                      {resolved}
                    </Link>
                  ) : (
                    <span>{resolved}</span>
                  );
                })()}
              </div>
              <div className="text-sm text-slate-400 mt-1">
                {new Date(entry.date).toLocaleString("pt-BR")}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getTypeBadge(entry.type)}
              {getStatusBadge(entry.status)}
            </div>
          </div>
          <div className="border-t border-slate-700 my-3"></div>
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center text-slate-300">
              {entry.channel === "email" ? (
                <Mail className="w-4 h-4 mr-2" />
              ) : (
                <MessageCircle className="w-4 h-4 mr-2" />
              )}
              Enviado via {entry.channel}
            </div>
            <div className="flex items-center text-slate-300">
              <User className="w-4 h-4 mr-2" />
              {(() => {
                const recArr = Array.isArray(entry.recipients)
                  ? entry.recipients
                  : (typeof entry.recipients === 'string' && entry.recipients.length)
                    ? entry.recipients.split(',').map(s => s.trim()).filter(Boolean)
                    : [];
                return `${recArr.length} destinatário(s)`;
              })()}
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Destinatários:{' '}
            {(() => {
              const recArr = Array.isArray(entry.recipients)
                ? entry.recipients
                : (typeof entry.recipients === 'string' && entry.recipients.length)
                  ? entry.recipients.split(',').map(s => s.trim()).filter(Boolean)
                  : [];
              const full = recArr.join(', ');
              const max = 80;
              if (!full) return <span>—</span>;
              if (full.length > max) {
                const truncated = full.slice(0, max) + '...';
                return (
                  <Tooltip content={full} side="top">
                    <span className="cursor-help text-slate-300">{truncated}</span>
                  </Tooltip>
                );
              }
              return <span>{full}</span>;
            })()}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default SalesHistory;
