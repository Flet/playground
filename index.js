'use strict';
var express = require('express');
var exphbs = require('express-handlebars');
var bodyParser = require('body-parser');
var app = express();
var get = require('simple-get');
var qs = require('qs');

const apiUrl = process.env.PLAYGROUND_URL;
const googleApiKey = process.env.GOOGLE_API_KEY;

console.log('api url', apiUrl);

app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

app.use(express.static('static'));

app.use(bodyParser.urlencoded({
  extended: true
}));

app.get('/', (req, res) => {
  var query = {
    id: {
      $in: topLevelCategories
    }
  };

  var opts = {
    method: 'GET',
    url: `${apiUrl}/categories?${qs.stringify(query)}`,
    json: true
  };

  get.concat(opts, (err, resp, data) => {
    if (err) throw err;
    res.render('index', {categories: data.data});
  });
});

app.get('/locator', (req, res) => res.render('locator'));

app.post('/locator', (req, res) => {
  var query = {
    near: req.body.zip
  };

  var opts = {
    method: 'GET',
    url: `${apiUrl}/stores/?${qs.stringify(query)}`,
    json: true
  };

  get.concat(opts, (err, resp, data) => {
    if (err) throw err;
    if (googleApiKey) {
      data.googleApiKey = googleApiKey;
    }
    res.render('locator', data);
  });
});

app.get('/product/:id', (req, res) => {
  var opts = {
    method: 'GET',
    url: `${apiUrl}/products/${req.params.id}`,
    json: true
  };

  get.concat(opts, (err, resp, data) => {
    if (err) throw err;
    res.render('product', data);
  });
});

app.get('/search', (req, res) => {
  var page = Number(req.query.page) || 1;
  var limit = 10;

  var query = {
    $skip: (page * limit) - limit
  };

  if (req.query.q) {
    query.$or = {
      name: { '$like': `%${req.query.q}%` },
      description: { '$like': `%${req.query.q}%` }
    };
  } else if (req.query.cat) {
    query['category.id'] = req.query.cat;
  }

  var opts = {
    method: 'GET',
    url: `${apiUrl}/products?${qs.stringify(query)}`,
    json: true
  };

  get.concat(opts, (err, resp, data) => {
    if (err) throw err;

    data.page = page;
    data.nextPage = page + 1;

    data.pages = makePages(page, data.total, data.limit);

    data.next = data.limit + data.skip;

    if (req.query.cat) {
      let catOpts = {
        method: 'GET',
        url: `${apiUrl}/categories/${req.query.cat}`,
        json: true
      };
      get.concat(catOpts, (err, resp, catData) => {
        data.cat = catData.id;
        data.catName = catData.name;
        data.categoryPath = catData.categoryPath;
        data.subCategories = catData.subCategories;
        res.render('catresults', data);
      });
    } else {
      data.q = req.query.q;
      res.render('productresults', data);
    }
  });
});

var port = process.env.PORT || 4000;

app.listen(port, function (err) {
  if (err) {
    console.error(err);
  }

  console.log(`App is up and listening on ${port}`);
});

function makePages (page, total, limit) {
  var pages = [];
  let spread = 6;
  let partialPage = (total % limit);
  let lastPage = (total - partialPage) / limit;
  if (partialPage > 0) lastPage++;

  for (let i = page - 1; i > 0 && i > page - 3; i--) {
    pages.unshift({page: i, current: false});
  }

  pages.push({page: page, current: true});

  for (let i = page + 1; i <= lastPage && pages.length < spread; i++) {
    pages.push({page: i, current: false});
  }

  if (pages.length === 1) pages = [];
  var pageData = {
    pages: pages
  };

  if (page > 1) pageData.previous = page - 1;
  if (page < lastPage) pageData.next = page + 1;
  return pageData;
}

var topLevelCategories = [
  'abcat0100000',
  'abcat0200000',
  'abcat0207000',
  'abcat0300000',
  'abcat0400000',
  'abcat0500000',
  'abcat0600000',
  'abcat0700000',
  'abcat0800000',
  'abcat0900000'
];
