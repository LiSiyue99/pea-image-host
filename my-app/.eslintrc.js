/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['next', 'next/core-web-vitals'],
  rules: {
    // 未使用变量允许使用下划线前缀
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    // 允许空接口扩展
    '@typescript-eslint/no-empty-interface': 'off',
  },
}; 