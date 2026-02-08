const path = require('path');

module.exports = {
  mode: 'production',
  entry: {
    outputPanel: './src/outputPanelEntry.tsx',
    toolDetail: './src/toolDetailEntry.tsx'
  },
  output: {
    path: path.resolve(__dirname, 'out'),
    filename: '[name].js',
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
