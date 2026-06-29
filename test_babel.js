const Babel = require('@babel/standalone');

const code = `
import React from 'react';
import { AbsoluteFill } from 'remotion';

export default function App() {
  return <AbsoluteFill>Hello</AbsoluteFill>;
}
`;

try {
  const compiled = Babel.transform(code, {
    presets: [
      ['react', { runtime: 'classic' }], 
      ['env', { modules: 'commonjs' }]
    ]
  }).code;
  console.log(compiled);
} catch (e) {
  console.error("Error:", e.message);
}
