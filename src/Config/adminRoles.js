const ADMIN_ROLES = {
  FOUNDER: 'FOUNDER',
  HOD: 'HOD',
  SENIOR_MANAGER: 'SENIOR_MANAGER',
  MANAGER: 'MANAGER',
  EXECUTIVE: 'EXECUTIVE',
  TRAINEE: 'TRAINEE',
};

const TRAINEE_DEPARTMENTS = {
  MARKETING_SALES: 'MARKETING_SALES',
  SERVICE_OPS: 'SERVICE_OPS',
};

const normalizeRole = (role, type) => {
  if (!role) {
    if (Number(type) === 5) return ADMIN_ROLES.FOUNDER;
    return ADMIN_ROLES.EXECUTIVE;
  }

  const value = String(role).trim().toUpperCase().replace(/\s+/g, '_');
  if (value === 'ADMIN' || value === 'SUPER_ADMIN') return ADMIN_ROLES.FOUNDER;
  if (Object.values(ADMIN_ROLES).includes(value)) return value;
  return ADMIN_ROLES.EXECUTIVE;
};

const normalizeDepartment = (department) => {
  if (!department) return TRAINEE_DEPARTMENTS.SERVICE_OPS;
  const value = String(department).trim().toUpperCase().replace(/\s+/g, '_');
  if (Object.values(TRAINEE_DEPARTMENTS).includes(value)) return value;
  return TRAINEE_DEPARTMENTS.SERVICE_OPS;
};

const resolveModuleFromPath = (path = '') => {
  const p = path.toLowerCase();
  if (p.includes('/admin/enquir') || p.includes('/enquir')) return 'enquiries';
  if (p.includes('/lead')) return 'leads';
  if (p.includes('consultancy')) return 'consultancy';
  if (p.includes('/technician') && p.includes('attendance')) return 'attendance';
  if (
    p.includes('/technician') &&
    (p.includes('helper') || p.includes('pair') || p.includes('acd-helper'))
  ) {
    return 'helpers';
  }
  if (p.includes('assign_technician') || p.includes('/booking/assign')) {
    return 'assign_technician';
  }
  if (p.includes('/shop/')) return 'products';
  if (p.includes('/service')) return 'services';
  if (p.includes('/booking')) return 'bookings';
  if (p.includes('/payment')) return 'payments';
  if (p.includes('/customer') || p.includes('/admin/user')) return 'customers';
  if (p.includes('/technician')) return 'technicians';
  if (p.includes('/coupon')) return 'coupons';
  if (p.includes('/banner')) return 'banners';
  if (p.includes('/material')) return 'material';
  if (p.includes('/taxation')) return 'taxation';
  if (p.includes('/tool')) return 'tools';
  if (p.includes('/purchase')) return 'purchase';
  if (p.includes('/amc')) return 'amc';
  if (p.includes('/copper')) return 'copper_piping';
  if (p.includes('/sell-old')) return 'sell_old_ac';
  if (p.includes('/admin/staff')) return 'admin_staff';
  return 'general';
};

const ROLE_RULES = {
  [ADMIN_ROLES.FOUNDER]: {
    view: ['*'],
    create: ['*'],
    edit: ['*'],
    delete: ['*'],
  },
  [ADMIN_ROLES.HOD]: {
    view: ['*'],
    create: ['*'],
    edit: ['*'],
    delete: [],
  },
  [ADMIN_ROLES.SENIOR_MANAGER]: {
    view: ['*'],
    create: ['*'],
    edit: ['*'],
    delete: [],
  },
  [ADMIN_ROLES.MANAGER]: {
    view: [
      'enquiries',
      'bookings',
      'technicians',
      'attendance',
      'helpers',
      'assign_technician',
      'leads',
      'consultancy',
      'customers',
      'payments',
      'purchase',
      'amc',
      'copper_piping',
      'sell_old_ac',
      'general',
    ],
    create: ['bookings', 'enquiries', 'assign_technician'],
    edit: ['bookings', 'enquiries', 'assign_technician', 'technicians', 'attendance', 'helpers'],
    delete: [],
  },
  [ADMIN_ROLES.EXECUTIVE]: {
    view: ['*'],
    create: [],
    edit: [],
    delete: [],
  },
};

