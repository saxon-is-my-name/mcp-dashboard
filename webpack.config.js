const path = require('path');

module.exports = {
  mode: 'production',
  entry: './src/webview.tsx',
  output: {
    path: path.resolve(__dirname, 'out'),
    filename: 'webview.js',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  externals: {
    vscode: 'commonjs vscode',
  },
  devtool: 'source-map',
};
