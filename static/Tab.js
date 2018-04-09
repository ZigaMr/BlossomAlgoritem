/**
 * A Tab in the view. Wires together the legend and calls algo's activation functions.
 * @author Adrian Haarbach
 * @class
 * @param {GraphDrawer} algo - Instance of an algorithm. Must have interface methods : init, activate, deactivate
 * @param {Object} p_tab - Jquery tab elector
 */
function Tab(algo,p_tab) {

    var that = this;
    this.algo=algo;

    /**
     * jQuery Objekt des aktuellen Tabs
     * @type Object
     */
    this.tab = p_tab;

    this.initialized = false;
    
    /**
     * Initialisiert das Zeichenfeld
     * @method
     */
    this._init = function() {
        //http://spin.atomicobject.com/2014/01/21/convert-svg-to-png/
        //http://techslides.com/save-svg-as-an-image
        this.tab.find('.svgDownloader').on('click',function(foo){
        
            var ahref = $(this);

            var nodes = Graph.instance.getNodes();

            var screenCoords = nodes.map(algo.nodePos.bind(algo));

            var xR = d3.extent(screenCoords,function(d){return d.x});
            var yR = d3.extent(screenCoords,function(d){return d.y});

            var transl = "translate(-"+xR[0]+",-"+yR[0]+")";

            var width = xR[1]-xR[0]+algo.margin.left+algo.margin.right;
            var height = yR[1]-yR[0]+algo.margin.top+algo.margin.bottom;


            //use d3 to select transform, doesnt work with jqyery since it selects all g's, not just the top level one;
            var oldTra = algo.svgOrigin.select("g").attr("transform");
            var oldWidth = algo.svgOrigin.attr("width");
            var oldHeight = algo.svgOrigin.attr("height");

            algo.svgOrigin.select("g").attr("transform",oldTra+","+transl);//.each("end",function(){
                algo.svgOrigin.attr("width",width);
                algo.svgOrigin.attr("height",height);

                //use jquery to get the svg xml, doesnt work with d3.
                var svgContainer = that.tab.find('.svgContainer');//.clone();
                var svg = svgContainer.find("svg");
                svg.attr({ version: '1.1' , xmlns:"http://www.w3.org/2000/svg"});
                var svgHtml = svgContainer.html();

                var seed = 50 + Math.floor(Math.random()*1000000); //lower 50 ones are reserved for my own use

                svgHtml = svgHtml.replace(/arrowhead2/g,"arrowhead"+seed);
                var b64 = btoa(svgHtml); // or use btoa if supported

                var href = "data:image/svg+xml;base64,\n"+b64;
                ahref.prop("href-lang","image/svg+xml");
                ahref.prop("href",href);

                //move back
                algo.svgOrigin.attr("width",oldWidth);
                algo.svgOrigin.attr("height",oldHeight);
                algo.svgOrigin.select("g").attr("transform",oldTra);

        });

        legendeMax = this.tab.find(".Legende");
        legendeMin = this.tab.find(".LegendeMinimized");
        legendeMaxButton = legendeMax.find(".LegendeMin");
        legendeMinButton = legendeMin.find(".LegendeMin");
        tabIntroDialog = this.tab.find(".tabIntroDialog");
        tabChangeWarningDialog = this.tab.find(".tabChangeWarningDialog");
        statusWindow = this.tab.find(".statusWindow");
        this.statusBackup = statusWindow.html();
        this.animateLegende();
        this.openDialogs();
        this.minimizeLegend();
        algo.init && algo.init();
        this.initialized=true;
    };
    
    /**
     * when tab is openend
     * @method
     */
    this._activate = function() {
        if(!this.initialized) this.init();
        algo.activate && algo.activate();
    };
    
    /**
     * when tab is closed
     * @method
     */
    this._deactivate = function() {
        algo.deactivate && algo.deactivate();
    };

    /**
     * HTML des Tabs vor dem Öffnen des Tabs
     * @type String
     */
    this.statusBackup = null;
    /**
     * Zeigt an, ob der Tab z.Zt. aktiv ist (ungenutzt)
     * @type Boolean
     */
    this.active = false;
    
    /**
     * jQuery Objekt der maximierten Legende
     * @type Object
     */
    var legendeMax;
    /**
     * jQuery Objekt der minimierten Legende
     * @type Object
     */
    var legendeMin;
    /**
     * jQuery Objekt des "Maximieren" Buttons de Legende im aktuellen Tab
     * @type Object
     */
    var legendeMaxButton;
    /**
     * jQuery Objekt des "Minimieren" Buttons de Legende im aktuellen Tab
     * @type Object
     */
    var legendeMinButton;
    /**
     * jQuery Objekt des Dialogs, der zu Beginn des Tabs gezeigt wird.
     * @type Object
     */
    var tabIntroDialog;
    /**
     * jQuery Objekt des Dialogs, der zu Beginn des Tabs gezeigt wird.
     * @type Object
     */
    var tabChangeWarningDialog;
    /**
     * jQuery Objekt des statusFensters des Tabs
     * @type Object
     */
    var statusWindow;

    /**
     * Minimiert die Legende und positioniert sie korrekt.
     * @method
     */
    this.minimizeLegend = function() {
        legendeMax.hide();
        legendeMin.show();
    };

    /**
     * Maximiert die Legende und positioniert sie korrekt.
     * @method
     */
    this.maximizeLegend = function() {
        legendeMax.show();
        legendeMin.hide();
    };
    
    /**
     * Öffnet die Dialoge, die zu dem Tab gehören: Eingangsdialog und mglw. 
     * Abfrage, ob man den Tab wirklich verlassen möchte.
     * @method
     */
    this.openDialogs = function() {
        var currentTab = this.tab;      // Closure
        var minW = 150;
        if(this.tab.attr("id") == "tab_tf2") {
            minW = 570;
        }
        $(function() {
            tabIntroDialog.dialog({
                dialogClass: "shadow",
                resizable: false,
                draggable: false,
                minWidth: minW,
                position: { my: "center center", at: "center center", of: currentTab},
                modal: false,
                autoOpen: false,
                beforeClose: function(event, ui) {
                    tabIntroDialog.effect('transfer', {
                        to: statusWindow
                    }, 500, null);
                    return true;
                },
                buttons: {
                    Ok: function() {$(this).dialog( "close" );}
                }
            });
        });

        // Tabwechsel Warndialog
        if(tabChangeWarningDialog) {
            $(function() {
                tabChangeWarningDialog.dialog({
                    autoOpen: false,
                    resizable: false,
                    modal: true,
                    buttons: {
						stay_button: {
							click: function() {
								$("#tabs").removeData("requestedTab");
								$("#tabs").removeData("tabChangeDialogOpen");
								$(this).dialog( "close" );
							},
							text: LNG.K('tabChange_stay')
						},
						change_button: {
							click: function() {
								$(this).dialog( "close" );
								var newTabID =$("#tabs").data("requestedTab");
								$("#tabs").removeData("requestedTab");
								$("#tabs").tabs("option", "active", newTabID);
								$("#tabs").removeData("tabChangeDialogOpen");
							},
							text: LNG.K('tabChange_change')
						} 
                    }
                });
            });
        }
    };
    
    /**
     * Animiert die Legende: Buttons zum maximieren / minimieren, Icons in den
     * Buttons, Tooltipp für Vorgängerkante
     * @method
     */
    this.animateLegende = function() {
        legendeMaxButton.button({icons: {primary: "ui-icon-minus"},text: false});
        legendeMinButton.button({icons: {primary: "ui-icon-plus"},text: false});
        this.maximizeLegend();
        legendeMaxButton.on("click.CanvasDrawer",this.minimizeLegend);
        legendeMinButton.on("click.CanvasDrawer",this.maximizeLegend);
        $("tr.LegendeZeileClickable").tooltip();
    };
}

Tab.prototype.init = function(){
    this._init();
}

Tab.prototype.activate = function(){
    this._activate();
}

Tab.prototype.deactivate = function(){
    this._deactivate();
}
