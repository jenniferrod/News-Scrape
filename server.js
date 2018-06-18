// Dependencies
var express = require("express");
var exphbs = require("express-handlebars");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");

// Scraping tools
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = process.env.PORT || 3000;

// Initialize Express
var app = express();

// Set handlebars
app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Use body-parser for handling form submissions
app.use(bodyParser.urlencoded({ extended: true }));
// Use express.static to serve the public folder as a static directory
app.use(express.static("public"));

// Connect to the Mongo DB
var MONGODB_URI = process.env.MONGO_URI || "mongodb://localhost/mongoHeadlines"
mongoose.Promise = Promise;
mongoose.connect(process.env.MONGODB_URI);

// Routes

// A GET route for scraping the NYT website
app.get("/scrape", function (req, res) {
  axios.get("https://www.nytimes.com/section/us?module=SectionsNav&action=click&version=BrowseTree&region=TopBar&contentCollection=U.S.&pgtype=sectionfront").then(function (response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);

    // Now, grab each article:
    $(".story-meta").each(function (i, element) {
      var title = $(element).children(".headline").text();
      var summary = $(element).children(".summary").text();
      var link = $(element).parent().attr("href");
      
      var result = {
        title: title,
        summary: summary,
        link: link
      };

      // Create a new Article using the `result` object built from scraping
      db.Article.create(result)
        .then(function (data) {
          // console.log(data);
        })
        .catch(function (err) {
          // return res.json(err);
        });
    });

    // If we were able to successfully scrape and save an Article, send a message to the client
    res.send("Scrape Complete");
  });
});

app.get("/", function(req, res) {
  res.render("index");
})

// Route for getting all Articles from the db
app.get("/articles", function (req, res) {
  // Grab every document in the Articles collection
  db.Article.find({})
    .then(function (data) {
      res.render("index", { articles: data });
    })
    .catch(function (err) {
      res.json(err);
    });
});

// Route for rendering the saved articles
app.get("/saved-articles", function(req, res) {
  db.Article.find({ saved: true })
    .then(function(data) {
      res.render("saved", { articles: data });
    });
});

app.post("/saved-articles/:id", function(req, res) {
  console.log(req.body);
  console.log(req.params.id);

  // if the article is saved 
  // if () {
  //   db.Article.findOneAndUpdate({ _id: req.params.id }, { $set: { saved: true } }, { new: true }).then(function(data) {
  //     res.json(data);
  //   }).catch(function (err) {
  //     if (err) throw err
  //   })
  // }
  // else, keep saved set to false
  // else {
  //   db.Article.findOneAndUpdate({ _id: req.params.id },
  //     { $set: { saved: false } },
  //     { new: true })
  //     .then(function(data) {
  //       res.json(data);
  //     })
  //     .catch(function(err) {
  //       if (err) throw err
  //     });
  // }
});


// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function (req, res) {
  db.Article.findOne({ _id: req.params.id })
    .populate("note")
    .then(function (data) {
      res.json(data);
    })
    .catch(function (err) {
      res.json(err);
    });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function (req, res) {
  db.Note.create(req.body)
    .then(function (data) {
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { $set: { note: data._id } }, { new: true });
    })
    .then(function (dbArticle) {
      res.json(dbArticle);
    })
    .catch(function (err) {
      res.json(err);
    });
});

// Start the server
app.listen(PORT, function () {
  console.log("App running on port " + PORT + "!");
});
