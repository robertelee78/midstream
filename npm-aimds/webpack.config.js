const path = require('path');

module.exports = {
  entry: './index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'aimds.js',
    library: {
      name: 'AIMDS',
      type: 'umd',
      export: 'default',
    },
    globalObject: 'this',
  },
  resolve: {
    extensions: ['.js', '.wasm'],
    fallback: {
      fs: false,
      path: require.resolve('path-browserify'),
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      buffer: require.resolve('buffer/'),
    },
  },
  module: {
    rules: [
      {
        test: /\.wasm$/,
        type: 'webassembly/async',
      },
    ],
  },
  experiments: {
    asyncWebAssembly: true,
  },
  mode: 'production',
  optimization: {
    minimize: true,
  },
  target: ['web', 'es2020'],
  devtool: 'source-map',
};
