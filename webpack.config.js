var path = require(`path`)
var webpack = require(`webpack`)

module.exports = {
  //   entry: ["babel-polyfill", "./src/index.js"],
  entry: [`./src/index.js`],
  output: {
    path: path.resolve(__dirname, `build`),
    filename: `script.js`,
    publicPath: `/`,
    libraryTarget: `commonjs`,
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
  },
  devServer: {
    contentBase: `./build`,
    hot: true,
  },
  target: `node`,
  // mode: "development",
  module: {
    rules: [
      {
        test: /(\.tsx?)/,
        use: [
          {
            loader: "ts-loader",
            // loader: "awesome-typescript-loader",
            options: {
              transpileOnly: true,
            },
          },
        ],
      },
      {
        test: /(\.js|\.jsx)$/,
        use: [
          {
            loader: "babel-loader",
            options: {
              presets: ["@babel/preset-react", "@babel/preset-env"],
              plugins: [
                ["@babel/plugin-proposal-decorators", { legacy: true }],
                "@babel/plugin-proposal-object-rest-spread",
                ["@babel/plugin-proposal-class-properties", { loose: true }],
                "@babel/plugin-proposal-do-expressions",
                "@babel/plugin-syntax-dynamic-import",
              ],
            },
          },
        ],
      },
    ],
  },
  stats: {
    colors: true,
  },
  externals: {
    react: "React",
    "react-dom": "ReactDOM",
    mobx: "mobx",
    "mobx-react": "mobxReact",
  },
}
