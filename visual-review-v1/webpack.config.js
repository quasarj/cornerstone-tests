const path = require('path');
const HtmlWebPackPlugin = require("html-webpack-plugin");

module.exports = {
  entry: path.resolve(__dirname, './src/main.jsx'),
  mode: "development",
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: ['babel-loader'],
      },
      {
        test: /\.css$/,
        exclude: /node_modules/,
        use: [
			{
				loader: 'style-loader',
			},
			{
				loader: 'css-loader',
				options: {
					importLoaders: 1,
				}
			},
			{
				loader: 'postcss-loader'
			}
		],
      },
    ],
  },
  plugins: [
	  new HtmlWebPackPlugin({
		  title: "Test Title",
		  template: "./src/index.html",
	  }),
  ],
  resolve: {
    extensions: ['*', '.js', '.jsx'],
  },
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: 'index_bundle.js',
  },
  devServer: {
    // contentBase: path.resolve(__dirname, './public'),
  },
};

