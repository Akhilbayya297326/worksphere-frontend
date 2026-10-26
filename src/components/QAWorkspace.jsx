import React from 'react';
import UnifiedWorkspace from './UnifiedWorkspace';

// Review persisted project tasks using the shared workspace workflow.
export default function QAWorkspace({ project }) {
    return <UnifiedWorkspace project={project} reviewOnly />;
}
