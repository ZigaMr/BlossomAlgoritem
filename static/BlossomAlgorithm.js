/**
 * Edmonds's Blossom Algorithm
 * @author Johannes Feil
 * @augments GraphDrawer
 * @class
 */
function BlossomAlgorithm(svgSelection) {
	GraphDrawer.call(this,svgSelection);

	/**
     * closure for this class
	 * @type BlossomAlgorithm
	 */
    var that = this;
    
    var debugConsole = false;
    
    var id = 0;
    var STATE_START = id++;
    var STATE_INIT = id++;
    var STATE_MAINLOOP = id++;
    var STATE_BFSLOOP = id++;
    var STATE_PICK_NEIGHBOR = id++;
    var STATE_GROW_BFS_TREE = id++;
    var STATE_AUG_PATH = id++;
    var STATE_AUG_PATH_INVERT = id++;
    var STATE_CONTRACT = id++;
    var STATE_EXPAND = id++;
    var STATE_MARK_EVEN_CIRCLE = id++;
    var STATE_FINISHED = id;
    
    /**
     * the logger instance
     * @type Logger
     */
    var logger = new Logger(d3.select("#logger"));

    /**
     * status variables
     * @type Object
     */
    var s = null;

    /**
     * Replay Stack, speichert alle Schritte des Ablaufs für Zurück Button
     * @type {Array}
     */
    var replayHistory = new Array();

    var fastforwardOptions = {label: $("#ta_button_text_fastforward").text(), icons: {primary: "ui-icon-seek-next"}};

    /**
     * Initialisiert das Zeichenfeld
     * @method
     */
    this.init = function() {

        Graph.addChangeListener(function(){
            that.clear();
            that.reset();
            that.squeeze();
            that.update();
        });

        this.reset();
        this.update();
    };

    /**
     * clear all states
     * @method
     */
    this.reset = function(){
        s = {
            id: 0, //status id
            prevState: -1, // id of previous state
            freeNodes: d3.set(), // integer set; IDs of all free nodes
            bfsRoot: -1, // node ID (integer)
            bfsQueue: [], // array of node IDs (integer)
            activeBFSNode: -1, // node ID (integer)
            currentEdgesToCheck: [], // array of edge IDs
            currentEdge: -1, // edge ID
            currentNeighbor: -1, // node ID
            freeNodeFound: -1, // node ID (integer)
            nodesToExpand: [] // stack of node IDs
        };

        logger.data = [];
        this.replayHistory = [];

        if(Graph.instance){
            // prepare graph for this algorithm: add special properties to nodes and edges
            Graph.instance.nodes.forEach(function(key, node) {
                node.free = true; // bool
                node.mate = -1; // node id (integer)
                node.pred = -1; // node id (integer)
                node.bfsLevel = -1; // integer
                node.onAugPath = false; // bool

                // for contracting and expanding:
                node.contractedEdges = d3.map(); // edge ID, edge object
                node.contractedNodes = d3.map(); // node ID, node object
                node.contractedBFSRoot = -1; // node ID
                node.blossom = []; // array of nodes on the contracted circle, always beginning with the stem of the blossom
                node.augPathNeighbor = -1; // node id
            })

            Graph.instance.edges.forEach(function(key, edge) {
                edge.matched = false; // bool
                edge.isTreeEdge = false; // bool
                edge.onAugPath = false; // bool
                edge.forVisualization = false; // bool
            })
        }
    }

    /**
     * Makes the view consistent with the state
     * @method
     */
    this.update = function(){

        this.updateDescriptionAndPseudocode();
        logger.update();


        if(Graph.instance){
             BlossomAlgorithm.prototype.update.call(this); //updates the graph
        }
    }

    /**
     * When Tab comes into view
     * @method
     */
    this.activate = function() {
        this.reset();
        this.squeeze();
        this.update();
    };

    /**
     * tab disappears from view
     * @method
     */
    this.deactivate = function() {
        this.stopFastForward();
        this.reset();
        Graph.instance = null;
        Graph.setGraph();
    };

    /*
     * Returns true if warning tab for tab change should be displayed.
     * @method
     */   
    this.getWarnBeforeLeave = function() {
        return s.id != 0 && s.id != id;
    } 
    
    
    this.setDisabledBackward = function(disabled) {
        $("#ta_button_Zurueck").button("option", "disabled", disabled);
    };
    
    this.setDisabledForward = function(disabled, disabledSpulen) {
        var disabledSpulen = (disabledSpulen!==undefined) ? disabledSpulen : disabled;
        $("#ta_button_1Schritt").button("option", "disabled", disabled);
        $("#ta_button_vorspulen").button("option", "disabled", disabledSpulen);
    };

    /*
     * Deep copy of d3.set()
     */
    var cloneSet = function(set) {
        var setCopy = d3.set();
        set.forEach( function(key) {
            setCopy.add(key);
        });
        return setCopy;
    }

    /*
     * Deep copy of an array
     */
    var cloneArray = function(array) {
        var arrayCopy = [];
        for (var i = 0; i < array.length; ++i) {
            var value = array[i];
            if (value instanceof Graph.Node || value instanceof Graph.Edge) {
                arrayCopy.push(value.clone());
            }
            else {
                arrayCopy.push(value);
            }
        }
        return arrayCopy;
    }

    /*
     * Deep copy of status variable s.
     */
    var cloneState = function() {
        var sCopy = {
            id: 0, //status id
            prevState: -1, // id of previous state
            freeNodes: d3.set(), // integer set; IDs of all free nodes
            bfsRoot: -1, // node ID (integer)
            bfsQueue: [], // array of node IDs (integer)
            activeBFSNode: -1, // node ID (integer)
            currentEdgesToCheck: [], // array of edge IDs
            currentEdge: -1, // edge ID
            currentNeighbor: -1, // node ID
            freeNodeFound: -1, // node ID (integer)
            nodesToExpand: [] // stack of node IDs
        };
        sCopy.id = s.id;
        sCopy.prevState = s.prevState;
        sCopy.bfsRoot = s.bfsRoot;
        sCopy.bfsQueue = s.bfsQueue.slice(0);
        sCopy.activeBFSNode = s.activeBFSNode;
        sCopy.freeNodeFound = s.freeNodeFound;
        sCopy.freeNodes = cloneSet(s.freeNodes);
        sCopy.nodesToExpand = s.nodesToExpand.slice(0);
        sCopy.currentEdgesToCheck = s.currentEdgesToCheck.slice(0);
        sCopy.currentEdge = s.currentEdge;
        sCopy.currentNeighbor = s.currentNeighbor;

        return sCopy;
    }

    /*
     * Deep copy of d3.map()
     */
    var cloneMap = function(map) {
        var mapClone = d3.map();
        map.forEach( function(key, value) {
            if (value instanceof Graph.Node) {
                var newNode = value.clone();
                newNode.free = value.free;
                newNode.mate = value.mate;
                newNode.pred = value.pred;
                newNode.bfsLevel = value.bfsLevel;
                newNode.onAugPath = value.onAugPath;

                newNode.contractedEdges = cloneMap(value.contractedEdges);
                newNode.contractedNodes = cloneMap(value.contractedNodes);
                newNode.contractedBFSRoot = value.contractedBFSRoot;
                newNode.blossom = value.blossom.slice(0); // = clone()
                newNode.augPathNeighbor = value.augPathNeighbor;

                mapClone.set(key, newNode);
            }
            else if (value instanceof Graph.Edge) {
                var newEdge = value.clone();
                newEdge.matched = value.matched;
                newEdge.isTreeEdge = value.isTreeEdge;
                newEdge.onAugPath = value.onAugPath;
                newEdge.forVisualization = value.forVisualization;

                mapClone.set(key, newEdge);
            }
            else {
                mapClone.set(key, value);
            }
        });
        return mapClone; 
    }   

    /*
     * Deep copy of the graph.
     */
    var cloneBlossomGraph = function() {
        var graphClone = new Graph();
        graphClone.nodeIds = Graph.instance.nodeIds;
        graphClone.edgeIds = Graph.instance.edgeIds;

        // add nodes and edges
        Graph.instance.nodes.forEach( function(nodeID, node) {
            graphClone.addNodeWithID(node.x, node.y, parseInt(nodeID), node.resources);
        });
        Graph.instance.edges.forEach( function(edgeID, edge) {
            if (! edge.forVisualization) {
                graphClone.addEdgeWithID(edge.start.id, edge.end.id, parseInt(edgeID), edge.resources);
            }
            else {
                addVisualizationEdgeToGraph(edge.start.id, edge.end.id, parseInt(edgeID), edge.isTreeEdge ? 1 : 2, graphClone);
            }
        });

        // initialize additional attributes of nodes and edges
        Graph.instance.nodes.forEach( function(nodeID, node) {
            var currentNode = graphClone.nodes.get(nodeID);
            currentNode.free = node.free;
            currentNode.mate = node.mate;
            currentNode.pred = node.pred;
            currentNode.bfsLevel = node.bfsLevel;
            currentNode.onAugPath = node.onAugPath;

            currentNode.contractedEdges = cloneMap(node.contractedEdges);
            currentNode.contractedNodes = cloneMap(node.contractedNodes);
            currentNode.contractedBFSRoot = node.contractedBFSRoot;
            currentNode.blossom = node.blossom.slice(0); // = clone()
            currentNode.augPathNeighbor = node.augPathNeighbor;
        });

        Graph.instance.edges.forEach( function(edgeID, edge) {
            var currentEdge = graphClone.edges.get(edgeID);
            if (!edge.forVisualization) {
                currentEdge.matched = edge.matched;
            }
            currentEdge.isTreeEdge = edge.isTreeEdge;
            currentEdge.onAugPath = edge.onAugPath;
            currentEdge.forVisualization = edge.forVisualization;
        });
        return graphClone; 
    };

    /**
     * add a step to the replay stack, serialize stateful data
     * @method
     */
    this.addReplayStep = function() {
        var cloneS = cloneState(); 
        var graphCopy = cloneBlossomGraph(); 

        replayHistory.push({
            "graphState": graphCopy,
            "s": cloneS,
            "legende": $("#tab_ta").find(".LegendeText").html(),
            "loggerData": JSON.stringify(logger.data)
        });
    };

    /*
     * Returns the color of a node depending on the state of the algorithm. 
     */
    var getNodeColor = function(d) {
        var node = Graph.instance.nodes.get(d.id);
       
        if (node.onAugPath) {
            return "green";
        }
        else if (s.freeNodeFound != -1 && node.id == s.freeNodeFound) {
            return "yellow";
        }
        else if (node.id == s.activeBFSNode) {
            return "red";
        } 
        else if (node.id == s.currentNeighbor) {
            return "orange";
        }
        else if (s.id == 2 && node.free) {
            return "yellow";
        }
        else {
            return global_NodeLayout['fillStyle'];
        }
    }

    /*
     * Returns the stroke color of a node depending on the state of the algorithm. 
     */
    var getNodeStroke = function(d) {
        var node = Graph.instance.nodes.get(d.id);
        
        if (s.bfsRoot == node.id) {
            return const_Colors.NodeBorderHighlight;
        }
        else {
            return global_NodeLayout['borderColor'];
        }
    }

    /*
     * Returns the stroke width of a node depending on the state of the algorithm. 
     */
    var getNodeStrokeWidth = function(d) {
        var node = Graph.instance.nodes.get(d.id);

        if (node.contractedNodes.size() > 0) {
            return "4px";
        }
        else {
            return "2px";
        }
    }

    /*
     * Returns the radius of a node depending on the state of the algorithm. 
     */
    var getNodeRadius = function(d) {
        var node = Graph.instance.nodes.get(d.id);

        if (node.contractedNodes.size() > 0) {
            return global_KnotenRadius * 1.3;
        }
        else {
            return global_KnotenRadius;
        }
    }

    /*
     * Updates the visualization of all nodes. 
     */
    this.onNodesUpdated = function(selection) {
        selection
        .selectAll("circle")
        .attr("r", function(d) {
            return getNodeRadius(d);
        })
        .style("fill", function(d) {
            return getNodeColor(d);
        })
        .style("stroke", function(d) {
            return getNodeStroke(d);
        })
        .style("stroke-width", function(d) {
            return getNodeStrokeWidth(d);
        });
    }

    /*
     * Returns the color of an edge depending on the state of the algorithm. 
     */
    var getLineColor = function(d) {
        var edge = Graph.instance.edges.get(d.id);

        var currentEdge1 = null;
        var currentEdge2 = null;
        if (s.currentEdge != -1) {
            currentEdge1 = Graph.instance.edges.get(s.currentEdge);
            currentEdge2 = Graph.instance.getEdge(currentEdge1.end.id, currentEdge1.start.id);
        }

        if (edge.forVisualization && edge.onAugPath) {
            return "green";
        }
        else if (edge.forVisualization && edge.isTreeEdge) {
            return "grey";
        }
        else if (currentEdge1 != null && (edge.id == currentEdge1.id || edge.id == currentEdge2.id)) {
            return "orange";             
        }
        else if (edge.matched) {
            return const_Colors.NodeBorder;
        }
        else return "#000000";
    }

    /*
     * Returns the width of an edge depending on the state of the algorithm. 
     */
    var getStrokeWidth = function(d) {
        var edge = Graph.instance.edges.get(d.id);

        if (edge.forVisualization) {
            return 10;
        }
        else return 2;
    }

    /*
     * Returns the transparency of an edge depending on the state of the algorithm. 
     */
    var getStrokeOpacity = function(d) {
        var edge = Graph.instance.edges.get(d.id);

        if (edge.forVisualization) {
            return 0.5;
        }
        else return 1.0; 
    }

    /*
     * Updates the visualization of all edges. 
     */
    this.onEdgesUpdated = function(selection) {
        selection
        .selectAll("line")
        .style("stroke", function(d) {
            return getLineColor(d);
        })
        .style("stroke-width", function(d) {
            return getStrokeWidth(d);
        })
        .style("stroke-opacity", function(d) {
            return getStrokeOpacity(d);       
        });

    }

    /**
     * playback the last step from stack, deserialize stateful data
     * @method
     */
    this.previousStepChoice = function() {
        
        var oldState = replayHistory.pop();
        if (debugConsole)
            console.log("Replay Step", oldState);
        
        Graph.instance = oldState.graphState;
        s = oldState.s;
        logger.data = JSON.parse(oldState.loggerData);
        $("#tab_ta").find(".LegendeText").html(oldState.legende);
        
        this.update();
    };

    /*
     * Returns the description depending on the current and previous state.
     */
    var getDescription = function(divCounter) {
        if (s.prevState == -1 && s.id == 0) return divCounter == 0;
        else if (s.prevState == 0 && s.id == 2) return divCounter == 3;
        else if (s.prevState == 3 && s.id == 1) return divCounter == 1;
        else if (s.prevState == 7 && s.id == 1) return divCounter == 2;
        else if (s.prevState == 1 && s.id == 2) return divCounter == 3;
        else if (s.prevState == 2 && s.id == 3) return divCounter == 4;
        else if (s.prevState == 4 && s.id == 3) return divCounter == 5;
        else if (s.prevState == 8 && s.id == 3) return divCounter == 6;
        else if (s.prevState == 3 && s.id == 4) return divCounter == 7;
        else if (s.prevState == 5 && s.id == 4) return divCounter == 8;
        else if (s.prevState == 10 && s.id == 4) return divCounter == 9;
        else if (s.prevState == 4 && s.id == 5) return divCounter == 10;
        else if (s.prevState == 4 && s.id == 6) return divCounter == 11;
        else if (s.prevState == 4 && s.id == 8) return divCounter == 12;
        else if (s.prevState == 4 && s.id == 10) return divCounter == 13;
        else if (s.prevState == 6 && s.id == 9) return divCounter == 14;
        else if (s.prevState == 9 && s.id == 9) return divCounter == 15;
        else if (s.prevState == 6 && s.id == 7) return divCounter == 16;
        else if (s.prevState == 9 && s.id == 7) return divCounter == 17;
        else if (s.id == 11) return divCounter == 18;
    }

    /*
     * Returns all pseudocode lines that have to be marked depending on the current and previous state.
     */
    var getPseudocodeLines = function(divCounter) {
        if (s.prevState == -1 && s.id == 0) return divCounter == 0;
        else if (s.prevState == 0 && s.id == 2) return divCounter == 1;
        else if (s.prevState == 3 && s.id == 1) return divCounter == 3;
        else if (s.prevState == 7 && s.id == 1) return divCounter == 14;
        else if (s.prevState == 1 && s.id == 2) return divCounter == 1;
        else if (s.prevState == 2 && s.id == 3) return divCounter == 2;
        else if (s.prevState == 4 && s.id == 3) return divCounter == 5;
        else if (s.prevState == 8 && s.id == 3) return divCounter == 11;
        else if (s.prevState == 3 && s.id == 4) return (divCounter == 3 || divCounter == 4);
        else if (s.prevState == 5 && s.id == 4) return divCounter == 7;
        else if (s.prevState == 10 && s.id == 4) return divCounter == 9;
        else if (s.prevState == 4 && s.id == 5) return (divCounter == 5 || divCounter == 6);
        else if (s.prevState == 4 && s.id == 6) return (divCounter == 5 || divCounter == 12);
        else if (s.prevState == 4 && s.id == 8) return (divCounter == 5 || divCounter == 10);
        else if (s.prevState == 4 && s.id == 10) return (divCounter == 5 || divCounter == 8);
        else if (s.prevState == 6 && s.id == 9) return divCounter == 13;
        else if (s.prevState == 9 && s.id == 9) return divCounter == 13;
        else if (s.prevState == 6 && s.id == 7) return divCounter == 13;
        else if (s.prevState == 9 && s.id == 7) return divCounter == 13;
        else if (s.id == 11) return divCounter == 15;
    }

    /**
     * updates status description and pseudocode highlight based on current s.id
     * @method
     */
    this.updateDescriptionAndPseudocode = function() {
        var sel = d3.select("#ta_div_statusPseudocode").selectAll("div").selectAll("p")
        sel.classed("marked", function(a, pInDivCounter, divCounter) {          
            return getPseudocodeLines(divCounter);
        });
        
        var sel = d3.select("#ta_div_statusErklaerung").selectAll("div");
        sel.style("display", function(a, divCounter) {
            return getDescription(divCounter) ? "block" : "none";
        });

        if(this.fastForwardIntervalID != null){
            this.setDisabledForward(true,false);
            this.setDisabledBackward(true);
        }else if (s.id == STATE_START) {
            this.setDisabledForward(false);
            this.setDisabledBackward(true);
        } else if (s.id == id) {
            this.setDisabledForward(true);
            this.setDisabledBackward(false);
        }else{
            this.setDisabledForward(false);
            this.setDisabledBackward(false);
        }
    };

    /**
     * Executes the next step of the algorithm
     * @method
     */
    this.nextStepChoice = function(d) {
        
        if (debugConsole)
            console.log("Current State: " + s.id);

        // Speichere aktuellen Schritt im Stack
        this.addReplayStep();
        
        s.prevState = s.id;

        switch (s.id) {

            case STATE_START:
		        this.setDisabledBackward(false);
		        this.setDisabledForward(false);
                this.reset();
                initFreeNodes();
                s.prevState = s.id;
        	    s.id = STATE_INIT;
                logger.log("Started.");
            case STATE_INIT:
                logger.log("Check if there are any free nodes.");
                if (s.freeNodes.empty()) {	
                    while (s.nodesToExpand.length != 0) {
                        expandNodes();
                    }
                    logger.log("Finished. The found matching is marked blue.");	
                    s.bfsRoot = -1;           
                    s.id = STATE_FINISHED;
                    this.stopFastForward();
                }
                else {
                    s.id = STATE_MAINLOOP;
                }
                break;
	        case STATE_MAINLOOP:
                resetNodesForBFS();                
                s.bfsRoot = parseInt(s.freeNodes.values()[0]);
                s.freeNodes.remove(s.bfsRoot);
                Graph.instance.nodes.get(s.bfsRoot).bfsLevel = 0;
                s.bfsQueue.push(s.bfsRoot);
		        s.id = STATE_BFSLOOP;
                logger.log("Trying to find an augmenting path from free node " + s.bfsRoot + ".");
                break;
            case STATE_BFSLOOP:
                if (s.bfsQueue.length == 0) {
                    resetTree();
                    resetNodesForBFS();
                    s.activeBFSNode = -1; 
                    s.bfsRoot = -1;                 
                    s.id = STATE_INIT;
                    removeVisualizationEdges();
                }
                else {
                    s.activeBFSNode = s.bfsQueue.shift();
                    s.currentEdgesToCheck = [];
                    var currentEdgesToCheckAux = Graph.instance.nodes.get(s.activeBFSNode).getOutEdges();
                    for (var i = 0; i < currentEdgesToCheckAux.length; i++) {
                        if (!currentEdgesToCheckAux[i].isTreeEdge) {                        
                            s.currentEdgesToCheck.push(currentEdgesToCheckAux[i].id);
                        }
                    }
                    logger.log("Active BFS node: " + s.activeBFSNode);
		            s.id = STATE_PICK_NEIGHBOR;
                }
                break;
            case STATE_PICK_NEIGHBOR:
                while (true) {
                    if (s.currentEdgesToCheck.length == 0) {
                        logger.log("No neighbors left. Pick next node.");                     
                        s.id = STATE_BFSLOOP;
                        break;
                    }
                    s.currentEdge = s.currentEdgesToCheck.shift();
                    s.currentNeighbor = Graph.instance.edges.get(s.currentEdge).end.id;
                    var currentNeighbor = Graph.instance.nodes.get(s.currentNeighbor);
                    logger.log("Current neighbor: " + s.currentNeighbor);
                    if (currentNeighbor.bfsLevel != -1) {
                        if (currentNeighbor.bfsLevel % 2 == 0) {
                            s.id = STATE_CONTRACT;
                        }
                        else {
                            s.id = STATE_MARK_EVEN_CIRCLE;
                        }
                        break;
                    }
                    else { 
                        if (currentNeighbor.free) {
                            s.freeNodeFound = currentNeighbor.id;
                            currentNeighbor.pred = s.activeBFSNode;
                            var edge1 = Graph.instance.edges.get(s.currentEdge);
                            edge1.isTreeEdge = true;
                            var edge2 = Graph.instance.getEdge(edge1.end.id, edge1.start.id);
                            edge2.isTreeEdge = true;
                            s.id = STATE_AUG_PATH;
                        }
                        else {
                            s.id = STATE_GROW_BFS_TREE;
                            s.bfsQueue.push(currentNeighbor.mate);
                            currentNeighbor.pred = s.activeBFSNode;
                            Graph.instance.nodes.get(currentNeighbor.mate).pred = currentNeighbor.id; 
                            currentNeighbor.bfsLevel = Graph.instance.nodes.get(s.activeBFSNode).bfsLevel + 1;
                            Graph.instance.nodes.get(currentNeighbor.mate).bfsLevel = Graph.instance.nodes.get(s.activeBFSNode).bfsLevel + 2;
                        }		            
                        break;
                    }
                }
                break;
            case STATE_GROW_BFS_TREE:
                var currentNeighbor = Graph.instance.nodes.get(s.currentNeighbor);
                // set tree edges
                Graph.instance.getEdge(s.activeBFSNode, currentNeighbor.id).isTreeEdge = true;
                Graph.instance.getEdge(currentNeighbor.id, s.activeBFSNode).isTreeEdge = true;
                Graph.instance.getEdge(currentNeighbor.id, currentNeighbor.mate).isTreeEdge = true;
                Graph.instance.getEdge(currentNeighbor.mate, currentNeighbor.id).isTreeEdge = true;
                // add visualization edges
                addVisualizationEdge(s.activeBFSNode, currentNeighbor.id, 1);
                addVisualizationEdge(currentNeighbor.id, currentNeighbor.mate, 1);
                s.currentEdge = -1;
                s.currentNeighbor = -1;
		        s.id = STATE_PICK_NEIGHBOR;
                logger.log("Grow BFS tree.");
                break;
	        case STATE_AUG_PATH:
                logger.log("Augmenting path to node " + s.freeNodeFound + " found.");
                setAugmentingPath(s.bfsRoot, s.freeNodeFound);
                if (s.nodesToExpand.length == 0) {
                    s.id = STATE_AUG_PATH_INVERT;
                }
                else {
                    s.id = STATE_EXPAND;
                }
                break;
            case STATE_AUG_PATH_INVERT:
                invertMatching();
                s.id = STATE_INIT;
                removeVisualizationEdges();
                resetTree();
                s.currentEdge = -1;
                s.currentNeighbor = -1;
                s.freeNodes.remove(s.freeNodeFound);
                s.freeNodeFound = -1;
                s.activeBFSNode = -1;
                break;
            case STATE_CONTRACT:
                logger.log("Odd-length circle found. Contract.");
                // contract blossom to one node
                contract();
                s.currentEdge = -1;
                s.currentNeighbor = -1;
                s.id = STATE_BFSLOOP;
                break;
            case STATE_EXPAND:
                logger.log("Expand contracted nodes.");
                expandNodes();
                if (s.nodesToExpand.length == 0) {
                    s.id = STATE_AUG_PATH_INVERT;
                }
                else {
                    s.id = STATE_EXPAND;
                }
                s.currentEdge = -1;
                s.currentNeighbor = -1;
                break;
            case STATE_MARK_EVEN_CIRCLE:
                s.currentEdge = -1;
                s.currentNeighbor = -1;
		        s.id = STATE_PICK_NEIGHBOR;
                logger.log("Even-length circle found.");
                break;	
            case STATE_FINISHED:
                break;
            default:
                console.log("Fehlerhafter State");
                break;
        }

        //update view with status values
        this.update();
    };



    /*
     * Initialize all free nodes.
     */
    function initFreeNodes() {
        Graph.instance.nodes.forEach(function(key, node) {
            s.freeNodes.add(key);
        })
    }

    /*
     * Reset all variables for the next BFS.
     */
    function resetNodesForBFS() { 
          s.bfsRoot = -1;
          s.bfsQueue = [];
          Graph.instance.nodes.forEach(function(key, node) {
            node.bfsLevel = -1;
            node.pred = -1;
        })
    }

    /*
     * Reset all tree variables. 
     */
    function resetTree() {
        Graph.instance.edges.forEach(function(key, edge) {
            edge.isTreeEdge = false;
            edge.onAugPath = false;
        })
        Graph.instance.nodes.forEach(function(key, node) {
            node.onAugPath = false;
        })
    }

    /*
     * Contract blossom to supednode.
     */
    function contract() {
        var targetNode = Graph.instance.nodes.get(s.activeBFSNode);
        var currentNode = Graph.instance.nodes.get(s.currentNeighbor);
        var currentBlossom = [];
        var currentBlossomPart1 = []; // part of the blossom from target node to stem
        var currentBlossomPart2 = []; // part of the blossom from current node to stem

        // 1) find all nodes along odd-length circle in correct order
        var nodesOnCircle = d3.set(); // set of blossom node ids
        while (targetNode.bfsLevel > currentNode.bfsLevel) {
            currentBlossomPart1.unshift(targetNode.id);
            targetNode = Graph.instance.nodes.get(targetNode.pred);                 
        }
        while (currentNode.bfsLevel > targetNode.bfsLevel) {
            currentBlossomPart2.push(currentNode.id);
            currentNode = Graph.instance.nodes.get(currentNode.pred);  
        }
        while (currentNode != targetNode) {
            currentBlossomPart1.unshift(targetNode.id);
            targetNode = Graph.instance.nodes.get(targetNode.pred);
            currentBlossomPart2.push(currentNode.id);
            currentNode = Graph.instance.nodes.get(currentNode.pred); 
        }
        // combining the two parts to the actual blossom
        currentBlossom.push(currentNode.id);
        nodesOnCircle.add(currentNode.id);
        while (currentBlossomPart1.length != 0) {
            var currentID = currentBlossomPart1.shift();
            currentBlossom.push(currentID);
            nodesOnCircle.add(currentID);
        }
        while (currentBlossomPart2.length != 0) {
            var currentID = currentBlossomPart2.shift();
            currentBlossom.push(currentID);
            nodesOnCircle.add(currentID);
        }

        // 2) find all neighbors of those circle nodes
        var neighbors = d3.set(); // set of node ids
        nodesOnCircle.forEach( function(nodeID) {
            var node = Graph.instance.nodes.get(parseInt(nodeID));
            var outEdges = node.getOutEdges();
            for (var j = 0; j < outEdges.length; j++) {
                var currentNeighbor = outEdges[j].end.id;
                if (!nodesOnCircle.has(currentNeighbor)) {
                    neighbors.add(currentNeighbor);
                }
            }
        });
        // remove their IDs from BFS queue
        var newBFSQueue = [];
        for (var i = 0; i < s.bfsQueue.length; i++) {
            var currentID = s.bfsQueue.shift();
            if (!nodesOnCircle.has(currentID)) {
                newBFSQueue.push(currentID);
            }
        }
        s.bfsQueue = newBFSQueue;

        // 3) create contracted node
        // calculate coordinates (mean of the removed node coordinates)
        var newX = 0.0;
        var newY = 0.0;
        nodesOnCircle.forEach( function(nodeID) {
            var node = Graph.instance.nodes.get(parseInt(nodeID));
            newX += node.x;
            newY += node.y;
        });
        newX /= nodesOnCircle.size();
        newY /= nodesOnCircle.size();
        var newNode = Graph.instance.addNode(newX, newY, []);
        newNode.free = true; 
        // find predecessor (= mate) of shrinked node, if there is any
        var newNodePred = -1;
        nodesOnCircle.forEach( function(nodeID) {
            var node = Graph.instance.nodes.get(parseInt(nodeID));
            if (node.pred != -1 && !nodesOnCircle.has(node.pred)) {
                newNodePred = node.pred;
            }
        });
        newNode.mate = newNodePred; // node id (integer)
        newNode.pred = newNodePred; // node id (integer)
        if (newNodePred != -1) {
            var predNode = Graph.instance.nodes.get(newNodePred);
            predNode.mate = newNode.id;
            newNode.bfsLevel = predNode.bfsLevel + 1;
            newNode.contractedBFSRoot = -1;
        }
        else {
            newNode.bfsLevel = 0;
            newNode.contractedBFSRoot = s.bfsRoot;
            s.bfsRoot = newNode.id;
        }
        newNode.onAugPath = false; // bool
        newNode.contractedEdges = d3.map(); // map of edges
        newNode.contractedNodes = d3.map(); // map of nodes
        newNode.blossom = currentBlossom;

        // 4) store edges and nodes on odd-length circle in new node and remove them from the graph
        var neighborsOfNewNode = [];
        nodesOnCircle.forEach( function(nodeID) {
            var node = Graph.instance.nodes.get(parseInt(nodeID));
            var outEdges = node.getOutEdges();
            var inEdges = node.getInEdges();
            for (var j = 0; j < outEdges.length; j++) {
                if (!nodesOnCircle.has(outEdges[j].end.id)) {
                    neighborsOfNewNode.push(outEdges[j].end.id);
                }
                newNode.contractedEdges.set(outEdges[j].id, outEdges[j]);
                Graph.instance.removeEdge(outEdges[j].id);
            }
            for (var j = 0; j < inEdges.length; j++) {
                if (!nodesOnCircle.has(inEdges[j].start.id)) {
                    newNode.contractedEdges.set(inEdges[j].id, inEdges[j]);
                    Graph.instance.removeEdge(inEdges[j].id);
                }               
            } 
        });
        nodesOnCircle.forEach( function(nodeID) {
            var node = Graph.instance.nodes.get(parseInt(nodeID));
            newNode.contractedNodes.set(nodeID, node);
            Graph.instance.removeNode(nodeID);
        });  

        // 5) check if visualization edges have to be removed from or added to the graph
        Graph.instance.edges.forEach(function(key, edge) {
            if (edge.forVisualization) {
                if (nodesOnCircle.has(edge.start.id) && nodesOnCircle.has(edge.end.id)) {
                    newNode.contractedEdges.set(edge.id, edge);
                    Graph.instance.edges.remove(edge.id);
                }
                else if ((!nodesOnCircle.has(edge.start.id) && nodesOnCircle.has(edge.end.id))
                        || (nodesOnCircle.has(edge.start.id) && !nodesOnCircle.has(edge.end.id))) {
                    newNode.contractedEdges.set(edge.id, edge);
                    Graph.instance.edges.remove(edge.id);
                    var edgeType;
                    if (edge.isTreeEdge) {
                        edgeType = 1;
                    }
                    else {
                        edgeType = 2;
                    }
                    if (!nodesOnCircle.has(edge.start.id) && nodesOnCircle.has(edge.end.id)) {
                        addVisualizationEdge(edge.start.id, newNode.id, edgeType);
                    }
                    else {
                        addVisualizationEdge(newNode.id, edge.end.id, edgeType);
                    }
                }
            }
        });      
   
        // 6) add new edges to the graph
        for (var i = 0; i < neighborsOfNewNode.length; i++) {
            if (!Graph.instance.existsEdgeBetween(newNode.id, neighborsOfNewNode[i])) {
                var edge1 = Graph.instance.addEdge(newNode.id, neighborsOfNewNode[i], []);
                var edge2 = Graph.instance.addEdge(neighborsOfNewNode[i], newNode.id, []);
                if (neighborsOfNewNode[i] == newNode.mate) { 
                    edge1.matched = true; 
                    edge2.matched = true; 
                }
                else {
                    edge1.matched = false; 
                    edge2.matched = false;
                }
                if (neighborsOfNewNode[i] == newNode.pred) { 
                    edge1.isTreeEdge = true; 
                    edge2.isTreeEdge = true; 
                }
                else if (nodesOnCircle.has(Graph.instance.nodes.get(neighborsOfNewNode[i]).pred)) {
                    edge1.isTreeEdge = true; 
                    edge2.isTreeEdge = true;
                    Graph.instance.nodes.get(neighborsOfNewNode[i]).pred = newNode.id;
                }
                else {
                    edge1.isTreeEdge = false; 
                    edge2.isTreeEdge = false;
                }
                edge1.onAugPath = false; // bool
                edge2.onAugPath = false; // bool   
            }
        }

        // 6) update BFS queue and stack of contracted nodes
        s.bfsQueue.push(newNode.id);
        s.nodesToExpand.push(newNode.id);
        logger.log("Contracting finished");
    }

    /*
     * Returns all nodes that have been contracted.
     */
    function getContractedNodes() {
        var contractedNodes = d3.set();
        Graph.instance.nodes.forEach(function(key, node) {
            if (node.contractedNodes.size() > 0) {
                contractedNodes.add(key);
            }
        });
        return contractedNodes;
    }

    /*
     * Set important attributes for reconstruction of augmenting path through a blossom.
     */
    function reconstructAugPathThroughBlossom(currentNode, currentBlossom) {
        // get correct index for blossom starting point
        var blossomIndex = 0;
        var neighbor = currentNode.augPathNeighbor;
        for (var i = 1; i < currentBlossom.length; i++) { // i = 0: stem
            if (Graph.instance.existsEdgeBetween(currentBlossom[i], neighbor)) {
                blossomIndex = i;
                var edge1 = Graph.instance.getEdge(currentBlossom[i], neighbor);
                var edge2 = Graph.instance.getEdge(neighbor, currentBlossom[i]);
                edge1.onAugPath = true;
                edge2.onAugPath = true;
                Graph.instance.nodes.get(currentBlossom[i]).onAugPath = true;
                break;                            
            } 
        }
        // find augmenting path to stem
        var index = blossomIndex;
        if (index == 0) {
            var edge1 = Graph.instance.getEdge(currentBlossom[index], neighbor);
            var edge2 = Graph.instance.getEdge(neighbor, currentBlossom[index]);
            edge1.onAugPath = true;
            edge2.onAugPath = true;
            Graph.instance.nodes.get(currentBlossom[index]).onAugPath = true;
            if (Graph.instance.nodes.get(currentBlossom[index]).contractedNodes.size() > 0) {
                Graph.instance.nodes.get(currentBlossom[index]).augPathNeighbor = neighbor;
            }
        }
        else {
            var node1, node2;
            var edgeToTheLeft = Graph.instance.getEdge(currentBlossom[index], currentBlossom[index-1]);
            if (Graph.instance.nodes.get(currentBlossom[index]).contractedNodes.size() > 0) {
                Graph.instance.nodes.get(currentBlossom[index]).augPathNeighbor = neighbor;
            }
            if (edgeToTheLeft.matched) {
                while (index >= 1) {
                    node1 = currentBlossom[index];
                    node2 = currentBlossom[index-1];
                    var edge1 = Graph.instance.getEdge(node1, node2);
                    var edge2 = Graph.instance.getEdge(node2, node1);
                    edge1.onAugPath = true;
                    edge2.onAugPath = true;
                    Graph.instance.nodes.get(node2).onAugPath = true;
                    if (Graph.instance.nodes.get(node2).contractedNodes.size() > 0) {
                        if (edge1.matched) {
                            Graph.instance.nodes.get(node2).augPathNeighbor = currentBlossom[index-2];
                        }
                        else {
                            Graph.instance.nodes.get(node2).augPathNeighbor = node1;
                        }
                    }
                    index--;
                } 
            }  
            else {
                while (index < currentBlossom.length - 1) {
                    node1 = currentBlossom[index];
                    node2 = currentBlossom[index+1];
                    var edge1 = Graph.instance.getEdge(node1, node2);
                    var edge2 = Graph.instance.getEdge(node2, node1);
                    edge1.onAugPath = true;
                    edge2.onAugPath = true;
                    Graph.instance.nodes.get(node2).onAugPath = true;
                    if (Graph.instance.nodes.get(node2).contractedNodes.size() > 0) {
                        if (edge1.matched) {
                            Graph.instance.nodes.get(node2).augPathNeighbor = currentBlossom[(index+2) % currentBlossom.length];
                        }
                        else {
                            Graph.instance.nodes.get(node2).augPathNeighbor = node1;
                        }
                    }
                    index++;                           
                } 
                node1 = currentBlossom[currentBlossom.length - 1];
                node2 = currentBlossom[0];
                Graph.instance.getEdge(node1, node2).onAugPath = true;
                Graph.instance.getEdge(node2, node1).onAugPath = true;
                Graph.instance.nodes.get(node2).onAugPath = true;
                if (Graph.instance.nodes.get(node2).contractedNodes.size() > 0) {
                    Graph.instance.nodes.get(node2).augPathNeighbor = node1;
                }
            }          
        } 
    }

    /*
     * Expand supernode to a blossom.
     */
    function expandNodes() {
        var nodeID = s.nodesToExpand.pop();
        var currentNode = Graph.instance.nodes.get(nodeID);
        // set of edges to add
        var edgesToAdd = [];
        // add nodes that have been contracted to the graph again
        currentNode.contractedNodes.forEach( function(key, node) {
            Graph.instance.nodes.set(key, node);
        });
        // add edges that have been contracted to the graph again
        currentNode.contractedEdges.forEach( function(key, edge) {
            // set properties of BFS tree for reconstruction of augmenting path, if necessary
            // case 1: edge from contracted node to non-contracted one
            if (!edge.forVisualization && currentNode.contractedNodes.has(edge.start.id) && !currentNode.contractedNodes.has(edge.end.id)) {
                var correspondingEdge = Graph.instance.getEdge(currentNode.id, edge.end.id);
                edge.isTreeEdge = correspondingEdge.isTreeEdge;
                if (correspondingEdge.isTreeEdge) {
                    if (currentNode.pred == correspondingEdge.end.id) {
                        edge.start.pred = correspondingEdge.end.id;
                        edge.start.bfsLevel = correspondingEdge.end.bfsLevel + 1;
                    }
                    else if (correspondingEdge.end.pred == currentNode.id) {
                        edge.end.pred = edge.start.id;
                        edge.end.bfsLevel = edge.start.bfsLevel + 1;
                    }
                }
            }
            // case 2: edge from a non-contracted node to a contracted one
            else if (!edge.forVisualization && !currentNode.contractedNodes.has(edge.start.id) && currentNode.contractedNodes.has(edge.end.id)) {
                var correspondingEdge = Graph.instance.getEdge(edge.start.id, currentNode.id);
                edge.isTreeEdge = correspondingEdge.isTreeEdge;
            }
            // add edge to graph
            edgesToAdd.push(edge);
        });
        // remove all edges from and to the current node
        var outEdges = currentNode.getOutEdges();
        var inEdges = currentNode.getInEdges();
        while (outEdges.length > 0) {
            var edgeToRemove = outEdges.shift();
            var edgeToRemove2 = inEdges.shift();
            Graph.instance.removeEdge(edgeToRemove.id);
            Graph.instance.removeEdge(edgeToRemove2.id);
        }
        // check if current node had contracted a BFS root
        if (currentNode.contractedBFSRoot != -1) {
            s.bfsRoot = currentNode.contractedBFSRoot;
        }
        // get blossom properties and remove current node  
        var currentAugPathNeighbor, currentBlossom; 
        if (currentNode.onAugPath) {
            currentAugPathNeighbor = currentNode.augPathNeighbor;
            currentBlossom = currentNode.blossom;
        }
        Graph.instance.removeNode(currentNode.id);
        // add all edges
        while (edgesToAdd.length > 0) {
            var edge = edgesToAdd.shift();
            // to ensure that references work correctly
            edge.start = Graph.instance.nodes.get(edge.start.id);
            edge.end = Graph.instance.nodes.get(edge.end.id);

            Graph.instance.edges.set(edge.id, edge);
            if (!edge.forVisualization) {
                var edgeMapKey = edge.start.id + 0.5*(edge.start.id + edge.end.id)*(edge.start.id + edge.end.id + 1);
                Graph.instance.edgeMap.set(edgeMapKey, edge);
                edge.start.outEdges.set(edge.id,edge);
                edge.end.inEdges.set(edge.id,edge); 
            }
        }
        // extend augmenting path if necessary
        // case 1: contracted node was the free node found (does not occur!!)
        // case 3: contracted node neither start nor end point of the augmenting path        
        // case 2: contracted node is start point of the augmenting path          
        if (currentNode.onAugPath) { 
            reconstructAugPathThroughBlossom(currentNode, currentBlossom);
            if (currentNode.pred != -1) { // case 3
                // edge between stem and its predecessor
                var stemID = currentBlossom[0];
                var predID = Graph.instance.nodes.get(stemID).pred;
                Graph.instance.getEdge(stemID, predID).onAugPath = true;
                Graph.instance.getEdge(predID, stemID).onAugPath = true;              
            }                
        }
        
        // remove all visualization edges
        removeVisualizationEdges();
        // color augmenting path
        Graph.instance.nodes.forEach( function(nodeID, node) {
            var outEdges = node.getOutEdges();
            for (var i = 0; i < outEdges.length; i++) {
                if (outEdges[i].onAugPath && nodeID < outEdges[i].end.id) {
                    addVisualizationEdge(nodeID, outEdges[i].end.id, 2);
                }
            }
        });
    }
  
    /*
     * Construct the augmenting path correctly.
     * start node: BFS root, end node: free node found
     */
    function setAugmentingPath(startNodeID, endNodeID) {
        // remove tree visualization edges first
        removeVisualizationEdges();
        var currentNode = Graph.instance.nodes.get(endNodeID);
        currentNode.onAugPath = true;
        var predNode, edge1, edge2;

        while (currentNode.pred != -1) {
            predNode = Graph.instance.nodes.get(currentNode.pred);
            predNode.onAugPath = true;
            if (predNode.contractedNodes.size() > 0) {
                predNode.augPathNeighbor = currentNode.id;
            }
            edge1 = Graph.instance.getEdge(currentNode.id, predNode.id);
            edge2 = Graph.instance.getEdge(predNode.id, currentNode.id);
            edge1.onAugPath = true;
            edge2.onAugPath = true;
            // create visualization edges
            addVisualizationEdge(currentNode.id, predNode.id, 2);
            currentNode = predNode;
        }
        Graph.instance.nodes.get(startNodeID).free = false;
        Graph.instance.nodes.get(endNodeID).free = false;
    }
  

    /*
     * Invert the augmenting path found.
     */
    function invertMatching() {
        removeVisualizationEdges();
        Graph.instance.edges.forEach(function(key, edge) {
            if (edge.onAugPath) {
                edge.matched = !edge.matched;
                edge.start.free = false;
                edge.end.free = false;
            }
            if (edge.matched) {
                Graph.instance.nodes.get(edge.start.id).mate = edge.end.id;
                Graph.instance.nodes.get(edge.end.id).mate = edge.start.id;
            }
        });
        s.bfsRoot = -1;
    }

    /*
     * Add visualization edges that are only used for visualization purposes.
     * edgeType: 1 = edge of BFS tree, 2 = edge of augmenting path
     */ 
    function addVisualizationEdge(startID, endID, edgeType) {
        var s = Graph.instance.nodes.get(startID);
        var t = Graph.instance.nodes.get(endID);
        var edge = new Graph.Edge(s, t, Graph.instance.edgeIds++);
        edge.forVisualization = true;
        edge.isTreeEdge = (edgeType == 1);
        edge.onAugPath = (edgeType == 2);   
        Graph.instance.edges.set(edge.id, edge);
    }

    /*
     * Add visualization edges for a specific graph.
     * edgeType: 1 = edge of BFS tree, 2 = edge of augmenting path
     */
    function addVisualizationEdgeToGraph(startID, endID, edgeID, edgeType, graph) {
        var s = graph.nodes.get(startID);
        var t = graph.nodes.get(endID);
        var edge = new Graph.Edge(s, t, edgeID);
        edge.forVisualization = true;
        edge.isTreeEdge = (edgeType == 1);
        edge.onAugPath = (edgeType == 2);   
        graph.edges.set(edge.id, edge);
    }

    /*
     * Remove all edges that are used for visualization purposes.
     */
    function removeVisualizationEdges() {
        Graph.instance.edges.forEach( function(key, edge) {
            if (edge.forVisualization) {
                Graph.instance.edges.remove(key);
            }
        });
    }
}

// Vererbung realisieren
BlossomAlgorithm.prototype = Object.create(GraphDrawer.prototype);
BlossomAlgorithm.prototype.constructor = BlossomAlgorithm;
