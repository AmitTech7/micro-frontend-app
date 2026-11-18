const HtmlWebpackPlugin = require("html-webpack-plugin");
const { ModuleFederationPlugin } = require("webpack").container;

module.exports = {
  entry: "./src/index.ts",
  output: { publicPath: "auto" },
  resolve: { extensions: [".tsx", ".ts", ".js", ".jsx"] },
  devServer: {
    port: 3001,
    // The host (port 3000) loads our files from a different origin, so allow it.
    headers: { "Access-Control-Allow-Origin": "*" },
  },
  module: {
    rules: [{ test: /\.[jt]sx?$/, exclude: /node_modules/, loader: "babel-loader" }],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: "products", // unique name of this remote
      filename: "remoteEntry.js", // the "menu" file the host downloads
      exposes: {
        "./mount": "./src/mount", // what we let other apps use
      },
      shared: {
        react: { singleton: true, requiredVersion: "^18.2.0" },
        "react-dom": { singleton: true, requiredVersion: "^18.2.0" },
      },
    }),
    new HtmlWebpackPlugin({ template: "./public/index.html" }),
  ],
};
