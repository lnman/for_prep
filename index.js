var express = require('express');
var app = express();
var cool = require('cool-ascii-faces');
var url=require('url');

var req = require('request');

app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));

app.get('/', function(request, response) {
  response.send(cool());
});



// add some new pattern
var greet=[/How.*you/i,/what.*your.*name/i,/pleasure.*meet.*you/i];
app.get('/greetings', function(request, response) {
  response.writeHead(200, { 'Content-Type': 'application/json' });
  var fullquery=url.parse(request.url,true);
  var query=fullquery.query;
  var q=unescape(query.q||"");
  var answer="";
  for (var i = 0; i < greet.length; i++) {
    var mat=q.match(greet[i]);
    if(mat){
      if(i==0){
        answer+="I am fine. How are you?";
        break;
      }
      if(i==1){
        answer+="My name is shaba. I am a bot.";
        break;
      }
      if(i==2){
        answer+="Pleased to meet you too.";
        break;
      }

    } 
  }
  if(answer===""){
    answer="I am not that clever to answer your question";
  }
  response.end(JSON.stringify({"answer":"Hello, Kitty!"+answer}));
});


// add some new pattern
var cityreg=/ in .*?$/i;
var weather_type=[/what.*today.*temperature/i,/what.*today.*humidity/i,/Is.*(Rain|clouds|clear)/i];
app.get('/weather', function(request, response) {
  response.writeHead(200, { 'Content-Type': 'application/json' });
  var fullquery=url.parse(request.url,true);
  var query=fullquery.query;
  var q=unescape(query.q||"");
  var mat=q.match(cityreg);
  if(!mat){
    response.end(JSON.stringify({"answer":"I didn't understand the question"}));
    return;
  }
  var ppos=0;
  for (var i = mat[0].length - 2; i >= 0; i--) {
    if(mat[0][i]==' '){ppos=i+1;break;}
  };
  var parsed_var=mat[0].substr(ppos,mat[0].length-ppos-1);
  if(!parsed_var){
    response.end(JSON.stringify({"answer":"I didn't understand the question"}));
    return;
  }
  //console.log(parsed_var);
  req({
    method: 'GET',
    uri: 'http://api.openweathermap.org/data/2.5/weather',
    qs:{q:parsed_var}
  },function (error, resp, body) {
      if (error) {
        response.end(JSON.stringify({"answer":"failed to get data."}));
      }
      else{
        var pp=JSON.parse(body);
        //console.log(pp);
        var answer="";
        for (var i = 0; i < weather_type.length; i++) {
          var mat=q.match(weather_type[i]);
          if(mat){
            if(i==0){
              answer+=pp.main.temp+" K";
              break;
            }
            if(i==1){
              answer+=pp.main.humidity;
              break;
            }
            if(i==2){
              answer+="No";
              if(q.match("\\"+pp.weather[0].main+"\\i"))answer="Yes";
              break;
            }
          }
        }
      response.end(JSON.stringify({"answer":answer}));
      }
    });
});




// naive using doc
app.get('/qa', function(request,response){
  response.writeHead(200, {'Content-Type':'application/json'});
  var fullquery=url.parse(request.url,true);
  var query=fullquery.query;
  var q=unescape(query.q||"");
  req({
    method: 'GET',
    uri: 'http://quepy.machinalis.com/engine/get_query',
    qs:{
      question: q
    }
  },function (error, resp, body) {
      if(error){
        response.end(JSON.stringify({"answer":"failed to get query."}));
      }
      else{
        var pp=JSON.parse(body);
        var sqlq=pp.queries[0].query;
        if(!sqlq) return response.end(JSON.stringify({"answer":"Your majesty! Jon Snow knows nothing! So do I!"}));
        //console.log(sqlq);
        req({
          method: 'GET',
          uri: 'http://dbpedia.org/sparql',
          qs:{
            "debug": "on",
            "timeout": "0",
            "query": sqlq,
            "default-graph-uri": "",
            "format": "application/sparql-results+json"
          }
        },function (error, resp, body) {
            if(error){
              response.end(JSON.stringify({"answer":"failed to get data."}));
            }
            else{
              //console.log(body);
              var pp=JSON.parse(body);
              var answer="";
              if(pp&&pp.results&&pp.results.bindings){
                pp=pp.results.bindings;
                for (var i = pp.length - 1; i >= 0; i--) {
                  if(pp[i]&&pp[i].x1&&pp[i].x1["xml:lang"]==="en"){
                    answer=pp[i].x1.value;
                    break;
                  }
                };
                if(answer==="")answer="Your majesty! Jon Snow knows nothing! So do I!";
              }else answer="Your majesty! Jon Snow knows nothing! So do I!";
              response.end(JSON.stringify({"answer":answer}));
            }
        });
      }
    });
});

var pg = require('pg');
app.get('/db', function (request, response) {
  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    client.query('SELECT * FROM test_table', function(err, result) {
      done();
      if (err)
       { console.error(err); response.send("Error " + err); }
      else
       { response.send(result.rows); }
    });
  });
})

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
