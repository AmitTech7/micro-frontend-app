const HtmlWebpackPlugin = require("html-webpack-plugin");
const { ModuleFederationPlugin } = require("webpack").container;

// Where the remotes live. Locally these are the dev servers. On Vercel, set
// PRODUCTS_URL and CART_URL as environment variables (no trailing slash).
// The values are baked in at BUILD time.
const PRODUCTS_URL = process.env.PRODUCTS_URL || "http://localhost:3001";
const CART_URL = process.env.CART_URL || "http://localhost:3002";

module.exports = {
  entry: "./src/index.ts",
  // "/" (not "auto") so deep URLs like /products/list still find the scripts
  output: { publicPath: "/" },
  resolve: { extensions: [".tsx", ".ts", ".js", ".jsx"] },
  devServer: {
    port: 3000,
    historyApiFallback: true, // serve index.html for any route (needed by React Router)
  },
  module: {
    rules: [
      { test: /\.[jt]sx?$/, exclude: /node_modules/, loader: "babel-loader" },
      { test: /\.css$/, use: ["style-loader", "css-loader"] },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: "host",
      // "<remote name>@<url of its remoteEntry.js>"
      remotes: {
        products: `products@${PRODUCTS_URL}/remoteEntry.js`,
        cart: `cart@${CART_URL}/remoteEntry.js`,
      },
      shared: {
        react: { singleton: true, requiredVersion: "^18.2.0" },
        "react-dom": { singleton: true, requiredVersion: "^18.2.0" },
      },
    }),
    new HtmlWebpackPlugin({ template: "./public/index.html" }),
  ],
};
