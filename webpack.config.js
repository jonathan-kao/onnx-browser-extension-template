const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    popup: './src/popup.js',
    background: './src/background.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  target: 'webworker',
  experiments: {
    topLevelAwait: true
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: { presets: ['@babel/preset-env'] }
        }
      }
    ]
  },
  performance: {
    hints: false // Disable performance warnings for this ONNX extension
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: './manifest.json', to: 'manifest.json' },
        { from: './src/popup.html', to: 'popup.html' },
        { from: './src/session-manager.html', to: 'session-manager.html' },
        { from: './src/session-manager.js', to: 'session-manager.js' },
        { from: './model.onnx', to: 'model.onnx', noErrorOnMissing: true },
        { from: './node_modules/onnxruntime-web/dist/ort.wasm.min.js', to: 'ort.wasm.min.js', noErrorOnMissing: true },
        { from: './node_modules/onnxruntime-web/dist/*.wasm', to: '[name][ext]', noErrorOnMissing: true },
        { from: './node_modules/onnxruntime-web/dist/*.mjs', to: '[name][ext]', noErrorOnMissing: true }
      ]
    })
  ]
};