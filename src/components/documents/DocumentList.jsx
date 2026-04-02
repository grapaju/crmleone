import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import DocumentCard from './DocumentCard';

const DocumentList = ({ documents, onDelete }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <AnimatePresence>
        {documents.map((document, index) => (
          <motion.div
            key={document.id}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <DocumentCard document={document} onDelete={onDelete} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default DocumentList;