const TRAINEE_RULES = {
  [TRAINEE_DEPARTMENTS.MARKETING_SALES]: {
    view: ['leads', 'consultancy', 'general'],
    create: [],
    edit: [],
    delete: [],
  },
  [TRAINEE_DEPARTMENTS.SERVICE_OPS]: {
    view: ['enquiries', 'technicians', 'attendance', 'helpers', 'assign_technician', 'general'],
    create: ['assign_technician'],
    edit: ['assign_technician', 'attendance', 'helpers'],
    delete: [],
  },
};

const allows = (allowedModules, moduleName) => {
  if (!allowedModules || allowedModules.length === 0) return false;
  if (allowedModules.includes('*')) return true;
  return allowedModules.includes(moduleName);
};

const getRoleRules = (role, department) => {
  if (role === ADMIN_ROLES.TRAINEE) {
    return TRAINEE_RULES[normalizeDepartment(department)];
  }
  return ROLE_RULES[role] || ROLE_RULES[ADMIN_ROLES.EXECUTIVE];
};

const FOUNDER_ONLY_MODULES = new Set(['admin_staff']);

const getHttpAction = (method = 'GET') => {
  const verb = method.toUpperCase();
  if (verb === 'GET' || verb === 'HEAD') return 'view';
  if (verb === 'DELETE') return 'delete';
  return 'edit';
};

const ALL_MODULES = [
  'dashboard',
  'enquiries',
  'cancelled',
  'payments',
  'customers',
  'technicians',
  'attendance',
  'helpers',
  'assign_technician',
  'bookings',
  'promotions',
  'leads',
  'services',
  'coupons',
  'banners',
  'products',
  'material',
  'taxation',
  'tools',
  'amc',
  'copper_piping',
  'consultancy',
  'purchase',
  'sell_old_ac',
  'utility',
  'admin_staff',
  'general',
];

const buildPermissionPayloadFromModules = (role, department, modules = {}) => {
  const view = modules.view || [];
  const create = modules.create || [];
  const edit = modules.edit || [];
  const del = modules.delete || [];
  return {
    role,
    department: role === ADMIN_ROLES.TRAINEE ? normalizeDepartment(department) : null,
    canDelete: allows(del, '*') || del.length > 0,
    canCreate: allows(create, '*') || create.length > 0,
    canEdit: allows(edit, '*') || edit.length > 0,
    canView: allows(view, '*') || view.length > 0,
    useCustomPermissions: true,
    modules: { view, create, edit, delete: del },
  };
};

const buildPermissionPayload = (role, department) => {
  const rules = getRoleRules(role, department);
  return {
    role,
    department: role === ADMIN_ROLES.TRAINEE ? normalizeDepartment(department) : null,
    canDelete: allows(rules.delete, '*') || rules.delete.length > 0,
    canCreate: allows(rules.create, '*') || rules.create.length > 0,
    canEdit: allows(rules.edit, '*') || rules.edit.length > 0,
    canView: allows(rules.view, '*') || rules.view.length > 0,
    useCustomPermissions: false,
    modules: {
      view: rules.view,
      create: rules.create,
      edit: rules.edit,
      delete: rules.delete,
    },
  };
};

const resolvePermissions = (adminDoc = {}) => {
  const role = normalizeRole(adminDoc.role, adminDoc.type);
  const department =
    role === ADMIN_ROLES.TRAINEE ? normalizeDepartment(adminDoc.department) : null;

  if (adminDoc.useCustomPermissions && adminDoc.customPermissions?.modules) {
    return buildPermissionPayloadFromModules(
      role,
      department,
      adminDoc.customPermissions.modules,
    );
  }

  return buildPermissionPayload(role, department);
};

const canPerformAction = (role, department, action, path, permissions, useCustomPermissions) => {
  const moduleName = resolveModuleFromPath(path);
  const resolved =
    permissions || buildPermissionPayload(role, department);

  if (
    !useCustomPermissions &&
    FOUNDER_ONLY_MODULES.has(moduleName) &&
    role !== ADMIN_ROLES.FOUNDER
  ) {
    return false;
  }

  return allows(resolved.modules[action] || [], moduleName);
};

module.exports = {
  ADMIN_ROLES,
  TRAINEE_DEPARTMENTS,
  ALL_MODULES,
  normalizeRole,
  normalizeDepartment,
  resolveModuleFromPath,
  canPerformAction,
  getHttpAction,
  buildPermissionPayload,
  buildPermissionPayloadFromModules,
  resolvePermissions,
};
