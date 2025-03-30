<br><br>
<div align="center">
<img src="./icon.png" width="20%" />
<h3> diep custom </h3>
<p> CQ6 version of BDC, not canonical at all.
</div>
<br>

## Installation

You need to install [Node.js](https://nodejs.org/), as well as the [Yarn Package Manager](https://classic.yarnpkg.com/en/docs/install).\
After doing so, download or clone this repository and install the dependencies with:
```bash
$ yarn install
```

## Running the Server

Run the server with:
```bash
$ yarn run server
```
This builds and runs the server.

After running the server, content will be served at `localhost:PORT` on your computer. The port will default to 8080, and you may override it with `process.env.PORT`.

Consult `src/config.ts` for configuration, and `package.json` for environ variable setup.

## License

Please see [LICENSE](./LICENSE)
