const path = require('path');

module.exports = {
  entry: './src/nifti.js',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
  },
  experiments: {
    asyncWebAssembly: true,
    // syncWebAssembly: true,
  },
  module: {
    rules: [{ test: /\.wasm/, type: 'asset/resource' }]
  },
};
