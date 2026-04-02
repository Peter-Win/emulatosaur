const path = require("node:path");
const { writeFile, readdir, stat } = require('node:fs/promises');
const { constants } = require('node:fs');
const express = require("express");
const {isFileExists, checkFolder} = require("./fileUtils");

const app = express()

// app.use(express.urlencoded({ extended: true }));
app.use(express.raw());

app.get("/api/load", (req, res) => {
  // TODO: пока только МИКРОША
  const {src, name} = req.query;
  const fname = path.normalize(path.join(__dirname, "..", src, "МИКРОША", name));
  console.log("load file", fname);
  res.sendFile(fname);
});

app.get("/api/checkFileName", async (req, res) => {
  // TODO: пока только для МИКРОШИ...
  const ext = "rkm";
  let fullName = path.normalize(path.join(__dirname, "..", "userData", "МИКРОША", req.query.name));
  if (ext) {
     fullName += `.${ext}`;
  }
  const exists = await isFileExists(fullName);
  res.send({exists});
});

app.get("/api/files", async (req, res) => {
  const {src} = req.query;
  let fullFolderName = path.normalize(path.join(__dirname, "..", src, "МИКРОША"));
  const files = await readdir(fullFolderName);
  const result = [];
  for (const name of files) {
    const filePath = path.join(fullFolderName, name);
    const stats = await stat(filePath);
    result.push({name, size: stats.size});
  }
  res.send(result);
});

app.post("/api/saveFile", async (req, res, next) => {
  const shortName = req.query.name + ".rkm"; // TODO: Для МИКРОШИ
  let fullName = path.normalize(path.join(__dirname, "..", "userData", "МИКРОША", shortName));
  let data = [];
  req.on('data', chunk => {
    data.push(chunk);
  });
  req.on('end', async () => {
    try {
      const buffer = Buffer.concat(data);
      await checkFolder(fullName);
      await writeFile(fullName, buffer)
      res.sendStatus(200);
    } catch (e) {
      next(e);
    }
  });
});

app.use(function(err, req, res, next) {
  if (err instanceof Error) {
    console.error(err.stack);
    res.status(500).send(err.message);
  } else {
    next(err);
  }
});
  
app.listen(3002);
process.stdout.write("Server started\n");