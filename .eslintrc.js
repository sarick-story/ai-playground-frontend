module.exports = {
  root: true,
  extends: [
    'next',
    'next/core-web-vitals',
    'plugin:react/recommended'
  ],
  plugins: ['react'],
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/jsx-uses-react': 'off',
    'react/no-unknown-property': ['error', { 
      ignore: ['fragmentShader', 'vertexShader', 'uniforms', 'args'] 
    }]
  },
  settings: {
    react: {
      version: 'detect'
    }
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  env: {
    browser: true,
    node: true,
    es6: true
  }
}; 