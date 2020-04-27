const express = require("express"),
  fs = require("fs"),
  path = require("path"),
  pkg = require("./package.json");

const app = express();
const protocol = "https";
const port = 3000;
const host = "localhost";
const key_path = "./certs/encrypted.key";
const cert_path = "./certs/server.cert";

app.use("/static", express.static(path.join(__dirname, "public_html")));

app.get("/", function (request, response) {
  response.sendFile(__dirname + "/public_html/index.html");
});

// Configure an HTTPS server
const options = {
  key: fs.readFileSync(key_path),
  cert: fs.readFileSync(cert_path),
  passphrase: "rancherwebportalkey",
};
server = require("https").createServer(options, app);

server.listen(port, function () {
  console.log(
    "Express server listening at: https://" +
    server.address().address + ":" + server.address().port
  );
});
