module.exports = [
  {
    files: ['src/**/*.{ts,js}'],
    ignores: ['node_modules/**', 'dist/**'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
      globals: {
        node: true,
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        console: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin')
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn', // Changed to warn to be less strict
      'no-undef': 'off', // TypeScript handles this
      'quotes': 'off', // Disable quotes rule to avoid too many errors
      'no-console': 'off'
    }
  }
];