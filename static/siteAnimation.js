var graphEditorTab = null, algorithmTab = null;

function svgHack(){
    //http://www.mediaevent.de/svg-in-html-seiten/
   var imgs = d3.selectAll("img");

   imgs.attr("src",function(a,b,c){
       var src = this.src;
       var selection = d3.select(this);
       if(src.indexOf(".svg")==src.length-4){
           d3.text(src, function(error,text){
            var parent = d3.select(selection.node().parentNode)
                parent.insert("span","img").html(text);
                var newSVGElem = parent.select("span").select("svg");
                newSVGElem.attr("class","svgText");
                selection.remove();
        });
       }
       return src;
   })
}

/**
 * Initializes the page layout of all interactive tabs
 * @author Adrian Haarbach
 * @global
 * @function
 */
function initializeSiteLayout(GraphAlgorithmConstructor) {

    $("button").button();
    $("#te_button_gotoDrawGraph").click(function() { $("#tabs").tabs("option", "active", 1);});
    $("#te_button_gotoIdee").click(function() { $("#tabs").tabs("option", "active", 3);});
    $("#ti_button_gotoDrawGraph").click(function() { $("#tabs").tabs("option", "active", 1);});
    $("#ti_button_gotoAlgorithm").click(function() { $("#tabs").tabs("option", "active", 2);});
    $("#tw_Accordion").accordion({heightStyle: "content"});
    
    graphEditorTab = new GraphEditorTab(new GraphEditor(d3.select("#tg_canvas_graph")),$("#tab_tg"));
    graphEditorTab.init();
    
    var algo = new GraphAlgorithmConstructor(d3.select("#ta_canvas_graph"));
    algorithmTab = new AlgorithmTab(algo, $("#tab_ta"));
    $("#tab_ta").data("algo", algo);
    algorithmTab.init();
  
    $("#tabs").tabs({
        beforeActivate: function(event, ui) {
            var id = ui.oldPanel[0].id;
            if(id == "tab_tg") { /** graph editor tab */
                // nothing to do
            }else if(id == "tab_ta") { /** graph algorithm tab */
                if($("#tabs").data("tabChangeDialogOpen") == null && $("#tab_ta").data("algo").getWarnBeforeLeave()) {
                    event.preventDefault();
                    $( "#tabs" ).data("requestedTab",$("#" +ui.newPanel.attr("id")).index()-1);
                    $("#tabs").data("tabChangeDialogOpen",true);
                    $( "#ta_div_confirmTabChange" ).dialog("open");
                }
                else {
                    $("#tab_ta").data("algo").deactivate();
                }
            }
        },
        activate: function(event, ui) {
            var id = ui.newPanel[0].id;
            if(id == "tab_tg") {
                graphEditorTab.activate();
            } else if(id == "tab_ta") {
                algorithmTab.activate();
            }
        }
    });

   svgHack();
}
