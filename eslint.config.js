import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  // ARQ-1 (sin localStorage) y ARQ-4 (nunca decidir por rol), D-FA11 de la spec frontend 01.
  {
    files: ['src/**/*.{js,jsx}'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'localStorage', message: 'ARQ-1: la sesión vive en memoria; no se usa localStorage.' },
        { name: 'sessionStorage', message: 'ARQ-1: la sesión vive en memoria; no se usa sessionStorage.' },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'window', property: 'localStorage', message: 'ARQ-1: no se usa localStorage.' },
        { object: 'window', property: 'sessionStorage', message: 'ARQ-1: no se usa sessionStorage.' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'BinaryExpression[operator=/^[!=]==?$/] > MemberExpression[property.name=/^(rol|role|userRole)$/]',
          message: 'ARQ-4: se decide por permisos (usePermissions), nunca por rol.',
        },
        {
          selector:
            'BinaryExpression[operator=/^[!=]==?$/] > Identifier[name=/^(rol|role|userRole)$/]',
          message: 'ARQ-4: se decide por permisos (usePermissions), nunca por rol.',
        },
        {
          selector: 'SwitchStatement > MemberExpression.discriminant[property.name=/^(rol|role|userRole)$/]',
          message: 'ARQ-4: se decide por permisos (usePermissions), nunca por rol.',
        },
      ],
    },
  },
  // P-FA12: error previo (variable `otros` sin uso) en un archivo que la spec frontend 01 no toca (DV-FA2).
  // Temporal: se retira con la spec de dinero, que reescribe CajaDiaria.jsx.
  {
    files: ['src/pages/CajaDiaria.jsx'],
    rules: {
      'no-unused-vars': 'off',
    },
  },
])
