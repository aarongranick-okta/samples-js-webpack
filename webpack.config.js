require('dotenv').config();

const webpack = require('webpack');
const path = require('path');

const PORT = process.env.PORT || 8080;

module.exports = {
  mode: 'development',
  plugins: [
    new webpack.EnvironmentPlugin(['CLIENT_ID', 'DOMAIN']),
  ],
  devServer: {
    contentBase: path.join(__dirname, 'dist'),
    port: PORT,
  },
};
