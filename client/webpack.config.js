const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
// const CopyPlugin = require('copy-webpack-plugin');

const pathCommon = path.resolve(path.join(__dirname, "..", "common"));

module.exports = {
	entry: './src/index.tsx',
	output: {
		path: path.resolve(__dirname, './dist'),
		publicPath: '/',
		filename: 'res/bundle.js'
	},
	resolve: {
		extensions: ['.js', '.ts', '.tsx'],
    alias: {
      src: path.join(__dirname, "src"),
      common: pathCommon,
    },
	},
  devtool: "source-map",
	module: {
		rules: [
			{test: /\.(ts|tsx)$/, use: 'ts-loader' },
      {
        test: /\.less$/,
        use: ["style-loader", "css-loader", "less-loader"],
        exclude: /\.module\.less$/,
      },
      {
        test: /\.(png|jpg|jpeg|gif)$/,
        type: "asset/resource",
        generator: {
          filename: "images/[hash][ext][query]",
        },
      },
      {
        test: /\.svg$/,
        type: "asset/inline",
      },
      {
        test: /\.module\.less$/,
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: {
              modules: {
                localIdentName: "[path][name]__[local]--[hash:base64:5]",
              },
            },
          },
          "less-loader",
        ],
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
		],
	},
	plugins: [
    new CleanWebpackPlugin(),
		new HtmlWebpackPlugin({
			template: path.join(__dirname, 'src/template.ejs'),
      title: "Emulatosaur",
      favicon: "./favicon.png",
		}),
		// new CopyPlugin([
		// 	{from: 'src/resources/favicon.ico', to: '', toType: 'dir'},
		// ]),
	],
	devServer: {
		port: 3001,
    hot: true,
    compress: true,
    historyApiFallback: true,
		static: {
			directory: path.join(__dirname, 'dist'),
		},		
    proxy: [
      {
        context: ["/api"],
        target: "http://localhost:3002",
        changeOrigin: true,
        secure: false,
        logLevel: "debug",
      },
    ],
	},
};