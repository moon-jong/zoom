# Zoom Clone WebRTC
![demo](https://raw.githubusercontent.com/moon-jong/zoom/main/demo/demo.gif)

Web RTC code using [Media-pipe](https://google.github.io/mediapipe/solutions/face_mesh.html) 

<details>

<summary>How to Use</summary>

## Initailize npm project
```bash
npm init -y
```

## Install nodemon
```bash
npm i nodemon -D
```

## Install express
```bash
npm i express
```

## Install pug
```bash
npm i pug
```
## Install babel
```bash
npm i @babel/core @babel/cli @babel/node @babel/preset-env -D
```

## Change nodemon.json
```json
{...
"exec" : "babel-node src/server.js"
...}
```

## Change babel.config.json
```json
{...
"presets": ["@babel/preset-env"]
...}
```

## Change package.json
```json
{...
"scripts": {
    "dev": "nodemon"
  }
...}
```
</details>
