/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'schema-imports-nothing-internal',
      comment: 'packages/schema must not import from any other internal package or app',
      severity: 'error',
      from: { path: '^packages/schema' },
      to: { path: '^(packages/(?!schema)|apps/|tooling/)' },
    },
    {
      name: 'core-only-imports-schema',
      comment: 'packages/core may only import from packages/schema (no export, apps, tooling)',
      severity: 'error',
      from: { path: '^packages/core' },
      to: { path: '^(packages/(?!(core|schema))|apps/|tooling/)' },
    },
    {
      name: 'core-no-platform-imports',
      comment: 'packages/core source must never import platform-specific or framework modules',
      severity: 'error',
      from: { path: '^packages/core/src/(?!__tests__/)' },
      to: {
        dependencyTypes: ['core'],
        path: '^(fs|fs/promises|path|child_process|cluster|os|http|https|net|tls|dgram)$',
      },
    },
    {
      name: 'presets-only-imports-schema',
      comment: 'packages/presets may only import packages/schema',
      severity: 'error',
      from: { path: '^packages/presets' },
      to: { path: '^(packages/(?!(presets|schema))|apps/|tooling/)' },
    },
    {
      name: 'export-allowed-deps',
      comment: 'packages/export may import packages/schema and packages/core',
      severity: 'error',
      from: { path: '^packages/export' },
      to: { path: '^(packages/(?!(export|core|schema))|apps/|tooling/)' },
    },
    {
      name: 'no-circular',
      comment: 'Disallow circular dependencies',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'packages-never-import-apps',
      comment: 'Packages must never import from apps',
      severity: 'error',
      from: { path: '^packages/' },
      to: { path: '^apps/' },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.base.json',
    },
  },
};
