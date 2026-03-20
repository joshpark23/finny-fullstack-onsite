import nextPlugin from '@next/eslint-plugin-next'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'
import prettier from 'eslint-config-prettier'
import perfectionist from 'eslint-plugin-perfectionist'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'

export default [
  // Ignore patterns
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      '.yarn/**',
      'dist/**',
      'build/**',
      '*.min.js',
      '*.d.ts'
    ]
  },

  // Base perfectionist rules
  perfectionist.configs['recommended-natural'],

  // TypeScript configuration
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        },
        ecmaVersion: 2022,
        project: './tsconfig.json',
        sourceType: 'module',
        tsconfigRootDir: import.meta.dirname
      }
    },
    plugins: {
      '@next/next': nextPlugin,
      '@typescript-eslint': tseslint,
      react,
      'react-hooks': reactHooks
    },
    rules: {
      // TypeScript specific rules
      ...tseslint.configs.recommended.rules,
      ...tseslint.configs['recommended-requiring-type-checking'].rules,
      // Next.js specific rules (includes React and React Hooks)
      ...nextPlugin.configs.recommended.rules,
      // React specific rules
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      // React Hooks rules
      ...reactHooks.configs.recommended.rules,
      // Next.js specific rules
      ...nextPlugin.configs.recommended.rules,

      // TODO: fix these
      '@typescript-eslint/await-thenable': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/consistent-type-imports': 'warn',
      '@typescript-eslint/no-base-to-string': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-enum-comparison': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'after-used'
        }
      ],
      '@typescript-eslint/no-useless-empty-export': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-promise-reject-errors': 'warn',
      '@typescript-eslint/require-await': 'warn',
      'no-console': ['error', { allow: ['debug', 'error', 'warn'] }],

      // React specific rules
      'react-hooks/exhaustive-deps': 'warn',

      'react/no-unescaped-entities': 'warn'
    },
    settings: {
      react: {
        version: 'detect'
      }
    }
  },

  // Override for test files
  {
    files: ['**/*.test.ts', '**/*.test.tsx', 'test/**/*.ts', 'test/**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off'
    }
  },

  // Override for config files
  {
    files: ['**/*.config.ts', '**/*.config.mjs'],
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
      'no-console': 'off'
    }
  },

  // Prettier config (must be last to override other formatting rules)
  prettier
]
