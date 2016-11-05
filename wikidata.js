var request = require('request');

var search_wikipedia = function (keyword, fn){
    request({
        url:'https://en.wikipedia.org/w/api.php',
        qs: {
            action: 'query',
            format: 'json',
            list: 'search',
            srsearch: keyword,
            srprop: 'redirecttitle',
            srlimit: 1,
            srwhat: 'nearmatch'
        },
        
        callback: function(err, resp, body){
            //console.log('body: '+body);
            var obj = JSON.parse(body);
            if (obj.query.search.length > 0){
                var title = obj.query.search[0].title;
                request({
                    url: 'https://en.wikipedia.org/api/rest_v1/page/summary/'+title,
                    callback: function (err, resp, body){
                        obj = JSON.parse(body);
                        if (obj.thumbnail){
                            var thumbnail_url=obj.thumbnail.source;
                        }
                        fn(obj.title, obj.extract, thumbnail_url);
                    }
                });
            }
            else {
                fn(null);
            }
            
        }
    });
};

//search_wikipedia('marie curie', function(title,extract){console.log('extract: '+extract)});

exports.search_wikipedia = search_wikipedia;

var search_wiktionary = function (headword, fn){
    request({
        url:'https://en.wiktionary.org/w/api.php',
        qs: {
            format: 'json',
            action: 'query',
            titles: headword,
            prop: 'extracts',
            redirects: 'true',
            explaintext: 'true'
        },
        
        callback: function(err, resp, body){
            //console.log('body: '+body);
            var obj = JSON.parse(body);
            var definition = obj.query.pages[Object.keys(obj.query.pages)[0]].extract;
            definition = definition.replace(/====(.+)/g,'####$1');
            definition = definition.replace(/===(.+)/g,'###$1');
            definition = definition.replace(/==(.+)/g,'##$1');
            definition = definition.replace(/=/g,'');
            definition = definition.split('#### Translations')[0];
            if (definition){
                fn(definition);
            }
            else {
                fn(null);
            }
            
        }
    });
}

exports.search_wiktionary = search_wiktionary;

//search_wiktionary('enervate',function(x){console.log(x)});