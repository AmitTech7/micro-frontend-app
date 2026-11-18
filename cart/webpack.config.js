const HtmlWebpackPlugin = require("html-webpack-plugin");
const { ModuleFederationPlugin } = require("webpack").container;

module.exports = {
  entry: "./src/index.ts",
  output: { publicPath: "auto" },
  resolve: { extensions: [".tsx", ".ts", ".js", ".jsx"] },
  devServer: {
    port: 3002,
    headers: { "Access-Control-Allow-Origin": "*" },
  },
  module: {
    rules: [{ test: /\.[jt]sx?$/, exclude: /node_modules/, loader: "babel-loader" }],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: "cart",
      filename: "remoteEntry.js",
      exposes: {
        "./mount": "./src/mount",
      },
      shared: {
        react: { singleton: true, requiredVersion: "^18.2.0" },
        "react-dom": { singleton: true, requiredVersion: "^18.2.0" },
      },
    }),
    new HtmlWebpackPlugin({ template: "./public/index.html" }),
  ],
};
