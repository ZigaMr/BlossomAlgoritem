/**
 * @author Adrian Haarbach
 * This file contains just our basic graph representation, together with methods to parse and sequentialize the graph.
 * @requires d3.map
 */

/**
 * Represents a graph
 * @constructor
 */
var Graph = function(){
  this.nodeIds=0;
  this.edgeIds=0;
  this.nodes=d3.map();      // key: node ID, value: node
  this.edges=d3.map();      // key: edge ID, value: edge 
  this.edgeMap = d3.map();  // key: unique value derived from start node and end node ID, value: edge
}

/**
 * Represents a graph node
 * @constructor
 */
Graph.Node = function(x,y,id){
  this.x=x;
  this.y=y;
  this.id=id;
  this.resources = [];
  
  this.outEdges = d3.map();
  this.inEdges = d3.map();    

  this.state={};//changes during algorithm runtime
}

Graph.Node.prototype.getInEdges = function(){
  return this.inEdges.values();
}

Graph.Node.prototype.getOutEdges = function(){
  return this.outEdges.values();
}

function styleResources(resources,left,right,f){
  var f = f || function(d){return d};
  var str = resources.map(f).join(",");
  if(resources.length>1) str = left + str + right;
  return str;
}

Graph.Node.prototype.toString = function(full,f){
  var str="";
  if(full) str += this.id+" ";
  str +=styleResources(this.resources,"[","]",f);
  return str;
}

/**
 * Represents a graph edge
 * @constructor
 */
Graph.Edge = function(s, t, id){
  this.start=s;
  this.end=t;
  this.id=id;

  this.resources=[];

  this.state={}; //changes during algorithm runtime
}

Graph.Edge.prototype.toString = function(full,f){
  var str="";
  if(full) str += this.start.id+"->"+this.end.id+" ";
  str += styleResources(this.resources,"(",")",f);
  return str;
}

Graph.Node.prototype.clone = function() {
    var nodeClone = new Graph.Node(this.x, this.y, this.id);
    return nodeClone;
}

Graph.Edge.prototype.clone = function() {
    var edgeClone = new Graph.Edge(this.start, this.end, this.id);
    return edgeClone;
}

Graph.prototype.clone = function() {
    var graphClone = new Graph();
    graphClone.nodeIds = this.nodeIds;
    graphClone.edgeIds = this.edgeIds;

    this.nodes.forEach( function(nodeID, node) {
        graphClone.addNodeWithID(node.x, node.y, parseInt(nodeID), node.resources);
    });
    this.edges.forEach( function(edgeID, edge) {
        graphClone.addEdgeWithID(edge.start.id, edge.end.id, parseInt(edgeID), edge.resources);
    });
    return graphClone;
}

/////////////////
//MEMBERS

/**
 * add a node to the graph
 * @param {Number|String} x coordinate
 * @param {Number|String} y coordinate
 */
Graph.prototype.addNode = function(x,y,resources){
  var node = new Graph.Node(+x,+y,this.nodeIds++);
  node.resources=resources || [];
  for(var i = 0, toAdd = this.getNodeResourcesSize() - node.resources.length; i<toAdd; i++){
    node.resources.push(0);
  }
  this.nodes.set(node.id,node);
  return node;
}

Graph.prototype.addNodeWithID = function(x, y, nodeId, resources){
  var node = new Graph.Node(+x, +y, nodeId);
  node.resources=resources || [];
  for(var i = 0, toAdd = this.getNodeResourcesSize() - node.resources.length; i<toAdd; i++){
    node.resources.push(0);
  }
  this.nodes.set(node.id,node);
  return node;
}

Graph.prototype.addNodeDirectly = function(node){
  node.id = this.nodeIds++;
  for(var i = 0, toAdd = this.getNodeResourcesSize() - node.resources.length; i<toAdd; i++){
    node.resources.push(0);
  }
  this.nodes.set(node.id,node);
  return node;
}

/**
 * add an edge to the graph
 * @param {Number|String} id of start node
 * @param {Number|String} id of end node
 */
Graph.prototype.addEdge = function(startId,endId,resources){
    var s = this.nodes.get(startId);
    var t = this.nodes.get(endId);
    var edge = new Graph.Edge(s, t, this.edgeIds++);
    edge.resources=resources;
    edge.start.outEdges.set(edge.id,edge);
    edge.end.inEdges.set(edge.id,edge);
    this.edges.set(edge.id,edge);
    // Add edge to edge map. First compute unique key from start and end node ID with Cantor's pairing function.
    var key = s.id + 0.5*(s.id + t.id)*(s.id + t.id + 1);
    this.edgeMap.set(key, edge);        
    return edge;
}

