# Blogging-Engine developed to LHTN (learn how to node)
## Description
node-blog was built for 2 purposes: the first (and obvious one) is to learn how to 
build a full blown node web application using frameworks. The second reason is the 
re-activation of my "believed-to-be-forgotten" domain "schaermu.ch" as a blog.

The application was built using [Express](https://github.com/visionmedia/express),
[Mongoose](https://github.com/LearnBoost/mongoose), [Jade](https://github.com/visionmedia/jade) 
as html template engine and [Stylus](https://github.com/LearnBoost/stylus) as css engine.

**This engine is by no means to be used for production on any website, it just serves
as my personal blog!**

## Dependencies
- node.js (tested using development branch, should run on stable npm release (`npm install node`))
- mongoose (current stable, `npm install mongoose`)
- express (current stable, `npm install express`)
  - *Sidenote*: the current stable branch of `connect` (express' http middleware) ships with
  `qs-0.0.3`, which has a small glitch concerning form body decoding (see [this pull request](https://github.com/aeosynth/node-querystring/commit/70caef1cf8b718c03e10a590d3dca6caba4638e6))
- jade (current stable, `npm install jade`)
- stylus (current stable, `npm install stylus`)

In addition to the packages mentioned above you'll need a running mongodb instance (check out the [MongoDB website](http://www.mongodb.org) 
for further instructions)

## Useful packages used
- nodemon (for auto-restarting node instance on file changes, `npm install nodemon`)
- inspect (for debugging object graphs, `npm install inspect`)