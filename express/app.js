// builtin
var fs = require('fs');
var assert = require('assert');

// 3rd party
var express = require('express');
var request = require('request');
var YQL = require('yql');
var hbs = require('hbs');

var app = module.exports = express.createServer();

var defaultLocale = 'en';
var pageDB = {};
var cardId;

function initPageDB(forceRefresh){
	console.log('initializing...');
	if(forceRefresh){
		RefreshCache();
		return;
	}
	pageDB = loadCache();
	if(pageDB){
		initDone();
	}else{
		RefreshCache();
	}
}

function initDone(){
	console.log('init done');
	//console.log(pageDB);
}

function loadCache(){
	console.log('loading cache...');
	var pageDBcache;

	try {
		var data = fs.readFileSync('./pagedb.cache.json');
		//console.log(data);
		try {
			pageDBcache = JSON.parse(data);
			//console.dir(pageDBcache);
			return pageDBcache;
		}
		catch (err) {
			console.log('There has been an error parsing the pageDBcache JSON')
			console.log(err);
			return false;
		}
	}
	catch (err) {
		console.error("There was an error opening pagedb.cache.json");
		console.log(err);
	}


	//getStrings();
}

function RefreshCache(){
	console.log('refreshing cache');
	pageDB = {
		nav : [],
		languages : {},
		cards : []
	};

	getStrings();
}

function getStrings(){
	console.log('loading strings...');
	new YQL.exec("select * from csv where url='https://docs.google.com/spreadsheet/pub?key=0Ar3qBZOJQ4WBdDk3ajRQTzdKdGNTZnptR3lNYWZkMlE&single=true&gid=3&output=csv' and columns='languagecode,language,language_en,rtl,active,question,answer,yes,no,next,wrong,correct,more'", function(response) {
		if (response.error) {
			console.log("getStrings Error: " + response.error.description);
		} else {
	        console.log("getStrings success");
	        //console.log(response);
	        //console.log(response.query.results);
	        var languages = response.query.results.row;
	        for(var i=1;i<languages.length;i++){
	        	var lang = languages[i];
	        	if(lang.active.toUpperCase() =='TRUE'){ // is there any way to get this as BOOL from gdocs?
	        		pageDB.languages[lang.languagecode] = lang;
	        		pageDB.nav.push(lang);
	        		console.log('pushing: '+lang.languagecode);
	        	}
	        }
	        //console.log('languages added: ---------------------------');
	        //console.log(pageDB);

			console.log('saving strings.cache.json ...');
	        fs.writeFile('strings.cache.json', JSON.stringify(response.query.results, null, 4), function (err) {
				if (err) return console.log(err);
				console.log('strings.cache.json saved');
			});

	        getCards();
		}
	});
};
function getCards(){
	console.log('loading cards...');
	new YQL.exec("select * from csv where url='https://docs.google.com/spreadsheet/pub?key=0Ar3qBZOJQ4WBdDk3ajRQTzdKdGNTZnptR3lNYWZkMlE&single=true&gid=2&output=csv' and columns='id,question_en,answer_en,active,truth,img_question,img_answer,link,question_hi,answer_hi,question_ar,answer_ar,question_de,answer_de,question_es,answer_es,question_zh,answer_zh,question_fr,answer_fr,question_nl,answer_nl,question_vi,answer_vi'", function(response) {
		if (response.error) {
			console.log("getCards Error: " + response.error.description);
		} else {
	        console.log("getCards success");
	        //console.log(response);
	        //console.log(response.query.results);
	        var cards = response.query.results.row;
	        pageDB.cardCount = cards.length-1;
	        for(var i=1;i<cards.length;i++){
	        	var card = cards[i];
	        	//console.log(card);
	        	pageDB.cards[card.id] = {
	        		id : card.id,
	        		truth : (card.truth.toLowerCase() == 'true'),
	        		link : card.link,
	        		img_question : card.img_question,
	        		img_answer : card.img_answer
	        	}
	        	// only store the strings for the activated languages
	        	for (var lang in pageDB.languages){
	        		pageDB.cards[card.id][lang] = {
	        			question : card['question_'+lang],
	        			answer : card['answer_'+lang]
	        		}
	        	}
	        	// add exception for includes instead of images
	        	if(fileExt(card.img_question) == 'hbs'){
	        		pageDB.cards[card.id].img_question = undefined;
	        		pageDB.cards[card.id].inc_question = card.img_question;
	        	}
	        	if(fileExt(card.img_answer) == 'hbs'){
	        		pageDB.cards[card.id].img_answer = undefined;
	        		pageDB.cards[card.id].inc_answer = card.img_answer;
	        	}


	        }
			console.log('saving cards.cache.json ...');
        	fs.writeFile('cards.cache.json', JSON.stringify(response.query.results, null, 4), function (err) {
				if (err) return console.log(err);
				console.log('cards.cache.json saved');
			});
	        //console.log(pageDB);
	        savePageDB();
		}
	});
};

function savePageDB(){
	console.log('saving pageDB');
    fs.writeFile('pagedb.cache.json', JSON.stringify(pageDB, null, 4), function (err) {
		if (err) return console.log(err);
		console.log('pagedb.cache.json saved');
		console.log('cache refresh finished successfully');
		initDone();
	});
}

function fileExt(fileName){
	var ext = fileName.substr(fileName.lastIndexOf('.') + 1);
	return ext;
}