Graph.prototype.addEdgeWithID = function(startId, endId, edgeId, resources) {
    var s = this.nodes.get(startId);
    var t = this.nodes.get(endId);
    var edge = new Graph.Edge(s, t, edgeId);
    edge.resources=resources;
    edge.start.outEdges.set(edge.id,edge);
    edge.end.inEdges.set(edge.id,edge);
    this.edges.set(edge.id,edge);
    // Add edge to edge map. First compute unique key from start and end node ID with Cantor's pairing function.
    var key = s.id + 0.5*(s.id + t.id)*(s.id + t.id + 1);
    this.edgeMap.set(key, edge);        
    return edge;
}

Graph.prototype.addCompleteEdge = function(edge){
    edge.id = this.edgeIds++;
    edge.start.outEdges.set(edge.id,edge);
    edge.end.inEdges.set(edge.id,edge);
    this.edges.set(edge.id,edge);
    var max = this.getEdgeResourcesSize();
    while(edge.resources.length<max) edge.resources.push(Math.floor(Math.random()*100.0));
    // Add edge to edge map. First compute unique key from start and end node ID with Cantor's pairing function.
    var key = edge.start.id + 0.5*(edge.start.id + edge.end.id)*(edge.start.id + edge.end.id + 1);
    this.edgeMap.set(key, edge);   
    return edge;
}

// If end node is not known at that time. (For the Graph Editor.)
Graph.prototype.addUnfinishedEdge = function(edge) {
    edge.id = this.edgeIds++; 
    this.edges.set(edge.id,edge);
    return edge;  
}

Graph.prototype.getEdge = function(startID, endID) {
    var key = startID + 0.5*(startID + endID)*(startID + endID + 1);
    return this.edgeMap.get(key);
}

Graph.prototype.existsEdgeBetween = function(startID, endID) {
    var key = startID + 0.5*(startID + endID)*(startID + endID + 1);
    return this.edgeMap.has(key);
}

Graph.prototype.removeNode = function(id){
  var that=this;
  var node = this.nodes.get(id);
  node.outEdges.forEach(function(key,value){
      that.removeEdge(key);
  });
  node.inEdges.forEach(function(key,value){
      that.removeEdge(key);
  });
  this.nodes.remove(id);
  return node;
}

Graph.prototype.removeEdge = function(id){
    var startID = this.edges.get(id).start.id;
    var endID = this.edges.get(id).end.id;
    this.nodes.get(startID).outEdges.remove(id);
    this.nodes.get(endID).inEdges.remove(id);
    var key = startID + 0.5*(startID + endID)*(startID + endID + 1);
    this.edgeMap.remove(key);  
    return this.edges.remove(id);
}

Graph.prototype.removeUnfinishedEdge = function(id){
    var startID = this.edges.get(id).start.id;
    var endID = this.edges.get(id).end.id;
    this.nodes.get(startID).outEdges.remove(id);
    this.nodes.get(endID).inEdges.remove(id);
    return this.edges.remove(id);
}

Graph.prototype.getNodes = function(){
  return this.nodes.values();
}

Graph.prototype.getEdges = function(){
  return this.edges.values();
}

Graph.prototype.toString = function(){
  var lines = []; 

  lines.push("% Graph saved at "+new Date());

  this.nodes.forEach(function(key,node){
      var line = "n " + node.x + " " + node.y;
      if(node.resources.length>0) line +=" "+node.resources.join(" ");
      lines.push(line);
  });
  this.edges.forEach(function(key,edge){
      var line = "e " + edge.start.id + " " + edge.end.id;
      if(edge.resources.length>0) line +=" "+edge.resources.join(" ");
      lines.push(line);
  });

  return lines.join("\n");
}

Graph.prototype.getNodeResourcesSize = function(){
  var max=0;
  this.nodes.forEach(function(key,node){
     max = Math.max(max,node.resources.length);
  });
  return max;
}

Graph.prototype.getEdgeResourcesSize = function(){
  var max=0;
  this.edges.forEach(function(key,edge){
     max = Math.max(max,edge.resources.length);
  });
  return max;
}

Graph.prototype.replace = function(oldGraph){
  this.nodeIds = oldGraph.nodeIds;
  this.edgeIds = oldGraph.edgeIds;
  this.nodes = oldGraph.nodes;
  this.edges = oldGraph.edges;
}

Graph.prototype.getState = function(){
  var savedState = { nodes : {}, edges : {} };
  this.nodes.forEach(function(key,node){
     savedState.nodes[key] = JSON.stringify(node.state);
  });
  this.edges.forEach(function(key,edge){
     savedState.edges[key] = JSON.stringify(edge.state);
  });
  return savedState;
}

Graph.prototype.setState = function(savedState){
  this.nodes.forEach(function(key,node){
     node.state = JSON.parse(savedState.nodes[key]);
  });
  this.edges.forEach(function(key,edge){
     edge.state = JSON.parse(savedState.edges[key]);
  });
}

/////////////////
//STATICS

/**
 * Graph Parser factory method
 * @static
 * @method
 * @param {String} text - sequentialized Graph
 * @return {Graph} - parsed Graph object
 */
