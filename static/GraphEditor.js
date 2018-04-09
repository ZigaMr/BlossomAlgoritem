var GraphEditor = function(svgOrigin){
  GraphDrawer.call(this,svgOrigin,null,0);

  this.type="GraphEditor";

  this.svgOrigin
    .on("dblclick",dblclick) //for adding new nodes
    .on("mousemove",mousemove)
    .on("mousedown",mousedown)
    .on("contextmenu", function(d){d3.event.stopPropagation();d3.event.preventDefault()});

  // event handler for enter key
  d3.select("body")
    .on("keydown", function () {
        var key = d3.event.keyCode;
        if(key == 13) { // enter key code
            blurResourceEditor();
        }
    }); 

  this.onNodesEntered = function(selection) {   
    selection
      .on("mousedown", mousedownNode)
      .on("mouseup", mouseupNode)
      .on("contextmenu", contextmenuNode)
      .on("dblclick",dblclickResource);
  }

  this.onNodesUpdated = function(selection){
      selection
       .style("cursor",function(d){
        return (dragging && d == selectedNode) ? "move" : "pointer"
      })
      .selectAll("circle")
       .style("stroke", function(d){
        if(d==selectedNode){
          return const_Colors.NodeBorderHighlight;
        }else{
          return global_NodeLayout['borderColor'];
        }
      })

  }

  this.onEdgesEntered = function(selection) {   
    selection
      .on("contextmenu", contextmenuEdge)
      .style("cursor","pointer") //crosshair pointer move
    
    var all =selection.on("dblclick",dblclickResource);
  }

  this.onEdgesUpdated = function(selection) {
       selection
      .style("cursor",function(d){
        return (d == unfinishedEdge) ? "crosshair" : "pointer";
      }) //crosshair pointer move
  }

    var that=this;

    /**
     * Zeigt an, ob wir im Moment die Maus bei gedrücktem Mauszeiger verschieben
     * (Drag and Drop)
     * @type Boolean
     */
    var dragging = false;

    /**
     * Zeigt an, ob wir beim letzten Event noch verschoben haben
     * (dann wir der aktuell ausgewählte Knoten abgewählt)
     * @type Boolean
     */
    var hasDragged = false;

    /**
     * Der aktuell ausgewählte Knoten
     * @type d3 Selection with typeof datum() == Graph.Node
     */
    var selectedNode = null;

    /**
      * line that is beeing drawn
      */
    var unfinishedEdge = null;


    var deselectNode = function(){
      if(selectedNode != null){
        selectedNode = null;
      }
      unfinishedEdge = null;
          that.svgOrigin.style("cursor","default");

      blurResourceEditor();
      that.update();
    }

    var selectNode = function(selection){
      selectedNode = selection;
    }

    /**
     * End of mouseclick on a node
     * @method
     */
    function mouseupNode(){
      dragging = false;
      if(hasDragged){
        deselectNode();
      }else if(selectedNode){
        var endNode = new Graph.Node(selectedNode.x, selectedNode.y, "invisible");
        unfinishedEdge = new Graph.Edge(selectedNode,endNode,"unfinished");
        Graph.instance.addUnfinishedEdge(unfinishedEdge);
        svgOrigin.style("cursor","crosshair") //crosshair
      }
      hasDragged = false;
      d3.event.stopPropagation(); //we dont want svg to receive the event
      that.updateNodes();
    }

    /**
      * moving a mouse on the svgOrigin
      */
    function mousemove(){
      if(selectedNode != null){
          var pos = d3.mouse(this);
          var xy = that.screenPosToNodePos(pos);
          //moving a node
          if(dragging){
            selectedNode.x = xy.x; 
            selectedNode.y = xy.y;
            hasDragged = true;
            that.update();
          }
          //drawing an edge
          else{
            unfinishedEdge.end.x = xy.x;
            unfinishedEdge.end.y = xy.y;
            that.updateEdges();
          }

       }
     }

function dblclick(){
  d3.event.preventDefault();d3.event.stopPropagation();
  var pos = d3.mouse(this);
  addNode(pos);
  
}

//Es wird entweder die Auswahl aufgehoben, ein Knoten ausgewählt oder eine Kante zwischen vorhandenen Knoten erstellt.
function mousedownNode(d,id){
  if(selectedNode == d){// Falls wir wieder auf den selben Knoten geklickt haben, hebe Auswahl auf.
      if(unfinishedEdge) Graph.instance.removeEdge(unfinishedEdge.id);
      deselectNode();
  }else if(selectedNode == null) { // Falls wir nichts ausgewählt hatten, wähle den Knoten aus
      dragging = true;
      selectNode(d);
  }else {// Füge Kante hinzu
      unfinishedEdge.end=d; //throw away temporary end node;
      Graph.instance.removeUnfinishedEdge(unfinishedEdge.id);
      Graph.instance.edgeIds--;
      if (!Graph.instance.existsEdgeBetween(unfinishedEdge.start.id, unfinishedEdge.end.id)) {  
          Graph.instance.addCompleteEdge(unfinishedEdge);
          var secondEdge = new Graph.Edge(unfinishedEdge.end, unfinishedEdge.start, -1);          
          Graph.instance.addCompleteEdge(secondEdge);
      }
      deselectNode();
      that.updateEdges();
  }

  that.update();

  blurResourceEditor();

  d3.event.stopPropagation(); 
}

// Wir haben nicht auf einem Knoten gestoppt 
// -> Falls etwas ausgewählt war, erstelle Knoten und zeichne Kante
function mousedown(a,b,c){
  if(selectedNode){ //unfinishedEdge starts in selectedNode
    var pos = d3.mouse(this);
    Graph.instance.addNodeDirectly(unfinishedEdge.end);

    Graph.instance.removeUnfinishedEdge(unfinishedEdge.id);
    Graph.instance.edgeIds--;
    Graph.instance.addCompleteEdge(unfinishedEdge);
    var secondEdge = new Graph.Edge(unfinishedEdge.end, unfinishedEdge.start, -1);          
    Graph.instance.addCompleteEdge(secondEdge);

    deselectNode();
    that.updateEdges(); 
    that.updateNodes(); 
  }
  blurResourceEditor();
}

function blurResourceEditor(){
  updateResources([]);
}

var myDiv = d3.select("body");

function updateResources(data){
      var selection = myDiv.selectAll("input.resourceEditor")
    .data(data);

  selection.enter().append("input")
      .attr("type","number")
      .attr("class", "tooltip resourceEditor")

  selection
  .attr("value",function(a,b,c){ 
    return +a;
  })
  .on("input", function(a,b,c) {
     data[b]=+this.value;
     that.update()
  })
  .style("left", function(a,b,c){
    return (d3.event.pageX - 30+40*b) + "px"
  })
  .style("top", function(a,b,c){return (d3.event.pageY)+ "px"})

  if (selection.node()) selection.node().focus();

  selection.exit().remove();  
}

function dblclickResource(d,i,all)
{
  d3.event.stopPropagation();d3.event.preventDefault();
  updateResources(d.resources);  
}

function contextmenuNode(d){
  var unfinishedID = unfinishedEdge ? unfinishedEdge.id : null;
  deselectNode();
  d3.event.stopPropagation();d3.event.preventDefault();
  Graph.instance.removeNode(d.id);
  if(unfinishedID) Graph.instance.edges.remove(unfinishedID);
  that.update();
}

function contextmenuEdge(d){
  deselectNode();
  d3.event.stopPropagation();d3.event.preventDefault();
  Graph.instance.removeEdge(d.id);
  that.updateEdges();
}


function addNode(pos){
  var xy = that.screenPosToNodePos(pos);
  Graph.instance.addNode(xy.x, xy.y);
  that.update();
}


}
GraphEditor.prototype = Object.create(GraphDrawer.prototype);
GraphEditor.prototype.constructor = GraphEditor;