// https://github.com/mashpie/i18n-node/blob/master/i18n.js
function guessLanguage(request) {
    if (typeof request === 'object') {
        var language_header = request.headers['accept-language'],
        languages = [],
        regions = [];
        request.languages = [defaultLocale];
        request.regions = [defaultLocale];
        request.language = defaultLocale;
        request.region = defaultLocale;

        if (language_header) {
            language_header.split(',').forEach(function(l) {
                header = l.split(';', 1)[0];
                lr = header.split('-', 2);
                if (lr[0]) {
                    languages.push(lr[0].toLowerCase());
                }
                if (lr[1]) {
                    regions.push(lr[1].toLowerCase());
                }
            });

            if (languages.length > 0) {
                request.languages = languages;
                request.language = languages[0];
            }

            if (regions.length > 0) {
                request.regions = regions;
                request.region = regions[0];
            }
        }
    }
}

function getRandomCardId(){
	return Math.floor(Math.random() * pageDB.cardCount + 1);
}

// set the view engine to use handlebars
app.set('view engine', 'hbs');
app.set('views', __dirname + '/views');

app.use(express.static(__dirname + '/public'));
app.use(express.favicon(__dirname + '/public/images/favicon.ico', { maxAge: 2592000000 })); 


//hbs.registerPartial('languageNav', getLanguageNav());

// hbs.registerHelper('languageNav', function(items, fn) {
// 	//{{#nav}}<li><a href="/{{languagecode}}/{{../id}}">{{language}}</a></li>{{/nav}}
// 	console.log('languageNav:------------------');
// 	console.log(items);
//   	var out = "";
//   	// for(var i=0, l=pageDB.nav.length; i<l; i++) {
//   	// 	var lang = pageDB.nav[i];
//    //  	out = out + '<li><a href="/'+lang.languagecode+'/'+fn(items[i])+'>'+lang.language+'</a></li>';
//   	// }
//   	return out;
// });

hbs.registerHelper('csv', function(items, options) {
	var out = "";
	for(var i=0, l=items.length; i<l; i++) {
		out += options.fn(items[i]);
		if (i < l - 1) {
	    	out += ', ';
		}
	} 
	return out;
});
// template:
//{{#csv list}}{{item}}{{/csv}}



app.get('/refresh', function(req, res, next){
	console.log('page: /refresh');
  	RefreshCache();
  	res.send("refreshing - isn't it? ;-)", 200);
});

app.get('/about', function(req, res, next){
	//console.log('page: /about');
	res.render('about', {
		question_title: "about",
		nav: pageDB.nav
	});
});

app.get('/language', function(req, res, next){
	//console.log('page: /about');
	res.render('language', {
		question_title: "language",
		nav: pageDB.nav
	});
});


app.get('/:language/:id/:selection?', function(req, res, next){
	//console.log('page: /:language/:id/:selection?');
	var language = req.params.language; // check for validity!
	var id = cardId = parseInt(req.params.id,10) // check for validity!
	var selection = req.params.selection; // either "yes" or 'no'
	var isRTL = ['ar'];

	if(isNaN(id)){
		next();
	}

	if(id > pageDB.cardCount){
		// we don't have that id. Let's use a random valid one instead
		id = getRandomCardId();
		if (!selection){
			selection = '';
		}
		res.redirect('/'+language+'/'+id+'/'+selection);
	}

	var nextId = id+1;
	if(nextId > pageDB.cardCount){
		nextId = 1;
	}

	var str = pageDB.languages[language];
	var card = pageDB.cards[id];

	if(!str || !card){
		next();
	}

	card_str = card[language];


	if(!str){
		return; //this route seems to get processed twice with str being undefined the 2nd time
	}

	str.id = card.id;
	str.truth = card.truth;
	str.link = card.link;
	str.question_text = card_str.question;
	str.answer_text = card_str.answer;
	str.nav = pageDB.nav;
	str.nextId = nextId;
	str.img_question = card.img_question;
	str.img_answer = card.img_answer;
	str.inc_answer = card.inc_answer;
	str.inc_question = card.inc_question;
	if(card.inc_answer){
		str.clear = ' clear';
		str.fill = ' fill';
	}else{
		str.clear = undefined;
		str.fill = undefined;
	}
	str.flipped = undefined;
	str.selection = undefined;
	if(selection){
		str.urlselection = 'urlselection';
		str.flipped = 'flip';
		if(selection.toLowerCase() == 'yes'){
			str.selection = 'yes'
		}else if(selection.toLowerCase() == 'no'){
			str.selection = 'no'
		}
	}

	if(isRTL.indexOf(language) > -1){
		str.dir = 'rtl';
	}else{
		str.dir = 'ltr';
	}

	/* exception for the moon phases*/

	if(card.id == 20){
		str.moonphases = true;
	}else{
		str.moonphases = undefined;
	}

	//console.log('rendering card: ');
	//console.log(str);

	res.render('card', str);
});

app.get('/:language', function(req, res, next){
	//console.log('page /:language');
	var language = req.params.language; // check for validity!
	var id = getRandomCardId();

	if(!isNaN(language)){
		// it's a number! Let's show the given id in the user language
		guessLanguage(req)
		id = language;
		language = req.language;
	}
	res.redirect('/'+language+'/'+id);
});

app.get('/', function(req, res, next){
	//console.log('page: /');
	guessLanguage(req)
	var language = req.language
	res.redirect('/'+language);
});

app.get('*', function(req, res, next){
	console.log('error page');
  	res.send('ummm what?', 404);
});


var PORT = process.env.PORT || 3000;
var REFRESH = process.env.REFRESH || false;
app.listen(PORT, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
  initPageDB(REFRESH);
});
