const developerRoles = new Set(['Developer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'DevOps Engineer']);

export const getNavigationRole = role => developerRoles.has(role) ? 'Developer' : role;
