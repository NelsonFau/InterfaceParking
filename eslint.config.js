import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

// ARQ-1: sin localStorage ni sessionStorage (D-FA11).
const ARQ1_PROPERTIES = [
  { object: 'window', property: 'localStorage', message: 'ARQ-1: no se usa localStorage.' },
  { object: 'window', property: 'sessionStorage', message: 'ARQ-1: no se usa sessionStorage.' },
]

// D-FB9: los toLocale* se bloquean en cualquier objeto, también en Number#toLocaleString, para que el
// locale quede fijo en un solo lugar (fechas.js y formato.js).
const TOLOCALE_MESSAGE =
  'Las fechas se muestran con formatInstant de src/utils/fechas.js (zona del tenant); ' +
  'los números y la moneda, con formatNumber y formatMoney de src/utils/formato.js.'
const TOLOCALE_PROPERTIES = ['toLocaleString', 'toLocaleDateString', 'toLocaleTimeString'].map((property) => ({
  property,
  message: TOLOCALE_MESSAGE,
}))

// Una regla de flat config que se vuelve a definir REEMPLAZA a la anterior, no se fusiona: las
// excepciones de abajo repiten ARQ-1 y solo sacan la restricción de toLocale*.
const sinToLocale = (files) => ({
  files,
  rules: {
    'no-restricted-properties': ['error', ...ARQ1_PROPERTIES],
  },
})

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
      'no-restricted-properties': ['error', ...ARQ1_PROPERTIES, ...TOLOCALE_PROPERTIES],
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
  // D-FB9: los módulos donde vive el formato quedan fuera de la regla de toLocale*.
  sinToLocale(['src/utils/fechas.js', 'src/utils/formato.js']),
  // D-FB9: excepciones TEMPORALES. Cada una se saca cuando la spec indicada reescribe la página
  // (sección 5.4 de la spec frontend 02). Al sacarla, la página usa formatInstant / formatMoney.
  // (La excepción de Ocupaciones.jsx se retiró con la spec 07.)
  // (La excepción de CajaDiaria.jsx y la de no-unused-vars se retiraron con la spec 09, que la reemplazó.)
])