Graph.parse = function(text){
  var lines = text.split("\n");

  var graph = new Graph();

  function parseResources(s){
      var resources = [];
      for(var i=3; i<s.length; i++){
          resources.push(+s[i]);
      }
      return resources;
  }

  // Nach Zeilen aufteilen
  for (var line in lines) {
      var s = lines[line].split(" ");
      // Nach Parametern aufteilen
      if (s[0] == "%") { //comment
          continue;
      }	
      //x y r1 r2 ...
      if (s[0] == "n") {
          graph.addNode(s[1], s[2], parseResources(s));
          continue;
      }
      //s t r1 r2 ... 
      if (s[0] == "e") {
          resources = parseResources(s);  
          graph.addEdge(s[1], s[2], resources);    
      };
  }

  if(graph.nodeIds==0 && graph.edgeIds==0){
    throw "parse error";
  }

  return graph;
}

Graph.createRandomGraph = function() {
    var graph = new Graph();
    
    // choose number of nodes between 5 and 10
    var numNodes = Math.floor(Math.random()*5.0) + 5;  
    
    for(var i = 0; i < numNodes; ++i) {
        var x = Math.random() * 600 + 50;     // Knoten nicht zu nah am Rand
        var y = Math.random() * 350 + 50;
        x = Math.round(x/10)*10;             // Knoten ein bisschen gleichmäßiger verteilt.
        y = Math.round(y/10)*10;
        graph.addNode(x,y,[]);
	}  

    for(var i = 0; i < numNodes; ++i) {
        for(var j = i+1; j < numNodes; ++j) {
            if(Math.random() < 0.3) {
                graph.addEdge(i,j,[]);
                graph.addEdge(j,i,[]);
            }
        }
	}

    return graph;
}

Graph.setGraph = function() {
    var selection = $("#tg_select_GraphSelector>option:selected").val();
    var filename = "";

    // remove background picture if loaded
    var svg = d3.select("#tg_canvas_graph");
    svg.select("#europaRect").remove();

    switch (selection) {
        case "Triangle":
            filename = "Triangle.txt";
            break;
        case "Pentagon":
            filename = "Pentagon.txt";
            break;
        case "Triangles and squares":
            filename = "TrianglesAndSquares.txt";
            break;
        case "House of cards":
            filename = "HouseOfCards.txt";
            break;
        case "Large house of cards":
            filename = "HouseOfCards2.txt";
            break;
        case "Large graph":
            filename = "LargeGraph1.txt";
            break;
        case "Another large graph":
            filename = "LargeGraph2.txt";
            break;
        case "Random graph":
            Graph.instance = Graph.createRandomGraph();
            Graph.onLoadedCbFP.forEach(function(fp){fp()});
            return;
    }

    var GRAPH_FILENAME = GRAPH_FILENAME || null;
    var completeFilename = GRAPH_FILENAME || "graphs-new/" + filename; //the selected option 
    Graph.loadInstance(completeFilename,function(error,text,completeFilename){
        console.log("error loading graph instance "+error + " from " + filename +" text: "+text);
    }); 
}

Graph.load = function(filename, callbackFp){
  d3.text(filename, function(error,text){
    var graph = Graph.parse(text);
    callbackFp(graph);
  });
}

Graph.setInstance = function(error,text,filename,exceptionFp){
    if(error != null){
      exceptionFp ? exceptionFp(error,text,filename) : console.log(error,text,filename);
      return;
    };
    var noErrors=false;
    try{
      Graph.instance = Graph.parse(text);
      noErrors=true;
    }catch(ex){
      if(exceptionFp) exceptionFp(ex,text,filename);
      else console.log(ex,text,filename);
    }
    if(noErrors) Graph.onLoadedCbFP.forEach(function(fp){fp()});
}

Graph.loadInstance = function(filename,exceptionFp){
  d3.text(filename, function(error,text){
    Graph.setInstance(error,text,filename,exceptionFp)
  });
}

Graph.instance = null;

Graph.onLoadedCbFP = [];

Graph.addChangeListener = function(callbackFp){
  Graph.onLoadedCbFP.push(callbackFp);
}

Graph.handleFileSelect = function(evt,exceptionFp) {
    var files = evt.target.files; // FileList object

    // Loop through the FileList and render image files as thumbnails.
    for (var i = 0, f; f = files[i]; i++) {

      // Only process image files.
      if (!f.type.match('text/plain')) {
        exceptionFp("wrong mimetype",f.type);
        continue;
      }

      var reader = new FileReader();

      // Closure to capture the file information.
      reader.onload = (function(theFile) {
        return function(e) {
          var error = e.target.error;
          var text = e.target.result;
          var filename = theFile.name;
          Graph.setInstance(error,text,filename,exceptionFp)
        };
      })(f);

      // Read in the image file as a data URL.
      reader.readAsText (f);
    }
}
