import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import AgentCard from './AgentCard';

const AgentList = ({ agents, onDelete }) => {
    return (
        <AnimatePresence>
            {agents.map((agent, index) => (
                <motion.div
                    key={agent.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    layout
                >
                    <AgentCard agent={agent} onDelete={onDelete} />
                </motion.div>
            ))}
        </AnimatePresence>
    );
};

export default AgentList;