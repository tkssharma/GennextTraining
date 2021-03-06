const express = require('express');
const request = require('request');
const path = require('path');
const tmdbApiKey = process.env.KEY;

const optionsTrending = {
  method: 'GET',
  url: 'https://api.themoviedb.org/3/trending/movie/day',
  qs: {
    api_key: tmdbApiKey,
  },
};

const optionsTopRatedRecommended = {
  method: 'GET',
  url: 'https://api.themoviedb.org/3/movie/top_rated',
  qs: {
    api_key: tmdbApiKey,
    region: 'gb',
  },
};

const optionsMovieDetails = {
  method: 'GET',
  url: undefined,
  qs: {
    api_key: tmdbApiKey,
    append_to_response: 'videos,credits',
  },
};

const optionsMovieAutocomplete = {
  method: 'GET',
  url: 'https://api.themoviedb.org/3/search/movie',
  qs: {
    api_key: tmdbApiKey,
    query: undefined,
  },
};

let parsedResult;

tmdbApiKey
  ? console.log('TMDb api key is found')
  : console.log('TMDb api key is NOT found among environment variables!');

async function apiCall(options) {
  // (I.) promise to return the parsedResult for processing
  function tmdbRequest() {
    return new Promise(function(resolve, reject) {
      request(options, function(error, response, body) {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  // (II.)
  try {
    parsedResult = await tmdbRequest();
  } catch (e) {
    console.error(e);
  }
  return parsedResult;
}

function endpointCreation() {
  try {
    const app = express();
    const port = process.env.PORT || 5000;

    app.use(express.static(path.join(__dirname, 'client/build')));
    // required to serve SPA on heroku production without routing problems; it will skip only 'api' calls
    if (process.env.NODE_ENV === 'production') {
      app.get(/^((?!(api)).)*$/, function(req, res) {
        res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
      });
    }
    app.use(function(req, res, next) {
      res.header('Access-Control-Allow-Origin', '*');
      res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept',
      );
      next();
    });

    // providing a constant endpoint for trending movies
    app.get('/api/trending', async (req, res) => {
      res.json(await apiCall(optionsTrending));
      console.log('/api/trending endpoint has been called!');
    });

    // providing a constant endpoint for a random top rated movie
    app.get('/api/topRatedRecommended', async (req, res) => {
      const topRatedResponse = await apiCall(optionsTopRatedRecommended);
      const randomIndex = Math.floor(Math.random() * Math.floor(20)); // one page contains exactly 20 results
      const topRatedRandomMovie = topRatedResponse.results[randomIndex];
      res.json(topRatedRandomMovie);
      console.log('/api/topRatedRecommended endpoint has been called!');
    });

    // providing a dynamic endpoint to movie detail pages
    app.get('/api/movieDetails/:tmdbId', async (req, res) => {
      const id = req.params.tmdbId;
      optionsMovieDetails.url = `https://api.themoviedb.org/3/movie/${id}`;
      res.json(await apiCall(optionsMovieDetails));
      console.log(`/api/movieDetails/${id} endpoint has been called!`);
    });

    // providing a dynamic endpoint to movie autocomplete
    app.get('/api/movieAutocomplete', async (req, res) => {
      const query = req.query.q;
      optionsMovieAutocomplete.qs.query = query;
      res.json(await apiCall(optionsMovieAutocomplete));
      console.log(
        `/api/movieAutocomplete?q=${query} endpoint has been called!`,
      );
    });

    app.listen(port);

    console.log(`API is listening on ${port}`);
  } catch (e) {
    console.error(e);
  }
}
endpointCreation();
