const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: './src/index.js',
  devtool: 'inline-source-map',
  devServer: {
    static: ['dist', 'public'],
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin", 
      "Cross-Origin-Embedder-Policy": "require-corp", 
    },
    proxy: [
      {
        context: ['/papi'],
        target: 'http://tcia-posda-rh-1.ad.uams.edu',
        headers: { 'Authorization': 'Bearer e9a63bc2-bfa5-4299-afb3-c844fb2ef38b' },
      },
    ],
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
	clean: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: 'src/index.html'
    })
  ],
  experiments: {
    asyncWebAssembly: true,
    // syncWebAssembly: true,
  },
  module: {
    rules: [{ test: /\.wasm/, type: 'asset/resource' }]
  },
  // optimization: {
  //   runtimeChunk: 'single',
  // },
};
