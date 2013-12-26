/***
|Name|GeEditor|
|Version|1.0|
|Author|Rolf Lindén (rolind@utu.fi) + Petri Salmela (pesasa@iki.fi)|
|License|[[GNU AGPL|http://www.gnu.org/licenses/agpl-3.0.html]]|
|Type|plugin|
|Requires|jQuery 1.4.3 or newer, JSXGraph 0.95 or newer, MathQuill.|
|Description|Creates and shows geometric scenes constructed from geometric primitives.|
!!!!!Revisions
<<<
20131223.1722 ''Version 1.0''
* Swedish translation
* Moving translations in the file
<<<
<<<
20131218.2259 ''Version 0.6''
* Enable colorpicker
* Small fix on point move.
<<<
<<<
20131218.1525 ''Version 0.5''
* New tools: parallelogram, bisector, tangent, parallel, text label
* Small fixes
* Move and zoom scene
<<<
<<<
20131212.1659 ''Version 0.4''
* Midpoint tool.
<<<
<<<
20131211.1032 ''Version 0.3''
* Right triangle, rectangle, remove animation from advanced properties
* Fix Rcircle, when clicking sides of right triangles or rectangles.
<<<
<<<
20131209.1207 ''Version 0.2''
* More objecttypes
<<<
<<<
20131203.1552 ''Version 0.1''
* First version with TiddlyWiki-macro
<<<
<<<
20131105.1435 ''Version 0.01''
* Started rewrite
<<<
!!!!!Code
***/

//{{{
/**
 * Geometry editor (jQuery plugin).
 * gedit.js
 * jQuery-plugin for creating geometrical constructions
 * Created by: E-Math -project ( http://emath.eu )
 * Petri Salmela
 * Petri Sallasmaa
 * 2012-2013
 * v.1.0
 * Copyright: Four Ferries oy
 *   http://fourferries.fi
 * License: GNU AGPL
 **/

(function ($) {
    { /*** jQuery plugin ***/
        $.fn.geditor = function(options){
            if (methods[options]){
                return methods[options].apply( this, Array.prototype.slice.call( arguments, 1));
            } else if (typeof(options) === 'object' || !options) {
                return methods.init.apply(this, arguments);
            } else {
                $.error( 'Method ' +  method + ' does not exist on Geditor' );
                return this;
            }
        }
        
        var methods = {
            init: function(params){
                
                params = $.extend(true, {
                    'editable' : true,
                    'width' : '100%',
                    'height' : '500px',
                    'mode' : 'free',
                    'isSquare' : false,
                    'browsingMode' : 'tabs',
                    'scenes' : 
                        [	
                            {
                                'type': 'Scene',
                                'name': '',
                                'objects': [],
                                'boundingBox': [-10,5,10,-5],
                                'description' : '',
                                'allowControls' : true,
                                'showAxes' : true,
                                'showGrid': false,
                                'isStatic': false
                            }
                        ]
                }, params);
                var editor = new GEditor(this, params);
                editor.init();
            },
            getdata: function(params){
                var $place = $(this);
                $place.trigger('getdata');
                var data = $place.data('[[geoeditordata]]');
                return data;
            }
        }
    }
    
    { /*** Editor class ***/
        /******
         * Class for GEditor.
         ******/
        var GEditor = function(place, options){
            options = $.extend({
                editable: false,
                scenes: [],
                width: 500,
                height: 500,
                browsingMode: 'tabs',
                lang: $(place).closest('[lang]').attr('lang') || 'en'
            }, options);
            var editor = this;
            this.place = $(place);
            this.lang = options.lang;
            this.localizer = new Localizer(this.lang);
            this.decimalperiod = this.localizer.decimalperiod();
            this.editable = options.editable;
            this.dataObj = options.scenes;
            this.width = options.width;
            this.height = options.height;
            this.browsingMode = options.browsingMode;
            this.place.addClass('geoeditorwrapper gedit-gradbg');
            this.sceneArr = [];
            this.sceneById = {};
            this.boxnum = this.generateId('geditorbox');
            this.objIdStore = {};
            this.generateSceneArr();
            this.sceneNum = 0;
            this.objectId = 'scene';
            $(window).resize(function() { editor.updateView(); });
        }
        
        /******
         * Container for GeoTool constructors
         ******/
        GEditor.prototype.geotools = [];
        
        /******
         * Init the viewing area.
         ******/
        GEditor.prototype.init = function(){
            if ($('head style#geditorstyle').length == 0){
                $('head').append('<style id="geditorstyle" type="text/css">'+GEditor.strings.css+'</style>');
            }
            this.place.undelegate();
            this.place.html(this.getLayout());
            this.layout = {
                scenearea: this.place.find('.gedit-scenearea'),
                naviarea: this.place.find('.gedit-naviarea'),
                objectarea: this.place.find('.gedit-objectarea'),
                objectlist: this.place.find('.gedit-objectlist'),
                propertyarea: this.place.find('.gedit-propertyarea'),
                tabarea: this.place.find('.gedit-tabarea'),
                toolarea: this.place.find('.gedit-toolarea'),
                subtoolarea: this.place.find('.gedit-subtoolarea'),
                infoarea: this.place.find('.gedit-infoarea')
            }
            this.layout.scenearea.attr('id', 'geditorbox-'+this.boxnum);
            this.initNavi();
            // If select tool is inited in view-mode, the state of scene is remembered
            // between scene changes.
            this.initTools();
            this.setClasses();
            this.addHandlers();
            this.setScene(0);
        }
        
        /******
         * Get data
         ******/
        GEditor.prototype.getData = function(){
            var data = {
                editable: this.editable,
                width: this.width,
                height: this.height,
                mode: this.mode,
                isSquare: this.isSquare,
                browsingMode: this.browsingMode,
                scenes: []
            }
            for (var i = 0; i < this.sceneArr.length; i++) {
                data.scenes.push(this.sceneArr[i].getData());
            }
            return data;
        }
        
        /******
         * Init tools
         ******/
        GEditor.prototype.initTools = function(){
            this.tools = {};
            var toolList = [];
            for (var i = 0; i < this.geotools.length; i++) {
                var tool = new this.geotools[i](this);
                var toolType = tool.getType();
                this.tools[toolType] = tool;
                if (!tool.subtool) {
                    toolList.push('<li class="gedit-geotool" data-gedit-geotooltype="'+toolType+'" title="'+this.localize(toolType + '-maintooltip')+'">'+tool.getIcon()+'<div class="gedit-toolshade"></div></li>');
                }
            }
            this.layout.toolarea.html(toolList.join('\n'));
            this.selectTool('Select');
        }
        
        /******
         * Init navigation
         ******/
        GEditor.prototype.initNavi = function(){
            this.layout.naviarea.html(GEditor.strings.tools.navigation);
        }
        
        /******
         * Generate unique number for html-index with given prefix.
         ******/
        GEditor.prototype.generateId = function(prefix){
            var idnum = 0;
            while ($('#' + prefix + '-' + idnum).length > 0) {
                idnum++;
            }
            return idnum;
        }
        
        /******
         * Generate unique object id for object of given type.
         ******/
        GEditor.prototype.getObjId = function(objType){
            if (typeof(this.objIdStore[objType]) === 'undefined') {
                this.objIdStore[objType] = 0;
            }
            while (objType !== 'Scene' && this.sceneArr[this.sceneNum].hasObject('Geo'+objType+'_{'+this.objIdStore[objType]+'}')){
                this.objIdStore[objType]++;
            }
            var objId = 'Geo' + objType + '_{' + this.objIdStore[objType]++ +'}';
            return objId;
        }
        
        /**
         * Return name of object with given geoid in current scene.
         */
        GEditor.prototype.getObjName = function(geoid){
            return this.sceneArr[this.sceneNum].getObjName(geoid);
        }
        
        
        /******
         * Get layout depending on view/edit -mode.
         ******/
        GEditor.prototype.getLayout = function(){
            if (this.editable) {
                return GEditor.templates.editorlayout;
            } else {
                return GEditor.templates.viewlayout;
            }
        }
        
        /******
         * Set classes by mode.
         ******/
        GEditor.prototype.setClasses = function(){
            this.place.removeClass('editmode viewmode');
            if (this.editable) {
                this.place.addClass('editmode');
            } else {
                this.place.addClass('viewmode');
            }
        }
        
        /******
         * Generate the sceneArr from the data.
         ******/
        GEditor.prototype.generateSceneArr = function(){
            this.sceneArr = [];
            this.sceneById = {};
            if (this.dataObj != null) {
                for (var i = 0; i < this.dataObj.length; ++i) {
                    this.addScene(this.dataObj[i]);
                }
            }
        }
        
        /******
         * Add new scene
         ******/
        GEditor.prototype.addScene = function(data){
            data.decimalperiod = this.decimalperiod;
            data.geoid = this.getObjId(data.type);
            var newscene = new GeoScene(data);
            this.sceneArr.push(newscene);
            this.sceneById[newscene.geoid] = newscene;
        }
        
        /******
         * Remove scene
         ******/
        GEditor.prototype.removeScene = function(sceneNum){
            if (typeof(sceneNum) === 'undefined') {
                sceneNum = this.sceneNum;
            }
            if (sceneNum >= 0 && sceneNum < this.sceneArr.length) {
                if (this.sceneArr.length === 1) {
                    var oldscene = this.sceneArr[this.sceneNum].getData();
                    var scenedata = {type: 'Scene', boundingBox: oldscene.boundingBox, showGrid: oldscene.showGrid};
                    this.addScene(scenedata);
                }
                this.sceneArr.splice(sceneNum, 1);
                this.sceneNum = Math.min(this.sceneNum, this.sceneArr.length - 1);
                this.updateAll();
            }
        }
        
        /******
         * Set scene active
         ******/
        GEditor.prototype.setScene = function(sceneNum){
            this.sceneNum = sceneNum;
            this.objectId = 'scene';
            this.updateAll();
        }
        
        /******
         * Set next scene active
         ******/
        GEditor.prototype.nextScene = function(){
            this.sceneNum = (this.sceneNum + 1) % this.sceneArr.length;
            this.objectId = 'scene';
            this.updateAll();
        }
        
        /******
         * Set next scene active
         ******/
        GEditor.prototype.previousScene = function(){
            this.sceneNum = (this.sceneNum - 1 + this.sceneArr.length) % this.sceneArr.length;
            this.objectId = 'scene';
            this.updateAll();
        }
        
        /******
         * Add handlers for events.
         ******/
        GEditor.prototype.addHandlers = function(){
            var editor = this;
            this.place.bind('getdata', function(event){
                var data = editor.getData();
                editor.place.data('[[geoeditordata]]', data);
            });
            this.place.bind('updateview', function(event){
                editor.updateView();
            });
            this.place.bind('updatefromdialog', function(event){
                editor.updateDataFromDialog();
            });
            this.place.bind('updateinfo', function(event, message){
                editor.updateInfo(message);
            });
            this.addHandlersTab();
            this.addHandlersView();
            this.addHandlersNavi();
            if (this.editable) {
                this.addHandlersObjlist();
                this.addHandlersProplist();
                this.addHandlersTool();
                this.addHandlersAction();
            }
        }
        
        /******
         * Add handlers for tab-events.
         ******/
        GEditor.prototype.addHandlersTab = function(){
            /*** Tab actions *********/
            var editor = this;
            this.place.delegate('ul.gedit-tabarea li.gedit-tab[data-gedit-scenenum]', 'click', function(event){
                var tab = $(this);
                var newscene = parseInt(tab.attr('data-gedit-scenenum'));
                editor.setScene(newscene);
            });
            this.place.delegate('ul.gedit-tabarea li.gedit-tabnext', 'click', function(event){
                editor.nextScene();
            });
            this.place.delegate('ul.gedit-tabarea li.gedit-tabprev', 'click', function(event){
                editor.previousScene();
            });
            this.place.delegate('ul.gedit-tabarea li.gedit-tabadd', 'click', function(event){
                var oldscene = editor.sceneArr[editor.sceneNum].getData();
                var scenedata = {type: 'Scene', boundingBox: oldscene.boundingBox, showGrid: oldscene.showGrid};
                editor.addScene(scenedata);
                editor.setScene(editor.sceneArr.length - 1);
            });
            this.place.delegate('ul.gedit-tabarea li.gedit-tabcopy', 'click', function(event){
                editor.addScene(editor.sceneArr[editor.sceneNum].getData());
                editor.sceneNum = editor.sceneArr.length - 1;
                editor.updateAll();
            });
            this.place.delegate('ul.gedit-tabarea li.gedit-tabremove', 'click', function(event){
                if (editor.sceneArr.length > 0) {
                    var dialog = new GeoDialog(editor.place,
                        {
                            title: editor.localize('Remove picture'),
                            text: editor.localize('Remove are you sure'),
                            buttons: [
                                {
                                    text: editor.localize('Cancel')
                                },
                                {
                                    text: editor.localize('Ok'),
                                    event: 'removescene',
                                    data: {}
                                }
                            ]
                        }
                    );
                    dialog.show();
                }
            });
        }
        
        /******
         * Add handlers for Object list -events.
         ******/
        GEditor.prototype.addHandlersObjlist = function(){
            /*** Object list actions **********/
            var editor = this;
            this.place.delegate('ul.gedit-objectlist li.gedit-objectitem', 'click', function(event){
                var listitem = $(this);
                var geoid = listitem.attr('data-gedit-objectuniqueid');
                editor.selectObject(geoid);
            });
            this.place.delegate('ul.gedit-objectlist li.gedit-objectitem .gedit-remove', 'click', function(event){
                var listitem = $(this).parents('li').eq(0);
                var objectId = listitem.attr('data-gedit-objectid');
                editor.selectObject('scene');
                editor.removeObject(objectId);
                editor.updateAll();
                return false;
            })
            this.place.delegate('ul.gedit-objectlist li.gedit-objectitem .gedit-visible', 'click', function(event){
                var listitem = $(this).parents('li').eq(0);
                var objectId = listitem.attr('data-gedit-objectid');
                editor.toggleObjectVisibility(objectId);
                editor.updateAll();
                return false;
            })
        }
        
        /******
         * Add handlers for Property list -events.
         ******/
        GEditor.prototype.addHandlersProplist = function(){
            /*** Property area actions *********/
            var editor = this;
            this.place.delegate('div.gedit-propertyarea .gedit-advanced-toggle', 'click', function(event){
                $(this).parents('.gedit-propertyarea').toggleClass('gedit-show-advanced');
            });
            this.place.delegate('div.gedit-propertyarea input[type="text"], div.gedit-propertyarea input[type="number"], textarea', 'blur', function(event){
                editor.place.trigger('updatefromdialog');
            });
            this.place.delegate('div.gedit-propertyarea input[type="text"], div.gedit-propertyarea input[type="number"], textarea', 'keyup', function(event){
                if (event.which === 13) {
                    editor.place.trigger('updatefromdialog');
                }
            });
            this.place.delegate('div.gedit-propertyarea input, div.gedit-propertyarea select', 'change', function(event){
                editor.place.trigger('updatefromdialog');
            });
        }
        
        /******
         * Add handlers for View -events.
         ******/
        GEditor.prototype.addHandlersView = function(){
            /*** View area actions **************************/
            var editor = this;
            this.place.delegate('div.gedit-scenearea[data-gedit-tooltype="Select"]', 'objectmoved', function(event, options){
                editor.updateAll();
                options.element.setData({x: options.x, y: options.y});
            });
            this.place.delegate('div.gedit-scenearea[data-gedit-tooltype="Select"]', 'objectselected', function(event, options){
                var geoid = options.geoid;
                if (editor.editable) {
                    if (options.delay) {
                        // Make sure, the click on GeoPoint etc. is the last one.
                        setTimeout(function(){editor.selectObject(geoid);}, 1);
                    } else {
                        editor.selectObject(geoid);
                    }
                }
            });
            this.place.delegate('div.gedit-scenearea[data-gedit-tooltype="Select"]', 'objectupdate', function(event, options){
                var ids = options.geoid;
                if (editor.editable) {
                    editor.updateDepsFromBoard(ids);
                    editor.updateDialog();
                }
                editor.place.trigger('geoeditor_changed');
            });
            this.place.delegate('div.gedit-scenearea', 'clickonboard', function(event, options){
                var objdata = editor.tool.click(options);
                var geoid;
                if (objdata && objdata.length > 0) {
                    for (var i = 0; i < objdata.length; i++){
                        geoid = editor.addNew(objdata[i]);
                    }
                    editor.updateAll();
                    editor.selectObject(geoid);
                }
            });
        }
        
        /******
         * Add handlers for Tool -events.
         ******/
        GEditor.prototype.addHandlersTool = function(){
            /*** Tool area actions *********/
            var editor = this;
            this.place.delegate('ul.gedit-toolarea li.gedit-geotool, ul.gedit-subtoolarea li.gedit-geotool', 'click', function(event){
                var button = $(this);
                var toolType = button.attr('data-gedit-geotooltype');
                editor.selectTool(toolType);
                editor.updateView();
            });
        }
        
        /******
         * Add handlers for Navi -events.
         ******/
        GEditor.prototype.addHandlersNavi = function(){
            /*** Navi area actions *********/
            var editor = this;
            this.place.delegate('.gedit-naviarea .gedit-navi-up', 'click', function(event){
                editor.moveScene('up');
            });
            this.place.delegate('.gedit-naviarea .gedit-navi-down', 'click', function(event){
                editor.moveScene('down');
            });
            this.place.delegate('.gedit-naviarea .gedit-navi-left', 'click', function(event){
                editor.moveScene('left');
            });
            this.place.delegate('.gedit-naviarea .gedit-navi-right', 'click', function(event){
                editor.moveScene('right');
            });
            this.place.delegate('.gedit-naviarea .gedit-navi-zoomin', 'click', function(event){
                editor.zoomScene('in');
            });
            this.place.delegate('.gedit-naviarea .gedit-navi-zoomout', 'click', function(event){
                editor.zoomScene('out');
            });
        }
        
        /******
         * Add handlers for action -events.
         ******/
        GEditor.prototype.addHandlersAction = function(){
            /*** Tool area actions *********/
            var editor = this;
            this.place.bind('removescene', function(event, data){
                editor.removeScene();
            });
        }
        
        /******
         * Select an object in current scene.
         ******/
        GEditor.prototype.selectObject = function(geoid){
            var objlist = this.layout.objectlist.find('li').removeClass('gedit-selected');
            var selObj = this.layout.objectlist.find('li.gedit-objectitem[data-gedit-objectuniqueid="'+geoid+'"]');
            if (selObj.length === 0) {
                geoid = 'scene';
                selObj = this.layout.objectlist.find('li.gedit-objectitem[data-gedit-objectuniqueid="'+geoid+'"]');
            }
            var objId = selObj.attr('data-gedit-objectid');
            selObj.addClass('gedit-selected');
            var dialog = this.sceneArr[this.sceneNum].getDialog(objId);
            this.sceneArr[this.sceneNum].deselectObject(this.objectId);
            this.objectId = geoid;
            this.highlightObject(geoid);
            this.setDialog(dialog);
        }
        
        /******
         * Highlight an object in current scene.
         ******/
        GEditor.prototype.highlightObject = function(geoid){
            this.sceneArr[this.sceneNum].selectObject(geoid);
        }
        
        /******
         * Select the tool.
         ******/
        GEditor.prototype.selectTool = function(toolType){
            var button = this.layout.toolarea.find('li[data-gedit-geotooltype="'+toolType+'"]')
                .add(this.layout.subtoolarea.find('li[data-gedit-geotooltype="'+toolType+'"]')).eq(0);
            button.closest('ul').find('li.gedit-geotool').removeClass('gedit-selected');
            button.addClass('gedit-selected');
            this.layout.scenearea.attr('data-gedit-tooltype', toolType);
            this.tool = this.tools[toolType];
            this.tool.init();
            if (!this.tool.subtool) {
                this.layout.subtoolarea.empty();
                if (this.tool.subtools.length > 0) {
                    this.layout.subtoolarea.append('<li class="gedit-geotool gedit-selected" data-gedit-geotooltype="'+toolType+'" title="'+this.localize(toolType + '-tooltip')+'">'+this.tool.getIcon()+'<div class="gedit-toolshade"></div></li>');
                }
                for (var i = 0; i < this.tool.subtools.length; i++) {
                    var subtool = this.tool.subtools[i];
                    this.layout.subtoolarea.append('<li class="gedit-geotool" data-gedit-geotooltype="'+subtool+'" title="'+this.localize(subtool + '-tooltip')+'">'+this.tools[subtool].getIcon()+'<div class="gedit-toolshade"></div></li>');
                }
            }
            this.updateInfo(this.tool.type + '-start');
        }
        
        /******
         * Set the content of options dialog
         ******/
        GEditor.prototype.setDialog = function(dialog){
            var str = ['<div class="gedit-options-basic"><fieldset><legend>'+this.localize('Basic')+'</legend>',
                '<table>\n<tbody>\n</tbody>\n</table>\n',
                '</fieldset></div>',
                '<div class="gedit-advanced-toggle">. . .</div>',
                '<div class="gedit-options-advanced"><fieldset><legend>'+this.localize('Advanced')+'</legend>',
                '<table>\n<tbody>\n</tbody>\n</table>\n',
                '</fieldset></div>'
            ].join('\n');
            this.layout.propertyarea.html(str); //.scrollTop(0);
            var table = this.layout.propertyarea.find('.gedit-options-basic tbody');
            for (var i = 0; i < dialog.basic.length; i++) {
                table.append('<tr class="geoWidgetRow geoWidget-'+dialog.basic[i].type+'"><td><span class="geoItemCaption">'+this.localize(dialog.basic[i].label)+': </span></td><td><span class="geoProperty"></span></td></tr>');
                var place = table.find('.geoProperty:last');
                if (typeof(dialog.basic[i]) === 'object') {
                    var widgetConstr = this.widgets[dialog.basic[i].type];
                    var widget = new widgetConstr(place, dialog.basic[i]);
                    widget.init();
                }
            }
            var table = this.layout.propertyarea.find('.gedit-options-advanced tbody');
            for (var i = 0; i < dialog.advanced.length; i++) {
                table.append('<tr class="geoWidgetRow geoWidget-'+dialog.advanced[i].type+'"><td><span class="geoItemCaption">'+this.localize(dialog.advanced[i].label)+': </span></td><td><span class="geoProperty"></span></td></tr>');
                var place = table.find('.geoProperty:last');
                if (typeof(dialog.advanced[i]) === 'object') {
                    var widgetConstr = this.widgets[dialog.advanced[i].type];
                    var widget = new widgetConstr(place, dialog.advanced[i]);
                    widget.init();
                }
            }
        }
        
        /******
         * Refresh size
         ******/
        GEditor.prototype.refreshSize = function(){
            var scene = this.sceneArr[this.sceneNum];
            var aspectRatio = scene.getAspectRatio();
            var width = this.place.width() - this.layout.objectarea.width();
            var height = width / aspectRatio;
            var size = {width: width, height: height};
            this.layout.scenearea.css(size);
            //this.layout.scenearea.children('svg').css(size);
        }
        
        /******
         * Update all parts
         ******/
        GEditor.prototype.updateAll = function(){
            var errors = this.updateView();
            this.updateTabs();
            if (this.editable) {
                this.updateObjectlist(errors);
                this.selectObject(this.objectId);
            } else {
                this.sceneArr[this.sceneNum].showCaption();
            }
            if (this.editable || this.sceneArr[this.sceneNum].allowControls) {
                this.layout.naviarea.addClass('gedit-controls-on');
            } else {
                this.layout.naviarea.removeClass('gedit-controls-on');
            }
        }
        
        /******
         * Update the view.
         ******/
        GEditor.prototype.updateView = function(){
            this.clearAll();
            this.layout.scenearea.empty();
            this.refreshSize();
            //var aspectRatio = this.sceneArr[this.sceneNum].getAspectRatio();
            //var size = {width: this.layout.scenearea.width(), height: this.layout.scenearea.width() / aspectRatio};
            //this.layout.scenearea.css(size);
            var errors = this.sceneArr[this.sceneNum].draw('geditorbox-' + this.boxnum, !this.editable);
            this.highlightObject(this.objectId);
            this.place.trigger('geoeditor_changed');
            return errors;
            //this.layout.scenearea.find('svg').css(size).attr('viewbox', '0 0 800 800');
        }
        
        /******
         * Update the property dialog.
         ******/
        GEditor.prototype.updateDialog = function(){
            var objIndex = this.layout.objectlist.find('li.gedit-objectitem[data-gedit-objectuniqueid="' + this.objectId + '"]').attr('data-gedit-objectid');
            var dialog = this.sceneArr[this.sceneNum].getDialog(objIndex);
            this.setDialog(dialog);
        }
        
        /******
         * Update tabs
         ******/
        GEditor.prototype.updateTabs = function(){
            this.layout.tabarea.empty();
            if (this.editable) {
                this.layout.tabarea.append('<li class="gedit-tab gedit-tab-addremove gedit-tabremove">'+GEditor.strings.icons.removeminus+'</li>')
                this.layout.tabarea.append('<li class="gedit-tab gedit-tab-addremove gedit-tabcopy">'+GEditor.strings.icons.copy+'</li>')
                this.layout.tabarea.append('<li class="gedit-tab gedit-tab-addremove gedit-tabadd">'+GEditor.strings.icons.newplus+'</li>')
            }
            if (this.editable || (this.browsingMode === 'tabs' && this.sceneArr.length > 1)) {
                for (var i = 0; i < this.sceneArr.length; i++){
                    var currClass = (this.sceneNum === i ? ' gedit-selected' : '');
                    this.layout.tabarea.append('<li class="gedit-tab'+currClass+'" data-gedit-scenenum="'+i+'">'+(this.sceneArr[i].name || (i+1))+'</li>');
                }
            } else if (!this.editable && this.browsingMode === 'tabless') {
                this.layout.tabarea.addClass('gedit-tabarea-tabless');
                this.layout.tabarea.append('<li class="gedit-tab gedit-tab-navi gedit-tabprev">'+GEditor.strings.icons.tablessprev+'</li>')
                for (var i = 0; i < this.sceneArr.length; i++){
                    var currClass = (this.sceneNum === i ? ' gedit-selected' : '');
                    this.layout.tabarea.append('<li class="gedit-tab gedit-tabless'+currClass+'" data-gedit-scenenum="'+i+'">'+GEditor.strings.icons.tablessbutton+'</li>');
                }
                this.layout.tabarea.append('<li class="gedit-tab gedit-tab-navi gedit-tabnext">'+GEditor.strings.icons.tablessnext+'</li>')
            }
        }
        
        /******
         * Update objectlist
         ******/
        GEditor.prototype.updateObjectlist = function(errors){
            if (typeof(errors) === 'undefined') {
                errors = [];
            }
            var selected = this.layout.objectlist.find('.gedit-selected').attr('data-gedit-objectid');
            this.layout.objectlist.empty();
            this.layout.objectlist.append('<li class="gedit-objectitem" data-gedit-objectid="scene" data-gedit-objectuniqueid="scene">'+ this.getSceneListItem()+'</li>');
            var objlist = this.sceneArr[this.sceneNum].getObjectlist();
            for (var i = 0; i < objlist.length; i++) {
                var errorclass = (errors.indexOf(objlist[i].geoid) !== -1 ? ' gedit-error' : '');
                this.layout.objectlist.append('<li class="gedit-objectitem' + errorclass + '" data-gedit-objectid="'+i+'" data-gedit-objectuniqueid="'+objlist[i].geoid+'" data-gedit-visible="'+(objlist[i].visible ? 'visible' : 'nonvisible')+'">'+ objlist[i].str+' <div class="gedit-objectitem-buttons"><div class="gedit-visible">'+GEditor.strings.icons.visible+'</div><div class="gedit-remove">'+GEditor.strings.icons.remove+'</div></div></li>');
            }
            this.layout.objectlist.find('li[data-gedit-objectid="'+selected+'"]').addClass('gedit-selected');
        }
        
        /******
         * Update infoarea
         ******/
        GEditor.prototype.updateInfo = function(message){
            message = this.localize(message) || '<p>&nbsp;</p>';
            this.layout.infoarea.html(message);
        }
        
        /******
         * Update dependent data from the board.
         ******/
        GEditor.prototype.updateDepsFromBoard = function(geoids){
            //var deps = this.sceneArr[this.sceneNum].getDependents(geoids);
            //deps = geoids.concat(deps);
            // Don't bother to find dependencies. Update all instead.
            deps = [];
            this.sceneArr[this.sceneNum].updateFromBoard(deps);
        }
        
        /******
         * Update data from dialog to the datastructure.
         ******/
        GEditor.prototype.updateDataFromDialog = function(){
            var data = {};
            var inputs = this.layout.propertyarea.find('input[type="text"], input[type="color"], select, textarea');
            for (var i = 0; i < inputs.length; i++){
                var attr = inputs.eq(i).attr('data-geoattribute');
                var value = inputs.eq(i).val();
                data[attr] = value;
            }
            var inputs = this.layout.propertyarea.find('input[type="number"]');
            for (var i = 0; i < inputs.length; i++){
                var attr = inputs.eq(i).attr('data-geoattribute');
                var value = inputs.eq(i).val();
                data[attr] = value;
            }
            var inputs = this.layout.propertyarea.find('input[type="checkbox"]');
            for (var i = 0; i < inputs.length; i++){
                var attr = inputs.eq(i).attr('data-geoattribute');
                data[attr] = inputs[i].checked;
            }
            this.setObjData(data);
            var errors = this.updateView();
            this.updateObjectlist(errors);
            if (this.objectId === 'scene') {
                this.updateTabs();
            }
        }
        
        /******
         * Add a new object
         ******/
        GEditor.prototype.addNew = function(data){
            data.geoid = data.geoid || this.getObjId(data.type);
            return this.sceneArr[this.sceneNum].addObject(data);
        }
        
        /******
         * Remove object
         ******/
        GEditor.prototype.removeObject = function(objectId){
            this.sceneArr[this.sceneNum].removeObject(objectId);
            if (objectId == this.objectId) {
                this.objectId = 'scene';
            }
        }
        
        /******
         * Toggle object visibility
         ******/
        GEditor.prototype.toggleObjectVisibility = function(objectId){
            this.sceneArr[this.sceneNum].toggleVisible(objectId);
            if (objectId == this.objectId) {
                this.objectId = 'scene';
            }
        }
        
        /******
         * Set the data of current object.
         ******/
        GEditor.prototype.setObjData = function(data){
            this.sceneArr[this.sceneNum].setObjData(this.objectId, data);
        }
        
        /******
         * Get the data of given object.
         ******/
        GEditor.prototype.getObjDataById = function(geoid){
            return this.sceneArr[this.sceneNum].getObjData(geoid);
        }
        
        /******
         * Get the data of current object.
         ******/
        GEditor.prototype.getObjData = function(){
            return this.sceneArr[this.sceneNum].getObjData(this.objectId);
        }
        
        /******
         * Get list item for scene.
         ******/
        GEditor.prototype.getSceneListItem = function(){
            return this.sceneArr[this.sceneNum].getListStr();
        }
        
        /******
         * Move scene view.
         ******/
        GEditor.prototype.moveScene = function(direction){
            this.sceneArr[this.sceneNum].move(direction);
            this.updateAll();
        }
        
        /******
         * Zoom scene view.
         ******/
        GEditor.prototype.zoomScene = function(direction){
            this.sceneArr[this.sceneNum].zoom(direction);
            this.updateAll();
        }
        
        /******
         * Get list of point-like objects.
         ******/
        GEditor.prototype.getPointlikes = function(){
            return this.sceneArr[this.sceneNum].getPointlikes();
        }
        
        /******
         * Clear rendered images.
         * Removing the renderer causes an error when freeBoard() is
         * used. The renderer has no clear reference in the code.
         * Contents of the freeBoard() function is copied below to
         * fix the problem.
         ******/
        GEditor.prototype.clearAll = function(){
            // Go through the boards and find the right one.
            for (var f in JXG.JSXGraph.boards) {
                if (JXG.JSXGraph.boards[f].container === 'geditorbox-' + this.boxnum) {
                    if (typeof(f) === 'string') {
                        f = JXG.JSXGraph.boards[f];
                    }
                    f.removeEventHandlers();
                    for (var d = 0; d < f.containerObj.childNodes.length; d++) {
                        f.containerObj.removeChild(f.containerObj.childNodes[d]);
                    }
                    f.objects = new Object();
                    delete(f.algebra);
                    delete(JXG.JSXGraph.boards[f.id]);
                }
            }
        }

        /**
        * Localize strings
        */
        GEditor.prototype.localize = function(str, lang){
           return this.localizer.localize(str, lang);
        }
        
        GEditor.templates = {
            editorlayout: [
                '<ul class="gedit-toolarea gedit-gradbg"></ul>',
                '<ul class="gedit-subtoolarea gedit-gradbg-rev"></ul>',
                '<div class="gedit-scenearea"></div>',
                '<div class="gedit-naviarea"></div>',
                '<div class="gedit-objectarea"><div class="gedit-propertyarea gedit-gradbg"></div><ul class="gedit-objectlist"></ul></div>',
                '<ul class="gedit-tabarea gedit-gradbg"></ul>',
                '<div class="gedit-infoarea gedit-gradbg"></div>'
            ].join('\n'),
            viewlayout: [
                '<div class="gedit-scenearea"></div>',
                '<div class="gedit-naviarea"></div>',
                '<ul class="gedit-tabarea gedit-gradbg"></ul>',
                '<div class="gedit-infoarea gedit-gradbg"></div>'
            ].join('\n')
        }
        
        GEditor.strings = {
            css: [
                '.geoeditorwrapper {margin: 0.5em 0; box-sizing: border-box; -moz-box-sizing: border-box; width: 100%; border: 1px solid black; position: relative;}',
                '.geoeditorwrapper.editmode {min-width: 600px;}',
                '.geoeditorwrapper svg {display: inline-block;}',
                '.gedit-gradbg {background: rgb(238,238,238);',
                    'background: -moz-linear-gradient(top,  rgba(238,238,238,1) 0%, rgba(204,204,204,1) 100%);',
                    'background: -webkit-gradient(linear, left top, left bottom, color-stop(0%,rgba(238,238,238,1)), color-stop(100%,rgba(204,204,204,1)));',
                    'background: -webkit-linear-gradient(top,  rgba(238,238,238,1) 0%,rgba(204,204,204,1) 100%);',
                    'background: -o-linear-gradient(top,  rgba(238,238,238,1) 0%,rgba(204,204,204,1) 100%);',
                    'background: -ms-linear-gradient(top,  rgba(238,238,238,1) 0%,rgba(204,204,204,1) 100%);',
                    'background: linear-gradient(to bottom,  rgba(238,238,238,1) 0%,rgba(204,204,204,1) 100%);',
                    "filter: progid:DXImageTransform.Microsoft.gradient( startColorstr='#eeeeee', endColorstr='#cccccc',GradientType=0 );}",
                '.geoeditorwrapper .gedit-gradbg-rev {background: rgb(238,238,238);',
                    'background: -moz-linear-gradient(bottom,  rgba(238,238,238,1) 0%, rgba(178,178,178,1) 100%);',
                    'background: -webkit-gradient(linear, left bottom, left top, color-stop(0%,rgba(238,238,238,1)), color-stop(100%,rgba(178,178,178,1)));',
                    'background: -webkit-linear-gradient(bottom,  rgba(238,238,238,1) 0%,rgba(178,178,178,1) 100%);',
                    'background: -o-linear-gradient(bottom,  rgba(238,238,238,1) 0%,rgba(178,178,178,1) 100%);',
                    'background: -ms-linear-gradient(bottom,  rgba(238,238,238,1) 0%,rgba(178,178,178,1) 100%);',
                    'background: linear-gradient(to top,  rgba(238,238,238,1) 0%,rgba(178,178,178,1) 100%);',
                    "filter: progid:DXImageTransform.Microsoft.gradient( startColorstr='#b2b2b2', endColorstr='#eeeeee',GradientType=0 );}",
                /*** Scenearea ***********/
                '.geoeditorwrapper.editmode .gedit-scenearea {margin-right: 300px; min-width: 300px; min-height: 200px; background-color: white;}',
                '.geoeditorwrapper.editmode .gedit-scenearea {cursor: crosshair;}',
                '.geoeditorwrapper.editmode .gedit-scenearea[data-gedit-tooltype="Select"] {cursor: default;}',
                '.geoeditorwrapper.viewmode .gedit-scenearea {margin-right: 0; min-height: 400px; background-color: white;}',
                /*** Naviarea *************/
                '.geoeditorwrapper .gedit-naviarea {position: absolute; right: 300px; margin-top: -70px; display: none; opacity: 0.2; transition: opacity 0.5s; -webkit-transition: opacity 0.5s;}',
                '.geoeditorwrapper.viewmode .gedit-naviarea {right: 0;}',
                '.geoeditorwrapper .gedit-naviarea:hover {opacity: 1;}',
                '.geoeditorwrapper .gedit-naviarea.gedit-controls-on {display: block;}',
                '.geoeditorwrapper .gedit-naviarea .gedit-navibutton:hover {cursor: pointer;}',
                '.geoeditorwrapper .gedit-naviarea .gedit-navibutton:hover circle {fill: #faa;}',
                /*** Objectarea ***********/
                '.geoeditorwrapper.editmode .gedit-objectarea {position: absolute; top: 0; bottom: 0; right: 0; width: 300px; box-sizing: border-box; -moz-box-sizing: border-box; border-left: 1px solid black;}',
                /*** Propertyarea ***********/
                '.geoeditorwrapper.editmode .gedit-propertyarea {font-size: 80%; height: 250px; overflow-y: scroll; overflow-x: hidden; padding: 0.3em; box-sizing: border-box; -moz-box-sizing: border-box;}',
                '.geoeditorwrapper.editmode .gedit-propertyarea fieldset table {width: 100%;}',
                '.geoeditorwrapper.editmode .gedit-propertyarea fieldset table td {vertical-align: top;}',
                '.geoeditorwrapper.editmode .gedit-propertyarea input[type="text"], .geoeditorwrapper.editmode .gedit-propertyarea input[type="color"], .geoeditorwrapper.editmode .gedit-propertyarea input[type="number"] {display: block; width: 100%;}',
                '.geoeditorwrapper.editmode .gedit-propertyarea textarea {box-sizing: content-box; -moz-box-sizing: content-box; width: 100%; height: 4em; padding: 0; margin: 0;}',
                '.geoeditorwrapper.editmode .gedit-propertyarea .gedit-options-advanced {overflow: hidden; height: 0; -moz-transition: all 0.2s ease-out; -webkit-transition: all 0.2s ease-out; -ie-transition: all 0.2s ease-out; transition: all 0.2s ease-out;}',
                '.geoeditorwrapper.editmode .gedit-propertyarea .gedit-advanced-toggle {display: block; text-align: center; font-size: 50%; line-height: 0.8em; padding-bottom: 0.5em; cursor: pointer; font-weight: bold; text-shadow: -1px -1px 1px rgba(0,0,0,0.5), 1px 1px 1px rgba(255,255,255,0.7);}',
                '.geoeditorwrapper.editmode .gedit-propertyarea .gedit-advanced-toggle:hover {background-color: rgba(255,255,255,0.8);}',
                '.geoeditorwrapper.editmode .gedit-propertyarea.gedit-show-advanced .gedit-options-advanced {height: auto; -moz-transition: all 0.4s ease-out; -webkit-transition: all 0.4s ease-out; -ie-transition: all 0.4s ease-out; transition: all 0.4s ease-out;}',
                '.geoeditorwrapper .gedit-propertyarea tr.geoWidget-Label {font-size: 70%; color: #777;}',
                /*** Object list ***********/
                '.geoeditorwrapper.editmode ul.gedit-objectlist {position: absolute; top: 250px; left: 0; right: 0; bottom: 0; overflow-x: hidden; overflow-y: scroll; list-style: none; margin: 0; padding: 0; background-color: white; border-top: 1px solid black;}',
                '.geoeditorwrapper.editmode ul.gedit-objectlist li {padding: 0.1em 0.2em; border-bottom: 1px solid #999; cursor: pointer;}',
                '.geoeditorwrapper.editmode ul.gedit-objectlist li.gedit-selected {background-color: #ffa; box-shadow: inset 0 2px 5px rgba(255,255,255,0.8), inset 0 -2px 5px rgba(0,0,0,0.3);}',
                '.geoeditorwrapper.editmode ul.gedit-objectlist li.gedit-error {background-color: #fdd;}',
                '.geoeditorwrapper.editmode ul.gedit-objectlist li.gedit-selected.gedit-error {background-color: #fda;}',
                '.geoeditorwrapper.editmode ul.gedit-objectlist li > div {display: inline-block; vertical-align: middle;}',
                '.geoeditorwrapper.editmode ul.gedit-objectlist li div.gedit-objectitem-buttons {display: inline-block; vertical-align: middle; float: right;}',
                '.geoeditorwrapper.editmode ul.gedit-objectlist li div.gedit-objectitem-buttons > div {display: inline-block; cursor: pointer;}',
                '.geoeditorwrapper.editmode ul.gedit-objectlist li div.gedit-objectitem-buttons .gedit-visible {margin-right: 0.7em;}',
                '.geoeditorwrapper.editmode ul.gedit-objectlist li .gedit-listicon {margin-right: 15px;}',
                '.geoeditorwrapper.editmode ul.gedit-objectlist li .gedit-listname {font-family: serif;}',
                '.geoeditorwrapper.editmode ul.gedit-objectlist li .gedit-listname sub {font-size: 60%;}',
                '.geoeditorwrapper.editmode ul.gedit-objectlist li .gedit-listname .geoedit-aka {color: #555; font-size: 80%;}',
                '.geoeditorwrapper.editmode ul.gedit-objectlist li div.gedit-objectitem-buttons .gedit-visible svg .nonvisible {display: none}',
                '.geoeditorwrapper.editmode ul.gedit-objectlist li[data-gedit-visible="nonvisible"] div.gedit-objectitem-buttons .gedit-visible svg .nonvisible {display: inherit;}',
                '.geoeditorwrapper.editmode ul.gedit-objectlist li[data-gedit-visible="nonvisible"] div.gedit-objectitem-buttons .gedit-visible svg .visible {stroke: #999;}',
                '.geoeditorwrapper.editmode ul.gedit-objectlist li[data-gedit-visible="nonvisible"] {background-color: rgba(170,170,170,0.2);}',
                /*** Tabarea ***********/
                '.geoeditorwrapper.editmode .gedit-tabarea {border-top: 1px solid black; margin-right: 300px; list-style: none; padding: 0 0.5em 0.2em; margin: 0;}',
                '.geoeditorwrapper.editmode .gedit-tabarea li.gedit-tab {margin: 0; margin-top: -1px; padding: 0.2em 0.4em; border: 1px solid black; border-top: 1px solid white; border-radius: 0 0 0.2em 0.2em; background-color: #f6f6f6; display: inline-block; min-width: 1em; text-align: center; cursor: pointer;}',
                '.geoeditorwrapper.editmode .gedit-tabarea li.gedit-tab.gedit-selected {padding-bottom: 0.5em; background-color: white; font-weight: bold;}',
                '.geoeditorwrapper.editmode .gedit-tabarea li.gedit-tab:hover, .geoeditorwrapper.editmode .gedit-tabarea li.gedit-tab.gedit-selected:hover {background-color: rgba(255,200,200,0.8); border-color: #a00; border-top-color: rgba(255,200,200,0.8); }',
                '.geoeditorwrapper.viewmode .gedit-tabarea {border-top: 1px solid black; margin-right: 40%; list-style: none; padding: 0 0.5em 0.2em; margin: 0;}',
                '.geoeditorwrapper.editmode .gedit-tabarea li.gedit-tab-addremove {border: 1px solid black; border-radius: 50%; height: 18px; width: 18px; vertical-align: middle; line-height: 22px; padding: 2px; margin-left: 0.2em; margin-top: 0.3em; box-shadow: 0px 3px 2px rgba(0,0,0,0.2), 3px 0px 2px rgba(0,0,0,0.2), -2px -2px 2px rgba(255,255,255,0.5), inset 1px 1px 2px rgba(0,0,0,0.2), inset -1px -1px 2px rgba(255,255,255,0.2);}',
                '.geoeditorwrapper.editmode .gedit-tabarea li.gedit-tab-addremove:hover {border: 1px solid #a00; background-color: rgba(255,200,200,0.8);}',
                '.geoeditorwrapper.editmode .gedit-tabarea li.gedit-tab.gedit-tab-addremove.gedit-tabremove { margin-left: 0.5em;}',
                '.geoeditorwrapper.editmode .gedit-tabarea li.gedit-tab.gedit-tab-addremove.gedit-tabadd { margin-right: 2em;}',
                '.geoeditorwrapper.viewmode .gedit-tabarea li.gedit-tab {margin: 0; margin-top: -1px; padding: 0.2em 0.4em; border: 1px solid black; border-top: none; border-radius: 0 0 0.4em 0.4em; background-color: white; display: inline-block; min-width: 1em; text-align: center; cursor: pointer;}',
                '.geoeditorwrapper.viewmode .gedit-tabarea li.gedit-tab.gedit-selected {padding-bottom: 0.5em; font-weight: bold;}',
                /*** Tabarea tabless ****/
                '.geoeditorwrapper.viewmode .gedit-tabarea.gedit-tabarea-tabless {text-align: center; padding: 0; padding-top: 0.2em;}',
                '.geoeditorwrapper.viewmode .gedit-tabarea li.gedit-tab.gedit-tabless, .geoeditorwrapper.viewmode .gedit-tabarea li.gedit-tab.gedit-tab-navi {border-radius: 0; border: none; background: transparent; vertical-align: middle; margin: 0; padding:0;}',
                '.geoeditorwrapper.viewmode .gedit-tabarea li.gedit-tab.gedit-tabless.gedit-selected {padding: 0;}',
                '.geoeditorwrapper.viewmode .gedit-tabarea li.gedit-tab.gedit-tabless.gedit-selected svg .selectable {fill: #555;}',
                '.geoeditorwrapper.viewmode .gedit-tabarea li.gedit-tab.gedit-tabless.gedit-selected svg .highlight {stroke: blue; stroke-width: 2px;}',
                '.geoeditorwrapper.viewmode .gedit-tabarea li.gedit-tab.gedit-tabless:hover svg .highlight {stroke: #a00; fill: rgba(255,0,0,0.3); stroke-width: 2px;}',
                '.geoeditorwrapper.viewmode .gedit-tabarea li.gedit-tab.gedit-tab-navi:hover svg .highlight {stroke: #a00; fill: rgba(255,0,0,0.3); stroke-width: 2px;}',
                /*** Toolarea ***********/
                '.geoeditorwrapper.editmode .gedit-toolarea {list-style: none; margin: 0; padding: 0 4px; border-top: 1px solid #888; border-bottom: 1px solid #888; margin-right: 300px;}',
                '.geoeditorwrapper.editmode .gedit-toolarea li.gedit-geotool {margin: 2px 0; display: inline-block; line-height: 24px; width: 24px; height: 24px; padding: 2px; text-align: center; vertical-align: middle; border: 1px solid #888; border-radius: 4px; box-shadow: -1px -1px 1px rgba(0,0,0,0.3), inset 1px 1px 1px rgba(255,255,255,0.6), inset -1px -1px 1px rgba(0,0,0,0.3), 1px 1px 1px rgba(255,255,255,0.6); cursor: pointer; position: relative;}',
                '.geoeditorwrapper.editmode .gedit-toolarea li.gedit-geotool:hover {background-color: rgba(255,255,255,0.6);}',
                '.geoeditorwrapper.editmode .gedit-toolarea li.gedit-geotool:active, .geoeditorwrapper.editmode .gedit-toolarea li.gedit-geotool.gedit-selected {padding: 3px 1px 1px 3px; box-shadow: -1px -1px 1px rgba(0,0,0,0.4), inset 1px 1px 1px rgba(0,0,0,0.4), inset -1px -1px 1px rgba(255,255,255,0.5), 1px 1px 1px rgba(255,255,255,0.5); background-color: rgba(255,255,255,0.6);}',
                '.geoeditorwrapper.editmode .gedit-toolarea li.gedit-geotool .gedit-toolshade {position: absolute; top: 0; bottom: 0; left: 0; right: 0;}',
                '.geoeditorwrapper.editmode .gedit-toolarea li.gedit-geotool svg {width: 22px; height: 22px;}',
                /*** SubToolarea ***********/
                '.geoeditorwrapper.editmode .gedit-subtoolarea {list-style: none; margin: 0; padding: 0 10px; border-bottom: 1px solid #888; margin-right: 300px; min-height: 30px; background-color: #eee;}',
                '.geoeditorwrapper.editmode .gedit-subtoolarea li.gedit-geotool {margin: 2px 3px; display: inline-block; line-height: 22px; width: 19px; height: 19px; padding: 2px; text-align: center; vertical-align: middle; border: 1px solid #666; border-radius: 4px;  cursor: pointer; position: relative; background-color: #ddd;}',
                '.geoeditorwrapper.editmode .gedit-subtoolarea li.gedit-geotool:hover {background-color: rgba(255,255,255,0.6);}',
                '.geoeditorwrapper.editmode .gedit-subtoolarea li.gedit-geotool:active, .geoeditorwrapper.editmode .gedit-subtoolarea li.gedit-geotool.gedit-selected {padding: 3px 1px 1px 3px; border: 1px solid black; background-color: rgba(255,255,100,0.8); background-color: white;}',
                '.geoeditorwrapper.editmode .gedit-subtoolarea li.gedit-geotool .gedit-toolshade {position: absolute; top: 0; bottom: 0; left: 0; right: 0;}',
                '.geoeditorwrapper.editmode .gedit-subtoolarea li.gedit-geotool svg {width: 15px; height: 15px;}',
                /*** Infoarea ***********/
                '.geoeditorwrapper .gedit-infoarea {min-height: 1.5em; margin-right: 300px; border-top: 1px solid #ddd; border-bottom: 1px solid #999;}',
                '.geoeditorwrapper.viewmode .gedit-infoarea {margin-right: 0;}',
                '.geoeditorwrapper .gedit-infoarea p {margin: 0 0.3em; padding: 0.2em 0.5em; font-size: 80%; background-color: rgba(255,255,255,0.7); border-top: none; border-left: 1px solid #444; border-right: 1px solid #ddd; border-bottom: none; min-height: 1em;}',
                '.geoeditorwrapper .gedit-infoarea p:first-child {margin-top: 0.2em; border-top: 1px solid #444;}',
                '.geoeditorwrapper .gedit-infoarea p:last-child {margin-bottom: 0.2em; border-bottom: 1px solid #ddd;}'
            ].join('\n'),
            icons: {
                remove: '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="20" height="20" viewbox="0 0 30 30" class="mini-icon mini-icon-remove"><path style="stroke: none;" d="M7 4 l6 0 l0 -2 l4 0 l0 2 l6 0 l0 2 l-16 0z M7 8 l16 0 l0 19 l-1 1 l-14 0 l-1 -1z M9 10 l0 15 l3 0 l0 -15z M13.7 10 l0 15 l3 0 l0 -15z M21.1 10 l-3 0 l0 15 l3 0z" /></svg>',
                copy: '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="15" height="15" viewbox="0 0 30 30" class="mini-icon mini-icon-copy"><path style="stroke: none;" d="M2 2 l18 0 l0 6 l-12 0 l0 17 l-6 0 z M10 10 l8 0 l0 10 l10 0 l0 10 l-18 0 z M20 10 l8 8 l-8 0 z" /></svg>',
                newplus: '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="15" height="15" viewbox="0 0 30 30" class="mini-icon mini-icon-newplus"><path style="stroke: none;" d="M13 7 l4 0 l0 6 l6 0 l0 4 l-6 0 l0 6 l-4 0 l0 -6 l-6 0 l0 -4 l6 0z" /></svg>',
                removeminus: '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="15" height="15" viewbox="0 0 30 30" class="mini-icon mini-icon-removeminus"><path style="stroke: none;" d="M7 13 l16 0 l0 4 l-16 0 z" /></svg>',
                tablessbutton: '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="20" height="20" viewbox="0 0 30 30" class="mini-icon mini-icon-tablessbutton"><circle class="highlight" fill="none" stroke="none" cx="15.5" cy="15.5" r="10" /><circle class="selectable" fill="#999" stroke="none" cx="15.5" cy="15.5" r="7" /></svg>',
                tablessprev: '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="20" height="20" viewbox="0 0 30 30" class="mini-icon mini-icon-previous"><path class="highlight" fill="#999" stroke="none" d="M20 3 l-12 12.5 l12 12.5 l-5 -13.5 z" /></svg>',
                tablessnext: '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="20" height="20" viewbox="0 0 30 30" class="mini-icon mini-icon-next"><path class="highlight" fill="#999" stroke="none" d="M10 3 l12 12.5 l-12 12.5 l5 -13.5 z" /></svg>',
                visible: '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="20" height="20" viewbox="0 0 30 30" class="mini-icon mini-icon-visible"><path class="visible" fill="white" stroke="black" d="M2 15.5 a15 15 0 0 0 26 0 a15 15 0 0 0 -26 0z" /><circle class="visible" fill="white" stroke="black" cx="15.5" cy="15.5" r="6" /><circle class="visible" fill="black" stroke="none" cx="15.5" cy="15.5" r="3" /><path class="visible" fill="none" stroke="black" stroke-width="2" d="M2 15.5 a15 15 0 0 1 26 0" /><line class="nonvisible" stroke="#a00" stroke-width="3" x1="28" y1="2" x2="2" y2="28" /></svg>'
            },
            tools: {
                navigation: '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="105" height="70" viewbox="0 0 150 100" class="geoedit-tool geoedit-navitool"><g transform="translate(50 25)" class="gedit-navibutton gedit-navi-up"><circle style="stroke: #333; stroke-width: 4;" fill="#eee" cx="0" cy="0" r="14" /><path style="stroke: none; fill: #333;" d="M2 -2 l0 8 a2 2 0 0 1 -4 0 l0 -8 l-3 3 a2 2 0 0 1 -3 -3 l6 -6 a3 3 0 0 1 4 0 l6 6 a2 2 0 0 1 -3 3z" /></g><g transform="translate(50 75) rotate(180)" class="gedit-navibutton gedit-navi-down"><circle style="stroke: #333; stroke-width: 4;" fill="#eee" cx="0" cy="0" r="14" /><path style="stroke: none; fill: #333;" d="M2 -2 l0 8 a2 2 0 0 1 -4 0 l0 -8 l-3 3 a2 2 0 0 1 -3 -3 l6 -6 a3 3 0 0 1 4 0 l6 6 a2 2 0 0 1 -3 3z" /></g><g transform="translate(25 50) rotate(-90)" class="gedit-navibutton gedit-navi-left"><circle style="stroke: #333; stroke-width: 4;" fill="#eee" cx="0" cy="0" r="14" /><path style="stroke: none; fill: #333;" d="M2 -2 l0 8 a2 2 0 0 1 -4 0 l0 -8 l-3 3 a2 2 0 0 1 -3 -3 l6 -6 a3 3 0 0 1 4 0 l6 6 a2 2 0 0 1 -3 3z" /></g><g transform="translate(75 50) rotate(90)" class="gedit-navibutton gedit-navi-right"><circle style="stroke: #333; stroke-width: 4;" fill="#eee" cx="0" cy="0" r="14" /><path style="stroke: none; fill: #333;" d="M2 -2 l0 8 a2 2 0 0 1 -4 0 l0 -8 l-3 3 a2 2 0 0 1 -3 -3 l6 -6 a3 3 0 0 1 4 0 l6 6 a2 2 0 0 1 -3 3z" /></g><g transform="translate(125 20)" class="gedit-navibutton gedit-navi-zoomin"><rect x="-22" y="-12" width="34" height="34" fill="transparent" /><circle style="stroke: #333; stroke-width: 4;" fill="#eee" cx="0" cy="0" r="10" /><path style="stroke: none; fill: #333;" d="M-11 7 l-10 10 a2 2 0 0 0 4 4 l10 -10z" /><path style="stroke: none; fill: #333;" d="M-1.5 -1.5 l0 -5 l3 0 l0 5 l5 0 l0 3 l-5 0 l0 5 l-3 0 l0 -5 l-5 0 l0 -3z" /></g><g transform="translate(125 70)" class="gedit-navibutton gedit-navi-zoomout"><rect x="-22" y="-12" width="34" height="34" fill="transparent" /><circle style="stroke: #333; stroke-width: 4;" fill="#eee" cx="0" cy="0" r="10" /><path style="stroke: none; fill: #333;" d="M-11 7 l-10 10 a2 2 0 0 0 4 4 l10 -10z" /><path style="stroke: none; fill: #333;" d="M-6.5 -1.5 l13 0 l0 3 l-13 0z" /></g></svg>'
            }
        }
    }
    
    { /*** Localizer **************************************************************/
        
        var Localizer = function(lang){
            this.lang = lang || 'en';
        }
        /**
        * Localize strings
        */
        Localizer.prototype.localize = function(str, lang){
           lang = lang || this.lang;
           return (this.dict && this.dict[str] && (this.dict[str][lang] || this.dict[str]['en']))  || str;
        }
        
        /**
         * Add new terms to dictionary as an object.
         */
        Localizer.addTerms = function(terms){
            for (var item in terms){
                if (typeof(Localizer.prototype.dict[item]) === 'undefined') {
                    Localizer.prototype.dict[item] = terms[item];
                }
            }
        }

        /**
         * Which languages use decimal period.
         */
        Localizer.prototype.decimalPeriod = {
            'en': false,
            'fi': true,
            'sv': true,
            'et': true
        }
        
        /**
         * Return the usage of decimal period in this.language.
         */    
        Localizer.prototype.decimalperiod = function(){
            return this.decimalPeriod[this.lang];
        }
        
        /** GeoEditor **********/
        Localizer.prototype.dict = {
            'Basic': {
                'en': 'Basic',
                'fi': 'Perusominaisuudet',
                'sv': 'Grundfunktioner'
            },
            'Advanced': {
                'en': 'Advanced',
                'fi': 'Lisäominaisuudet',
                'sv': 'Tilläggsfunktioner'
            },
            'Remove are you sure': {
                'en': '<p>You are removing picture on this tab.</p><p>Are you sure?</p>',
                'fi': '<p>Olet poistamassa tämän välilehden kuvaa.</p><p>Oletko varma?</p>',
                'sv': '<p>Du håller på att radera bilden på denna tab.</p><p>Är du säker?</p>'
            },
            'Remove picture': {
                'en': 'Remove picture',
                'fi': 'Poista kuva',
                'sv': 'Ta bort bild'
            },
            'Ok': {
                'en': 'Ok',
                'fi': 'Ok',
                'sv': 'Ok'
            },
            'Cancel': {
                'en': 'Cancel',
                'fi': 'Peruuta',
                'sv': 'Ångra'
            }
        }
        
        /** GeoScene *************/
        Localizer.addTerms({
            'Name': {
                'en': 'Name',
                'fi': 'Nimi',
                'sv': 'Namn'
            },
            'Description': {
                'en': 'Description',
                'fi': 'Kuvateksti',
                'sv': 'Bildtext'
            },
            'Show grid': {
                'en': 'Show grid',
                'fi': 'Näytä ruudukko',
                'sv': 'Visa rutfält'
            },
            'Show axis': {
                'en': 'Show axis',
                'fi': 'Näytä akselit',
                'sv': 'Visa axlarna'
            },
            'Static': {
                'en': 'Static',
                'fi': 'Kiinnitetty',
                'sv': 'Statisk'
            },
            'Allow controls': {
                'en': 'Allow controls',
                'fi': 'Salli hallinta',
                'sv': 'Tillåt redigering'
            },
            'Bounding box': {
                'en': 'Bounding box',
                'fi': 'Kuvan rajat',
                'sv': 'Bildens gränser'
            }
        });
        
        /** GeoObject ************/
        Localizer.addTerms({
            'Label': {
                'en': 'Label',
                'fi': 'Nimi',
                'sv': 'Namn'
            },
            'Color': {
                'en': 'Color',
                'fi': 'Väri',
                'sv': 'Färg'
            },
            'Stroke color': {
                'en': 'Stroke color',
                'fi': 'Viivan väri',
                'sv': 'Linjens färg'
            },
            'Fill color': {
                'en': 'Fill color',
                'fi': 'Täytön väri',
                'sv': 'Fyllnadsfärg'
            },
            'Stroke width': {
                'en': 'Stroke width',
                'fi': 'Viivan paksuus',
                'sv': 'Linjens bredd'
            },
            'Visible': {
                'en': 'Visible',
                'fi': 'Näkyvissä',
                'sv': 'Synlig'
            },
            'Show label': {
                'en': 'Show label',
                'fi': 'Näytä nimi',
                'sv': 'Visa namn'
            },
            'Fixed': {
                'en': 'Fixed',
                'fi': 'Kiinteä',
                'sv': 'Fast'
            },
            'Size': {
                'en': 'Size',
                'fi': 'Koko',
                'sv': 'Storlek'
            },
            'Line style': {
                'en': 'Line style',
                'fi': 'Viivan tyyli',
                'sv': 'Linjens typ'
            }
        });
        
        /** GeoPoint *************/
        Localizer.addTerms({
            'x-coordinate': {
                'en': 'x-coordinate',
                'fi': 'x-koordinaatti',
                'sv': 'x-koordinat'
            },
            'y-coordinate': {
                'en': 'y-coordinate',
                'fi': 'y-koordinaatti',
                'sv': 'y-koordinat'
            },
            'Snap to grid': {
                'en': 'Snap to grid',
                'fi': 'Napsahda ruudukkoon',
                'sv': 'Fäst vid rutfältet'
            }
        });
        
        /** GeoLine ***********/
        Localizer.addTerms({
            'First point': {
                'en': 'First point',
                'fi': 'Ensimmäinen piste',
                'sv': 'Första punkten'
            },
            'Second point': {
                'en': 'Second point',
                'fi': 'Toinen piste',
                'sv': 'Andra punkten'
            },
            'Line type': {
                'en': 'Line type',
                'fi': 'Suoran tyyppi',
                'sv': 'Typ av linje'
            },
            'Arrow at start': {
                'en': 'Arrow at start',
                'fi': 'Nuoli alussa',
                'sv': 'Pil i början'
            },
            'Arrow at end': {
                'en': 'Arrow at end',
                'fi': 'Nuoli lopussa',
                'sv': 'Pil i slutet'
            },
            'Line': {
                'en': 'Line',
                'fi': 'Suora',
                'sv': 'Linje'
            },
            'Line segment': {
                'en': 'Line segment',
                'fi': 'Jana',
                'sv': 'Sträcka'
            },
            'Starting line segment': {
                'en': 'Starting line segment',
                'fi': 'Puolisuora pisteestä',
                'sv': 'Stråle från en punkt'
            },
            'Ending line segment': {
                'en': 'Ending line segment',
                'fi': 'Puolisuora pisteeseen',
                'sv': 'Stråle till en punkt'
            }
        });
        
        /** GeoCircle ************/
        Localizer.addTerms({
            'Center point': {
                'en': 'Center point',
                'fi': 'Keskipiste',
                'sv': 'Medelpunkt'
            },
            'Arc point': {
                'en': 'Arc point',
                'fi': 'Kehäpiste',
                'sv': 'Periferipunkt'
            }
        });
        
        /** GeoRcircle *************/
        Localizer.addTerms({
            'Center point': {
                'en': 'Center point',
                'fi': 'Keskipiste',
                'sv': 'Medelpunkt'
            },
            'Radius start': {
                'en': 'Start point of radius',
                'fi': 'Säteen alkupiste',
                'sv': 'Radiens startpunkt'
            },
            'Radius end': {
                'en': 'End point of radius',
                'fi': 'Säteen päätepiste',
                'sv': 'Radiens ändpunkt'
            }
        });
        
        /** GeoGlider *********/
        Localizer.addTerms({
            'x-coordinate': {
                'en': 'x-coordinate',
                'fi': 'x-koordinaatti',
                'sv': 'x-koordinat'
            },
            'y-coordinate': {
                'en': 'y-coordinate',
                'fi': 'y-koordinaatti',
                'sv': 'y-koordinat'
            },
            'Parent': {
                'en': 'On the element',
                'fi': 'Käyrällä',
                'sv': 'På elementet'
            }
        });
        
        /** GeoMidpoint ***************/
            Localizer.addTerms({
            'Point 1': {
                'en': 'Point 1',
                'fi': '1. piste',
                'sv': 'Punkt 1'
            },
            'Point 2': {
                'en': 'Point 2',
                'fi': '2. piste',
                'sv': 'Punkt 2'
            }
        });
        
        /** GeoIntersection **********/
        Localizer.addTerms({
            'Parent 1': {
                'en': 'First curve',
                'fi': 'Käyrä 1',
                'sv': 'Element 1'
            },
            'Parent': {
                'en': 'Second curve',
                'fi': 'Käyrä 2',
                'sv': 'Element 2'
            },
            'Show points': {
                'en': 'Show points',
                'fi': 'Näytä pisteet',
                'sv': 'Visa punkter'
            },
            'both': {
                'en': 'Both',
                'fi': 'Molemmat',
                'sv': 'Båda'
            },
            'first': {
                'en': 'First',
                'fi': 'Ensimmäinen',
                'sv': 'Den första'
            },
            'second': {
                'en': 'Second',
                'fi': 'Toinen',
                'sv': 'Den andra'
            }
        });
        
        /** GeoTriangle *********/
        Localizer.addTerms({
            'First point': {
                'en': 'First point',
                'fi': 'Ensimmäinen piste',
                'sv': 'Den första punkten'
            },
            'Second point': {
                'en': 'Second point',
                'fi': 'Toinen piste',
                'sv': 'Den andra punkten'
            },
            'Third point': {
                'en': 'Third point',
                'fi': 'Kolmas piste',
                'sv': 'Den tredje punkten'
            }
        });
        
        /** GeoRighttriangle / GeoRtriangle ********/
        Localizer.addTerms({
            'First point': {
                'en': 'First point',
                'fi': 'Ensimmäinen piste',
                'sv': 'Den första punkten'
            },
            'Second point': {
                'en': 'Second point',
                'fi': 'Toinen piste',
                'sv': 'Den andra punkten'
            },
            'Third point name': {
                'en': 'Third point name',
                'fi': 'Kolmannen pisteen nimi',
                'sv': 'Den tredje punktens namn'
            },
            'Show generated point': {
                'en': 'Show third point',
                'fi': 'Näytä kolmas piste',
                'sv': 'Visa den tredje punkten'
            },
            'Show generated name': {
                'en': 'Show the name of third point',
                'fi': 'Näytä kolmannen pisteen nimi',
                'sv': 'Visa den tredje punktens namn'
            },
            'Show right angle': {
                'en': 'Show mark for right angle',
                'fi': 'Näytä suoran kulman merkki'
            }
        });
        
        /** GeoAngle **********/
        Localizer.addTerms({
            'Right point': {
                'en': 'Right point',
                'fi': 'Oikean kyljen piste',
                'sv': 'Högra sidans punkt'
            },
            'Corner point': {
                'en': 'Corner point',
                'fi': 'Kärkipiste',
                'sv': 'Spetspunkt'
            },
            'Left point': {
                'en': 'Left point',
                'fi': 'Vasemman kyljen piste',
                'sv': 'Högra sidans punkt'
            },
            'Angle mode': {
                'en': 'Angle mode',
                'fi': 'Kulman tyyppi',
                'sv': 'Typ av vinkel'
            },
            'Angle': {
                'en': 'Angle',
                'fi': 'Kulma',
                'sv': 'Vinkel'
            },
            'Small angle': {
                'en': 'Small angle',
                'fi': 'Pienempi kulma',
                'sv': 'Mindre vinkel'
            },
            'Large angle': {
                'en': 'Large angle',
                'fi': 'Suurempi kulma',
                'sv': 'Större vinkel'
            },
            'Radius': {
                'en': 'Radius',
                'fi': 'Säde',
                'sv': 'Radie'
            },
            'Fill opacity': {
                'en': 'Fill opacity',
                'fi': 'Täytön peittävyys',
                'sv': 'Fyllnads opacitet'
            }
        });
        
        /** GeoBisector **********/
        Localizer.addTerms({
            'Right point': {
                'en': 'Right point',
                'fi': 'Oikean kyljen piste',
                'sv': 'Högra sidans punkt'
            },
            'Corner point': {
                'en': 'Corner point',
                'fi': 'Kärkipiste',
                'sv': 'Spetspunkt'
            },
            'Left point': {
                'en': 'Left point',
                'fi': 'Vasemman kyljen piste',
                'sv': 'Högra sidans punkt'
            },
            'Is ray': {
                'en': 'Ray',
                'fi': 'Puolisuora',
                'sv': 'En stråle'
            },
            'Bisector': {
                'en': 'Bisector',
                'fi': 'Kulmanpuolittaja',
                'sv': 'Bisektris'
            }
        });
        
        /** GeoNormal *********/
        Localizer.addTerms({
            'Point': {
                'en': 'Point',
                'fi': 'Piste',
                'sv': 'Punkt'
            },
            'Curve': {
                'en': 'Curve',
                'fi': 'Käyrä',
                'sv': 'Kurva'
            },
            'Line type': {
                'en': 'Line type',
                'fi': 'Suoran tyyppi',
                'sv': 'Typ av linje'
            },
            'Line': {
                'en': 'Line',
                'fi': 'Suora',
                'sv': 'Linje'
            },
            'Line segment': {
                'en': 'Line segment',
                'fi': 'Jana',
                'sv': 'Spetspunkt'
            },
            'Starting line segment': {
                'en': 'Starting line segment',
                'fi': 'Puolisuora pisteestä',
                'sv': 'En stråle från en punkt'
            },
            'Ending line segment': {
                'en': 'Ending line segment',
                'fi': 'Puolisuora pisteeseen',
                'sv': 'En stråle till en punkt'
            }
        });
        
        /** GeoParallel ********/
        
        /** GeoTangent ************/
        Localizer.addTerms({
            'Intersection 1 name': {
                'en': 'Name of 1st intersection',
                'fi': '1. leikkauspisteen nimi'
            },
            'Intersection 2 name': {
                'en': 'Name of 2nd intersection',
                'fi': '2. leikkauspisteen nimi'
            }
        });
                
        /** GeoRectangle ********/
        Localizer.addTerms({
            'First point': {
                'en': 'First point',
                'fi': 'Ensimmäinen piste',
                'sv': 'Första punkten'
            },
            'Second point': {
                'en': 'Second point',
                'fi': 'Toinen piste',
                'sv': 'Andra punkten'
            },
            'Third point name': {
                'en': 'Third point\'s name',
                'fi': 'Kolmannen pisteen nimi',
                'sv': 'Tredje punktens namn'
            },
            'Fourth point name': {
                'en': 'Fourth point\'s name',
                'fi': 'Neljännen pisteen nimi',
                'sv': 'Fjärde punktens namn'
            },
            'Show third point': {
                'en': 'Show the third point',
                'fi': 'Näytä kolmas piste',
                'sv': 'Visa tredje punkten'
            },
            'Show fourth point': {
                'en': 'Show the fourth point',
                'fi': 'Näytä neljäs piste',
                'sv': 'Visa fjärde punkten'
            },
            'Show third point name': {
                'en': 'Show the name of the third point',
                'fi': 'Näytä kolmannen pisteen nimi',
                'sv': 'Visa tredje punktens namn'
            },
            'Show fourth point name': {
                'en': 'Show the name of the fourth point',
                'fi': 'Näytä neljännen pisteen nimi',
                'sv': 'Visa fjärde punktens namn'
            }
        });
        
        /** GeoParallelogram *******/
        
        /** GeoLabel **********/
            Localizer.addTerms({
            'Caption': {
                'en': 'Caption',
                'fi': 'Teksti',
                'sv': 'Text'
            },
            'Text size': {
                'en': 'Text size',
                'fi': 'Tekstin koko',
                'sv': 'Textstorlek'
            }
        });
        
        /***************
         * Geotools
         ****************/
        /** GeoToolSelect ******/
        Localizer.addTerms({
            'Select-start': {
                'en': '<p>Click object to select or drag to move it.</p>',
                'fi': '<p>Valitse kuvio klikkaamalla tai siirrä raahaamalla.</p>',
                'sv': '<p>Välj object genom att klicka eller flytta genom att dra.</p>'
            },
            'Select-tooltip': {
                'en': 'Select / Move',
                'fi': 'Valinta / Siirto',
                'sv': 'Val / Förflyttning'
            }
        });

        /** GeoToolPoint *****/
        Localizer.addTerms({
            'Point-start': {
                'en': '<p>Click on the drawing area to add a point.</p>',
                'fi': '<p>Lisää piste klikkaamalla piirtoaluetta.</p>',
                'sv': '<p>Lägg till en punkt genom att klicka på ritområdet.</p>'
            },
            'Point-maintooltip': {
                'en': 'Point',
                'fi': 'Piste',
                'sv': 'Punkt'
            },
            'Point-tooltip': {
                'en': 'Point',
                'fi': 'Piste',
                'sv': 'Punkt'
            }
        });

        /** GeoToolLine *********/
        Localizer.addTerms({
            'Line-start': {
                'en': '<p>Click on the drawing area to select or to add the <strong>first</strong> point of line.</p>',
                'fi': '<p>Valitse tai lisää suoran <strong>ensimmäinen</strong> piste klikkaamalla piirtoaluetta.</p>',
                'sv': '<p>Välj eller lägg till linjens <strong>första</strong> punkt genom att klicka på ritområdet.</p>'
            },
            'Line-1': {
                'en': '<p>Click on the drawing area to select or to add the <strong>second</strong> point of line.</p>',
                'fi': '<p>Valitse tai lisää suoran <strong>toinen</strong> piste klikkaamalla piirtoaluetta.</p>',
                'sv': '<p>Välj eller lägg till linjens <strong>andra</strong> punkt genom att klicka på ritområdet.</p>'
            },
            'Line-maintooltip': {
                'en': 'Line / Segment',
                'fi': 'Suora / Jana',
                'sv': 'Linje / Sträcka'
            },
            'Line-tooltip': {
                'en': 'Line / Segment',
                'fi': 'Suora / Jana',
                'sv': 'Linje / Sträcka'
            }
        });

        /** GeoToolCircle ******/
        Localizer.addTerms({
            'Circle-start': {
                'en': '<p>Click on the drawing area to select or to add the <strong>center point</strong> of the circle.</p>',
                'fi': '<p>Valitse tai lisää ympyrän <strong>keskipiste</strong> klikkaamalla piirtoaluetta.</p>',
                'sv': '<p>Välj eller lägg cirkelns <strong>medelpunkt</strong> genom att klicka på ritområdet.</p>'
            },
            'Circle-1': {
                'en': '<p>Click on the drawing area to select or to add the <strong>arc point</strong> of the circle.</p>',
                'fi': '<p>Valitse tai lisää ympyrän <strong>kehäpiste</strong> klikkaamalla piirtoaluetta.</p>',
                'sv': '<p>Välj eller lägg cirkelns <strong>periferipunkt</strong> genom att klicka på ritområdet.</p>'
            },
            'Circle-maintooltip': {
                'en': 'Circle',
                'fi': 'Ympyrä',
                'sv': 'Cirkel'
            },
            'Circle-tooltip': {
                'en': 'Circle with center and arc point',
                'fi': 'Ympyrä keski- ja kehäpisteillä',
                'sv': 'En cirkel med en medel- samt periferipunkt'
            }
        });

        /** GeoToolRcircle ******/
        Localizer.addTerms({
            'Rcircle-start': {
                'en': '<p>Click on the drawing area to select or to add the <strong>center point</strong> of the circle.</p>',
                'fi': '<p>Valitse tai lisää ympyrän <strong>keskipiste</strong> klikkaamalla piirtoaluetta.</p>',
                'sv': '<p>Välj eller lägg cirkelns <strong>medelpunkt</strong> genom att klicka på ritområdet.</p>'
            },
            'Rcircle-1': {
                'en': '<p>Click on a <strong>segment</strong> to select radius or a <strong>point</strong> to select starting point of radius.</p>',
                'fi': '<p>Valitse <strong>jana</strong> säteeksi tai <strong>piste</strong> säteen alkupisteeksi.</p>',
                'sv': '<p>Klicka på en <strong>sträcka</strong> för att välja radie eller på en <strong>punkt</strong> för att välja startpunkt för radien.</p>'
            },
            'Rcircle-2': {
                'en': '<p>Click on a <strong>point</strong> to select ending point of radius.</p>',
                'fi': '<p>Valitse <strong>piste</strong> säteen päätepisteeksi.</p>',
                'sv': '<p>Klicka på en <strong>punkt</strong> för att välja ändpunkten för radien.</p>'
            },
            'Rcircle-error': {
                'en': '<p>You missed point or segment. Click again.</p>',
                'fi': '<p>Et osunut pisteeseen tai janaan. Klikkaa uudelleen.</p>',
                'sv': '<p>Du missade punkten eller sträckan. Klicka igen.</p>',
            },
            'Rcircle-error-1': {
                'en': '<p>You missed point or segment. Click on a <strong>segment</strong> to select radius or a <strong>point</strong> to select starting point of radius.</p>',
                'fi': '<p>Et osunut pisteeseen tai janaan. Valitse <strong>jana</strong> säteeksi tai <strong>piste</strong> säteen alkupisteeksi.</p>',
                'sv': '<p>Du missade punkten eller sträckan. Klicka på en <strong>sträcka</strong> för att välja radie eller på en <strong>punkt</strong> för att välja startpunkt för radien.</p>'
            },
            'Rcircle-error-2': {
                'en': '<p>You missed point. Click on a <strong>point</strong> to select ending point of radius.</p>',
                'fi': '<p>Et osunut pisteeseen. Valitse <strong>piste</strong> säteen päätepisteeksi.</p>',
                'sv': '<p>Du missade punkten. Klicka på en <strong>punkt</strong> för att välja ändpunkt för radien.</p>'
            },
            'Rcircle-tooltip': {
                'en': 'Circle with center and radius from segment / two points',
                'fi': 'Ympyrä keskipisteellä ja kahdesta pisteestä / janasta saadulla säteellä',
                'sv': 'En cirkel med medelpunkt och radie från två punkter / en sträcka'
            }
        });

        /** GeoToolTriangle ******/
        Localizer.addTerms({
            'Triangle-start': {
                'en': '<p>Click on the drawing area to select or to add the <strong>first cornerpoint</strong> of triangle.</p>',
                'fi': '<p>Valitse tai lisää kolmion <strong>ensimmäinen kulmapiste</strong> klikkaamalla piirtoaluetta.</p>',
                'sv': '<p>Klicka på ritområdet för att välja eller lägga till triangelns <strong>första hörnpunkt</strong>.</p>'
            },
            'Triangle-1': {
                'en': '<p>Click on the drawing area to select or to add the <strong>second cornerpoint</strong> of triangle.</p>',
                'fi': '<p>Valitse tai lisää kolmion <strong>toinen kulmapiste</strong> klikkaamalla piirtoaluetta.</p>',
                'sv': '<p>Klicka på ritområdet för att välja eller lägga till triangelns <strong>andra hörnpunkt</strong>.</p>'
            },
            'Triangle-2': {
                'en': '<p>Click on the drawing area to select or to add the <strong>third cornerpoint</strong> of triangle.</p>',
                'fi': '<p>Valitse tai lisää kolmion <strong>kolmas kulmapiste</strong> klikkaamalla piirtoaluetta.</p>',
                'sv': '<p>Klicka på ritområdet för att välja eller lägga till triangelns <strong>tredje hörnpunkt</strong>.</p>'
            },
            'Triangle-maintooltip': {
                'en': 'Triangle',
                'fi': 'Kolmio',
                'sv': 'Triangel'
            },
            'Triangle-tooltip': {
                'en': 'Triangle',
                'fi': 'Kolmio',
                'sv': 'Triangel'
            }
        });

        /** GeoToolRighttriangle ********/
        Localizer.addTerms({
            'Righttriangle-start': {
                'en': '<p>Click on the drawing area to select or to add the <strong>first end of hypotenuse</strong>.</p>',
                'fi': '<p>Valitse tai lisää <strong>hypotenuusan ensimmäinen päätepiste</strong> klikkaamalla piirtoaluetta.</p>',
                'sv': '<p>Klicka på ritområdet för att välja eller lägga till den <strong>första ändpunkten för hypotenusan</strong>.</p>'
            },
            'Righttriangle-1': {
                'en': '<p>Click on the drawing area to select or to add the <strong>second end of hypotenuse</strong>.</p>',
                'fi': '<p>Valitse tai lisää <strong>hypotenuusan toinen päätepiste</strong> klikkaamalla piirtoaluetta.</p>',
                'sv': '<p>Klicka på ritområdet för att välja eller lägga till den <strong>andra ändpunkten för hypotenusan</strong>.</p>'
            },
            'Righttriangle-2': {
                'en': '<p>Click on the drawing area to select or to add the <strong>third</strong> cornerpoint of right triangle.</p>',
                'fi': '<p>Valitse tai lisää suorakulmaisen kolmion <strong>kolmas</strong> kulmapiste klikkaamalla piirtoaluetta.</p>',
                'sv': '<p>Klicka på ritområdet för att välja eller lägga till den <strong>tredje</strong> hörnpunkten för den rätvinkliga triangeln.</p>'
            },
            'Righttriangle-tooltip': {
                'en': 'Right triangle - hypotenuse first',
                'fi': 'Suorakulmainen kolmio - hypotenuusa ensin',
                'sv': 'Rätvinklig triangel - hypotenusan i den första'
            }
        });

        /** GeoToolGlider *******/
        Localizer.addTerms({
            'Glider-start': {
                'en': '<p>Click on a curve to add a new glider.</p>',
                'fi': '<p>Lisää uusi liukuva piste klikkaamalla käyrää.</p>',
                'sv': '<p>Klicka på kurvan för att lägga till en ny glidare.</p>'
            },
            'Glider-tooltip': {
                'en': 'Glider point',
                'fi': 'Liukuva piste',
                'sv': 'En glidande punkt'
            }
        });
        
        /** GeoToolMidpoint *******/
        Localizer.addTerms({
            'Midpoint-start': {
                'en': '<p>Click on a <strong>segment or the first end point</strong> of segment to add a midpoint.</p>',
                'fi': '<p>Lisää janalle keskipiste klikkaamalla <strong>janaa tai janan alkupään pistettä</strong>.</p>'
            },
            'Midpoint-1': {
                'en': '<p>Click on <strong>the second end point of</strong> of a segment to add a midpoint.</p>',
                'fi': '<p>Klikkaa janan <strong>toista päätepistettä</strong> keskipisteen lisäämiseksi.</p>'
            },
            'Midpoint-error-0': {
                'en': '<p>You didn\'t click a point or a segment.</p><p>Click on a <strong>segment or the first end point</strong> of a segment to add a midpoint.</p>',
                'fi': '<p>Et osunut pisteeseen tai janaan.</p><p>Lisää janalle keskipiste klikkaamalla <strong>janaa tai janan alkupään pistettä</strong>.</p>'
            },
            'Midpoint-error-1': {
                'en': '<p>You didn\'t click a point.</p><p>Click on <strong>the second end point of</strong> of a segment to add a midpoint.</p>',
                'fi': '<p>Et osunut pisteeseen.</p><p>Klikkaa janan <strong>toista päätepistettä</strong> keskipisteen lisäämiseksi.</p>'
            },
            'Midpoint-tooltip': {
                'en': 'Midpoint',
                'fi': 'Keskipiste'
            }
        });
        
        /** GeoToolIntersection *****/
        Localizer.addTerms({
            'Intersection-start': {
                'en': '<p>Click on the first curve.</p>',
                'fi': '<p>Klikkaa ensimmäistä käyrää</p>',
                'sv': '<p>Klicka på första kurvan</p>'
            },
            'Intersection-1': {
                'en': '<p>Click on the second curve.</p>',
                'fi': '<p>Klikkaa toista käyrää</p>',
                'sv': '<p>Klicka på andra kurvan</p>'
            },
            'Intersection-tooltip': {
                'en': 'Intersection points',
                'fi': 'Leikkauspisteet',
                'sv': 'Skärningspunkterna'
            }
        });

        /** GeoToolNormal *******/
        Localizer.addTerms({
            'Normal-start': {
                'en': '<p>Click on the drawing area to select the <strong>curve</strong> you want to draw a normal for.</p>',
                'fi': '<p>Valitse piirtoaluetta klikkaamalla <strong>käyrä</strong>, jolle haluat piirtää normaalin.</p>',
                'sv': '<p>Klicka på <strong>kurvan</strong> på ritområdet för att rita en normal till kurvan.</p>',
            },
            'Normal-1': {
                'en': '<p>Click on the drawing area to select or to add the <strong>point</strong> the normal will go through.</p>',
                'fi': '<p>Valitse tai lisää piirtoaluetta klikkaamalla <strong>piste</strong>, jonka kautta normaali kulkee.</p>',
                'sv': '<p>Klicka på ritområdet för att välja eller lägga till den <strong>punkt</strong> som normalen går genom.</p>'
            },
            'Normal-error-0': {
                'en': '<p>You missed the curve. Click on the drawing area to select the <strong>curve</strong> you want to draw a normal for.</p>',
                'fi': '<p>Et osunut käyrään. Valitse piirtoaluetta klikkaamalla <strong>käyrä</strong>, jolle haluat piirtää normaalin.</p>',
                'sv': '<p>Du träffade inte kurvan. Välj den <strong>kurva</strong> du vill rita en normal till genom att klicka på ritområdet.</p>'
            },
            'Normal-tooltip': {
                'en': 'Normal',
                'fi': 'Normaali',
                'sv': 'Normal',
            }
        });
        
        /** GeoToolParallel *****/
        Localizer.addTerms({
            'Parallel-start': {
                'en': '<p>Click on the drawing area to select the <strong>line or segment</strong> with which you want to draw a parallel line.</p>',
                'fi': '<p>Valitse piirtoaluetta klikkaamalla <strong>suora tai jana</strong>, jonka kanssa yhdensuuntaisen suoran haluat piirtää.</p>'
            },
            'Parallel-1': {
                'en': '<p>Click on the drawing area to select or to add the <strong>point</strong> the parallel line will go through.</p>',
                'fi': '<p>Valitse tai lisää piirtoaluetta klikkaamalla <strong>piste</strong>, jonka kautta yhdensuuntainen suora kulkee.</p>'
            },
            'Parallel-error-0': {
                'en': '<p>You missed the line. Click on the drawing area to select the <strong>line or segment</strong> with which you want to draw a parallel line.</p>',
                'fi': '<p>Et osunut käyrään. Valitse piirtoaluetta klikkaamalla <strong>suora tai jana</strong>, jonka kanssa yhdensuuntaisen suoran haluat piirtää.</p>'
            },
            'Parallel-tooltip': {
                'en': 'Parallel line',
                'fi': 'Yhdensuuntainen suora'
            }
        });
        
        /** GeoToolTangent ********/
        Localizer.addTerms({
            'Tangent-start': {
                'en': '<p>Click on the drawing area to select the <strong>curve</strong> you want to draw a tangent(s) for.</p>',
                'fi': '<p>Valitse piirtoaluetta klikkaamalla <strong>käyrä</strong>, jolle haluat piirtää tangentin.</p>'
            },
            'Tangent-1': {
                'en': '<p>Click on the drawing area to select or to add the <strong>point</strong> the tangent will go through.</p>',
                'fi': '<p>Valitse tai lisää piirtoaluetta klikkaamalla <strong>piste</strong>, jonka kautta tangentti kulkee.</p>'
            },
            'Tangent-error-0': {
                'en': '<p>You missed the curve. Click on the drawing area to select the <strong>curve</strong> you want to draw a tangent(s) for.</p>',
                'fi': '<p>Et osunut käyrään. Valitse piirtoaluetta klikkaamalla <strong>käyrä</strong>, jolle haluat piirtää tangentin.</p>'
            },
            'Tangent-tooltip': {
                'en': 'Normal',
                'fi': 'Normaali'
            }
        });

        /** GeoToolRectangle *********/
        Localizer.addTerms({
            'Rectangle-start': {
                'en': '<p>Click on the drawing area to select or to add the <strong>first point</strong> of the rectangle.</p>',
                'fi': '<p>Valitse tai lisää <strong>suorakaiteen ensimmäinen piste</strong> klikkaamalla piirtoaluetta.</p>',
                'sv': '<p>Klicka på ritområdet för att välja eller lägga till den <strong>första punkten</strong> av rektangeln.</p>',
            },
            'Rectangle-1': {
                'en': '<p>Click on the drawing area to select or to add the <strong>second point</strong> of the rectangle.</p>',
                'fi': '<p>Valitse tai lisää <strong>suorakaiteen toinen piste</strong> klikkaamalla piirtoaluetta.</p>',
                'sv': '<p>Klicka på ritområdet för att välja eller lägga till den <strong>andra punkten</strong> av rektangeln.</p>',
            },
            'Rectangle-2': {
                'en': '<p>Click on the drawing area to select or to add the <strong>third cornerpoint</strong> of the rectangle.</p>',
                'fi': '<p>Valitse tai lisää suorakaiteen <strong>kolmas</strong> kulmapiste klikkaamalla piirtoaluetta.</p>',
                'sv': '<p>Klicka på ritområdet för att välja eller lägga till den <strong>tredje hörnpunkten</strong> av rektangeln.</p>',
            },
            'Rectangle-maintooltip': {
                'en': 'Rectangle',
                'fi': 'Suorakaide',
                'sv': 'Rektangel'
            },
            'Rectangle-tooltip': {
                'en': 'Rectangle',
                'fi': 'Suorakaide',
                'sv': 'Rektangel'
            }
        });

        /** GeoToolRtriangle **********/
        Localizer.addTerms({
            'Rtriangle-start': {
                'en': '<p>Click on the drawing area to select or to add the <strong>first point</strong> of the right triangle.</p>',
                'fi': '<p>Valitse tai lisää <strong>suorakulmaisen kolmion ensimmäinen piste</strong> klikkaamalla piirtoaluetta.</p>'
            },
            'Rtriangle-1': {
                'en': '<p>Click on the drawing area to select or to add the <strong>point in the right angle corner</strong> of the right triangle.</p>',
                'fi': '<p>Valitse tai lisää suorakulmaisen kolmion <strong>suorakulmaisen kulman piste</strong> klikkaamalla piirtoaluetta.</p>'
            },
            'Rtriangle-2': {
                'en': '<p>Click on the drawing area to select or to add the <strong>third cornerpoint</strong> of the right triangle.</p>',
                'fi': '<p>Valitse tai lisää suorakulmaisen kolmion <strong>kolmas kulmapiste</strong> klikkaamalla piirtoaluetta.</p>'
            },
            'Rtriangle-maintooltip': {
                'en': 'Right triangle',
                'fi': 'Suorakulmainen kolmio'
            },
            'Rtriangle-tooltip': {
                'en': 'Right triangle - catheti first',
                'fi': 'Suorakulmainen kolmio - kateetti ensin'
            }
        });
        
        /** GeoToolAngle *********/
        Localizer.addTerms({
            'Angle-start': {
                'en': '<p>Click on the drawing area to select or to add the point on the <strong>right hand side</strong> of the angle.</p>',
                'fi': '<p>Valitse tai lisää kulman <strong>oikean sivun</strong> piste.</p>',
                'sv': '<p>Klicka på ritområdet för att välja eller lägga till punkten på den <strong>högra sidan</strong> av vinkeln.</p>'
            },
            'Angle-1': {
                'en': '<p>Click on the drawing area to select or to add the <strong>corner point</strong> of the angle.</p>',
                'fi': '<p>Valitse tai lisää kulman <strong>kärkipiste</strong>.</p>',
                'sv': '<p>Klicka på ritområdet för att välja eller lägga till vinkelns <strong>spetspunkt</strong> </p>'
            },
            'Angle-2': {
                'en': '<p>Click on the drawing area to select or to add the point on the <strong>left hand side</strong> of the angle.</p>',
                'fi': '<p>Valitse tai lisää kolmion <strong>vasemman sivun</strong> piste.</p>',
                'sv': '<p>Klicka på ritområdet för att välja eller lägga till punkten på den <strong>vänstra sidan</strong> av vinkeln.</p>'
            },
            'Angle-maintooltip': {
                'en': 'Angles',
                'fi': 'Kulmat',
                'sv': 'Vinklar'
            },
            'Angle-tooltip': {
                'en': 'Angle',
                'fi': 'Kulma',
                'sv': 'Vinkel'
            }
        });
        
        /** GeoToolBisector *********/
        Localizer.addTerms({
            'Bisector-start': {
                'en': '<p>Click on the drawing area to select or to add the point on the <strong>right hand side</strong> of the angle.</p>',
                'fi': '<p>Valitse tai lisää kulman <strong>oikean kyljen</strong> piste.</p>'
            },
            'Bisector-1': {
                'en': '<p>Click on the drawing area to select or to add the <strong>corner point</strong> of the angle.</p>',
                'fi': '<p>Valitse tai lisää kulman <strong>kärkipiste</strong>.</p>'
            },
            'Bisector-2': {
                'en': '<p>Click on the drawing area to select or to add the point on the <strong>left hand side</strong> of the angle.</p>',
                'fi': '<p>Valitse tai lisää kulman <strong>vasemman kyljen</strong> piste.</p>'
            },
            'Bisector-maintooltip': {
                'en': 'Bisector',
                'fi': 'Kulmanpuolittaja'
            },
            'Bisector-tooltip': {
                'en': 'Bisector',
                'fi': 'Kulmanpuolittaja'
            }
        });
        
        /** GeoToolParallelogram *********/
        Localizer.addTerms({
            'Parallelogram-start': {
                'en': '<p>Click on the drawing area to select or to add the <strong>first cornerpoint</strong> of parallelogram.</p>',
                'fi': '<p>Valitse tai lisää suunnikkaan <strong>ensimmäinen kulmapiste</strong> klikkaamalla piirtoaluetta.</p>'
            },
            'Parallelogram-1': {
                'en': '<p>Click on the drawing area to select or to add the <strong>second cornerpoint</strong> of parallelogram.</p>',
                'fi': '<p>Valitse tai lisää suunnikkaan <strong>toinen kulmapiste</strong> klikkaamalla piirtoaluetta.</p>'
            },
            'Parallelogram-2': {
                'en': '<p>Click on the drawing area to select or to add the <strong>third</strong> cornerpoint of parallelogram.</p>',
                'fi': '<p>Valitse tai lisää suunnikkaan <strong>kolmas</strong> kulmapiste klikkaamalla piirtoaluetta.</p>'
            },
            'Parallelogram-maintooltip': {
                'en': 'Parallelogram',
                'fi': 'Suunnikas'
            },
            'Parallelogram-tooltip': {
                'en': 'Parallelogram',
                'fi': 'Suunnikas'
            }
        });
        
        /** GeoToolLabel ******/
        Localizer.addTerms({
            'Label-start': {
                'en': '<p>Click on the drawing area to add a label.</p>',
                'fi': '<p>Lisää teksti klikkaamalla piirtoaluetta.</p>'
            },
            'Label-maintooltip': {
                'en': 'Text label',
                'fi': 'Teksti',
                'sv': 'Text'
            },
            'Label-tooltip': {
                'en': 'Text label',
                'fi': 'Teksti',
                'sv': 'Text'
            }
        });
        
    }
    
    
    { /*** GeoScene ***************************************************************/
        /**
         * Constructor for geometric scene.
         */
        var GeoScene = function(params) {
            params = $.extend( {
                'objects'     : [],
                'boundingBox' : [-10, 5, 10, -5],
                'description' : '',
                'name'	      : '',
                'showGrid'    : false,
                'showAxis'    : false,
                'isStatic'    : false,
                'allowControls' : true,
                'decimalperiod': this.decimalperiod || false,
                'geoid': null
            }, params);

            this.type = 'Scene';
            this.geoid = params.geoid;
            this.lang = params.lang;
            this.decimalperiod = params.decimalperiod;
            this.objects = [];
            this.objectsById = {};
            for (var i = 0; i < params.objects.length; i++) {
                this.add(this.dataToObject(params.objects[i]));
            }
            
            this.name = params.name;
            this.boundingBox = params.boundingBox;
            this.description = params.description;
            this.showGrid = params.showGrid;
            this.showAxis = params.showAxis;
            this.isStatic = params.isStatic;
            this.allowControls = params.allowControls;
        }
        
        /**
         * Icon for GeoScene
         */
        GeoScene.prototype.icon = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="20" height="20" viewbox="0 0 20 20" class="geoedit-icon geoedit-scene"><rect x="2" y="2" width="16" height="16" style="stroke: black; fill: none;" /><line x1="2" y1="6" x2="18" y2="6" style="stroke: black;" /><line x1="2" y1="10" x2="18" y2="10" style="stroke: black;" /><line x1="2" y1="14" x2="18" y2="14" style="stroke: black;" /><line x1="6" y1="2" x2="6" y2="18" style="stroke: black;" /><line x1="10" y1="2" x2="10" y2="18" style="stroke: black;" /><line x1="14" y1="2" x2="14" y2="18" style="stroke: black;" /></svg>';
        
        /**
         * Get list of objects.
         */
        GeoScene.prototype.getListStr = function(){
            var str = '<div class="gedit-listicon" title="'+this.type+'">' + this.icon + '</div><div class="gedit-listname">' + this.name + '</div>';
            return str;
        }
        
        /**
         * Get list of objects.
         */
        GeoScene.prototype.getObjectlist = function(){
            var objlist = [];
            for (var i = 0; i < this.objects.length; i++) {
                var currObj = this.objects[i];
                objlist.push(currObj.getListData());
            }
            return objlist;
        }
        
        /**
         * Return true, if the scene has an object with this id.
         */
        GeoScene.prototype.hasObject = function(geoid){
            return (typeof(this.objectsById[geoid]) !== 'undefined');
        }
        
        /**
         * Get data of GeoScene
         */
        GeoScene.prototype.getData = function(){
            var data = {
                type: this.type,
                name: this.name,
                geoid: this.geoid,
                objects: [],
                boundingBox: this.boundingBox.slice(), // Copy, not original!
                description: this.description,
                showGrid: this.showGrid,
                showAxis: this.showAxis,
                isStatic: this.isStatic,
                allowControls: this.allowControls
            };
            for (var i = 0; i < this.objects.length; i++) {
                data.objects.push(this.objects[i].getData());
            }
            return data;
        }
        
        /**
         * Return name of object with given geoid.
         */
        GeoScene.prototype.getObjName = function(geoid){
            return this.objectsById[geoid] && this.objectsById[geoid].nameStr() || '';
        }
        
        /**
         * Get recoursively all objects depending on object in given array.
         */
        GeoScene.prototype.getDependents = function(geoids){
            var dependents = [];
            for (var i = 0; i < geoids.length; i++) {
                var deplist = this.getDependentObjs(geoids[i]);
                for (var j = 0; j < deplist.length; j++) {
                    if (dependents.indexOf(deplist[j]) === -1) {
                        dependents.push(deplist[j]);
                    }
                }
            }
            return dependents;
        }
        
        /**
         * Get recoursively all objects depending on object with given geoid.
         */
        GeoScene.prototype.getDependentObjs = function(geoid){
            var dependents = [];
            for (var i = 0; i < this.objects.length; i++) {
                var gid = this.objects[i].getId();
                var deps = this.objects[i].getDeps();
                var index = deps.indexOf(geoid);
                if (index !== -1 && dependents.indexOf(gid) === -1) {
                    dependents.push(gid);
                }
            }
            for (var i = 0; i < dependents.length; i++) {
                var subdeps = this.getDependentObjs(dependents[i]);
                for (var j = 0; j < subdeps.length; j++) {
                    if (dependents.indexOf(subdeps[j]) === -1) {
                        dependents.push(subdeps[j]);
                    }
                }
            }
            return dependents;
        }
        
        /**
         * Update given objects from board.
         */
        GeoScene.prototype.updateFromBoard = function(geoids){
            if (geoids.length > 0) {
                for (var i = 0; i < geoids.length; i++) {
                    this.objectsById[geoids[i]] && this.objectsById[geoids[i]].updateFromBoard(this.board);
                }
            } else {
                for (var i = 0, len = this.objects.length; i < len; i++) {
                    this.objects[i].updateFromBoard(this.board);
                }
            }
        }
        
        /**
         * Get data of given object.
         */
        GeoScene.prototype.getObjData = function(objId){
            var result;
            var parts = objId.split('-');
            var geoid = parts[0];
            var subid = parts[1];
            if (this.objectsById[geoid]) {
                result = this.objectsById[geoid].getData(subid);
            } else {
                result = null;
            }
            return result;
        }
        
        /**
         * Set data of given object.
         */
        GeoScene.prototype.setObjData = function(objId, data){
            if (objId === 'scene') {
                this.name = (typeof data.name !== 'undefined' ? data.name : this.name);
                this.description = (typeof data.description !== 'undefined' ? data.description : this.description);
                this.showGrid = (typeof(data.showGrid) !== 'undefined' ? data.showGrid : this.showGrid);
                this.showAxis = (typeof(data.showAxis) !== 'undefined' ? data.showAxis : this.showAxis);
                this.isStatic = (typeof(data.isStatic) !== 'undefined' ? data.isStatic : this.isStatic);
                this.allowControls = (typeof(data.allowControls) !== 'undefined' ? data.allowControls : this.allowControls);
                this.boundingBox[0] = (typeof(data.boundingBox0) !== 'undefined' ? this.strToNum(data.boundingBox0) : this.boundingBox[0]);
                this.boundingBox[1] = (typeof(data.boundingBox1) !== 'undefined' ? this.strToNum(data.boundingBox1) : this.boundingBox[1]);
                this.boundingBox[2] = (typeof(data.boundingBox2) !== 'undefined' ? this.strToNum(data.boundingBox2) : this.boundingBox[2]);
                this.boundingBox[3] = (typeof(data.boundingBox3) !== 'undefined' ? this.strToNum(data.boundingBox3) : this.boundingBox[3]);
            } else {
                this.objectsById[objId].setData(data);
            }
        }
        
        /**
         * Move the bounding box of scene.
         */
        GeoScene.prototype.move = function(direction){
            var width = this.boundingBox[2] - this.boundingBox[0];
            var height = this.boundingBox[1] - this.boundingBox[3];
            var dx = width / 8;
            var dy = height /8;
            switch (direction) {
                case 'up':
                    this.boundingBox[1] += dy;
                    this.boundingBox[3] += dy;
                    break;
                case 'down':
                    this.boundingBox[1] -= dy;
                    this.boundingBox[3] -= dy;
                    break;
                case 'left':
                    this.boundingBox[0] -= dx;
                    this.boundingBox[2] -= dx;
                    break;
                case 'right':
                    this.boundingBox[0] += dx;
                    this.boundingBox[2] += dx;
                    break;
                default:
                    break;
            }
        }

        /**
         * Zoom the bounding box of scene.
         */
        GeoScene.prototype.zoom = function(direction){
            var width = this.boundingBox[2] - this.boundingBox[0];
            var height = this.boundingBox[1] - this.boundingBox[3];
            switch (direction) {
                case 'out':
                    var dx = width / 8;
                    var dy = height /8;
                    this.boundingBox[0] -= dx;
                    this.boundingBox[1] += dy;
                    this.boundingBox[2] += dx;
                    this.boundingBox[3] -= dy;
                    break;
                case 'in':
                    var dx = width / 10;
                    var dy = height /10;
                    this.boundingBox[0] += dx;
                    this.boundingBox[1] -= dy;
                    this.boundingBox[2] -= dx;
                    this.boundingBox[3] += dy;
                    break;
                default:
                    break;
            }
        }

        /**
         * Get aspect ratio of the bounding box.
         */
        GeoScene.prototype.getAspectRatio = function(){
            return (this.boundingBox[2] - this.boundingBox[0]) / (this.boundingBox[1] - this.boundingBox[3]);
        }

        /**
         * Get caption text.
         */
        GeoScene.prototype.getCaption = function(){
            return this.description;
        }

        /**
         * Get dialog object from GeoScene
         */
        GeoScene.prototype.getDialog = function(objid){
            var dialog = {};
            if (objid === 'scene') {
                dialog.basic = [
                    {
                        type: 'Text',
                        label: 'Name',
                        key: 'name',
                        value: this.name
                    },
                    {
                        type: 'Textbox',
                        label: 'Description',
                        key: 'description',
                        value: this.description
                    }
                ];
                dialog.advanced = [
                    {
                        type: 'Checkbox',
                        label: 'Show grid',
                        key: 'showGrid',
                        value: this.showGrid
                    },
                    {
                        type: 'Checkbox',
                        label: 'Show axis',
                        key: 'showAxis',
                        value: this.showAxis
                    },
                    {
                        type: 'Checkbox',
                        label: 'Static',
                        key: 'isStatic',
                        value: this.isStatic
                    },
                    {
                        type: 'Checkbox',
                        label: 'Allow controls',
                        key: 'allowControls',
                        value: this.allowControls
                    },
                    {
                        type: 'Boxarea',
                        label: 'Bounding box',
                        key: ['boundingBox1', 'boundingBox0', 'boundingBox2', 'boundingBox3'],
                        value: [
                            this.numToStr(this.boundingBox[1]),
                            this.numToStr(this.boundingBox[0]),
                            this.numToStr(this.boundingBox[2]),
                            this.numToStr(this.boundingBox[3])
                        ]
                    }
                ];
            } else if (typeof objid !== 'undefined'){
                dialog = this.objects[objid].getOptionsDialog();
            }
            return dialog;
        }
        
        /**
         * Get the list of all objects of given type (ids).
         **/
        GeoScene.prototype.getOfType = function(otype){
            var list = [];
            for (var i = 0; i < this.objects.length; i++) {
                var obj = this.objects[i];
                var typeobjs = obj.getOfType(otype);
                list = list.concat(typeobjs);
            }
            return list;
        }
        
        /**
         * Get the list of all points (ids).
         **/
        GeoScene.prototype.getPoints = function(){
            return this.getOfType('Point');
        }

        /**
         * Get the list of all point like objects (ids). (Points, Gliders,...)
         **/
        GeoScene.prototype.getPointlikes = function(){
            var pointtypes = ['Point', 'Glider', 'Intersection', 'Midpoint'];
            var pointlist = [];
            for (var i = 0; i < pointtypes.length; i++) {
                pointlist = pointlist.concat(this.getOfType(pointtypes[i]));
            }
            pointlist.sort(function(a,b){return (a.name < b.name ? -1 : 1);});
            return pointlist;
        }
        
        /**
         * Get the list of all curves (ids). (Lines, Circles,...)
         **/
        GeoScene.prototype.getCurves = function(){
            var curvetypes = ['Line', 'Circle', 'Linelike','Triangle','Bisector'];
            var curvelist = [];
            for (var i = 0; i < curvetypes.length; i++) {
                curvelist = curvelist.concat(this.getOfType(curvetypes[i]));
            }
            return curvelist;
        }
        
        /**
         * Create and add new object from data.
         */
        GeoScene.prototype.addObject = function(data){
            return this.add(this.dataToObject(data));
        }
        
        /**
         * Convert data to a GeoObject
         */
        GeoScene.prototype.dataToObject = function(params){
            var newelement;
            params.decimalperiod = this.decimalperiod;
            switch (params.type){
                case 'Label':
                    newelement = new GeoLabel(params, this);
                    break;
                case 'Point':
                    newelement = new GeoPoint(params, this);
                    break;
                case 'Line':
                    newelement = new GeoLine(params, this);
                    break;
                case 'Circle':
                    newelement = new GeoCircle(params, this);
                    break;
                case 'Rcircle':
                    newelement = new GeoRcircle(params, this);
                    break;
                case 'Glider':
                    newelement = new GeoGlider(params, this);
                    break;
                case 'Midpoint':
                    newelement = new GeoMidpoint(params, this);
                    break;
                case 'Intersection':
                    newelement = new GeoIntersection(params, this);
                    break;
                case 'Triangle':
                    newelement = new GeoTriangle(params, this);
                    break;
                case 'Righttriangle':
                    newelement = new GeoRighttriangle(params, this);
                    break;
                case 'Rtriangle':
                    newelement = new GeoRtriangle(params, this);
                    break;
                case 'Angle':
                    newelement = new GeoAngle(params, this);
                    break;
                case 'Bisector':
                    newelement = new GeoBisector(params, this);
                    break;
                case 'Normal':
                    newelement = new GeoNormal(params, this);
                    break;
                case 'Parallel':
                    newelement = new GeoParallel(params, this);
                    break;
                case 'Tangent':
                    newelement = new GeoTangent(params, this);
                    break;
                case 'Rectangle':
                    newelement = new GeoRectangle(params, this);
                    break;
                case 'Parallelogram':
                    newelement = new GeoParallelogram(params, this);
                    break;
                default:
                    newelement = false;
            }
            return newelement;
        }
        
        /**
         * Add given GeoObject to scene.
         */
        GeoScene.prototype.add = function(data){
            if (data && !this.objectsById[data.geoid]) {
                this.objects.push(data);
                this.objectsById[data.geoid] = data;
            } else {
                alert('ei ollu: '+data.geoid);
            }
            return data.geoid;
        }
        
        /**
         * Remove GeoObject from scene.
         */
        GeoScene.prototype.removeObject = function(objectId){
            var geoid = this.objects[objectId].getId();
            this.objects.splice(objectId, 1);
            delete this.objectsById[geoid];
        }
        
        /**
         * Toggle visibility of GeoObject.
         */
        GeoScene.prototype.toggleVisible = function(objectId){
            this.objects[objectId].toggleVisible();
        }
        
        /**
         * Deselect object with given id.
         */
        GeoScene.prototype.deselectObject = function(geoid){
            if (geoid && geoid !== 'scene' && this.objectsById[geoid]) {
                this.objectsById[geoid].deselect(this.board);
            }
        }
        
        /**
         * Select object with given id.
         */
        GeoScene.prototype.selectObject = function(geoid){
            if (geoid && geoid !== 'scene' && this.objectsById[geoid]) {
                this.objectsById[geoid].select(this.board);
            }
        }
        
        /**
         * Draw the scene to the html-element with given id.
         */
        GeoScene.prototype.draw = function(viewid, readonly){
            var scene = this;
            this.board = JXG.JSXGraph.initBoard(
                viewid,
                {
                    boundingbox: this.boundingBox,
                    keepaspectratio:true,
                    grid: this.showGrid,
                    axis: this.showAxis,
                    showCopyright: false,
                    showNavigation: false,
                    zoom: false/*sceneArr[sceneNum].allowControls && (!sceneArr[sceneNum].isStatic)*/,
                    pan: (this.allowControls && (!this.isStatic))
                }
            );
            var getMouseCoords = function(event) {
                var cPos = scene.board.getCoordsTopLeftCorner(event),
                    absPos = JXG.getPosition(event),
                    dx = absPos[0]-cPos[0],
                    dy = absPos[1]-cPos[1];
                return new JXG.Coords(JXG.COORDS_BY_SCREEN, [dx, dy], scene.board);
            }
            var down = function(e) {
                var coords = getMouseCoords(e);
                var data = {xcoord: coords.usrCoords[1], ycoord: coords.usrCoords[2], board: scene.board};
                $(scene.board.containerObj).trigger('clickonboard', [data]);
            }
            var mousecursor = scene.board.create('Point', [1,0,0], {visible: false, name: 'gedithiddenmousecursor', face: 'x'});
            var cursorMove = function(e){
                var coords = getMouseCoords(e);
                mousecursor.moveTo([coords.usrCoords[1], coords.usrCoords[2]], 0);
            }
            this.board.on('mousemove', cursorMove);
            this.board.on('down', down);
            if (readonly && this.isStatic){
                this.board.removeEventHandlers();
            }
            this.construction = this.board.construct('');
            var objlist = this.objects.slice(0).reverse();
            var len = objlist.length + 1;
            while (len > objlist.length){
                len = objlist.length;
                for (var i = len -1; i > -1; i--) {
                    if (objlist[i].drawable(this.board)) {
                        objlist[i].asConstruct(this.board, this.construction);
                        objlist.splice(i, 1);
                    } else {
                    }
                }
            }
            var errors = [];
            for (var i = 0; i < objlist.length; i++) {
                errors.push(objlist[i].getId());
            }
            return errors;
        }

        /**
         * Convert number to text. (Localize decimal period etc.)
         */
        GeoScene.prototype.numToStr = function(num){
            var str = ''+num;
            if (this.decimalperiod) {
                str = str.replace(/\./g, ',');
            }
            return str;
        }
        
        /**
         * Convert text to number. (With localization (decimal period etc.))
         */
        GeoScene.prototype.strToNum = function(str){
            var num = str;
            if (typeof str === 'string') {
                num = parseFloat(str.replace(/,/g, '.'));
            }
            return num;
        }
        
        /**
         * Send updateinfo-event with message.
         **/
        GeoScene.prototype.sendInfo = function(message){
            $(this.board.containerObj).trigger('updateinfo', [message]);
        }
        
        /**
         * Show caption
         ***/
        GeoScene.prototype.showCaption = function(){
            var message = this.getCaption();
            message = '<p>' + message.split('\n').join('</p><p>') + '</p>';
            this.sendInfo(message);
        }
    } // End GeoScene
    
    { /*** GeoData ****************************************************************/
        { // GeoObject
            /**
             * GeoObject - a virtual class that can be inherited.
             */
            var GeoObject = function(params, geoparent){
                this.type = 'GeoObject';
                this.decimalperiod = false;
            }
            
            /**
             * Get list string (to be shown in the object list)
             **/
            GeoObject.prototype.getListStr = function(){
                var str = '<div class="gedit-listicon" title="'+this.type+'">' + this.icon + '</div><div class="gedit-listname">' + this.getNameFormatted() + '</div>';
                return str;
            }
            
            /**
             * Get list data (to be shown in the object list)
             **/
            GeoObject.prototype.getListData = function(){
                var data = {
                    str: this.getListStr(),
                    geoid: this.getId(),
                    visible: this.visible
                }
                return data;
            }
            
            /**
             * Get objects data
             **/
            GeoObject.prototype.getData = function(){
                var data = {
                    type: this.type,
                    name: this.name,
                    geoid: this.geoid
                }
                return data;
            }
            
            /**
             * Get objects id.
             **/
            GeoObject.prototype.getId = function(){
                return this.geoid;
            }
            
            /**
             * Get objects name.
             **/
            GeoObject.prototype.getName = function(){
                return this.name;
            }
            
            /**
             * Get the list of dependencies.
             **/
            GeoObject.prototype.getDeps = function(){
                return [];
            }
            
            /**
             * Get the name of object with given geoid.
             **/
            GeoObject.prototype.getObjName = function(geoid){
                return this.geoparent.getObjName(geoid);
            }
            
            /**
             * Get list of elements of given type.
             **/
            GeoObject.prototype.getOfType = function(otype){
                return [];
            }
            
            /**
             * Toggle visibility of this GeoObject.
             **/
            GeoObject.prototype.toggleVisible = function(){
                this.visible = !this.visible;
            }
            
            /**
             * Update data of the object from the board.
             **/
            GeoObject.prototype.updateFromBoard = function(board){
                // By default do nothing.
            }
            
            /**
             * Find requested point from construction by the name.
             **/
            GeoObject.prototype.findPointByName = function(name_Str, construction){
                var j = -1;
                do ++j; while ((j < construction.points.length) && (name_Str !== construction.points[j].name));
                
                var p1 = null;
                if (j < construction.points.length) {
                    p1 = construction.points[j];
                }
                else {
                    j = -1;
                    do ++j; while ( (j < construction.intersections.length) && (name_Str != construction.intersections[j].name) );
                    if (j < construction.intersections.length) p1 = construction.intersections[j];
                }
                return p1;
            }

            /**
             * Get the formatted name of the GeoObject.
             */
            GeoObject.prototype.getNameFormatted = function() {
                var str = this.nameStr();
                str = str.replace(/_\{([^\}]+)\}/g, '<sub>$1</sub>').replace(/_([^{}])/g, '<sub>$1</sub>');
                return str;
            }

            /**
             * Get the nameStr of the GeoObject.
             */
            GeoObject.prototype.nameStr = function() {
                var result = this.name;
                for (var property in this) {
                    result = result.replace(new RegExp('%' + property + '%', 'g'), this[property]);
                }
                return result;
            }

            /**
             * Select this object.
             **/
            GeoObject.prototype.select = function(board){
                if (board.objects[this.geoid]) {
                    board.objects[this.geoid].setProperty({shadow: true});
                }
            }
            
            /**
             * Deselect this object.
             **/
            GeoObject.prototype.deselect = function(board){
                if (board.objects[this.geoid]) {
                    board.objects[this.geoid].setProperty({shadow: false});
                }
            }
            
            /**
             * Convert a GeoObject to JessieScript.
             */
            GeoObject.prototype.asJessieScript = function() { /* Not used. */ return ""; }
            
            /**
             * Tell, if the GeoObject is drawable.
             */
            GeoObject.prototype.drawable = function(board){
                return true;
            }
            
            /**
             * Convert number to text. (Localize decimal period etc.)
             */
            GeoObject.prototype.numToStr = function(num){
                var str = ''+num;
                if (this.decimalperiod) {
                    str = str.replace(/\./g, ',');
                }
                return str;
            }
            
            /**
             * Convert text to number. (With localization (decimal period etc.))
             */
            GeoObject.prototype.strToNum = function(str){
                var num = str;
                if (typeof str === 'string') {
                    num = parseFloat(str.replace(/,/g, '.')) || 0;
                }
                num = Math.round(num * 100) / 100;
                return num;
            }
            
            GeoObject.prototype.dashTypes = [
                "–––––––––",
                "..................",
                "-------------",
                "- - - - - - - -",
                "– – – – – –",
                "-&nbsp;&nbsp;–&nbsp;&nbsp;-&nbsp;&nbsp;–&nbsp;&nbsp;-",
                "- – - – - – -"
            ];
        } // End GeoObject
        
        { // GeoPoint
            /**
             * Constructor for geometric point object.
             */ 
            var GeoPoint = function(params, geoparent) {
                this.type = 'Point';
                this.geoid = params.geoid;
                this.geoparent = geoparent;
                this.setData(params);
            }
            
            /**
             * Inherit the prototype of GeoObject.
             */
            GeoPoint.prototype = new GeoObject();


            /**
             * Set data from given object.
             */
            GeoPoint.prototype.setData = function(params){
                params = $.extend( {
                    'x' : (typeof(this.x) !== 'undefined' ? this.x : null),
                    'y' : (typeof(this.y) !== 'undefined' ? this.y : null),
                    'name' : (typeof(this.name) !== 'undefined' ? this.name : null),
                    'showName' : (typeof this.showName !== 'undefined' ? this.showName : true),
                    'visible' : (typeof this.visible !== 'undefined' ? this.visible : true),
                    'fixed' : this.fixed || false,
                    'size' : (typeof this.size !== 'undefined' ? this.size : 3),
                    'color' : this.color || '#ff0000',
                    'snapToGrid' : this.snapToGrid || false,
                    'decimalperiod' : this.decimalperiod || false
                }, params);
                
                this.size = this.strToNum(params.size);
                this.x = this.strToNum(params.x);
                this.y = this.strToNum(params.y);
                this.name = params.name;
                this.showName = params.showName;
                this.visible = params.visible;
                this.fixed = params.fixed;
                this.color = params.color;
                this.snapToGrid = params.snapToGrid;
                this.decimalperiod = params.decimalperiod;
            }
            
            /**
             * Get data of GeoPoint
             **/
            GeoPoint.prototype.getData = function(){
                var data = {
                    type: this.type,
                    name: this.name,
                    geoid: this.geoid,
                    x: this.x,
                    y: this.y,
                    showName: this.showName,
                    visible: this.visible,
                    fixed: this.fixed,
                    size: this.size,
                    color: this.color,
                    snapToGrid: this.snapToGrid
                }
                return data;
            }
            
            /**
             * CSS style defining the icon representing this type.
             **/
            GeoPoint.prototype.iconCSS = 'pointBtn';
            
            GeoPoint.prototype.icon = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="20" height="20" viewbox="0 0 30 30" class="geoedit-icon geoedit-object-point"><circle style="stroke: none; fill: red;" cx="15" cy="15" r="5" /></svg>';
            
            /**
             * Draw the point on board in the construction.
             */
            GeoPoint.prototype.asConstruct = function(board, construction) {
                var geopoint = this;
                var obj = this;
                var p = board.create(
                    'point',
                    [this.x, this.y],
                    {
                        name : this.name,
                        id : this.geoid,
                        size : this.size,
                        withLabel : this.showName,
                        visible : this.visible,
                        fixed : this.fixed,
                        strokeColor: (!this.fixed ? this.color : '#000000'),
                        fillColor: (!this.fixed ? this.color : '#000000'),
                        snapToGrid: this.snapToGrid
                    }
                );
                if (!this.name) {
                    this.name = p.name;
                }
                //this.id = this.id || p.id;
                p.obj = obj;
                construction.points.push(p);
                construction[this.name] = p;
                if (this.showName){
                    p.label.content.setText(this.nameStr(construction));
                }
                p.on('up', function(event){
                    var point = this;
                    var updoptions = {name: geopoint.name, geoid: [geopoint.geoid]};
                    $(point.board.containerObj).trigger('objectupdate', [updoptions]);
                    var options = {
                        name: geopoint.name,
                        x: Math.round(point.X() * 100)/100,
                        y: Math.round(point.Y() * 100)/100,
                        element: geopoint
                    };
                    //$(point.board.containerObj).trigger('objectmoved', [options]);
                    $(point.board.containerObj).trigger('objectupdate', [options]);
                });
                p.on('down', function(event){
                    var point = this;
                    var options = {name: geopoint.name, geoid: geopoint.geoid, delay: true};
                    $(point.board.containerObj).trigger('objectselected', [options]);
                });
            }
            
            /**
             * Update data of the object from the board.
             **/
            GeoPoint.prototype.updateFromBoard = function(board){
                var point = board.objects[this.geoid];
                this.x = Math.round(point.X() * 100)/100;
                this.y = Math.round(point.Y() * 100)/100;
            }
            
            /**
             * Get list of elements of given type.
             **/
            GeoPoint.prototype.getOfType = function(otype){
                var list = [];
                if (otype === 'Point') {
                    list.push({id: this.geoid, name: this.name});
                }
                return list;
            }
            
            /**
             * Get the object for options dialog.
             */
            GeoPoint.prototype.getOptionsDialog = function() {
                var dialog = {
                    basic: [
                        {
                            type: 'Label',
                            label: 'Id',
                            key: '',
                            value: this.geoid
                        },
                        {
                            type: 'Text',
                            label: 'Label',
                            key: 'name',
                            value: this.name
                        },
                        {
                            type: 'Text',
                            label: 'x-coordinate',
                            key: 'x',
                            value: this.numToStr(this.x)
                        },
                        {
                            type: 'Text',
                            label: 'y-coordinate',
                            key: 'y',
                            value: this.numToStr(this.y)
                        },
                        {
                            type: 'Color',
                            label: 'Color',
                            key: 'color',
                            value: this.color
                        }
                    ],
                    advanced: [
                        {
                            type: 'Checkbox',
                            label: 'Visible',
                            key: 'visible',
                            value: this.visible
                        },
                        {
                            type: 'Checkbox',
                            label: 'Show label',
                            key: 'showName',
                            value: this.showName
                        },
                        {
                            type: 'Checkbox',
                            label: 'Fixed',
                            key: 'fixed',
                            value: this.fixed
                        },
                        {
                            type: 'Checkbox',
                            label: 'Snap to grid',
                            key: 'snapToGrid',
                            value: this.snapToGrid
                        },
                        {
                            type: 'Text',
                            label: 'Size',
                            key: 'size',
                            value: this.size
                        }
                    ]
                }
                return dialog;
            }
        } // End GeoPoint

        { // GeoLine
            /**
             * Constructor for geometric line object.
             */
            var GeoLine = function(params, geoparent) {
                this.type = 'Line';
                this.geoid = params.geoid;
                this.geoparent = geoparent;
                this.setData(params);
            }
            
            /**
             * Inherit the prototype of GeoObject.
             */
            GeoLine.prototype = new GeoObject();
            
            /**
             * Set data from given object.
             */
            GeoLine.prototype.setData = function(params){
                params = $.extend( {
                    'p1' : this.p1 || '',
                    'p2' : this.p2 || '',
                    'firstArrow' : this.firstArrow || false,
                    'lastArrow' : this.lastArrow || false,
                    'name' : (typeof(this.name) !== 'undefined' ? this.name : null),
                    'dash' : this.dash || 0,
                    'lineType' : this.lineType || 'lineSegment',
                    'showName' : (typeof(this.showName) !== 'undefined' ? this.showName : true),
                    'visible' : (typeof(this.visible) !== 'undefined' ? this.visible : true),
                    'color' : this.color || '#0000ff',
                    'strokeWidth' : (typeof(this.strokeWidth) !== 'undefined' ? this.strokeWidth : 2),
                    'labelOffset' : [10, 10]
                }, params);
                
                this.p1 = params.p1;
                this.p2 = params.p2;
                this.strokeWidth = this.strToNum(params.strokeWidth);
                this.firstArrow = params.firstArrow;
                this.lastArrow = params.lastArrow;
                this.name = params.name;
                this.dash = params.dash;
                this.lineType = params.lineType;
                this.showName = params.showName;
                this.visible = params.visible;
                this.color = params.color;
                this.labelOffset = params.labelOffset;
                this.lang = params.lang;
            }
            
            /**
             * Get data of GeoLine
             **/
            GeoLine.prototype.getData = function(){
                var data = {
                    type: this.type,
                    name: this.name,
                    geoid: this.geoid,
                    p1: this.p1,
                    p2: this.p2,
                    firstArrow: this.firstArrow,
                    lastArrow: this.lastArrow,
                    dash: this.dash,
                    lineType: this.lineType,
                    showName: this.showName,
                    visible: this.visible,
                    color: this.color,
                    strokeWidth: this.strokeWidth,
                    labelOffset: this.labelOffset
                }
                return data;
            }
            
            /**
             * Get the list of dependencies.
             **/
            GeoLine.prototype.getDeps = function(){
                return [this.p1, this.p2];
            }
            
            /**
             * Get list string (to be shown in the object list)
             **/
            GeoLine.prototype.getListStr = function(){
                var str = '<div class="gedit-listicon" title="'+this.type+'">' + this.icon + '</div><div class="gedit-listname"><i>' + this.getNameFormatted() + '</i><span class="geoedit-aka">=<i>l</i>(<i>'+this.getObjName(this.p1)+'</i>,<i>'+this.getObjName(this.p2)+'</i>)</span></div>';
                return str;
            }
            
            /**
             * CSS style defining the icon representing this type.
             **/
            GeoLine.prototype.iconCSS = 'lineBtn';
            
            GeoLine.prototype.icon = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="20" height="20" viewbox="0 0 20 20" class="geoedit-icon geoedit-object-line"><line style="stroke: blue;" x1="0" y1="4" x2="20" y2="17" /><circle style="stroke: none; fill: red;" cx="4.5" cy="7" r="2" /><circle style="stroke: none; fill: red;" cx="15" cy="14" r="2" /></svg>';

            /**
             * Draw the line on board in the construction.
             **/
            GeoLine.prototype.asConstruct = function(board, construction) {
                var geoline = this;
                var line = board.create(
                    'line',
                    [this.p1, this.p2],
                    {
                        // Options here.
                        visible : this.visible,
                        name : this.name,
                        id : this.geoid,
                        withLabel : false,
                        straightFirst : ((this.lineType === 'line') || (this.lineType === 'startingLine')),
                        straightLast : ((this.lineType === 'line') || (this.lineType === 'endingLine')),
                        firstArrow : this.firstArrow,
                        lastArrow : this.lastArrow,
                        dash : this.dash,
                        strokeWidth : this.strokeWidth,
                        color : this.color,
                        label : {
                            fixed : false
                        }
                    }
                );
                var labelPoint = board.create(
                    'point',
                    [
                        function (){ return ((line.point1.X() + line.point2.X()) / 2); },
                        function (){ return ((line.point1.Y() + line.point2.Y()) / 2); }
                    ],
                    {
                        // Options here.
                        visible : this.visible,
                        fixed : true,
                        name : 'labelOf' + this.name,
                        withLabel : this.showName,
                        isLabel : true,
                        size : -1,
                        label : {
                            offset : this.labelOffset,
                            fixed : false
                        }
                    }
                );
                
                //this.id = this.id || line.id;
                construction.points.push(labelPoint);
                construction['labelOf' + this.name] = labelPoint;
                construction.lines.push(line);
                
                if (typeof labelPoint.label.content !== 'undefined') {
                    labelPoint.label.content.setText(this.name);
                }
                
                line.on('up', function(event){
                    var line = this;
                    var updoptions = {name: geoline.name, geoid: [geoline.p1, geoline.p2]};
                    $(line.board.containerObj).trigger('objectupdate', [updoptions]);
                    //line.point1.triggerEventHandlers('up');
                    //line.point2.triggerEventHandlers('up');
                });
                line.on('down', function(event){
                    var line = this;
                    var options = {name: geoline.name, geoid: geoline.geoid};
                    $(line.board.containerObj).trigger('objectselected', [options]);
                });
            }
            
            /**
             * Get list of elements of given type.
             **/
            GeoLine.prototype.getOfType = function(otype){
                var list = [];
                switch (otype){
                    case 'Line':
                        list.push({id: this.geoid, name: this.name});
                        break;
                    default:
                        break;
                }
                return list;
            }
            
            /**
             * Get the html for options dialog.
             **/
            GeoLine.prototype.getOptionsDialog = function() {
                var pointlist = this.geoparent.getPointlikes();
                var dialog = {
                    basic: [
                        {
                            type: 'Label',
                            label: 'Id',
                            key: '',
                            value: this.geoid
                        },
                        {
                            type: 'Text',
                            label: 'Label',
                            key: 'name',
                            value: this.name
                        },
                        {
                            type: 'Select',
                            label: 'First point',
                            key: 'p1',
                            value: this.p1,
                            data: pointlist
                        },
                        {
                            type: 'Select',
                            label: 'Second point',
                            key: 'p2',
                            value: this.p2,
                            data: pointlist
                        },
                        {
                            type: 'Color',
                            label: 'Color',
                            key: 'color',
                            value: this.color
                        },
                        {
                            type: 'Select',
                            label: 'Line type',
                            key: 'lineType',
                            value: this.lineType,
                            data: [
                                {id: 'line', name: 'Line'},
                                {id: 'lineSegment', name: 'Line segment'},
                                {id: 'startingLine', name: 'Starting line segment'},
                                {id: 'endingLine', name: 'Ending line segment'}
                            ]
                        }
                    ],
                    advanced: [
                        {
                            type: 'Checkbox',
                            label: 'Arrow at start',
                            key: 'firstArrow',
                            value: this.firstArrow
                        },
                        {
                            type: 'Checkbox',
                            label: 'Arrow at end',
                            key: 'lastArrow',
                            value: this.lastArrow
                        },
                        {
                            type: 'Text',
                            label: 'Stroke width',
                            key: 'strokeWidth',
                            value: this.numToStr(this.strokeWidth)
                        },
                        {
                            type: 'Checkbox',
                            label: 'Visible',
                            key: 'visible',
                            value: this.visible
                        },
                        {
                            type: 'Checkbox',
                            label: 'Show label',
                            key: 'showName',
                            value: this.showName
                        }
                    ]
                }
                var dashDialog = {
                    type: 'Select',
                    label: 'Line style',
                    key: 'dash',
                    value: this.dash,
                    data: []
                }
                for (var i = 0; i < this.dashTypes.length; i++) {
                    dashDialog.data.push({id: i, name: this.dashTypes[i]});
                }
                dialog.advanced.push(dashDialog);
                return dialog;
            }
            
            /**
             * Tell, if Line is drawable.
             */
            GeoLine.prototype.drawable = function(board){
                return  !!board.objects[this.p1] && !!board.objects[this.p2];
            }
        } // End GeoLine

        { // GeoCircle
            /**
             * Constructor for geometric circle object.
             */
            var GeoCircle = function(params, geoparent) {
                this.type = 'Circle';
                this.geoid = params.geoid;
                this.geoparent = geoparent;
                this.setData(params);
            }
            
            /**
             * Inherit the prototype of GeoObject.
             */
            GeoCircle.prototype = new GeoObject();
            
            /**
             * Set data from given object.
             */
            GeoCircle.prototype.setData = function(params){
                params = $.extend( {
                    'p1' : this.p1 || '',
                    'p2' : this.p2 || '',
                    'name' : (typeof(this.name) !== 'undefined' ? this.name : null),
                    'dash' : this.dash || 0,
                    'showName' : (typeof(this.showName) !== 'undefined' ? this.showName : true),
                    'visible' : (typeof(this.visible) !== 'undefined' ? this.visible : true),
                    'strokeColor' : this.strokeColor || '#0000ff',
                    'fillColor': this.fillColor || 'none'
                }, params);
                
                this.p1 = params.p1;
                this.p2 = params.p2;
                this.name = params.name;
                this.dash = params.dash;
                this.showName = params.showName;
                this.visible = params.visible;
                this.strokeColor = params.strokeColor;
                this.fillColor = params.fillColor;
                
                // Fallback for the older versions.
                if (typeof params.color !== 'undefined'){
                    this.strokeColor = params.color;
                }
            }
            
            /**
             * Get data of GeoCircle
             **/
            GeoCircle.prototype.getData = function(){
                var data = {
                    type: this.type,
                    name: this.name,
                    geoid: this.geoid,
                    p1: this.p1,
                    p2: this.p2,
                    dash: this.dash,
                    showName: this.showName,
                    visible: this.visible,
                    strokeColor: this.strokeColor,
                    fillColor: this.fillColor,
                    radius: this.radius,
                    area: this.area,
                    circumference: this.circumference
                }
                return data;
            }
            
            /**
             * Get the list of dependencies.
             **/
            GeoCircle.prototype.getDeps = function(){
                return [this.p1, this.p2];
            }
            
            /**
             * Get list string (to be shown in the object list)
             **/
            GeoCircle.prototype.getListStr = function(){
                var str = '<div class="gedit-listicon" title="'+this.type+'">' + this.icon + '</div><div class="gedit-listname"><i>' + this.getNameFormatted() + '</i><span class="geoedit-aka">=<i>c</i>(<i>'+this.getObjName(this.p1)+'</i>; '+this.radius+')</span></div>';
                return str;
            }
            
            /**
             * CSS style defining the icon representing this type.
             **/
            GeoCircle.prototype.iconCSS = 'circleBtn';
            
            GeoCircle.prototype.icon = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="20" height="20" viewbox="0 0 20 20" class="geoedit-icon geoedit-object-circle"><circle style="stroke: blue; fill: none;" cx="10" cy="10" r="9" /><circle style="stroke: none; fill: red;" cx="10" cy="10" r="2" /><circle style="stroke: none; fill: red;" cx="17" cy="15" r="2" /></svg>';

            /**
             * Draw the circle on board in the construction.
             **/
            GeoCircle.prototype.asConstruct = function(board, construction) {
                var geocircle = this;
                var circle = board.create(
                    'circle',
                    [board.objects[this.p1], board.objects[this.p2]],
                    {
                        // Options here.
                        visible : this.visible,
                        name : this.name,
                        id : this.geoid,
                        withLabel : this.showName,
                        dash : this.dash,
                        strokeColor : this.strokeColor,
                        fillColor : this.fillColor,
                        highlightFillColor: this.fillColor,
                    }
                );
                
                //this.id = this.id || circle.id;
                construction.circles.push(circle);
                
                this.radius = Math.round(circle.midpoint.Dist(circle.point2) * 10) /10;
                
                circle.on('up', function(event){
                    var circle = this;
                    var updoptions = {name: geocircle.name, geoid: [geocircle.p1, geocircle.p2]};
                    $(circle.board.containerObj).trigger('objectupdate', [updoptions]);
                });
                circle.on('down', function(event){
                    var circle = this;
                    var options = {name: geocircle.name, geoid: geocircle.geoid};
                    $(circle.board.containerObj).trigger('objectselected', [options]);
                });
            }
            
            /**
             * Get list of elements of given type.
             **/
            GeoCircle.prototype.getOfType = function(otype){
                var list = [];
                switch (otype){
                    case 'Circle':
                        list.push({id: this.geoid, name: this.name});
                        break;
                    default:
                        break;
                }
                return list;
            }
            
            /**
             * Get the html for options dialog.
             **/
            GeoCircle.prototype.getOptionsDialog = function() {
                var pointlist = this.geoparent.getPointlikes();
                var dialog = {
                    basic: [
                        {
                            type: 'Label',
                            label: 'Id',
                            key: '',
                            value: this.geoid
                        },
                        {
                            type: 'Text',
                            label: 'Label',
                            key: 'name',
                            value: this.name
                        },
                        {
                            type: 'Select',
                            label: 'Center point',
                            key: 'p1',
                            value: this.p1,
                            data: pointlist
                        },
                        {
                            type: 'Select',
                            label: 'Arc point',
                            key: 'p2',
                            value: this.p2,
                            data: pointlist
                        },
                        {
                            type: 'Color',
                            label: 'Stroke color',
                            key: 'strokeColor',
                            value: this.strokeColor
                        },
                        {
                            type: 'Color',
                            label: 'Fill color',
                            key: 'fillColor',
                            value: this.fillColor
                        }
                    ],
                    advanced: [
                        {
                            type: 'Checkbox',
                            label: 'Visible',
                            key: 'visible',
                            value: this.visible
                        },
                        {
                            type: 'Checkbox',
                            label: 'Show label',
                            key: 'showName',
                            value: this.showName
                        }
                    ]
                }
                var dashDialog = {
                    type: 'Select',
                    label: 'Line style',
                    key: 'dash',
                    value: this.dash,
                    data: []
                }
                for (var i = 0; i < this.dashTypes.length; i++) {
                    dashDialog.data.push({id: i, name: this.dashTypes[i]});
                }
                dialog.advanced.push(dashDialog);
                return dialog;
            }
            
            /**
             * Tell, if Circle is drawable.
             */
            GeoCircle.prototype.drawable = function(board){
                return  !!board.objects[this.p1] && !!board.objects[this.p2];
            }
        } // End GeoCircle

        { // GeoRcircle
            /**
             * Constructor for geometric circle object.
             */
            var GeoRcircle = function(params, geoparent) {
                this.type = 'Rcircle';
                this.geoid = params.geoid;
                this.geoparent = geoparent;
                this.setData(params);
            }
            
            /**
             * Inherit the prototype of GeoObject.
             */
            GeoRcircle.prototype = new GeoObject();
            
            /**
             * Set data from given object.
             */
            GeoRcircle.prototype.setData = function(params){
                params = $.extend( {
                    'p1' : this.p1 || null,
                    'p2' : this.p2 || null,
                    'p3' : this.p3 || null,
                    'name' : (typeof(this.name) !== 'undefined' ? this.name : null),
                    'dash' : this.dash || 0,
                    'showName' : (typeof(this.showName) !== 'undefined' ? this.showName : true),
                    'visible' : (typeof(this.visible) !== 'undefined' ? this.visible : true),
                    'strokeColor' : this.strokeColor || '#0000ff',
                    'fillColor': this.fillColor || 'none'
                }, params);
                
                this.p1 = params.p1;
                this.p2 = params.p2;
                this.p3 = params.p3;
                this.name = params.name;
                this.dash = params.dash;
                this.showName = params.showName;
                this.visible = params.visible;
                this.strokeColor = params.strokeColor;
                this.fillColor = params.fillColor;
                
            }
            
            /**
             * Get data of GeoRcircle
             **/
            GeoRcircle.prototype.getData = function(){
                var data = {
                    type: this.type,
                    name: this.name,
                    geoid: this.geoid,
                    p1: this.p1,
                    p2: this.p2,
                    p3: this.p3,
                    dash: this.dash,
                    showName: this.showName,
                    visible: this.visible,
                    strokeColor: this.strokeColor,
                    fillColor: this.fillColor,
                    radius: this.radius,
                    area: this.area,
                    circumference: this.circumference
                }
                return data;
            }
            
            /**
             * Get the list of dependencies.
             **/
            GeoRcircle.prototype.getDeps = function(){
                return [this.p1, this.p2, this.p3];
            }
            
            /**
             * Get list string (to be shown in the object list)
             **/
            GeoRcircle.prototype.getListStr = function(){
                var str = '<div class="gedit-listicon" title="'+this.type+'">' + this.icon + '</div><div class="gedit-listname"><i>' + this.getNameFormatted() + '</i><span class="geoedit-aka">=<i>c</i>(<i>'+this.getObjName(this.p1)+'</i>; '+this.radius+')</span></div>';
                return str;
            }
            
            /**
             * CSS style defining the icon representing this type.
             **/
            GeoRcircle.prototype.iconCSS = 'rcircleBtn';
            
            GeoRcircle.prototype.icon = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="20" height="20" viewbox="0 0 20 20" class="geoedit-icon geoedit-object-rcircle"><circle style="stroke: blue; fill: none;" cx="10" cy="10" r="9" /><path style="stroke: red; stroke-width: 2px; fill: none;" d="M10 10 l8 4" /><circle style="stroke: none; fill: black;" cx="10" cy="10" r="2" /></svg>';

            /**
             * Draw the circle on board in the construction.
             **/
            GeoRcircle.prototype.asConstruct = function(board, construction) {
                var geocircle = this;
                var p2 = board.objects[this.p2];
                var p3 = board.objects[this.p3];
                var circle = board.create(
                    'circle',
                    [board.objects[this.p1], function(){return p2.Dist(p3);}],
                    {
                        // Options here.
                        visible : this.visible,
                        name : this.name,
                        id : this.geoid,
                        withLabel : this.showName,
                        dash : this.dash,
                        strokeColor : this.strokeColor,
                        fillColor : this.fillColor,
                        highlightFillColor: this.fillColor,
                    }
                );
                
                //this.id = this.id || circle.id;
                construction.circles.push(circle);
                
                this.radius = Math.round(p2.Dist(p3) * 10) /10;
                
                circle.on('up', function(event){
                    var circle = this;
                    var updoptions = {name: geocircle.name, geoid: [geocircle.p1]};
                    $(circle.board.containerObj).trigger('objectupdate', [updoptions]);
                });
                circle.on('down', function(event){
                    var circle = this;
                    var options = {name: geocircle.name, geoid: geocircle.geoid};
                    $(circle.board.containerObj).trigger('objectselected', [options]);
                });
            }
            
            /**
             * Get list of elements of given type.
             **/
            GeoRcircle.prototype.getOfType = function(otype){
                var list = [];
                switch (otype){
                    case 'Rcircle':
                    case 'Circle':
                        list.push({id: this.geoid, name: this.name});
                        break;
                    default:
                        break;
                }
                return list;
            }
            
            /**
             * Get the html for options dialog.
             **/
            GeoRcircle.prototype.getOptionsDialog = function() {
                var pointlist = this.geoparent.getPointlikes();
                var dialog = {
                    basic: [
                        {
                            type: 'Label',
                            label: 'Id',
                            key: '',
                            value: this.geoid
                        },
                        {
                            type: 'Text',
                            label: 'Label',
                            key: 'name',
                            value: this.name
                        },
                        {
                            type: 'Select',
                            label: 'Center point',
                            key: 'p1',
                            value: this.p1,
                            data: pointlist
                        },
                        {
                            type: 'Select',
                            label: 'Radius start',
                            key: 'p2',
                            value: this.p2,
                            data: pointlist
                        },
                        {
                            type: 'Select',
                            label: 'Radius end',
                            key: 'p3',
                            value: this.p3,
                            data: pointlist
                        },
                        {
                            type: 'Color',
                            label: 'Stroke color',
                            key: 'strokeColor',
                            value: this.strokeColor
                        },
                        {
                            type: 'Color',
                            label: 'Fill color',
                            key: 'fillColor',
                            value: this.fillColor
                        }
                    ],
                    advanced: [
                        {
                            type: 'Checkbox',
                            label: 'Visible',
                            key: 'visible',
                            value: this.visible
                        },
                        {
                            type: 'Checkbox',
                            label: 'Show label',
                            key: 'showName',
                            value: this.showName
                        }
                    ]
                }
                var dashDialog = {
                    type: 'Select',
                    label: 'Line style',
                    key: 'dash',
                    value: this.dash,
                    data: []
                }
                for (var i = 0; i < this.dashTypes.length; i++) {
                    dashDialog.data.push({id: i, name: this.dashTypes[i]});
                }
                dialog.advanced.push(dashDialog);
                return dialog;
            }
            
            /**
             * Tell, if Circle is drawable.
             */
            GeoRcircle.prototype.drawable = function(board){
                return  !!board.objects[this.p1] && !!board.objects[this.p2];
            }
        } // End GeoRcircle
        
        { // GeoGlider
            /**
             * Constructor glider point object on previous element.
             */ 
            var GeoGlider = function(params, geoparent) {
                this.type = 'Glider';
                this.geoid = params.geoid;
                this.geoparent = geoparent;
                this.setData(params);
            }
            
            /**
             * Inherit the prototype of GeoObject.
             */
            GeoGlider.prototype = new GeoObject();


            /**
             * Set data from given object.
             */
            GeoGlider.prototype.setData = function(params){
                params = $.extend( {
                    'parent' : this.parent || null,
                    'x' : this.x || null,
                    'y' : this.y || null,
                    'name' : (typeof(this.name) !== 'undefined' ? this.name : null),
                    'showName' : (typeof(this.showName) !== 'undefined' ? this.showName : true),
                    'visible' : (typeof (this.visible) !== 'undefined' ? this.visible : true),
                    'fixed' : this.fixed || false,
                    'size' : (typeof this.size !== 'undefined' ? this.size : 3),
                    'color' : this.color || '#ff0000',
                    'decimalperiod' : this.decimalperiod || false
                }, params);
                
                this.size = this.strToNum(params.size);
                this.parent = params.parent;
                this.x = (params.x == 'null' ? 0 : this.strToNum(params.x));
                this.y = (params.y == 'null' ? 0 : this.strToNum(params.y));
                this.name = params.name;
                this.showName = params.showName;
                this.visible = params.visible;
                this.fixed = params.fixed;
                this.color = params.color;
                this.decimalperiod = params.decimalperiod;
            }
            
            /**
             * Get data of GeoGlider
             **/
            GeoGlider.prototype.getData = function(){
                var data = {
                    type: this.type,
                    name: this.name,
                    geoid: this.geoid,
                    parent: this.parent,
                    x: this.x,
                    y: this.y,
                    showName: this.showName,
                    visible: this.visible,
                    fixed: this.fixed,
                    size: this.size,
                    color: this.color
                }
                return data;
            }
            
            /**
             * Get the list of dependencies.
             **/
            GeoGlider.prototype.getDeps = function(){
                return [this.parent];
            }
            
            /**
             * CSS style defining the icon representing this type.
             **/
            GeoGlider.prototype.iconCSS = 'gliderBtn';
            
            GeoGlider.prototype.icon = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="20" height="20" viewbox="0 0 20 20" class="geoedit-icon geoedit-object-glider"><line style="stroke: blue;" x1="0" y1="7" x2="20" y2="13" /><circle style="stroke: #f00; fill: #fff;" cx="10" cy="10" r="2" /></svg>';
            
            /**
             * Draw the glider on board in the construction.
             */
            GeoGlider.prototype.asConstruct = function(board, construction) {
                var geopoint = this;
                var obj = this;
                if ((this.x != null) && (this.y != null)) {
                    var p = board.create(
                        'glider',
                        [this.strToNum(this.x), this.strToNum(this.y), board.objects[this.parent]],
                        {
                            name : this.name,
                            id : this.geoid,
                            size : this.size,
                            //color: (this.fixed ? '#000000' : this.color),
                            withLabel : this.showName,
                            visible : this.visible,
                            fixed : this.fixed,
                            strokeColor: this.color,
                            fillColor: 'white'
                        }
                    );
                } else {
                    var p = board.create(
                        'glider',
                        [board.objects[this.parent]],
                        {
                            name : this.name,
                            id : this.geoid,
                            size : this.size,
                            //color: (this.fixed ? '#000000' : this.color),
                            withLabel : this.showName,
                            visible : this.visible,
                            fixed : this.fixed,
                            strokeColor: this.color,
                            fillColor: 'white'
                        }
                    );
                }
                if (!this.name) {
                    this.name = p.name;
                }
                //this.id = this.id || p.id;
                p.obj = obj;
                construction.points.push(p);
                construction[this.name] = p;
                if (this.showName){
                    p.label.content.setText(this.nameStr(construction));
                }
                p.on('up', function(event){
                    var point = this;
                    var options = {name: geopoint.name, id: geopoint.geoid};
                    $(point.board.containerObj).trigger('objectupdate', [options]);
                });
                p.on('down', function(event){
                    var point = this;
                    var options = {name: geopoint.name, geoid: geopoint.geoid};
                    $(point.board.containerObj).trigger('objectselected', [options]);
                });
            }
            
            /**
             * Update data of the object from the board.
             **/
            GeoGlider.prototype.updateFromBoard = function(board){
                var point = board.objects[this.geoid];
                this.x = Math.round(point.X() * 100)/100;
                this.y = Math.round(point.Y() * 100)/100;
            }
            
            /**
             * Get list of elements of given type.
             **/
            GeoGlider.prototype.getOfType = function(otype){
                var list = [];
                switch (otype){
                    case 'Glider':
                        list.push({id: this.geoid, name: this.name});
                        break;
                    default:
                        break;
                }
                return list;
            }
            
            /**
             * Get the html for options dialog.
             */
            GeoGlider.prototype.getOptionsDialog = function() {
                var curvelist = this.geoparent.getCurves();
                var dialog = {
                    basic: [
                        {
                            type: 'Label',
                            label: 'Id',
                            key: '',
                            value: this.geoid
                        },
                        {
                            type: 'Text',
                            label: 'Label',
                            key: 'name',
                            value: this.name
                        },
                        {
                            type: 'Select',
                            label: 'Parent',
                            key: 'parent',
                            value: this.parent,
                            data: curvelist
                        },
                        {
                            type: 'Text',
                            label: 'x-coordinate',
                            key: 'x',
                            value: (typeof(this.x) === 'number' ? this.numToStr(this.x) : '')
                        },
                        {
                            type: 'Text',
                            label: 'y-coordinate',
                            key: 'y',
                            value: (typeof(this.y) === 'number' ? this.numToStr(this.y) : '')
                        },
                        {
                            type: 'Color',
                            label: 'Color',
                            key: 'color',
                            value: this.color
                        }
                    ],
                    advanced: [
                        {
                            type: 'Checkbox',
                            label: 'Visible',
                            key: 'visible',
                            value: this.visible
                        },
                        {
                            type: 'Checkbox',
                            label: 'Show label',
                            key: 'showName',
                            value: this.showName
                        },
                        {
                            type: 'Checkbox',
                            label: 'Fixed',
                            key: 'fixed',
                            value: this.fixed
                        },
                        {
                            type: 'Text',
                            label: 'Size',
                            key: 'size',
                            value: this.numToStr(this.size)
                        }
                    ]
                }
                return dialog;
            }
            
            /**
             * Tell, if Glider is drawable.
             */
            GeoGlider.prototype.drawable = function(board){
                return  !!board.objects[this.parent];
            }
        } // End GeoGlider

        { // GeoMidpoint
            /**
             * Constructor Midpoint object on previous element.
             */ 
            var GeoMidpoint = function(params, geoparent) {
                this.type = 'Midpoint';
                this.geoid = params.geoid;
                this.geoparent = geoparent;
                this.setData(params);
            }
            
            /**
             * Inherit the prototype of GeoObject.
             */
            GeoMidpoint.prototype = new GeoObject();


            /**
             * Set data from given object.
             */
            GeoMidpoint.prototype.setData = function(params){
                params = $.extend( {
                    'p1' : this.p1 || null,
                    'p2' : this.p2 || null,
                    'name' : (typeof(this.name) !== 'undefined' ? this.name : null),
                    'showName' : (typeof(this.showName) !== 'undefined' ? this.showName : true),
                    'visible' : (typeof (this.visible) !== 'undefined' ? this.visible : true),
                    'fixed' : this.fixed || false,
                    'size' : (typeof this.size !== 'undefined' ? this.size : 3),
                    'color' : this.color || '#ff0000',
                    'decimalperiod' : this.decimalperiod || false
                }, params);
                
                this.size = this.strToNum(params.size);
                this.p1 = params.p1;
                this.p2 = params.p2;
                this.name = params.name;
                this.showName = params.showName;
                this.visible = params.visible;
                this.fixed = params.fixed;
                this.color = params.color;
                this.decimalperiod = params.decimalperiod;
            }
            
            /**
             * Get data of GeoMidpoint
             **/
            GeoMidpoint.prototype.getData = function(){
                var data = {
                    type: this.type,
                    name: this.name,
                    geoid: this.geoid,
                    p1: this.p1,
                    p2: this.p2,
                    showName: this.showName,
                    visible: this.visible,
                    fixed: this.fixed,
                    size: this.size,
                    color: this.color
                }
                return data;
            }
            
            /**
             * Get the list of dependencies.
             **/
            GeoMidpoint.prototype.getDeps = function(){
                return [this.p1, this.p2];
            }
            
            /**
             * CSS style defining the icon representing this type.
             **/
            GeoMidpoint.prototype.iconCSS = 'midpointBtn';
            
            GeoMidpoint.prototype.icon = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="20" height="20" viewbox="0 0 20 20" class="geoedit-icon geoedit-object-midpoint"><line style="stroke: blue;" x1="0" y1="7" x2="20" y2="13" /><circle style="stroke: none; fill: #000;" cx="3" cy="7.7" r="2" /><circle style="stroke: none; fill: #f00;" cx="10" cy="10" r="2" /><circle style="stroke: none; fill: #000;" cx="17" cy="12.3" r="2" /></svg>';
            
            /**
             * Draw the glider on board in the construction.
             */
            GeoMidpoint.prototype.asConstruct = function(board, construction) {
                var geopoint = this;
                var obj = this;
                var p = board.create(
                    'midpoint',
                    [this.p1, this.p2],
                    {
                        name : this.name,
                        id : this.geoid,
                        size : this.size,
                        withLabel : this.showName,
                        visible : this.visible,
                        fixed : this.fixed,
                        face : '<>',
                        strokeColor: this.color,
                        fillColor: this.color
                    }
                );
                if (!this.name) {
                    this.name = p.name;
                }
                p.obj = obj;
                construction.points.push(p);
                construction[this.name] = p;
                if (this.showName){
                    p.label.content.setText(this.nameStr(construction));
                }
                p.on('down', function(event){
                    var point = this;
                    var options = {name: geopoint.name, geoid: geopoint.geoid};
                    $(point.board.containerObj).trigger('objectselected', [options]);
                });
            }
            
            /**
             * Get list of elements of given type.
             **/
            GeoMidpoint.prototype.getOfType = function(otype){
                var list = [];
                switch (otype){
                    case 'Midpoint':
                        list.push({id: this.geoid, name: this.name});
                        break;
                    default:
                        break;
                }
                return list;
            }
            
            /**
             * Get the html for options dialog.
             */
            GeoMidpoint.prototype.getOptionsDialog = function() {
                var pointlist = this.geoparent.getPointlikes();
                var dialog = {
                    basic: [
                        {
                            type: 'Label',
                            label: 'Id',
                            key: '',
                            value: this.geoid
                        },
                        {
                            type: 'Text',
                            label: 'Label',
                            key: 'name',
                            value: this.name
                        },
                        {
                            type: 'Select',
                            label: 'Point 1',
                            key: 'p1',
                            value: this.p1,
                            data: pointlist
                        },
                        {
                            type: 'Select',
                            label: 'Point 2',
                            key: 'p2',
                            value: this.p2,
                            data: pointlist
                        },
                        {
                            type: 'Color',
                            label: 'Color',
                            key: 'color',
                            value: this.color
                        }
                    ],
                    advanced: [
                        {
                            type: 'Checkbox',
                            label: 'Visible',
                            key: 'visible',
                            value: this.visible
                        },
                        {
                            type: 'Checkbox',
                            label: 'Show label',
                            key: 'showName',
                            value: this.showName
                        },
                        {
                            type: 'Checkbox',
                            label: 'Fixed',
                            key: 'fixed',
                            value: this.fixed
                        },
                        {
                            type: 'Text',
                            label: 'Size',
                            key: 'size',
                            value: this.numToStr(this.size)
                        }
                    ]
                }
                return dialog;
            }
            
            /**
             * Tell, if Midpoint is drawable.
             */
            GeoMidpoint.prototype.drawable = function(board){
                return  !!board.objects[this.p1] && !!board.objects[this.p2];
            }
        } // End GeoMidpoint

        { // GeoIntersection
            /**
             * Constructor intersection points on two previous elements.
             */ 
            var GeoIntersection = function(params, geoparent) {
                this.type = 'Intersection';
                this.geoid = params.geoid;
                this.geoparent = geoparent;
                this.setData(params);
            }
            
            /**
             * Inherit the prototype of GeoObject.
             */
            GeoIntersection.prototype = new GeoObject();


            /**
             * Set data from given object.
             */
            GeoIntersection.prototype.setData = function(params){
                params = $.extend( {
                    'parent1' : (typeof(this.parent1) !== 'undefined' ? this.parent1 : null),
                    'parent2' : (typeof(this.parent2) !== 'undefined' ? this.parent2 : null),
                    'name' : (typeof(this.name) !== 'undefined' ? this.name : null),
                    'showName' : (typeof(this.showName) !== 'undefined' ? this.showName : true),
                    'visible' : (typeof(this.visible) !== 'undefined' ? this.visible : true),
                    'fixed' : this.fixed || false,
                    'size' : (typeof this.size !== 'undefined' ? this.size : 6),
                    'color' : this.color || '#ff0000',
                    'showPoints' : this.showPoints || 'both',
                    'decimalperiod' : this.decimalperiod || false
                }, params);
                
                this.size = this.strToNum(params.size);
                this.parent1 = params.parent1 || this.parent1;
                this.parent2 = params.parent2 || this.parent2;
                this.name = params.name;
                this.showName = params.showName;
                this.visible = params.visible;
                this.fixed = params.fixed;
                this.color = params.color;
                this.showPoints = params.showPoints;
                this.decimalperiod = params.decimalperiod;
            }
            
            /**
             * Get data of GeoIntersection
             **/
            GeoIntersection.prototype.getData = function(){
                var data = {
                    type: this.type,
                    name: this.name,
                    geoid: this.geoid,
                    parent1: this.parent1,
                    parent2: this.parent2,
                    showName: this.showName,
                    visible: this.visible,
                    fixed: this.fixed,
                    size: this.size,
                    color: this.color,
                    showPoints: this.showPoints
                }
                return data;
            }
            
            /**
             * Get the list of dependencies.
             **/
            GeoIntersection.prototype.getDeps = function(){
                return [this.parent1, this.parent2];
            }
            
            /**
             * CSS style defining the icon representing this type.
             **/
            GeoIntersection.prototype.iconCSS = 'intersectionBtn';
            
            GeoIntersection.prototype.icon = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="20" height="20" viewbox="0 0 20 20" class="geoedit-icon geoedit-object-intersection"><line style="stroke: blue;" x1="0" y1="7" x2="20" y2="13" /><line style="stroke: blue;" x1="18" y1="0" x2="3" y2="20" /><circle style="stroke: #a00; fill: #f00;" cx="10" cy="10" r="2" /></svg>';
            
            /**
             * Draw the intersections on board in the construction.
             */
            GeoIntersection.prototype.asConstruct = function(board, construction) {
                var geopoint = this;
                var obj = this;
                this.doubleintersection = (
                    board.objects[this.parent1].elType === 'circle' ||
                    board.objects[this.parent2].elType === 'circle');
                if ((this.parent1 != null) && (this.parent2 != null)) {
                    if (this.showPoints === 'both' || this.showPoints === 'first') {
                        var p1 = board.create(
                            'intersection',
                            [this.parent1, this.parent2, 0],
                            {
                                name : this.name + '_1',
                                id : this.geoid + '_1',
                                size : this.size,
                                color: (this.fixed ? '#000000' : this.color),
                                withLabel : this.showName,
                                visible : this.visible,
                                fixed : this.fixed,
                                face: '+',
                                strokeColor: this.color,
                                fillColor: this.color
                            }
                        );
                        construction.intersections.push(p1);
                        construction[this.name + '_1'] = p1;
                        if (this.showName){
                            p1.label.content.setText(this.nameStr() + (this.doubleintersection ? '_1' : ''));
                        }
                        p1.on('down', function(event){
                            var point = this;
                            var options = {name: geopoint.name, geoid: geopoint.geoid};
                            $(point.board.containerObj).trigger('objectselected', [options]);
                        });
                    }

                    if (this.doubleintersection && (this.showPoints === 'both' || this.showPoints === 'second')) {
                        var p2 = board.create(
                            'intersection',
                            [this.parent1, this.parent2, 1],
                            {
                                name : this.name + '_2',
                                id : this.geoid + '_2',
                                size : this.size,
                                color: (this.fixed ? '#000000' : this.color),
                                withLabel : this.showName,
                                visible : this.visible,
                                fixed : this.fixed,
                                face: '+',
                                strokeColor: this.color,
                                fillColor: this.color
                            }
                        );
                        construction.intersections.push(p2);
                        construction[this.name + '_2'] = p2;
                        if (this.showName){
                            p1 && p1.label.content.setText(this.nameStr() + '_1');
                            p2 && p2.label.content.setText(this.nameStr() + '_2');
                        }
                        p2.on('down', function(event){
                            var point = this;
                            var options = {name: geopoint.name, geoid: geopoint.geoid};
                            $(point.board.containerObj).trigger('objectselected', [options]);
                        });
                    }
                }
            }
            
            /**
             * Update data of the object from the board.
             **/
            GeoIntersection.prototype.updateFromBoard = function(board){}
            
            /**
             * Select this object.
             **/
            GeoIntersection.prototype.select = function(board){
                board.objects[this.geoid + '_1'] && board.objects[this.geoid + '_1'].setProperty({shadow: true});
                board.objects[this.geoid + '_2'] && board.objects[this.geoid + '_2'].setProperty({shadow: true});
            }
            
            /**
             * Deselect this object.
             **/
            GeoIntersection.prototype.deselect = function(board){
                board.objects[this.geoid + '_1'] && board.objects[this.geoid + '_1'].setProperty({shadow: false});
                board.objects[this.geoid + '_2'] && board.objects[this.geoid + '_2'].setProperty({shadow: false});
            }
            
            /**
             * Get list of elements of given type.
             **/
            GeoIntersection.prototype.getOfType = function(otype){
                var list = [];
                switch (otype){
                    case 'Point':
                    case 'Intersection':
                        list.push({id: this.geoid + '_1', name: this.name + (this.doubleintersection ? '_1': '')});
                        if (this.doubleintersection) {
                            list.push({id: this.geoid + '_2', name: this.name + '_2'});
                        }
                        break;
                    default:
                        break;
                }
                return list;
            }
            
            /**
             * Get the html for options dialog.
             */
            GeoIntersection.prototype.getOptionsDialog = function() {
                var curvelist = this.geoparent.getCurves();
                var showpoints = [
                    {
                        id: 'both',
                        name: 'both'
                    },
                    {
                        id: 'first',
                        name: 'first'
                    },
                    {
                        id: 'second',
                        name: 'second'
                    }
                ]
                var dialog = {
                    basic: [
                        {
                            type: 'Label',
                            label: 'Id',
                            key: '',
                            value: this.geoid
                        },
                        {
                            type: 'Text',
                            label: 'Label',
                            key: 'name',
                            value: this.name
                        },
                        {
                            type: 'Select',
                            label: 'Parent 1',
                            key: 'parent1',
                            value: this.parent1,
                            data: curvelist
                        },
                        {
                            type: 'Select',
                            label: 'Parent 2',
                            key: 'parent2',
                            value: this.parent2,
                            data: curvelist
                        },
                        {
                            type: 'Color',
                            label: 'Color',
                            key: 'color',
                            value: this.color
                        }
                    ],
                    advanced: [
                        {
                            type: 'Checkbox',
                            label: 'Visible',
                            key: 'visible',
                            value: this.visible
                        },
                        {
                            type: 'Checkbox',
                            label: 'Show label',
                            key: 'showName',
                            value: this.showName
                        },
                        {
                            type: 'Checkbox',
                            label: 'Fixed',
                            key: 'fixed',
                            value: this.fixed
                        },
                        {
                            type: 'Text',
                            label: 'Size',
                            key: 'size',
                            value: this.numToStr(this.size)
                        },
                        {
                            type: 'Select',
                            label: 'Show points',
                            key: 'showPoints',
                            value: this.showPoints,
                            data: showpoints
                        }
                    ]
                }
                return dialog;
            }
            
            /**
             * Tell, if Intersection is drawable.
             */
            GeoIntersection.prototype.drawable = function(board){
                return  !!board.objects[this.parent1] && !!board.objects[this.parent2];
            }
        } // End GeoIntersection

        { // GeoTriangle
            /**
             * Constructor for geometric triangle object.
             */
            var GeoTriangle = function(params, geoparent) {
                this.type = 'Triangle';
                this.geoid = params.geoid;
                this.geoparent = geoparent;
                this.setData(params);
            }
            
            /**
             * Inherit the prototype of GeoObject.
             */
            GeoTriangle.prototype = new GeoObject();
            
            /**
             * Set data from given object.
             */
            GeoTriangle.prototype.setData = function(params){
                params = $.extend( {
                    'p1' : this.p1 || null,
                    'p2' : this.p2 || null,
                    'p3' : this.p3 || null,
                    'name' : (typeof(this.name) !== 'undefined' ? this.name : null),
                    'dash' : this.dash || 0,
                    'showName' : (typeof(this.showName) !== 'undefined' ? this.showName : true),
                    'visible' : (typeof(this.showName) !== 'undefined' ? this.showName : true),
                    'strokeColor' : this.strokeColor || '#0000ff',
                    'fillColor' : this.fillColor || 'none',
                    'strokeWidth' : (typeof(this.strokeWidth) !== 'undefined' ? this.strokeWidth : 2)
                }, params);
                
                this.p1 = params.p1;
                this.p2 = params.p2;
                this.p3 = params.p3;
                this.strokeWidth = this.strToNum(params.strokeWidth);
                this.name = params.name;
                this.dash = params.dash;
                this.showName = params.showName;
                this.visible = params.visible;
                this.strokeColor = params.strokeColor;
                this.fillColor = params.fillColor;
                this.lang = params.lang;
            }
            
            /**
             * Get data of GeoTriangle
             **/
            GeoTriangle.prototype.getData = function(subid){
                if (!subid) {
                    var data = {
                        type: this.type,
                        name: this.name,
                        geoid: this.geoid,
                        p1: this.p1,
                        p2: this.p2,
                        p3: this.p3,
                        dash: this.dash,
                        showName: this.showName,
                        visible: this.visible,
                        strokeColor: this.strokeColor,
                        fillColor: this.fillColor,
                        labelOffset: this.labelOffset
                    }
                } else {
                    var data = {};
                    switch (subid){
                        case 'side1':
                            data.type = 'Line';
                            data.geoid = this.geoid + '-side1';
                            data.p1 = this.p1;
                            data.p2 = this.p2;
                            break;
                        case 'side2':
                            data.type = 'Line';
                            data.geoid = this.geoid + '-side2';
                            data.p1 = this.p2;
                            data.p2 = this.p3;
                            break;
                        case 'side3':
                            data.type = 'Line';
                            data.geoid = this.geoid + '-side3';
                            data.p1 = this.p3;
                            data.p2 = this.p1;
                            break;
                        default:
                            break
                    }
                }
                return data;
            }
            
            /**
             * Get the list of dependencies.
             **/
            GeoTriangle.prototype.getDeps = function(){
                return [this.p1, this.p2, this.p3];
            }
            
            /**
             * Get list string (to be shown in the object list)
             **/
            GeoTriangle.prototype.getListStr = function(){
                var str = '<div class="gedit-listicon" title="'+this.type+'">' + this.icon + '</div><div class="gedit-listname"><i>' + this.getNameFormatted() + '</i><span class="geoedit-aka">=<i>\u25b3'+this.getObjName(this.p1)+this.getObjName(this.p2)+this.getObjName(this.p3)+'</i></span></div>';
                return str;
            }
            
            /**
             * CSS style defining the icon representing this type.
             **/
            GeoTriangle.prototype.iconCSS = 'triangleBtn';
            
            GeoTriangle.prototype.icon = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="20" height="20" viewbox="0 0 20 20" class="geoedit-icon geoedit-object-triangle"><path style="stroke: blue; fill: none;" d="M4 4 l12 10 l-13 2z" /><circle style="stroke: none; fill: red;" cx="4" cy="4" r="2" /><circle style="stroke: none; fill: red;" cx="16" cy="14" r="2" /><circle style="stroke: none; fill: red;" cx="3" cy="16" r="2" /></svg>';

            /**
             * Draw the triangle on board in the construction.
             **/
            GeoTriangle.prototype.asConstruct = function(board, construction) {
                var geoobject = this;
                var line1 = board.create(
                    'line',
                    [board.objects[this.p1], board.objects[this.p2]],
                    {
                        visible : this.visible,
                        name : '',
                        id : this.geoid + '-side1',
                        withLabel : false,
                        straightFirst : false,
                        straightLast : false,
                        dash : this.dash,
                        color : this.strokeColor
                    }
                );
                construction.lines.push(line1);
                
                var line2 = board.create(
                    'line',
                    [board.objects[this.p2], board.objects[this.p3]],
                    {
                        visible : this.visible,
                        name : '',
                        id : this.geoid + '-side2',
                        withLabel : false,
                        straightFirst : false,
                        straightLast : false,
                        dash : this.dash,
                        color : this.strokeColor
                    }
                );
                construction.lines.push(line2);
                
                var line3 = board.create(
                    'line',
                    [board.objects[this.p1], board.objects[this.p3]],
                    {
                        visible : this.visible,
                        name : '',
                        id : this.geoid + '-side3',
                        withLabel : false,
                        straightFirst : false,
                        straightLast : false,
                        dash : this.dash,
                        color : this.strokeColor
                    }
                );
                construction.lines.push(line3);
                
                var polygon = board.create(
                    'polygon',
                    [board.objects[this.p1], board.objects[this.p2], board.objects[this.p3]],
                    {
                        visible : this.visible,
                        name : this.name,
                        id : this.geoid,
                        withLabel : this.showName,
                        withLines : false,
                        straightFirst : false,
                        straightLast : false,
                        fillColor : this.fillColor,
                        fillOpacity : 1.0,
                        borders : {
                            strokeColor : this.strokeColor
                        }
                    }
                );
                construction.polygons.push(polygon);
                
                line1.on('up', function(event){
                    var line = this;
                    var updoptions = {name: geoobject.name, geoid: [geoobject.p1, geoobject.p2]};
                    $(line.board.containerObj).trigger('objectupdate', [updoptions]);
                });
                line2.on('up', function(event){
                    var line = this;
                    var updoptions = {name: geoobject.name, geoid: [geoobject.p2, geoobject.p3]};
                    $(line.board.containerObj).trigger('objectupdate', [updoptions]);
                });
                line3.on('up', function(event){
                    var line = this;
                    var updoptions = {name: geoobject.name, geoid: [geoobject.p1, geoobject.p3]};
                    $(line.board.containerObj).trigger('objectupdate', [updoptions]);
                });
                line1.on('down', function(event){
                    var line = this;
                    var options = {name: geoobject.name, geoid: geoobject.geoid};
                    $(line.board.containerObj).trigger('objectselected', [options]);
                });
                line2.on('down', function(event){
                    var line = this;
                    var options = {name: geoobject.name, geoid: geoobject.geoid};
                    $(line.board.containerObj).trigger('objectselected', [options]);
                });
                line3.on('down', function(event){
                    var line = this;
                    var options = {name: geoobject.name, geoid: geoobject.geoid};
                    $(line.board.containerObj).trigger('objectselected', [options]);
                });
            }
            
            /**
             * Select this object.
             **/
            GeoTriangle.prototype.select = function(board){
                board.objects[this.geoid + '-side1'].setProperty({shadow: true});
                board.objects[this.geoid + '-side2'].setProperty({shadow: true});
                board.objects[this.geoid + '-side3'].setProperty({shadow: true});
            }
            
            /**
             * Deselect this object.
             **/
            GeoTriangle.prototype.deselect = function(board){
                board.objects[this.geoid + '-side1'].setProperty({shadow: false});
                board.objects[this.geoid + '-side2'].setProperty({shadow: false});
                board.objects[this.geoid + '-side3'].setProperty({shadow: false});
            }

            /**
             * Get list of elements of given type.
             **/
            GeoTriangle.prototype.getOfType = function(otype){
                var list = [];
                switch (otype){
                    case 'Triangle':
                        list.push({id: this.geoid, name: this.name});
                        break;
                    case 'Linelike':
                        list.push({id: this.geoid + '-side1', name: this.name + '_1'});
                        list.push({id: this.geoid + '-side2', name: this.name + '_2'});
                        list.push({id: this.geoid + '-side3', name: this.name + '_3'});
                        break;
                    default:
                        break;
                }
                return list;
            }
            
            /**
             * Get the html for options dialog.
             **/
            GeoTriangle.prototype.getOptionsDialog = function() {
                var pointlist = this.geoparent.getPointlikes();
                var dialog = {
                    basic: [
                        {
                            type: 'Label',
                            label: 'Id',
                            key: '',
                            value: this.geoid
                        },
                        {
                            type: 'Text',
                            label: 'Label',
                            key: 'name',
                            value: this.name
                        },
                        {
                            type: 'Select',
                            label: 'First point',
                            key: 'p1',
                            value: this.p1,
                            data: pointlist
                        },
                        {
                            type: 'Select',
                            label: 'Second point',
                            key: 'p2',
                            value: this.p2,
                            data: pointlist
                        },
                        {
                            type: 'Select',
                            label: 'Third point',
                            key: 'p3',
                            value: this.p3,
                            data: pointlist
                        },
                        {
                            type: 'Color',
                            label: 'Stroke color',
                            key: 'strokeColor',
                            value: this.strokeColor
                        },
                        {
                            type: 'Color',
                            label: 'Fill color',
                            key: 'fillColor',
                            value: this.fillColor
                        }
                    ],
                    advanced: [
                        {
                            type: 'Checkbox',
                            label: 'Visible',
                            key: 'visible',
                            value: this.visible
                        },
                        {
                            type: 'Checkbox',
                            label: 'Show label',
                            key: 'showName',
                            value: this.showName
                        }
                    ]
                }
                var dashDialog = {
                    type: 'Select',
                    label: 'Line style',
                    key: 'dash',
                    value: this.dash,
                    data: []
                }
                for (var i = 0; i < this.dashTypes.length; i++) {
                    dashDialog.data.push({id: i, name: this.dashTypes[i]});
                }
                dialog.advanced.push(dashDialog);
                return dialog;
            }
            
            /**
             * Tell, if Triangle is drawable.
             */
            GeoTriangle.prototype.drawable = function(board){
                return  !!board.objects[this.p1] && !!board.objects[this.p2] && !!board.objects[this.p3];
            }
        } // End GeoTriangle
        
        { // GeoRighttriangle
            /**
             * Constructor for geometric right triangle object.
             */
            var GeoRighttriangle = function(params, geoparent) {
                this.type = 'Righttriangle';
                this.geoid = params.geoid;
                this.geoparent = geoparent;
                this.setData(params);
            }
            
            /**
             * Inherit the prototype of GeoObject.
             */
            GeoRighttriangle.prototype = new GeoObject();
            
            /**
             * Set data from given object.
             */
            GeoRighttriangle.prototype.setData = function(params){
                params = $.extend( {
                    'p1' : this.p1 || null,
                    'p2' : this.p2 || null,
                    'p3x' : (typeof(this.p3x) !== 'undefined' ? this.p3x : null),
                    'p3y' : (typeof(this.p3y) !== 'undefined' ? this.p3y : null),
                    'p3name' : (typeof(this.p3name) !== 'undefined' ? this.p3name : null),
                    'name' : (typeof(this.name) !== 'undefined' ? this.name : null),
                    'dash' : this.dash || 0,
                    'showName' : (typeof this.showName !== 'undefined' ? this.showName : true),
                    'visible' : (typeof this.visible !== 'undefined' ? this.visible : true),
                    'showGeneratedPoints' : (typeof this.showGeneratedPoints !== 'undefined' ? this.showGeneratedPoints : true),
                    'showGeneratedName' : (typeof this.showGeneratedName !== 'undefined' ? this.showGeneratedName : true),
                    'showRightangle' : (typeof this.showRightangle !== 'undefined' ? this.showRightangle : false),
                    'strokeColor' : this.strokeColor || '#0000ff',
                    'fillColor' : this.fillColor || 'none',
                    'strokeWidth' : 2
                }, params);
                
                this.p1 = params.p1;
                this.p2 = params.p2;
                this.p3geoid = this.geoid + '-p3';
                this.p3x = params.x || params.p3x;
                this.p3y = params.y || params.p3y;
                this.p3name = params.p3name;
                this.strokeWidth = this.strToNum(params.strokeWidth);
                this.name = params.name;
                this.dash = params.dash;
                this.showName = params.showName;
                this.showGeneratedPoints = params.showGeneratedPoints;
                this.showGeneratedName = params.showGeneratedName;
                this.showRightangle = params.showRightangle;
                this.visible = params.visible;
                this.strokeColor = params.strokeColor || params.color;
                this.fillColor = params.fillColor;
                this.angleradius = 0.5;
            }
            
            /**
             * Get data of GeoRighttriangle
             **/
            GeoRighttriangle.prototype.getData = function(subid){
                if (!subid) {
                    var data = {
                        type: this.type,
                        name: this.name,
                        geoid: this.geoid,
                        p1: this.p1,
                        p2: this.p2,
                        p3x: this.p3x,
                        p3y: this.p3y,
                        p3name: this.p3name,
                        dash: this.dash,
                        showName: this.showName,
                        showGeneratedPoints: this.showGeneratedPoints,
                        showGeneratedName: this.showGeneratedName,
                        showRightangle: this.showRightangle,
                        visible: this.visible,
                        strokeColor: this.strokeColor,
                        fillColor: this.fillColor
                    }
                } else {
                    var data = {};
                    switch (subid){
                        case 'side1':
                            data.type = 'Line';
                            data.geoid = this.geoid + '-side1';
                            data.p1 = this.p1;
                            data.p2 = this.p2;
                            break;
                        case 'side2':
                            data.type = 'Line';
                            data.geoid = this.geoid + '-side2';
                            data.p1 = this.p2;
                            data.p2 = this.geoid + '-p3';
                            break;
                        case 'side3':
                            data.type = 'Line';
                            data.geoid = this.geoid + '-side3';
                            data.p1 = this.geoid + '-p3';
                            data.p2 = this.p1;
                            break;
                        default:
                            break
                    }
                }
                return data;
            }
            
            /**
             * Get the list of dependencies.
             **/
            GeoRighttriangle.prototype.getDeps = function(){
                return [this.p1, this.p2];
            }
            
            /**
             * Get list string (to be shown in the object list)
             **/
            GeoRighttriangle.prototype.getListStr = function(){
                var str = '<div class="gedit-listicon" title="'+this.type+'">' + this.icon + '</div><div class="gedit-listname"><i>' + this.getNameFormatted() + '</i><span class="geoedit-aka">=<i>\u25b3'+this.getObjName(this.p1)+this.getObjName(this.p2)+this.getObjName(this.p3)+'</i></span></div>';
                return str;
            }
            
            /**
             * CSS style defining the icon representing this type.
             **/
            GeoRighttriangle.prototype.iconCSS = 'righttriangleBtn';
            
            GeoRighttriangle.prototype.icon = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="20" height="20" viewbox="0 0 20 20" class="geoedit-icon geoedit-object-righttriangle"><path stroke="red" fill="none" d="M16 12 l-5 0 l0 5 l5 0z" /><path style="stroke: blue; fill: none;" d="M16 2 l0 15 l-14 0z" /><circle style="stroke: none; fill: red;" cx="16" cy="2" r="2" /><circle style="stroke: none; fill: red;" cx="3" cy="17" r="2" /><circle style="stroke: red; fill: white;" cx="16" cy="17" r="2" /></svg>';

            /**
             * Draw the right triangle on board in the construction.
             **/
            GeoRighttriangle.prototype.asConstruct = function(board, construction) {
                var geoobject = this;
                var midpoint = board.create(
                    'midpoint',
                    [this.p1, this.p2],
                    {visible: false, id: this.geoid + '-midpoint', name: ''}
                );
                midpoint.gedithelpobject = true;
                var circle = board.create(
                    'circle',
                    [this.geoid + '-midpoint', this.p1],
                    {visible: false, id: this.geoid + '-circle', name: ''}
                );
                circle.gedithelpobject = true;
                this.p3 = board.create(
                    'glider',
                    [this.p3x, this.p3y, circle],
                    {visible: this.showGeneratedPoints, id: this.geoid + '-p3', name: (this.showGeneratedName ? this.p3name: ''), fillColor: 'white'}
                );
                var line1 = board.create(
                    'line',
                    [this.p1, this.p2],
                    {
                        visible : this.visible,
                        name : '',
                        id : this.geoid + '-side1',
                        withLabel : false,
                        straightFirst : false,
                        straightLast : false,
                        dash : this.dash,
                        color : this.strokeColor
                    }
                );
                construction.lines.push(line1);
                
                var line2 = board.create(
                    'line',
                    [this.p2, this.p3],
                    {
                        visible : this.visible,
                        name : '',
                        id : this.geoid + '-side2',
                        withLabel : false,
                        straightFirst : false,
                        straightLast : false,
                        dash : this.dash,
                        color : this.strokeColor
                    }
                );
                construction.lines.push(line2);
                
                var line3 = board.create(
                    'line',
                    [this.p1, this.p3],
                    {
                        visible : this.visible,
                        name : '',
                        id : this.geoid + '-side3',
                        withLabel : false,
                        straightFirst : false,
                        straightLast : false,
                        dash : this.dash,
                        color : this.strokeColor
                    }
                );
                construction.lines.push(line3);
                
                var polygon = board.create(
                    'polygon',
                    [this.p1, this.p2, this.p3],
                    {
                        visible : this.visible,
                        name : this.name,
                        id : this.geoid,
                        withLabel : this.showName,
                        withLines : false,
                        straightFirst : false,
                        straightLast : false,
                        fillColor : this.fillColor,
                        fillOpacity : 1.0,
                        borders : {
                            strokeColor : this.strokeColor
                        }
                    }
                );
                construction.polygons.push(polygon);
                
                var p1 = board.objects[this.p1];
                var p2 = board.objects[this.p2];
                if (this.showRightangle) {
                    board.create(
                        'angle',
                        [this.p2, this.p3, this.p1],
                        {
                            visible: (JXG.Math.Geometry.trueAngle(p2, this.p3, p1).toFixed(0) < 180),
                            orthoType: 'square',
                            radius: this.angleradius,
                            id: this.geoid + '_rangle1',
                            name: function(){
                                board.objects[geoobject.geoid + '_rangle1'].setProperty({visible: (JXG.Math.Geometry.trueAngle(p2, geoobject.p3, p1).toFixed(0) < 180)});
                                    return '';
                            }
                        }
                    );
                    board.create(
                        'angle',
                        [this.p1, this.p3, this.p2],
                        {
                            visible: (JXG.Math.Geometry.trueAngle(p1, this.p3, p2).toFixed(0) < 180),
                            orthoType: 'square',
                            radius: this.angleradius,
                            id: this.geoid + '_rangle2',
                            name: function(){
                                board.objects[geoobject.geoid + '_rangle2'].setProperty({visible: (JXG.Math.Geometry.trueAngle(p1, geoobject.p3, p2).toFixed(0) < 180)});
                                    return '';
                            }
                        }
                    );
                }
                
                this.p3.on('up', function(event){
                    var point = this;
                    var options = {
                        id: geoobject.geoid,
                        x: Math.round(point.X() * 100)/100,
                        y: Math.round(point.Y() * 100)/100,
                        element: geoobject
                    };
                    
                    $(point.board.containerObj).trigger('objectupdate', [options]);
                    // Or should this be 'objectupdate'?
                    return false;
                });

                line1.on('up', function(event){
                    var line = this;
                    var updoptions = {name: geoobject.name, geoid: [geoobject.p1, geoobject.p2]};
                    $(line.board.containerObj).trigger('objectupdate', [updoptions]);
                });
                line1.on('down', function(event){
                    var line = this;
                    var options = {name: geoobject.name, geoid: geoobject.geoid};
                    $(line.board.containerObj).trigger('objectselected', [options]);
                });
                line2.on('down', function(event){
                    var line = this;
                    var options = {name: geoobject.name, geoid: geoobject.geoid};
                    $(line.board.containerObj).trigger('objectselected', [options]);
                });
                line3.on('down', function(event){
                    var line = this;
                    var options = {name: geoobject.name, geoid: geoobject.geoid};
                    $(line.board.containerObj).trigger('objectselected', [options]);
                });
            }
            
            /**
             * Select this object.
             **/
            GeoRighttriangle.prototype.select = function(board){
                board.objects[this.geoid + '-side1'] && board.objects[this.geoid + '-side1'].setProperty({shadow: true});
                board.objects[this.geoid + '-side2'] && board.objects[this.geoid + '-side2'].setProperty({shadow: true});
                board.objects[this.geoid + '-side3'] && board.objects[this.geoid + '-side3'].setProperty({shadow: true});
            }
            
            /**
             * Deselect this object.
             **/
            GeoRighttriangle.prototype.deselect = function(board){
                board.objects[this.geoid + '-side1'] && board.objects[this.geoid + '-side1'].setProperty({shadow: false});
                board.objects[this.geoid + '-side2'] && board.objects[this.geoid + '-side2'].setProperty({shadow: false});
                board.objects[this.geoid + '-side3'] && board.objects[this.geoid + '-side3'].setProperty({shadow: false});
            }
            
            /**
             * Update data of the object from the board.
             **/
            GeoRighttriangle.prototype.updateFromBoard = function(board){
                var point = board.objects[this.geoid + '-p3'];
                this.p3x = Math.round(point.X() * 100)/100;
                this.p3y = Math.round(point.Y() * 100)/100;
            }

            /**
             * Get list of elements of given type.
             **/
            GeoRighttriangle.prototype.getOfType = function(otype){
                var list = [];
                switch (otype){
                    case 'Point':
                        list.push({id: this.p3geoid, name: this.p3name});
                        break;
                    case 'Triangle':
                        list.push({id: this.geoid, name: this.name});
                        break;
                    case 'Righttriangle':
                        list.push({id: this.geoid, name: this.name});
                        break;
                    case 'Linelike':
                        list.push({id: this.geoid + '-side1', name: this.name + '_1'});
                        list.push({id: this.geoid + '-side2', name: this.name + '_2'});
                        list.push({id: this.geoid + '-side3', name: this.name + '_3'});
                        break;
                    default:
                        break;
                }
                return list;
            }
            
            /**
             * Get the html for options dialog.
             **/
            GeoRighttriangle.prototype.getOptionsDialog = function() {
                var pointlist = this.geoparent.getPointlikes();
                var dialog = {
                    basic: [
                        {
                            type: 'Label',
                            label: 'Id',
                            key: '',
                            value: this.geoid
                        },
                        {
                            type: 'Text',
                            label: 'Label',
                            key: 'name',
                            value: this.name
                        },
                        {
                            type: 'Select',
                            label: 'First point',
                            key: 'p1',
                            value: this.p1,
                            data: pointlist
                        },
                        {
                            type: 'Select',
                            label: 'Second point',
                            key: 'p2',
                            value: this.p2,
                            data: pointlist
                        },
                        {
                            type: 'Text',
                            label: 'Third point name',
                            key: 'p3name',
                            value: this.p3name
                        },
                        {
                            type: 'Color',
                            label: 'Stroke color',
                            key: 'strokeColor',
                            value: this.strokeColor
                        },
                        {
                            type: 'Color',
                            label: 'Fill color',
                            key: 'fillColor',
                            value: this.fillColor
                        }
                    ],
                    advanced: [
                        {
                            type: 'Checkbox',
                            label: 'Visible',
                            key: 'visible',
                            value: this.visible
                        },
                        {
                            type: 'Checkbox',
                            label: 'Show label',
                            key: 'showName',
                            value: this.showName
                        },
                        {
                            type: 'Checkbox',
                            label: 'Show generated point',
                            key: 'showGeneratedPoints',
                            value: this.showGeneratedPoints
                        },
                        {
                            type: 'Checkbox',
                            label: 'Show generated name',
                            key: 'showGeneratedName',
                            value: this.showGeneratedName
                        },
                        {
                            type: 'Checkbox',
                            label: 'Show right angle',
                            key: 'showRightangle',
                            value: this.showRightangle
                        }
                    ]
                }
                var dashDialog = {
                    type: 'Select',
                    label: 'Line style',
                    key: 'dash',
                    value: this.dash,
                    data: []
                }
                for (var i = 0; i < this.dashTypes.length; i++) {
                    dashDialog.data.push({id: i, name: this.dashTypes[i]});
                }
                dialog.advanced.push(dashDialog);
                return dialog;
            }
            
            /**
             * Tell, if Right triangle is drawable.
             */
            GeoRighttriangle.prototype.drawable = function(board){
                return  !!board.objects[this.p1] && !!board.objects[this.p2];
            }
        } // End GeoRighttriangle
        
        { // GeoRtriangle
            /**
             * Constructor for geometric right triangle object.
             */
            var GeoRtriangle = function(params, geoparent) {
                this.type = 'Rtriangle';
                this.geoid = params.geoid;
                this.geoparent = geoparent;
                this.setData(params);
            }
            
            /**
             * Inherit the prototype of GeoObject.
             */
            GeoRtriangle.prototype = new GeoObject();
            
            /**
             * Set data from given object.
             */
            GeoRtriangle.prototype.setData = function(params){
                params = $.extend( {
                    'p1' : this.p1 || null,
                    'p2' : this.p2 || null,
                    'p3dist' : (typeof(this.p3dist) !== 'undefined' ? this.p3dist : null),
                    'p3name' : (typeof(this.p3name) !== 'undefined' ? this.p3name : null),
                    'name' : (typeof(this.name) !== 'undefined' ? this.name : null),
                    'dash' : this.dash || 0,
                    'showName' : (typeof this.showName !== 'undefined' ? this.showName : true),
                    'visible' : (typeof this.visible !== 'undefined' ? this.visible : true),
                    'showP3' : (typeof(this.showP3) !== 'undefined' ? this.showP3 : true),
                    'showP3Name' : (typeof(this.showP3Name) !== 'undefined' ? this.showP3Name : true),
                    'showRightangle' : (typeof this.showRightangle !== 'undefined' ? this.showRightangle : false),
                    'strokeColor' : this.strokeColor || '#0000ff',
                    'fillColor' : this.fillColor || 'none',
                    'strokeWidth' : 2
                }, params);
                
                this.p1 = params.p1;
                this.p2 = params.p2;
                this.p3geoid = this.geoid + '-p3';
                this.p3dist = this.getDist(params.p3x, params.p3y, params.p3dist);
                this.p3name = params.p3name;
                this.strokeWidth = this.strToNum(params.strokeWidth);
                this.name = params.name;
                this.dash = params.dash;
                this.showName = params.showName;
                this.showP3 = params.showP3;
                this.showP3Name = params.showP3Name;
                this.showRightangle = params.showRightangle;
                this.visible = params.visible;
                this.strokeColor = params.strokeColor || params.color;
                this.fillColor = params.fillColor;
                this.angleradius = 0.5;
            }

            /**
             * Get the distance of p3 from p3 with given coordinates of p3.
             * The sign + means right from segment p2 p1 and - means left of it.
             * The third argument is returned, if x or y is undefined.
             **/
            GeoRtriangle.prototype.getDist = function(x, y, defaultval){
                var dist = defaultval;
                if (typeof(x) !== 'undefined' && typeof(y) !== 'undefined') {
                    var sign;
                    if (this.p1x-this.p2x === 0) {
                        sign = (x > this.p2x ? +1 : -1);
                    } else if (this.p1x > this.p2x) {
                        sign = (y > (this.p1y-this.p2y)/(this.p1x-this.p2x)*(x-this.p1x) + this.p1y ? -1 : 1);
                    } else {
                        sign = (y > (this.p1y-this.p2y)/(this.p1x-this.p2x)*(x-this.p1x) + this.p1y ? 1 : -1);
                    }
                    var dx = this.p2x - x;
                    var dy = this.p2y - y;
                    dist = sign * Math.sqrt(dx*dx + dy*dy);
                }
                return dist;
            }
            
            /**
             * Get data of GeoRtriangle
             **/
            GeoRtriangle.prototype.getData = function(subid){
                if (!subid) {
                    var data = {
                        type: this.type,
                        name: this.name,
                        geoid: this.geoid,
                        p1: this.p1,
                        p2: this.p2,
                        p3dist: this.p3dist,
                        dash: this.dash,
                        showName: this.showName,
                        showP3: this.showP3,
                        showP3Name: this.showP3Name,
                        showRightangle: this.showRightangle,
                        visible: this.visible,
                        strokeColor: this.strokeColor,
                        fillColor: this.fillColor,
                        labelOffset: this.labelOffset
                    }
                } else {
                    var data = {};
                    switch (subid){
                        case 'side1':
                            data.type = 'Line';
                            data.geoid = this.geoid + '-side1';
                            data.p1 = this.p1;
                            data.p2 = this.p2;
                            break;
                        case 'side2':
                            data.type = 'Line';
                            data.geoid = this.geoid + '-side2';
                            data.p1 = this.p2;
                            data.p2 = this.p3;
                            break;
                        case 'side3':
                            data.type = 'Line';
                            data.geoid = this.geoid + '-side3';
                            data.p1 = this.p3;
                            data.p2 = this.p1;
                            break;
                        default:
                            break
                    }
                }
                return data;
            }
            
            /**
             * Get the list of dependencies.
             **/
            GeoRtriangle.prototype.getDeps = function(){
                return [this.p1, this.p2, this.p3geoname];
            }
            
            /**
             * Get list string (to be shown in the object list)
             **/
            GeoRtriangle.prototype.getListStr = function(){
                var str = '<div class="gedit-listicon" title="'+this.type+'">' + this.icon + '</div><div class="gedit-listname"><i>' + this.getNameFormatted() + '</i><span class="geoedit-aka">=<i>\u25b3'+this.getObjName(this.p1)+this.getObjName(this.p2)+this.getObjName(this.p3)+'</i></span></div>';
                return str;
            }
            
            /**
             * CSS style defining the icon representing this type.
             **/
            GeoRtriangle.prototype.iconCSS = 'rtriangleBtn';
            
            GeoRtriangle.prototype.icon = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="20" height="20" viewbox="0 0 20 20" class="geoedit-icon geoedit-object-rtriangle"><path stroke="red" fill="none" d="M8 12 l-5 0 l0 5 l5 0z" /><path style="stroke: blue; fill: none;" d="M3 2 l0 15 l15 0z" /><circle style="stroke: none; fill: red;" cx="3" cy="2" r="2" /><circle style="stroke: none; fill: red;" cx="3" cy="17" r="2" /><circle style="stroke: red; fill: white;" cx="18" cy="17" r="2" /></svg>';

            /**
             * Draw the right triangle on board in the construction.
             **/
            GeoRtriangle.prototype.asConstruct = function(board, construction) {
                var geoobject = this;
                var p1 = board.objects[this.p1];
                var p2 = board.objects[this.p2];
                this.p1x = p1.X();
                this.p1y = p1.Y();
                this.p2x = p2.X();
                this.p2y = p2.Y();
                var line1 = board.create(
                    'line',
                    [this.p1, this.p2],
                    {
                        visible : this.visible,
                        name : '',
                        id : this.geoid + '-side1',
                        withLabel : false,
                        straightFirst : false,
                        straightLast : false,
                        dash : this.dash,
                        color : this.strokeColor
                    }
                );
                construction.lines.push(line1);
                
                var normal1 = board.create(
                    'normal',
                    [this.p2, line1],
                    {
                        visible : false,
                        name : '',
                        id : this.geoid + '-normal1'
                    }
                );
                normal1.gedithelpobject = true;
                
                var dx = p2.X() - p1.X();
                var dy = p2.Y() - p1.Y();
                var hypot = Math.sqrt(dx*dx + dy*dy);
                var ratio = this.p3dist/hypot;
                var p3x = p2.X() - dy*ratio;
                var p3y = p2.Y() + dx*ratio;
                this.p3 = board.create(
                    'glider',
                    [p3x, p3y, normal1],
                    {
                        visible: this.showP3,
                        name: (this.showP3Name ? this.p3name : ''),
                        id: this.p3geoid,
                        strokeColor: 'red',
                        fillColor: 'white'
                    }
                );
                
                var line2 = board.create(
                    'line',
                    [this.p2, this.p3],
                    {
                        visible : this.visible,
                        name : '',
                        id : this.geoid + '-side2',
                        withLabel : false,
                        straightFirst : false,
                        straightLast : false,
                        dash : this.dash,
                        color : this.strokeColor
                    }
                );
                construction.lines.push(line2);
                
                var line3 = board.create(
                    'line',
                    [this.p3, this.p1],
                    {
                        visible : this.visible,
                        name : '',
                        id : this.geoid + '-side3',
                        withLabel : false,
                        straightFirst : false,
                        straightLast : false,
                        dash : this.dash,
                        color : this.strokeColor
                    }
                );
                construction.lines.push(line3);
                
                var polygon = board.create(
                    'polygon',
                    [this.p1, this.p2, this.p3],
                    {
                        visible : this.visible,
                        name : this.name,
                        id : this.geoid,
                        withLabel : this.showName,
                        withLines : false,
                        straightFirst : false,
                        straightLast : false,
                        fillColor : this.fillColor,
                        fillOpacity : 1.0,
                        borders : {
                            strokeColor : this.strokeColor
                        }
                    }
                );
                construction.polygons.push(polygon);
                
                if (this.showRightangle) {
                    board.create(
                        'angle',
                        [this.p1, this.p2, this.p3],
                        {
                            visible: (JXG.Math.Geometry.trueAngle(p1, p2, this.p3).toFixed(0) < 180),
                            orthoType: 'square',
                            radius: this.angleradius,
                            id: this.geoid + '_rangle1',
                            name: function(){
                                board.objects[geoobject.geoid + '_rangle1'].setProperty({visible: (JXG.Math.Geometry.trueAngle(p1, p2, geoobject.p3).toFixed(0) < 180)});
                                    return '';
                            }
                        }
                    );
                    board.create(
                        'angle',
                        [this.p3, this.p2, this.p1],
                        {
                            visible: (JXG.Math.Geometry.trueAngle(this.p3, p2, p1).toFixed(0) < 180),
                            orthoType: 'square',
                            radius: this.angleradius,
                            id: this.geoid + '_rangle2',
                            name: function(){
                                board.objects[geoobject.geoid + '_rangle2'].setProperty({visible: (JXG.Math.Geometry.trueAngle(geoobject.p3, p2, p1).toFixed(0) < 180)});
                                    return '';
                            }
                        }
                    );
                }

                this.p3.on('up', function(event){
                    var point = this;
                    var p3x = point.X();
                    var p3y = point.Y();
                    geoobject.setData({p3x: p3x, p3y: p3y});
                    $(point.board.containerObj).trigger('objectupdate', [{name: geoobject.name, geoid: []}]);
                });
                line1.on('up', function(event){
                    var line = this;
                    var updoptions = {name: geoobject.name, geoid: [geoobject.p1, geoobject.p2, geoobject.geoid]};
                    $(line.board.containerObj).trigger('objectupdate', [updoptions]);
                });
                line2.on('up', function(event){
                    var line = this;
                    var updoptions = {name: geoobject.name, geoid: [geoobject.p2, geoobject.p3geoid]};
                    $(line.board.containerObj).trigger('objectupdate', [updoptions]);
                });
                line3.on('up', function(event){
                    var line = this;
                    var updoptions = {name: geoobject.name, geoid: [geoobject.p3geoid, geoobject.p4geoid]};
                    $(line.board.containerObj).trigger('objectupdate', [updoptions]);
                });
                line1.on('down', function(event){
                    var line = this;
                    var options = {name: geoobject.name, geoid: geoobject.geoid};
                    $(line.board.containerObj).trigger('objectselected', [options]);
                });
                line2.on('down', function(event){
                    var line = this;
                    var options = {name: geoobject.name, geoid: geoobject.geoid};
                    $(line.board.containerObj).trigger('objectselected', [options]);
                });
                line3.on('down', function(event){
                    var line = this;
                    var options = {name: geoobject.name, geoid: geoobject.geoid};
                    $(line.board.containerObj).trigger('objectselected', [options]);
                });
            }
            
            /**
             * Select this object.
             **/
            GeoRtriangle.prototype.select = function(board){
                board.objects[this.geoid + '-side1'] && board.objects[this.geoid + '-side1'].setProperty({shadow: true});
                board.objects[this.geoid + '-side2'] && board.objects[this.geoid + '-side2'].setProperty({shadow: true});
                board.objects[this.geoid + '-side3'] && board.objects[this.geoid + '-side3'].setProperty({shadow: true});
            }
            
            /**
             * Deselect this object.
             **/
            GeoRtriangle.prototype.deselect = function(board){
                board.objects[this.geoid + '-side1'] && board.objects[this.geoid + '-side1'].setProperty({shadow: false});
                board.objects[this.geoid + '-side2'] && board.objects[this.geoid + '-side2'].setProperty({shadow: false});
                board.objects[this.geoid + '-side3'] && board.objects[this.geoid + '-side3'].setProperty({shadow: false});
            }
            
            /**
             * Update data of the object from the board.
             **/
            GeoRtriangle.prototype.updateFromBoard = function(board){
                var p1 = board.objects[this.p1];
                var p2 = board.objects[this.p2];
                this.p1x = p1.X();
                this.p1y = p1.Y();
                this.p2x = p2.X();
                this.p2y = p2.Y();
                var p3 = board.objects[this.p3geoid];
                this.p3dist = this.getDist(p3.X(), p3.Y(), this.p3dist);
            }

            /**
             * Get list of elements of given type.
             **/
            GeoRtriangle.prototype.getOfType = function(otype){
                var list = [];
                switch (otype){
                    case 'Point':
                        list.push({id: this.p3geoid, name: this.p3name});
                        break;
                    case 'Triangle':
                        list.push({id: this.geoid, name: this.name});
                        break;
                    case 'Rtriangle':
                        list.push({id: this.geoid, name: this.name});
                        break;
                    case 'Linelike':
                        list.push({id: this.geoid + '-side1', name: this.name + '_1'});
                        list.push({id: this.geoid + '-side2', name: this.name + '_2'});
                        list.push({id: this.geoid + '-side3', name: this.name + '_3'});
                        break;
                    default:
                        break;
                }
                return list;
            }
            
            /**
             * Get the html for options dialog.
             **/
            GeoRtriangle.prototype.getOptionsDialog = function() {
                var pointlist = this.geoparent.getPointlikes();
                var dialog = {
                    basic: [
                        {
                            type: 'Label',
                            label: 'Id',
                            key: '',
                            value: this.geoid
                        },
                        {
                            type: 'Text',
                            label: 'Label',
                            key: 'name',
                            value: this.name
                        },
                        {
                            type: 'Select',
                            label: 'First point',
                            key: 'p1',
                            value: this.p1,
                            data: pointlist
                        },
                        {
                            type: 'Select',
                            label: 'Second point',
                            key: 'p2',
                            value: this.p2,
                            data: pointlist
                        },
                        {
                            type: 'Text',
                            label: 'Third point name',
                            key: 'p3name',
                            value: this.p3name
                        },
                        {
                            type: 'Color',
                            label: 'Stroke color',
                            key: 'strokeColor',
                            value: this.strokeColor
                        },
                        {
                            type: 'Color',
                            label: 'Fill color',
                            key: 'fillColor',
                            value: this.fillColor
                        }
                    ],
                    advanced: [
                        {
                            type: 'Checkbox',
                            label: 'Visible',
                            key: 'visible',
                            value: this.visible
                        },
                        {
                            type: 'Checkbox',
                            label: 'Show label',
                            key: 'showName',
                            value: this.showName
                        },
                        {
                            type: 'Checkbox',
                            label: 'Show third point',
                            key: 'showP3',
                            value: this.showP3
                        },
                        {
                            type: 'Checkbox',
                            label: 'Show third point name',
                            key: 'showP3Name',
                            value: this.showP3Name
                        },
                        {
                            type: 'Checkbox',
                            label: 'Show right angle',
                            key: 'showRightangle',
                            value: this.showRightangle
                        }
                    ]
                }
                var dashDialog = {
                    type: 'Select',
                    label: 'Line style',
                    key: 'dash',
                    value: this.dash,
                    data: []
                }
                for (var i = 0; i < this.dashTypes.length; i++) {
                    dashDialog.data.push({id: i, name: this.dashTypes[i]});
                }
                dialog.advanced.push(dashDialog);
                return dialog;
            }
            
            /**
             * Tell, if Right triangle is drawable.
             */
            GeoRtriangle.prototype.drawable = function(board){
                return  !!board.objects[this.p1] && !!board.objects[this.p2];
            }
        } // End GeoRighttriangle2
        
        { // GeoAngle
            /**
             * Constructor for geometric Angle object.
             */
            var GeoAngle = function(params, geoparent) {
                this.type = 'Angle';
                this.geoid = params.geoid;
                this.geoparent = geoparent;
                this.setData(params);
            }
            
            /**
             * Inherit the prototype of GeoObject.
             */
            GeoAngle.prototype = new GeoObject();
            
            /**
             * Set data from given object.
             */
            GeoAngle.prototype.setData = function(params){
                params = $.extend( {
                    'p1' : this.p1 || null,
                    'p2' : this.p2 || null,
                    'p3' : this.p3 || null,
                    'name' : (typeof(this.name) !== 'undefined' ? this.name : null),
                    'showName' : (typeof this.showName !== 'undefined' ? this.showName : true),
                    'visible' : (typeof this.visible !== 'undefined' ? this.visible : true),
                    'mode' : this.mode || 'angle',
                    'strokeColor' : this.strokeColor || '#ff0000',
                    'fillColor' : this.fillColor || '#ff0000',
                    'radius' : (typeof this.radius !== 'undefined' ? this.radius : 1.0),
                    'fillOpacity' : (typeof this.fillOpacity !== 'undefined' ? this.fillOpacity : 0.3),
                    'label' : {
                        'fixed': false
                    }
                }, params);
                
                this.p1 = params.p1;
                this.p2 = params.p2;
                this.p3 = params.p3;
                this.name = params.name;
                this.showName = params.showName;
                this.fillOpacity = params.fillOpacity;
                this.visible = params.visible;
                this.mode = params.mode;
                this.strokeColor = params.strokeColor;
                this.fillColor = params.fillColor;
                this.radius = this.strToNum(params.radius);
            }
            
            /**
             * Get data of GeoAngle
             **/
            GeoAngle.prototype.getData = function(){
                var data = {
                    type: this.type,
                    name: this.name,
                    geoid: this.geoid,
                    p1: this.p1,
                    p2: this.p2,
                    p3: this.p3,
                    mode: this.mode,
                    showName: this.showName,
                    visible: this.visible,
                    fillOpacity: this.fillOpacity,
                    strokeColor: this.strokeColor,
                    fillColor: this.fillColor,
                    radius: this.radius
                }
                return data;
            }
            
            /**
             * Get the list of dependencies.
             **/
            GeoAngle.prototype.getDeps = function(){
                return [this.p1, this.p2, this.p3];
            }
            
            /**
             * Get list string (to be shown in the object list)
             **/
            GeoAngle.prototype.getListStr = function(){
                var str = '<div class="gedit-listicon" title="'+this.type+'">' + this.icon + '</div><div class="gedit-listname"><i>' + this.getNameFormatted() + '</i><span class="geoedit-aka">=<i>\u2220'+this.getObjName(this.p1)+this.getObjName(this.p2)+this.getObjName(this.p3)+'</i></span></div>';
                return str;
            }
            
            /**
             * CSS style defining the icon representing this type.
             **/
            GeoAngle.prototype.iconCSS = 'angleBtn';
            
            GeoAngle.prototype.icon = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="20" height="20" viewbox="0 0 20 20" class="geoedit-icon geoedit-object-angle"><path style="stroke: #ff0000; fill: rgba(255,0,0,0.2);" d="M3 16 l10 -2 a11 11 0 0 0 -6 -7z" /><circle style="stroke: none; fill: red;" cx="11" cy="2" r="1.5" /><circle style="stroke: none; fill: red;" cx="18" cy="12" r="1.5" /><circle style="stroke: none; fill: red;" cx="3" cy="16" r="1.5" /><circle style="stroke: none; fill: blue;" cx="13" cy="8" r="1" /></svg>';

            /**
             * Return the value of angle (as degrees).
             **/
            GeoAngle.prototype.val = function() {
                var p1 = this.geoparent.board.objects[this.p1];
                var p2 = this.geoparent.board.objects[this.p2];
                var p3 = this.geoparent.board.objects[this.p3];
                var angval =  JXG.Math.Geometry.trueAngle(p1, p2, p3).toFixed(0);
                return angval;
            }
            
            /**
             * Return the value of angle (as degrees).
             **/
            GeoAngle.prototype.angleVal = function() {
                var angval =  this.val();
                if ((this.mode === 'angleSmall' && angval > 180) ||
                    (this.mode === 'angleLarge' && angval <= 180)) {
                    angval = 360 - angval;
                }
                return angval;
            }
            
            /**
             * Return the value of angle as a string.
             **/
            GeoAngle.prototype.angleStr = function() {
                if (this.showName) {
                    var angle = this.angleVal() + '&deg;';
                    if (this.name === '') {
                        var angleValue = this.val();
                        if ((angleValue === 90) || ((angleValue === 270) && (this.mode == 'angleSmall'))){
                            return ' ';
                        } else {
                            return angle;
                        }
                    } else {
                        return  this.name.replace(/%1/g, angle);
                    }
                } else {
                    return '';
                }
            }
            
            /**
             * Draw the angle on board in the construction.
             **/
            GeoAngle.prototype.asConstruct = function(board, construction) {
                var geoobject = this;
                if (!construction.angle) {
                    construction.angle = [];
                }
                if (this.mode === 'angle') {
                    var angle1 = board.create(
                        'angle',
                        [this.p1, this.p2, this.p3],
                        {
                            visible : this.visible,
                            id : this.geoid + '_1',
                            withLabel : true,
                            strokeWidth : 2,
                            strokeColor : this.strokeColor,
                            fillColor : this.fillColor,
                            fillOpacity : this.fillOpacity,
                            radius : this.radius,
                            needsRegularUpdate : true,
                            orthoSensitivity : 0.5,
                            label : {strokeColor: 'black'},
                            point : {visible: false},
                            name : function(){
                                return geoobject.angleStr();
                            }
                        }
                    );
                    construction.angle.push(angle1);
                }

                if (this.mode === 'angleSmall' || this.mode === 'angleLarge') {
                    var angle1 = board.create(
                        'angle',
                        [this.p1, this.p2, this.p3],
                        {
                            visible : geoobject.visible &&
                                ((geoobject.mode === 'angleSmall' && geoobject.val() <= 180) ||
                                 (geoobject.mode === 'angleLarge' && geoobject.val() > 180)),
                            id : this.geoid + '_1',
                            withLabel : true,
                            strokeWidth : 2,
                            strokeColor : this.strokeColor,
                            fillColor : this.fillColor,
                            fillOpacity : this.fillOpacity,
                            radius : this.radius,
                            needsRegularUpdate : true,
                            orthoSensitivity : 0.5,
                            label : {strokeColor: 'black'},
                            point : {visible: false},
                            name : function(){
                                board.objects[geoobject.geoid+'_1'].setProperty({
                                    visible: (geoobject.visible &&
                                    ((geoobject.mode === 'angleSmall' && geoobject.val() <= 180) ||
                                     (geoobject.mode === 'angleLarge' && geoobject.val() > 180)))
                                });
                                return geoobject.angleStr();
                            }
                        }
                    );
                    construction.angle.push(angle1);
                    var angle2 = board.create(
                        'angle',
                        [this.p3, this.p2, this.p1],
                        {
                            visible : this.visible &&
                                ((this.mode === 'angleSmall' && geoobject.val() > 180) ||
                                 (geoobject.mode === 'angleLarge' && geoobject.val() <= 180)),
                            id : this.geoid + '_2',
                            withLabel : true,
                            strokeWidth : 2,
                            strokeColor : this.strokeColor,
                            fillColor : this.fillColor,
                            fillOpacity : this.fillOpacity,
                            radius : this.radius,
                            needsRegularUpdate : true,
                            orthoSensitivity : 0.5,
                            label : {strokeColor: 'black'},
                            point : {visible: false},
                            name : function(){
                                board.objects[geoobject.geoid+'_2'].setProperty({
                                    visible: (geoobject.visible &&
                                    ((geoobject.mode === 'angleSmall' && geoobject.val() > 180) ||
                                     (geoobject.mode === 'angleLarge' && geoobject.val() <= 180)))
                                });
                                return geoobject.angleStr();
                            }
                        }
                    );
                    construction.angle.push(angle1);
                    angle2.on('down', function(event){
                        var line = this;
                        var options = {name: geoobject.name, geoid: geoobject.geoid};
                        $(line.board.containerObj).trigger('objectselected', [options]);
                    });
                }
                angle1.on('down', function(event){
                    var line = this;
                    var options = {name: geoobject.name, geoid: geoobject.geoid};
                    $(line.board.containerObj).trigger('objectselected', [options]);
                });
            }
            
            /**
             * Select this object.
             **/
            GeoAngle.prototype.select = function(board){
                board.objects[this.geoid + '_1'] && board.objects[this.geoid + '_1'].setProperty({shadow: true});
                board.objects[this.geoid + '_2'] && board.objects[this.geoid + '_2'].setProperty({shadow: true});
            }
            
            /**
             * Deselect this object.
             **/
            GeoAngle.prototype.deselect = function(board){
                board.objects[this.geoid + '_1'] && board.objects[this.geoid + '_1'].setProperty({shadow: false});
                board.objects[this.geoid + '_2'] && board.objects[this.geoid + '_2'].setProperty({shadow: false});
            }
            
            /**
             * Get list of elements of given type.
             **/
            GeoAngle.prototype.getOfType = function(otype){
                var list = [];
                switch (otype){
                    case 'Angle':
                        list.push({id: this.geoid+'_1', name: this.name});
                        list.push({id: this.geoid+'_2', name: this.name});
                        break;
                    default:
                        break;
                }
                return list;
            }
            
            /**
             * Get the html for options dialog.
             **/
            GeoAngle.prototype.getOptionsDialog = function() {
                var pointlist = this.geoparent.getPointlikes();
                var dialog = {
                    basic: [
                        {
                            type: 'Label',
                            label: 'Id',
                            key: '',
                            value: this.geoid
                        },
                        {
                            type: 'Text',
                            label: 'Label',
                            key: 'name',
                            value: this.name
                        },
                        {
                            type: 'Select',
                            label: 'Right point',
                            key: 'p1',
                            value: this.p1,
                            data: pointlist
                        },
                        {
                            type: 'Select',
                            label: 'Corner point',
                            key: 'p2',
                            value: this.p2,
                            data: pointlist
                        },
                        {
                            type: 'Select',
                            label: 'Left point',
                            key: 'p3',
                            value: this.p3,
                            data: pointlist
                        },
                        {
                            type: 'Color',
                            label: 'Stroke color',
                            key: 'strokeColor',
                            value: this.strokeColor
                        },
                        {
                            type: 'Color',
                            label: 'Fill color',
                            key: 'fillColor',
                            value: this.fillColor
                        }
                    ],
                    advanced: [
                        {
                            type: 'Checkbox',
                            label: 'Visible',
                            key: 'visible',
                            value: this.visible
                        },
                        {
                            type: 'Checkbox',
                            label: 'Show label',
                            key: 'showName',
                            value: this.showName
                        },
                        {
                            type: 'Text',
                            label: 'Radius',
                            key: 'radius',
                            value: this.radius
                        },
                        {
                            type: 'Text',
                            label: 'Fill opacity',
                            key: 'fillOpacity',
                            value: this.fillOpacity
                        },
                        {
                            type: 'Select',
                            label: 'Angle mode',
                            key: 'mode',
                            value: this.mode,
                            data: [
                                {id: 'angle', name: 'Angle'},
                                {id: 'angleSmall', name: 'Small angle'},
                                {id: 'angleLarge', name: 'Large angle'}
                            ]
                        }
                    ]
                }
                return dialog;
            }
            
            /**
             * Tell, if Angle is drawable.
             */
            GeoAngle.prototype.drawable = function(board){
                return  !!board.objects[this.p1] && !!board.objects[this.p2] && !!board.objects[this.p3];
            }
        } // End GeoAngle

        { // GeoBisector
            /**
             * Constructor for geometric Bisector object.
             */
            var GeoBisector = function(params, geoparent) {
                this.type = 'Bisector';
                this.geoid = params.geoid;
                this.geoparent = geoparent;
                this.setData(params);
            }
            
            /**
             * Inherit the prototype of GeoObject.
             */
            GeoBisector.prototype = new GeoObject();
            
            /**
             * Set data from given object.
             */
            GeoBisector.prototype.setData = function(params){
                params = $.extend( {
                    'p1' : this.p1 || null,
                    'p2' : this.p2 || null,
                    'p3' : this.p3 || null,
                    'name' : (typeof(this.name) !== 'undefined' ? this.name : null),
                    'showName' : (typeof this.showName !== 'undefined' ? this.showName : true),
                    'visible' : (typeof this.visible !== 'undefined' ? this.visible : true),
                    'strokeColor' : this.strokeColor || '#0000ff',
                    'dash' : (typeof this.dash !== 'undefined' ? this.dash : 0),
                    'isray' : (typeof this.isray !== 'undefined' ? this.isray : true)
                }, params);
                
                this.p1 = params.p1;
                this.p2 = params.p2;
                this.p3 = params.p3;
                this.name = params.name;
                this.showName = params.showName;
                this.visible = params.visible;
                this.strokeColor = params.strokeColor;
                this.dash = params.dash;
                this.isray = params.isray;
            }
            
            /**
             * Get data of GeoBisector
             **/
            GeoBisector.prototype.getData = function(){
                var data = {
                    type: this.type,
                    name: this.name,
                    geoid: this.geoid,
                    p1: this.p1,
                    p2: this.p2,
                    p3: this.p3,
                    showName: this.showName,
                    visible: this.visible,
                    strokeColor: this.strokeColor,
                    dash: this.dash,
                    isray: this.isray
                }
                return data;
            }
            
            /**
             * Get the list of dependencies.
             **/
            GeoBisector.prototype.getDeps = function(){
                return [this.p1, this.p2, this.p3];
            }
            
            /**
             * Get list string (to be shown in the object list)
             **/
            GeoBisector.prototype.getListStr = function(){
                var str = '<div class="gedit-listicon" title="'+this.type+'">' + this.icon + '</div><div class="gedit-listname"><i>' + this.getNameFormatted() + '</i><span class="geoedit-aka"></span></div>';
                return str;
            }
            
            /**
             * CSS style defining the icon representing this type.
             **/
            GeoBisector.prototype.iconCSS = 'bisectorBtn';
            
            GeoBisector.prototype.icon = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="20" height="20" viewbox="0 0 20 20" class="geoedit-icon geoedit-object-bisector"><line style="stroke: black;" x1="3" y1="16" x2="11" y2="2" /><line style="stroke: black;" x1="3" y1="16" x2="18" y2="12" /><line style="stroke: blue;" x1="0" y1="19" x2="20" y2="2" /><circle style="stroke: none; fill: red;" cx="11" cy="2" r="1.5" /><circle style="stroke: none; fill: red;" cx="18" cy="12" r="1.5" /><circle style="stroke: none; fill: red;" cx="3" cy="16" r="1.5" /></svg>';
            
            /**
             * Draw the bisector on board in the construction.
             **/
            GeoBisector.prototype.asConstruct = function(board, construction) {
                var geoobject = this;
                if (!construction.bisector) {
                    construction.bisector = [];
                }
                var bisect = board.create(
                    'bisector',
                    [this.p1, this.p2, this.p3],
                    {
                        visible : this.visible,
                        id : this.geoid,
                        withLabel : true,
                        strokeWidth : 2,
                        strokeColor : this.strokeColor,
                        straightFirst : !this.isray,
                        dash: this.dash,
                        name : this.name
                    }
                );
                construction.bisector.push(bisect);

                bisect.on('down', function(event){
                    var line = this;
                    var options = {name: geoobject.name, geoid: geoobject.geoid};
                    $(line.board.containerObj).trigger('objectselected', [options]);
                });
            }
            
            /**
             * Select this object.
             **/
            GeoBisector.prototype.select = function(board){
                board.objects[this.geoid] && board.objects[this.geoid].setProperty({shadow: true});
            }
            
            /**
             * Deselect this object.
             **/
            GeoBisector.prototype.deselect = function(board){
                board.objects[this.geoid] && board.objects[this.geoid].setProperty({shadow: false});
            }
            
            /**
             * Get list of elements of given type.
             **/
            GeoBisector.prototype.getOfType = function(otype){
                var list = [];
                switch (otype){
                    case 'Bisector':
                        list.push({id: this.geoid, name: this.name});
                        break;
                    default:
                        break;
                }
                return list;
            }
            
            /**
             * Get the html for options dialog.
             **/
            GeoBisector.prototype.getOptionsDialog = function() {
                var pointlist = this.geoparent.getPointlikes();
                var dialog = {
                    basic: [
                        {
                            type: 'Label',
                            label: 'Id',
                            key: '',
                            value: this.geoid
                        },
                        {
                            type: 'Text',
                            label: 'Label',
                            key: 'name',
                            value: this.name
                        },
                        {
                            type: 'Select',
                            label: 'Right point',
                            key: 'p1',
                            value: this.p1,
                            data: pointlist
                        },
                        {
                            type: 'Select',
                            label: 'Corner point',
                            key: 'p2',
                            value: this.p2,
                            data: pointlist
                        },
                        {
                            type: 'Select',
                            label: 'Left point',
                            key: 'p3',
                            value: this.p3,
                            data: pointlist
                        },
                        {
                            type: 'Color',
                            label: 'Stroke color',
                            key: 'strokeColor',
                            value: this.strokeColor
                        }
                    ],
                    advanced: [
                        {
                            type: 'Checkbox',
                            label: 'Visible',
                            key: 'visible',
                            value: this.visible
                        },
                        {
                            type: 'Checkbox',
                            label: 'Show label',
                            key: 'showName',
                            value: this.showName
                        },
                        {
                            type: 'Checkbox',
                            label: 'Is ray',
                            key: 'isray',
                            value: this.isray
                        }
                    ]
                }
                var dashDialog = {
                    type: 'Select',
                    label: 'Line style',
                    key: 'dash',
                    value: this.dash,
                    data: []
                }
                for (var i = 0; i < this.dashTypes.length; i++) {
                    dashDialog.data.push({id: i, name: this.dashTypes[i]});
                }
                dialog.advanced.push(dashDialog);
                return dialog;
            }
            
            /**
             * Tell, if Bisector is drawable.
             */
            GeoBisector.prototype.drawable = function(board){
                return  !!board.objects[this.p1] && !!board.objects[this.p2] && !!board.objects[this.p3];
            }
        } // End GeoBisector

        { // GeoNormal
            /**
             * Constructor for geometric normal object.
             */
            var GeoNormal = function(params, geoparent) {
                this.type = 'Normal';
                this.geoid = params.geoid;
                this.geoparent = geoparent;
                this.setData(params);
            }
            
            /**
             * Inherit the prototype of GeoObject.
             */
            GeoNormal.prototype = new GeoObject();
            
            /**
             * Set data from given object.
             */
            GeoNormal.prototype.setData = function(params){
                params = $.extend( {
                    'p1' : this.p1 || null,
                    'p2' : this.p2 || null,
                    'name' : (typeof this.name !== 'undefined' ? this.name : null),
                    'dash' : this.dash || 0,
                    'showName' : (typeof this.showName !== 'undefined' ? this.showName : true),
                    'visible' : (typeof this.visible !== 'undefined' ? this.visible : true),
                    'color' : this.color || '#0000ff',
                    'strokeWidth' : (typeof(this.strokeWidth) !== 'undefined' ? this.strokeWidth : 2)
                }, params);
                
                this.p1 = params.p1;
                this.p2 = params.p2;
                this.strokeWidth = this.strToNum(params.strokeWidth);
                this.name = params.name || this.name;
                this.dash = params.dash;
                this.showName = params.showName;
                this.visible = params.visible;
                this.color = params.color;
            }
            
            /**
             * Get data of GeoNormal
             **/
            GeoNormal.prototype.getData = function(){
                var data = {
                    type: this.type,
                    name: this.name,
                    geoid: this.geoid,
                    p1: this.p1,
                    p2: this.p2,
                    dash: this.dash,
                    showName: this.showName,
                    visible: this.visible,
                    color: this.color,
                    strokeWidth: this.strokeWidth
                }
                return data;
            }
            
            /**
             * Get the list of dependencies.
             **/
            GeoNormal.prototype.getDeps = function(){
                return [this.p1, this.p2];
            }
            
            /**
             * Get list string (to be shown in the object list)
             **/
            GeoNormal.prototype.getListStr = function(){
                var str = '<div class="gedit-listicon" title="'+this.type+'">' + this.icon + '</div><div class="gedit-listname"><i>' + this.getNameFormatted() + '</i><span class="geoedit-aka">=<i>\u27c2</i>(<i>'+this.getObjName(this.p1)+'</i>,<i>'+this.getObjName(this.p2)+'</i>)</span></div>';
                return str;
            }
            
            /**
             * CSS style defining the icon representing this type.
             **/
            GeoNormal.prototype.iconCSS = 'normalBtn';
            
            GeoNormal.prototype.icon = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="20" height="20" viewbox="0 0 20 20" class="geoedit-icon geoedit-object-normal"><line style="stroke: blue;" x1="0" y1="4" x2="20" y2="17" /><line style="stroke: black;" x1="20" y1="4" x2="8" y2="20" /><circle style="stroke: none; fill: red;" cx="4.5" cy="7" r="2" /></svg>';

            /**
             * Draw the normal on board in the construction.
             **/
            GeoNormal.prototype.asConstruct = function(board, construction) {
                var geonormal = this;
                var normal = board.create(
                    'normal',
                    [this.p1, this.p2],
                    {
                        // Options here.
                        visible : this.visible,
                        name : this.name,
                        id : this.geoid,
                        withLabel : this.showName,
                        straightFirst : true,
                        straightLast : true,
                        dash : this.dash,
                        strokeWidth : this.strokeWidth,
                        color : this.color
                    }
                );
                
                construction.lines.push(normal);
                
                normal.on('up', function(event){
                    var line = this;
                    var updoptions = {name: geonormal.name, geoid: [geonormal.p1, geonormal.p2]};
                    $(normal.board.containerObj).trigger('objectupdate', [updoptions]);
                });
                normal.on('down', function(event){
                    var normal = this;
                    var options = {name: geonormal.name, geoid: geonormal.geoid};
                    $(normal.board.containerObj).trigger('objectselected', [options]);
                });
            }
            
            /**
             * Get list of elements of given type.
             **/
            GeoNormal.prototype.getOfType = function(otype){
                var list = [];
                switch (otype){
                    case 'Linelike':
                        list.push({id: this.geoid, name: this.name});
                        break;
                    case 'Normal':
                        list.push({id: this.geoid, name: this.name});
                        break;
                    default:
                        break;
                }
                return list;
            }
            
            /**
             * Get the html for options dialog.
             **/
            GeoNormal.prototype.getOptionsDialog = function() {
                var pointlist = this.geoparent.getPointlikes();
                var curvelist = this.geoparent.getCurves();
                var dialog = {
                    basic: [
                        {
                            type: 'Label',
                            label: 'Id',
                            key: '',
                            value: this.geoid
                        },
                        {
                            type: 'Text',
                            label: 'Label',
                            key: 'name',
                            value: this.name
                        },
                        {
                            type: 'Select',
                            label: 'Curve',
                            key: 'p1',
                            value: this.p1,
                            data: curvelist
                        },
                        {
                            type: 'Select',
                            label: 'Point',
                            key: 'p2',
                            value: this.p2,
                            data: pointlist
                        },
                        {
                            type: 'Color',
                            label: 'Color',
                            key: 'color',
                            value: this.color
                        },
                        {
                            type: 'Select',
                            label: 'Line type',
                            key: 'lineType',
                            value: this.lineType,
                            data: [
                                {id: 'line', name: 'Line'},
                                {id: 'lineSegment', name: 'Line segment'},
                                {id: 'startingLine', name: 'Starting line segment'},
                                {id: 'endingLine', name: 'Ending line segment'}
                            ]
                        }
                    ],
                    advanced: [
                        {
                            type: 'Text',
                            label: 'Stroke width',
                            key: 'strokeWidth',
                            value: this.numToStr(this.strokeWidth)
                        },
                        {
                            type: 'Checkbox',
                            label: 'Visible',
                            key: 'visible',
                            value: this.visible
                        },
                        {
                            type: 'Checkbox',
                            label: 'Show label',
                            key: 'showName',
                            value: this.showName
                        }
                    ]
                }
                var dashDialog = {
                    type: 'Select',
                    label: 'Line style',
                    key: 'dash',
                    value: this.dash,
                    data: []
                }
                for (var i = 0; i < this.dashTypes.length; i++) {
                    dashDialog.data.push({id: i, name: this.dashTypes[i]});
                }
                dialog.advanced.push(dashDialog);
                return dialog;
            }
            
            /**
             * Tell, if Normal is drawable.
             */
            GeoNormal.prototype.drawable = function(board){
                return  !!board.objects[this.p1] && !!board.objects[this.p2];
            }
        } // End GeoNormal
        
        { // GeoParallel
            /**
             * Constructor for geometric parallel object.
             */
            var GeoParallel = function(params, geoparent) {
                this.type = 'Parallel';
                this.geoid = params.geoid;
                this.geoparent = geoparent;
                this.setData(params);
            }
            
            /**
             * Inherit the prototype of GeoObject.
             */
            GeoParallel.prototype = new GeoObject();
            
            /**
             * Set data from given object.
             */
            GeoParallel.prototype.setData = function(params){
                params = $.extend( {
                    'p1' : this.p1 || null,
                    'p2' : this.p2 || null,
                    'name' : (typeof this.name !== 'undefined' ? this.name : null),
                    'dash' : this.dash || 0,
                    'showName' : (typeof this.showName !== 'undefined' ? this.showName : true),
                    'visible' : (typeof this.visible !== 'undefined' ? this.visible : true),
                    'color' : this.color || '#0000ff',
                    'strokeWidth' : (typeof(this.strokeWidth) !== 'undefined' ? this.strokeWidth : 2)
                }, params);
                
                this.p1 = params.p1;
                this.p2 = params.p2;
                this.strokeWidth = this.strToNum(params.strokeWidth);
                this.name = params.name;
                this.dash = params.dash;
                this.showName = params.showName;
                this.visible = params.visible;
                this.color = params.color;
            }
            
            /**
             * Get data of GeoParallel
             **/
            GeoParallel.prototype.getData = function(){
                var data = {
                    type: this.type,
                    name: this.name,
                    geoid: this.geoid,
                    p1: this.p1,
                    p2: this.p2,
                    dash: this.dash,
                    showName: this.showName,
                    visible: this.visible,
                    color: this.color,
                    strokeWidth: this.strokeWidth
                }
                return data;
            }
            
            /**
             * Get the list of dependencies.
             **/
            GeoParallel.prototype.getDeps = function(){
                return [this.p1, this.p2];
            }
            
            /**
             * Get list string (to be shown in the object list)
             **/
            GeoParallel.prototype.getListStr = function(){
                var str = '<div class="gedit-listicon" title="'+this.type+'">' + this.icon + '</div><div class="gedit-listname"><i>' + this.getNameFormatted() + '</i><span class="geoedit-aka">=<i>\u2225</i>(<i>'+this.getObjName(this.p1)+'</i>,<i>'+this.getObjName(this.p2)+'</i>)</span></div>';
                return str;
            }
            
            /**
             * CSS style defining the icon representing this type.
             **/
            GeoParallel.prototype.iconCSS = 'parallelBtn';
            
            GeoParallel.prototype.icon = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="20" height="20" viewbox="0 0 20 20" class="geoedit-icon geoedit-object-parallel"><line style="stroke: blue;" x1="0" y1="16" x2="12" y2="0" /><line style="stroke: black;" x1="20" y1="4" x2="8" y2="20" /><circle style="stroke: none; fill: red;" cx="6" cy="8" r="2" /></svg>';

            /**
             * Draw the parallel on board in the construction.
             **/
            GeoParallel.prototype.asConstruct = function(board, construction) {
                var geoparallel = this;
                var parallel = board.create(
                    'parallel',
                    [this.p1, this.p2],
                    {
                        // Options here.
                        visible : this.visible,
                        name : this.name,
                        id : this.geoid,
                        withLabel : this.showName,
                        straightFirst : true,
                        straightLast : true,
                        dash : this.dash,
                        strokeWidth : this.strokeWidth,
                        color : this.color
                    }
                );
                
                construction.lines.push(parallel);
                
                parallel.on('up', function(event){
                    var line = this;
                    var updoptions = {name: geoparallel.name, geoid: [geoparallel.p1, geoparallel.p2]};
                    $(parallel.board.containerObj).trigger('objectupdate', [updoptions]);
                });
                parallel.on('down', function(event){
                    var parallel = this;
                    var options = {name: geoparallel.name, geoid: geoparallel.geoid};
                    $(parallel.board.containerObj).trigger('objectselected', [options]);
                });
            }
            
            /**
             * Get list of elements of given type.
             **/
            GeoParallel.prototype.getOfType = function(otype){
                var list = [];
                switch (otype){
                    case 'Linelike':
                        list.push({id: this.geoid, name: this.name});
                        break;
                    case 'Parallel':
                        list.push({id: this.geoid, name: this.name});
                        break;
                    default:
                        break;
                }
                return list;
            }
            
            /**
             * Get the html for options dialog.
             **/
            GeoParallel.prototype.getOptionsDialog = function() {
                var pointlist = this.geoparent.getPointlikes();
                var curvelist = this.geoparent.getCurves();
                var dialog = {
                    basic: [
                        {
                            type: 'Label',
                            label: 'Id',
                            key: '',
                            value: this.geoid
                        },
                        {
                            type: 'Text',
                            label: 'Label',
                            key: 'name',
                            value: this.name
                        },
                        {
                            type: 'Select',
                            label: 'Curve',
                            key: 'p1',
                            value: this.p1,
                            data: curvelist
                        },
                        {
                            type: 'Select',
                            label: 'Point',
                            key: 'p2',
                            value: this.p2,
                            data: pointlist
                        },
                        {
                            type: 'Color',
                            label: 'Color',
                            key: 'color',
                            value: this.color
                        },
                        {
                            type: 'Select',
                            label: 'Line type',
                            key: 'lineType',
                            value: this.lineType,
                            data: [
                                {id: 'line', name: 'Line'},
                                {id: 'lineSegment', name: 'Line segment'},
                                {id: 'startingLine', name: 'Starting line segment'},
                                {id: 'endingLine', name: 'Ending line segment'}
                            ]
                        }
                    ],
                    advanced: [
                        {
                            type: 'Text',
                            label: 'Stroke width',
                            key: 'strokeWidth',
                            value: this.numToStr(this.strokeWidth)
                        },
                        {
                            type: 'Checkbox',
                            label: 'Visible',
                            key: 'visible',
                            value: this.visible
                        },
                        {
                            type: 'Checkbox',
                            label: 'Show label',
                            key: 'showName',
                            value: this.showName
                        }
                    ]
                }
                var dashDialog = {
                    type: 'Select',
                    label: 'Line style',
                    key: 'dash',
                    value: this.dash,
                    data: []
                }
                for (var i = 0; i < this.dashTypes.length; i++) {
                    dashDialog.data.push({id: i, name: this.dashTypes[i]});
                }
                dialog.advanced.push(dashDialog);
                return dialog;
            }
            
            /**
             * Tell, if Parallel is drawable.
             */
            GeoParallel.prototype.drawable = function(board){
                return  !!board.objects[this.p1] && !!board.objects[this.p2];
            }
        } // End GeoParallel
        
        { // GeoTangent
            /**
             * Constructor for geometric tangent object.
             */
            var GeoTangent = function(params, geoparent) {
                this.type = 'Tangent';
                this.geoid = params.geoid;
                this.geoparent = geoparent;
                this.setData(params);
            }
            
            /**
             * Inherit the prototype of GeoObject.
             */
            GeoTangent.prototype = new GeoObject();
            
            /**
             * Set data from given object.
             */
            GeoTangent.prototype.setData = function(params){
                params = $.extend( {
                    'p1' : this.p1 || null,
                    'p2' : this.p2 || null,
                    'i1Name': (typeof this.i1Name !== 'undefined' ? this.i1Name : null),
                    'i2Name': (typeof this.i2Name !== 'undefined' ? this.i2Name : null),
                    'name' : (typeof this.name !== 'undefined' ? this.name : null),
                    'dash' : this.dash || 0,
                    'showName' : (typeof this.showName !== 'undefined' ? this.showName : true),
                    'visible' : (typeof this.visible !== 'undefined' ? this.visible : true),
                    'color' : this.color || '#0000ff',
                    'strokeWidth' : (typeof(this.strokeWidth) !== 'undefined' ? this.strokeWidth : 2)
                }, params);
                
                this.p1 = params.p1;
                this.p2 = params.p2;
                this.i1Name = params.i1Name;
                this.i2Name = params.i2Name;
                this.strokeWidth = this.strToNum(params.strokeWidth);
                this.name = params.name || this.name;
                this.dash = params.dash;
                this.showName = params.showName;
                this.visible = params.visible;
                this.color = params.color;
            }
            
            /**
             * Get data of GeoTangent
             **/
            GeoTangent.prototype.getData = function(){
                var data = {
                    type: this.type,
                    name: this.name,
                    geoid: this.geoid,
                    p1: this.p1,
                    p2: this.p2,
                    i1Name: this.i1Name,
                    i2Name: this.i2Name,
                    dash: this.dash,
                    showName: this.showName,
                    visible: this.visible,
                    color: this.color,
                    strokeWidth: this.strokeWidth
                }
                return data;
            }
            
            /**
             * Get the list of dependencies.
             **/
            GeoTangent.prototype.getDeps = function(){
                return [this.p1, this.p2];
            }
            
            /**
             * Get list string (to be shown in the object list)
             **/
            GeoTangent.prototype.getListStr = function(){
                var str = '<div class="gedit-listicon" title="'+this.type+'">' + this.icon + '</div><div class="gedit-listname"><i>' + this.getNameFormatted() + '</i><span class="geoedit-aka">=<i>T</i>(<i>'+this.getObjName(this.p1)+'</i>,<i>'+this.getObjName(this.p2)+'</i>)</span></div>';
                return str;
            }
            
            /**
             * CSS style defining the icon representing this type.
             **/
            GeoTangent.prototype.iconCSS = 'tangentBtn';
            
            GeoTangent.prototype.icon = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="20" height="20" viewbox="0 0 20 20" class="geoedit-icon geoedit-object-tangent"><path style="fill: none; stroke: black;" d="M0 16 a8 8 0 0 0 8.5 -16" /><line style="stroke: blue;" x1="20" y1="4" x2="8" y2="20" /><circle style="stroke: none; fill: red;" cx="12.5" cy="13" r="2" /></svg>';

            /**
             * Draw the normal on board in the construction.
             **/
            GeoTangent.prototype.asConstruct = function(board, construction) {
                var geotangent = this;
                var jsxpoint = board.objects[this.p2];
                var jsxcurve = board.objects[this.p1];
                if (((jsxpoint.elType === 'glider' || jsxpoint.elType === 'intersection') && jsxpoint.ancestors[this.p1]) ||
                    (jsxcurve.elType === 'circle' && jsxpoint.elType === 'point' && jsxcurve.ancestors[this.p2])) {
                    var tangent1 = board.create(
                        'tangent',
                        [this.p1, this.p2],
                        {
                            // Options here.
                            visible : this.visible,
                            name : this.name,
                            id : this.geoid,
                            dash: this.dash,
                            strokeWidth: this.strokeWidth,
                            color: this.color
                        }
                    );
                } else {
                    var helpline1 = board.create(
                        'tangent',
                        [this.p1, this.p2],
                        {
                            // Options here.
                            visible : false,
                            name : '',
                            id : this.geoid + '_helpline1',
                            straightFirst : true,
                            straightLast : true
                        }
                    );
                    this.intpoint1 = board.create(
                        'intersection',
                        [this.p1, helpline1, 0],
                        {
                            visible: this.visible,
                            id: this.geoid + '-intersection1',
                            face: '+',
                            size: 6
                        }
                    );
                    this.i1Name = this.intpoint1.name;
                    this.intpoint2 = board.create(
                        'intersection',
                        [this.p1, helpline1, 1],
                        {
                            visible: this.visible,
                            id: this.geoid + '-intersection2',
                            face: '+',
                            size: 6
                        }
                    );
                    this.i2Name = this.intpoint2.name;
                    var tangent1 = board.create(
                        'line',
                        [this.p2, this.intpoint1],
                        {
                            visible: this.visible,
                            id: this.geoid + '-1',
                            name: this.name + '1',
                            color: this.color,
                            strokeWidth: this.strokeWidth,
                            dash: this.dash
                        }
                    );
                    var tangent2 = board.create(
                        'line',
                        [this.p2, this.intpoint2],
                        {
                            visible: this.visible,
                            id: this.geoid + '-2',
                            name: this.name + '2',
                            color: this.color,
                            strokeWidth: this.strokeWidth,
                            dash: this.dash
                        }
                    );
                }
                construction.lines.push(tangent1);
                tangent2 && construction.lines.push(tangent2);
                
                
                tangent1.on('up', function(event){
                    var line = this;
                    var updoptions = {name: geotangent.name, geoid: [geotangent.p1, geotangent.p2]};
                    $(tangent1.board.containerObj).trigger('objectupdate', [updoptions]);
                });
                tangent2 && tangent2.on('up', function(event){
                    var line = this;
                    var updoptions = {name: geotangent.name, geoid: [geotangent.p1, geotangent.p2]};
                    $(tangent2.board.containerObj).trigger('objectupdate', [updoptions]);
                });
                tangent1.on('down', function(event){
                    var normal = this;
                    var options = {name: geotangent.name, geoid: geotangent.geoid};
                    $(tangent1.board.containerObj).trigger('objectselected', [options]);
                });
                tangent2 && tangent2.on('down', function(event){
                    var normal = this;
                    var options = {name: geotangent.name, geoid: geotangent.geoid};
                    $(tangent2.board.containerObj).trigger('objectselected', [options]);
                });
            }
            
            /**
             * Get list of elements of given type.
             **/
            GeoTangent.prototype.getOfType = function(otype){
                var list = [];
                switch (otype){
                    case 'Point':
                        this.intpoint1 && list.push({id: this.geoid + '-intersection1', name: this.i1Name});
                        this.intpoint2 && list.push({id: this.geoid + '-intersection2', name: this.i2Name});
                        break;
                    case 'Linelike':
                        list.push({id: this.geoid, name: this.name});
                        break;
                    case 'Tangent':
                        list.push({id: this.geoid + '_1', name: this.name + '1'});
                        list.push({id: this.geoid + '_2', name: this.name + '2'});
                        break;
                    default:
                        break;
                }
                return list;
            }
            
            /**
             * Get the html for options dialog.
             **/
            GeoTangent.prototype.getOptionsDialog = function() {
                var pointlist = this.geoparent.getPointlikes();
                var curvelist = this.geoparent.getCurves();
                var dialog = {
                    basic: [
                        {
                            type: 'Label',
                            label: 'Id',
                            key: '',
                            value: this.geoid
                        },
                        {
                            type: 'Text',
                            label: 'Label',
                            key: 'name',
                            value: this.name
                        },
                        {
                            type: 'Select',
                            label: 'Curve',
                            key: 'p1',
                            value: this.p1,
                            data: curvelist
                        },
                        {
                            type: 'Select',
                            label: 'Point',
                            key: 'p2',
                            value: this.p2,
                            data: pointlist
                        },
                        {
                            type: 'Text',
                            label: 'Intersection 1 name',
                            key: 'i1name',
                            value: this.i1name
                        },
                        {
                            type: 'Text',
                            label: 'Intersection 2 name',
                            key: 'i2name',
                            value: this.i2name
                        },
                        {
                            type: 'Color',
                            label: 'Color',
                            key: 'color',
                            value: this.color
                        },
                        {
                            type: 'Select',
                            label: 'Line type',
                            key: 'lineType',
                            value: this.lineType,
                            data: [
                                {id: 'line', name: 'Line'},
                                {id: 'lineSegment', name: 'Line segment'},
                                {id: 'startingLine', name: 'Starting line segment'},
                                {id: 'endingLine', name: 'Ending line segment'}
                            ]
                        }
                    ],
                    advanced: [
                        {
                            type: 'Text',
                            label: 'Stroke width',
                            key: 'strokeWidth',
                            value: this.numToStr(this.strokeWidth)
                        },
                        {
                            type: 'Checkbox',
                            label: 'Visible',
                            key: 'visible',
                            value: this.visible
                        },
                        {
                            type: 'Checkbox',
                            label: 'Show label',
                            key: 'showName',
                            value: this.showName
                        }
                    ]
                }
                var dashDialog = {
                    type: 'Select',
                    label: 'Line style',
                    key: 'dash',
                    value: this.dash,
                    data: []
                }
                for (var i = 0; i < this.dashTypes.length; i++) {
                    dashDialog.data.push({id: i, name: this.dashTypes[i]});
                }
                dialog.advanced.push(dashDialog);
                return dialog;
            }
            
            /**
             * Tell, if Tangent is drawable.
             */
            GeoTangent.prototype.drawable = function(board){
                return  !!board.objects[this.p1] && !!board.objects[this.p2];
            }
        } // End GeoTangent
        
        { // GeoRectangle
            /**
             * Constructor for geometric triangle object.
             */
            var GeoRectangle = function(params, geoparent) {
                this.type = 'Rectangle';
                this.geoid = params.geoid;
                this.geoparent = geoparent;
                this.setData(params);
            }
            
            /**
             * Inherit the prototype of GeoObject.
             */
            GeoRectangle.prototype = new GeoObject();
            
            /**
             * Set data from given object.
             */
            GeoRectangle.prototype.setData = function(params){
                params = $.extend( {
                    'p1' : this.p1 || null,
                    'p2' : this.p2 || null,
                    'p3dist' : (typeof(this.p3dist) !== 'undefined' ? this.p3dist : null),
                    'p3name' : (typeof(this.p3name) !== 'undefined' ? this.p3name : null),
                    'p4name' : (typeof(this.p4name) !== 'undefined' ? this.p4name : null),
                    'name' : (typeof(this.name) !== 'undefined' ? this.name : null),
                    'dash' : this.dash || 0,
                    'showName' : (typeof(this.showName) !== 'undefined' ? this.showName : true),
                    'visible' : (typeof(this.visible) !== 'undefined' ? this.visible : true),
                    'showP3' : (typeof(this.showP3) !== 'undefined' ? this.showP3 : true),
                    'showP4' : (typeof(this.showP4) !== 'undefined' ? this.showP4 : true),
                    'showP3Name' : (typeof(this.showP3Name) !== 'undefined' ? this.showP3Name : true),
                    'showP4Name' : (typeof(this.showP4Name) !== 'undefined' ? this.showP4Name : true),
                    'showRightangle' : (typeof this.showRightangle !== 'undefined' ? this.showRightangle : false),
                    'strokeColor' : this.strokeColor || '#0000ff',
                    'fillColor' : this.fillColor || 'none',
                    'strokeWidth' : (typeof(this.strokeWidth) !== 'undefined' ? this.strokeWidth : 2)
                }, params);
                
                this.p1 = params.p1;
                this.p2 = params.p2;
                this.p3geoid = this.geoid + '-p3';
                this.p4geoid = this.geoid + '-p4';
                this.p3dist = this.getDist(params.p3x, params.p3y, params.p3dist);
                this.p3name = params.p3name;
                this.p4name = params.p4name;
                this.strokeWidth = this.strToNum(params.strokeWidth);
                this.name = params.name;
                this.dash = params.dash;
                this.showName = params.showName;
                this.showP3 = params.showP3;
                this.showP3Name = params.showP3Name;
                this.showP4 = params.showP4;
                this.showP4Name = params.showP4Name;
                this.showRightangle = params.showRightangle;
                this.visible = params.visible;
                this.strokeColor = params.strokeColor;
                this.fillColor = params.fillColor;
                this.angleradius = 0.5;
            }
            
            /**
             * Get the distance of p3 from p3 with given coordinates of p3.
             * The sign + means right from segment p2 p1 and - means left of it.
             * The third argument is returned, if x or y is undefined.
             **/
            GeoRectangle.prototype.getDist = function(x, y, defaultval){
                var dist = defaultval;
                if (typeof(x) !== 'undefined' && typeof(y) !== 'undefined') {
                    var sign;
                    if (this.p1x-this.p2x === 0) {
                        sign = (x > this.p2x ? +1 : -1);
                    } else if (this.p1x > this.p2x) {
                        sign = (y > (this.p1y-this.p2y)/(this.p1x-this.p2x)*(x-this.p1x) + this.p1y ? -1 : 1);
                    } else {
                        sign = (y > (this.p1y-this.p2y)/(this.p1x-this.p2x)*(x-this.p1x) + this.p1y ? 1 : -1);
                    }
                    var dx = this.p2x - x;
                    var dy = this.p2y - y;
                    dist = sign * Math.sqrt(dx*dx + dy*dy);
                }
                return dist;
            }
            
            /**
             * Get data of GeoRectangle
             **/
            GeoRectangle.prototype.getData = function(subid){
                if (!subid) {
                    var data = {
                        type: this.type,
                        name: this.name,
                        geoid: this.geoid,
                        p1: this.p1,
                        p2: this.p2,
                        p3dist: this.p3dist,
                        p3name: this.p3name,
                        p4name: this.p4name,
                        dash: this.dash,
                        showName: this.showName,
                        showP3: this.showP3,
                        showP3Name: this.showP3Name,
                        showP4: this.showP4,
                        showP4Name: this.showP4Name,
                        showRightangle: this.showRightangle,
                        visible: this.visible,
                        strokeColor: this.strokeColor,
                        fillColor: this.fillColor,
                        labelOffset: this.labelOffset
                    }
                } else {
                    var data = {};
                    switch (subid){
                        case 'side1':
                            data.type = 'Line';
                            data.geoid = this.geoid + '-side1';
                            data.p1 = this.p1;
                            data.p2 = this.p2;
                            break;
                        case 'side2':
                            data.type = 'Line';
                            data.geoid = this.geoid + '-side2';
                            data.p1 = this.p2;
                            data.p2 = this.geoid + '-p3';
                            break;
                        case 'side3':
                            data.type = 'Line';
                            data.geoid = this.geoid + '-side3';
                            data.p1 = this.p3geoid;
                            data.p2 = this.p4geoid;
                            break;
                        case 'side4':
                            data.type = 'Line';
                            data.geoid = this.geoid + '-side4';
                            data.p1 = this.p4geoid;
                            data.p2 = this.p1;
                            break;
                        default:
                            break
                    }
                }
                return data;
            }
            
            /**
             * Get the list of dependencies.
             **/
            GeoRectangle.prototype.getDeps = function(){
                return [this.p1, this.p2, this.p3geoname];
            }
            
            /**
             * Get list string (to be shown in the object list)
             **/
            GeoRectangle.prototype.getListStr = function(){
                var str = '<div class="gedit-listicon" title="'+this.type+'">' + this.icon + '</div><div class="gedit-listname"><i>' + this.getNameFormatted() + '</i><span class="geoedit-aka">=<i>\u25af'+this.getObjName(this.p1)+this.getObjName(this.p2)+this.p3name+this.p4name+'</i></span></div>';
                return str;
            }
            
            /**
             * CSS style defining the icon representing this type.
             **/
            GeoRectangle.prototype.iconCSS = 'rectangleBtn';
            
            GeoRectangle.prototype.icon = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="20" height="20" viewbox="0 0 20 20" class="geoedit-icon geoedit-object-rectangle"><rect style="stroke: blue; fill: none;" x="3" y="5" width="14" height="10" /><circle style="stroke: none; fill: red;" cx="3" cy="5" r="2" /><circle style="stroke: none; fill: red;" cx="17" cy="5" r="2" /><circle style="stroke: none; fill: red;" cx="17" cy="15" r="2" /><circle style="stroke: none; fill: red;" cx="3" cy="15" r="2" /></svg>';

            /**
             * Update data of the object from the board.
             **/
            GeoRectangle.prototype.updateFromBoard = function(board){
                var p1 = board.objects[this.p1];
                var p2 = board.objects[this.p2];
                this.p1x = p1.X();
                this.p1y = p1.Y();
                this.p2x = p2.X();
                this.p2y = p2.Y();
                var p3 = board.objects[this.p3geoid];
                this.p3dist = this.getDist(p3.X(), p3.Y(), this.p3dist);
            }
            
            /**
             * Draw the rectangle on board in the construction.
             **/
            GeoRectangle.prototype.asConstruct = function(board, construction) {
                var geoobject = this;
                var p1 = board.objects[this.p1];
                var p2 = board.objects[this.p2];
                this.p1x = p1.X();
                this.p1y = p1.Y();
                this.p2x = p2.X();
                this.p2y = p2.Y();
                var line1 = board.create(
                    'line',
                    [this.p1, this.p2],
                    {
                        visible : this.visible,
                        name : '',
                        id : this.geoid + '-side1',
                        withLabel : false,
                        straightFirst : false,
                        straightLast : false,
                        dash : this.dash,
                        color : this.strokeColor
                    }
                );
                construction.lines.push(line1);
                
                var normal1 = board.create(
                    'normal',
                    [this.p2, line1],
                    {
                        visible : false,
                        name : '',
                        id : this.geoid + '-normal1'
                    }
                );
                normal1.gedithelpobject = true;
                
                var normal2 = board.create(
                    'normal',
                    [this.p1, line1],
                    {
                        visible : false,
                        name : '',
                        id : this.geoid + '-normal2'
                    }
                );
                normal2.gedithelpobject = true;
                
                var dx = p2.X() - p1.X();
                var dy = p2.Y() - p1.Y();
                var hypot = Math.sqrt(dx*dx + dy*dy);
                var ratio = this.p3dist/hypot;
                var p3x = p2.X() - dy*ratio;
                var p3y = p2.Y() + dx*ratio;
                this.p3 = board.create(
                    'glider',
                    [p3x, p3y, normal1],
                    {
                        visible: this.showP3,
                        name: (this.showP3Name ? this.p3name : ''),
                        id: this.p3geoid,
                        strokeColor: 'red',
                        fillColor: 'white'
                    }
                );
                
                var normal3 = board.create(
                    'normal',
                    [this.p3geoid, normal1],
                    {
                        visible: false,
                        name: '',
                        id: this.geoid+'-normal3'
                    }
                );
                normal3.gedithelpobject = true;
                
                this.p4 = board.create(
                    'intersection',
                    [normal2, normal3],
                    {
                        visible: this.showP4,
                        name: (this.showP4Name ? this.p4name : ''),
                        id: this.p4geoid,
                        face: '<>',
                        strokeColor: 'red',
                        fillColor: 'red'
                    }
                );
                
                var line2 = board.create(
                    'line',
                    [this.p2, this.p3],
                    {
                        visible : this.visible,
                        name : '',
                        id : this.geoid + '-side2',
                        withLabel : false,
                        straightFirst : false,
                        straightLast : false,
                        dash : this.dash,
                        color : this.strokeColor
                    }
                );
                construction.lines.push(line2);
                
                var line3 = board.create(
                    'line',
                    [this.p3, this.p4],
                    {
                        visible : this.visible,
                        name : '',
                        id : this.geoid + '-side3',
                        withLabel : false,
                        straightFirst : false,
                        straightLast : false,
                        dash : this.dash,
                        color : this.strokeColor
                    }
                );
                construction.lines.push(line3);
                
                var line4 = board.create(
                    'line',
                    [this.p4, this.p1],
                    {
                        visible : this.visible,
                        name : '',
                        id : this.geoid + '-side4',
                        withLabel : false,
                        straightFirst : false,
                        straightLast : false,
                        dash : this.dash,
                        color : this.strokeColor
                    }
                );
                construction.lines.push(line4);
                
                var polygon = board.create(
                    'polygon',
                    [this.p1, this.p2, this.p3, this.p4],
                    {
                        visible : this.visible,
                        name : this.name,
                        id : this.geoid,
                        withLabel : this.showName,
                        withLines : false,
                        straightFirst : false,
                        straightLast : false,
                        fillColor : this.fillColor,
                        fillOpacity : 1.0,
                        borders : {
                            strokeColor : this.strokeColor
                        }
                    }
                );
                construction.polygons.push(polygon);
                
                if (this.showRightangle) {
                    // rangle 1
                    board.create(
                        'angle',
                        [this.p1, this.p2, this.p3],
                        {
                            visible: (JXG.Math.Geometry.trueAngle(p1, p2, this.p3).toFixed(0) < 180),
                            orthoType: 'square',
                            radius: this.angleradius,
                            id: this.geoid + '_rangle11',
                            name: function(){
                                board.objects[geoobject.geoid + '_rangle11'].setProperty({visible: (JXG.Math.Geometry.trueAngle(p1, p2, geoobject.p3).toFixed(0) < 180)});
                                    return '';
                            }
                        }
                    );
                    board.create(
                        'angle',
                        [this.p3, this.p2, this.p1],
                        {
                            visible: (JXG.Math.Geometry.trueAngle(this.p3, p2, p1).toFixed(0) < 180),
                            orthoType: 'square',
                            radius: this.angleradius,
                            id: this.geoid + '_rangle12',
                            name: function(){
                                board.objects[geoobject.geoid + '_rangle12'].setProperty({visible: (JXG.Math.Geometry.trueAngle(geoobject.p3, p2, p1).toFixed(0) < 180)});
                                    return '';
                            }
                        }
                    );
                    // rangle 2
                    board.create(
                        'angle',
                        [this.p2, this.p3, this.p4],
                        {
                            visible: (JXG.Math.Geometry.trueAngle(p1, p2, this.p3).toFixed(0) < 180),
                            orthoType: 'square',
                            radius: this.angleradius,
                            id: this.geoid + '_rangle21',
                            name: function(){
                                board.objects[geoobject.geoid + '_rangle21'].setProperty({visible: (JXG.Math.Geometry.trueAngle(p1, p2, geoobject.p3).toFixed(0) < 180)});
                                    return '';
                            }
                        }
                    );
                    board.create(
                        'angle',
                        [this.p4, this.p3, this.p2],
                        {
                            visible: (JXG.Math.Geometry.trueAngle(this.p3, p2, p1).toFixed(0) < 180),
                            orthoType: 'square',
                            radius: this.angleradius,
                            id: this.geoid + '_rangle22',
                            name: function(){
                                board.objects[geoobject.geoid + '_rangle22'].setProperty({visible: (JXG.Math.Geometry.trueAngle(geoobject.p3, p2, p1).toFixed(0) < 180)});
                                    return '';
                            }
                        }
                    );
                    // rangle 3
                    board.create(
                        'angle',
                        [this.p3, this.p4, this.p1],
                        {
                            visible: (JXG.Math.Geometry.trueAngle(p1, p2, this.p3).toFixed(0) < 180),
                            orthoType: 'square',
                            radius: this.angleradius,
                            id: this.geoid + '_rangle31',
                            name: function(){
                                board.objects[geoobject.geoid + '_rangle31'].setProperty({visible: (JXG.Math.Geometry.trueAngle(p1, p2, geoobject.p3).toFixed(0) < 180)});
                                    return '';
                            }
                        }
                    );
                    board.create(
                        'angle',
                        [this.p1, this.p4, this.p3],
                        {
                            visible: (JXG.Math.Geometry.trueAngle(this.p3, p2, p1).toFixed(0) < 180),
                            orthoType: 'square',
                            radius: this.angleradius,
                            id: this.geoid + '_rangle32',
                            name: function(){
                                board.objects[geoobject.geoid + '_rangle32'].setProperty({visible: (JXG.Math.Geometry.trueAngle(geoobject.p3, p2, p1).toFixed(0) < 180)});
                                    return '';
                            }
                        }
                    );
                    // rangle 4
                    board.create(
                        'angle',
                        [this.p4, this.p1, this.p2],
                        {
                            visible: (JXG.Math.Geometry.trueAngle(p1, p2, this.p3).toFixed(0) < 180),
                            orthoType: 'square',
                            radius: this.angleradius,
                            id: this.geoid + '_rangle41',
                            name: function(){
                                board.objects[geoobject.geoid + '_rangle41'].setProperty({visible: (JXG.Math.Geometry.trueAngle(p1, p2, geoobject.p3).toFixed(0) < 180)});
                                    return '';
                            }
                        }
                    );
                    board.create(
                        'angle',
                        [this.p2, this.p1, this.p4],
                        {
                            visible: (JXG.Math.Geometry.trueAngle(this.p3, p2, p1).toFixed(0) < 180),
                            orthoType: 'square',
                            radius: this.angleradius,
                            id: this.geoid + '_rangle42',
                            name: function(){
                                board.objects[geoobject.geoid + '_rangle42'].setProperty({visible: (JXG.Math.Geometry.trueAngle(geoobject.p3, p2, p1).toFixed(0) < 180)});
                                    return '';
                            }
                        }
                    );
                }

                
                this.p3.on('up', function(event){
                    var point = this;
                    var p3x = point.X();
                    var p3y = point.Y();
                    geoobject.setData({p3x: p3x, p3y: p3y});
                    $(point.board.containerObj).trigger('objectupdate', [{name: geoobject.name, geoid: []}]);
                });
                line1.on('up', function(event){
                    var line = this;
                    var updoptions = {name: geoobject.name, geoid: [geoobject.p1, geoobject.p2, geoobject.geoid]};
                    $(line.board.containerObj).trigger('objectupdate', [updoptions]);
                });
                line2.on('up', function(event){
                    var line = this;
                    var updoptions = {name: geoobject.name, geoid: [geoobject.p2, geoobject.p3geoid]};
                    $(line.board.containerObj).trigger('objectupdate', [updoptions]);
                });
                line3.on('up', function(event){
                    var line = this;
                    var updoptions = {name: geoobject.name, geoid: [geoobject.p3geoid, geoobject.p4geoid]};
                    $(line.board.containerObj).trigger('objectupdate', [updoptions]);
                });
                line4.on('up', function(event){
                    var line = this;
                    var updoptions = {name: geoobject.name, geoid: [geoobject.p1, geoobject.p4geoid]};
                    $(line.board.containerObj).trigger('objectupdate', [updoptions]);
                });
                line1.on('down', function(event){
                    var line = this;
                    var options = {name: geoobject.name, geoid: geoobject.geoid};
                    $(line.board.containerObj).trigger('objectselected', [options]);
                });
                line2.on('down', function(event){
                    var line = this;
                    var options = {name: geoobject.name, geoid: geoobject.geoid};
                    $(line.board.containerObj).trigger('objectselected', [options]);
                });
                line3.on('down', function(event){
                    var line = this;
                    var options = {name: geoobject.name, geoid: geoobject.geoid};
                    $(line.board.containerObj).trigger('objectselected', [options]);
                });
                line4.on('down', function(event){
                    var line = this;
                    var options = {name: geoobject.name, geoid: geoobject.geoid};
                    $(line.board.containerObj).trigger('objectselected', [options]);
                });
            }
            
            /**
             * Select this object.
             **/
            GeoRectangle.prototype.select = function(board){
                board.objects[this.geoid + '-side1'] && board.objects[this.geoid + '-side1'].setProperty({shadow: true, strokeWidth: this.strokeWidth * 2});
                board.objects[this.geoid + '-side2'] && board.objects[this.geoid + '-side2'].setProperty({shadow: true});
                board.objects[this.geoid + '-side3'] && board.objects[this.geoid + '-side3'].setProperty({shadow: true});
                board.objects[this.geoid + '-side4'] && board.objects[this.geoid + '-side4'].setProperty({shadow: true});
            }
            
            /**
             * Deselect this object.
             **/
            GeoRectangle.prototype.deselect = function(board){
                board.objects[this.geoid + '-side1'] && board.objects[this.geoid + '-side1'].setProperty({shadow: false, strokeWidth: this.strokeWidth});
                board.objects[this.geoid + '-side2'] && board.objects[this.geoid + '-side2'].setProperty({shadow: false});
                board.objects[this.geoid + '-side3'] && board.objects[this.geoid + '-side3'].setProperty({shadow: false});
                board.objects[this.geoid + '-side4'] && board.objects[this.geoid + '-side4'].setProperty({shadow: false});
            }

            /**
             * Get list of elements of given type.
             **/
            GeoRectangle.prototype.getOfType = function(otype){
                var list = [];
                switch (otype){
                    case 'Rectangle':
                        list.push({id: this.geoid, name: this.name});
                        break;
                    case 'Point':
                        list.push({id: this.p3geoid, name: this.p3name});
                        list.push({id: this.p4geoid, name: this.p4name});
                        break;
                    case 'Linelike':
                        list.push({id: this.geoid + '-side1', name: this.name + '_1'});
                        list.push({id: this.geoid + '-side2', name: this.name + '_2'});
                        list.push({id: this.geoid + '-side3', name: this.name + '_3'});
                        list.push({id: this.geoid + '-side4', name: this.name + '_4'});
                        break;
                    default:
                        break;
                }
                return list;
            }
            
            /**
             * Get the html for options dialog.
             **/
            GeoRectangle.prototype.getOptionsDialog = function() {
                var pointlist = this.geoparent.getPointlikes();
                var dialog = {
                    basic: [
                        {
                            type: 'Label',
                            label: 'Id',
                            key: '',
                            value: this.geoid
                        },
                        {
                            type: 'Text',
                            label: 'Label',
                            key: 'name',
                            value: this.name
                        },
                        {
                            type: 'Select',
                            label: 'First point',
                            key: 'p1',
                            value: this.p1,
                            data: pointlist
                        },
                        {
                            type: 'Select',
                            label: 'Second point',
                            key: 'p2',
                            value: this.p2,
                            data: pointlist
                        },
                        {
                            type: 'Text',
                            label: 'Third point name',
                            key: 'p3name',
                            value: this.p3name
                        },
                        {
                            type: 'Text',
                            label: 'Fourth point name',
                            key: 'p4name',
                            value: this.p4name
                        },
                        {
                            type: 'Color',
                            label: 'Stroke color',
                            key: 'strokeColor',
                            value: this.strokeColor
                        },
                        {
                            type: 'Color',
                            label: 'Fill color',
                            key: 'fillColor',
                            value: this.fillColor
                        }
                    ],
                    advanced: [
                        {
                            type: 'Checkbox',
                            label: 'Visible',
                            key: 'visible',
                            value: this.visible
                        },
                        {
                            type: 'Checkbox',
                            label: 'Show label',
                            key: 'showName',
                            value: this.showName
                        },
                        {
                            type: 'Checkbox',
                            label: 'Show third point',
                            key: 'showP3',
                            value: this.showP3
                        },
                        {
                            type: 'Checkbox',
                            label: 'Show third point name',
                            key: 'showP3Name',
                            value: this.showP3Name
                        },
                        {
                            type: 'Checkbox',
                            label: 'Show fourth point',
                            key: 'showP4',
                            value: this.showP4
                        },
                        {
                            type: 'Checkbox',
                            label: 'Show fourth point name',
                            key: 'showP4Name',
                            value: this.showP4Name
                        },
                        {
                            type: 'Checkbox',
                            label: 'Show right angle',
                            key: 'showRightangle',
                            value: this.showRightangle
                        }
                    ]
                }
                var dashDialog = {
                    type: 'Select',
                    label: 'Line style',
                    key: 'dash',
                    value: this.dash,
                    data: []
                }
                for (var i = 0; i < this.dashTypes.length; i++) {
                    dashDialog.data.push({id: i, name: this.dashTypes[i]});
                }
                dialog.advanced.push(dashDialog);
                return dialog;
            }
            
            /**
             * Tell, if Rectangle is drawable.
             */
            GeoRectangle.prototype.drawable = function(board){
                return  !!board.objects[this.p1] && !!board.objects[this.p2];
            }
        } // End GeoRectangle

        { // GeoParallelogram
            /**
             * Constructor for geometric Parallelogram object.
             */
            var GeoParallelogram = function(params, geoparent) {
                this.type = 'Parallelogram';
                this.geoid = params.geoid;
                this.geoparent = geoparent;
                this.setData(params);
            }
            
            /**
             * Inherit the prototype of GeoObject.
             */
            GeoParallelogram.prototype = new GeoObject();
            
            /**
             * Set data from given object.
             */
            GeoParallelogram.prototype.setData = function(params){
                params = $.extend( {
                    'p1' : this.p1 || null,
                    'p2' : this.p2 || null,
                    'p3' : this.p3 || null,
                    'p4name' : (typeof(this.p4name) !== 'undefined' ? this.p4name : null),
                    'name' : (typeof(this.name) !== 'undefined' ? this.name : null),
                    'dash' : this.dash || 0,
                    'visible' : (typeof(this.showName) !== 'undefined' ? this.showName : true),
                    'showName' : (typeof(this.showName) !== 'undefined' ? this.showName : true),
                    'showP4' : (typeof(this.showP4) !== 'undefined' ? this.showP4 : true),
                    'showP4Name' : (typeof(this.showP4Name) !== 'undefined' ? this.showP4Name : true),
                    'strokeColor' : this.strokeColor || '#0000ff',
                    'fillColor' : this.fillColor || 'none',
                    'strokeWidth' : (typeof(this.strokeWidth) !== 'undefined' ? this.strokeWidth : 2)
                }, params);
                
                this.p1 = params.p1;
                this.p2 = params.p2;
                this.p3 = params.p3;
                this.p4name = params.p4name;
                this.p4geoid = this.geoid + '-p4';
                this.strokeWidth = this.strToNum(params.strokeWidth);
                this.name = params.name;
                this.dash = params.dash;
                this.showName = params.showName;
                this.visible = params.visible;
                this.strokeColor = params.strokeColor;
                this.fillColor = params.fillColor;
            }
            
            /**
             * Get data of GeoParallelogram
             **/
            GeoParallelogram.prototype.getData = function(subid){
                if (!subid) {
                    var data = {
                        type: this.type,
                        name: this.name,
                        geoid: this.geoid,
                        p1: this.p1,
                        p2: this.p2,
                        p3: this.p3,
                        p4name: this.p4name,
                        showP4: this.showP4,
                        showP4Name: this.showP4Name,
                        dash: this.dash,
                        showName: this.showName,
                        visible: this.visible,
                        strokeColor: this.strokeColor,
                        fillColor: this.fillColor,
                        labelOffset: this.labelOffset
                    }
                } else {
                    var data = {};
                    switch (subid){
                        case 'side1':
                            data.type = 'Line';
                            data.geoid = this.geoid + '-side1';
                            data.p1 = this.p1;
                            data.p2 = this.p2;
                            break;
                        case 'side2':
                            data.type = 'Line';
                            data.geoid = this.geoid + '-side2';
                            data.p1 = this.p2;
                            data.p2 = this.p3;
                            break;
                        case 'side3':
                            data.type = 'Line';
                            data.geoid = this.geoid + '-side3';
                            data.p1 = this.p3;
                            data.p2 = this.p4geoid;
                            break;
                        case 'side3':
                            data.type = 'Line';
                            data.geoid = this.geoid + '-side4';
                            data.p1 = this.p4geoid;
                            data.p2 = this.p1;
                            break;
                        default:
                            break
                    }
                }
                return data;
            }
            
            /**
             * Get the list of dependencies.
             **/
            GeoParallelogram.prototype.getDeps = function(){
                return [this.p1, this.p2, this.p3];
            }
            
            /**
             * Get list string (to be shown in the object list)
             **/
            GeoParallelogram.prototype.getListStr = function(){
                var str = '<div class="gedit-listicon" title="'+this.type+'">' + this.icon + '</div><div class="gedit-listname"><i>' + this.getNameFormatted() + '</i><span class="geoedit-aka">=<i>\u25b1'+this.getObjName(this.p1)+this.getObjName(this.p2)+this.getObjName(this.p3)+this.p4name+'</i></span></div>';
                return str;
            }
            
            /**
             * CSS style defining the icon representing this type.
             **/
            GeoParallelogram.prototype.iconCSS = 'parallelogramBtn';
            
            GeoParallelogram.prototype.icon = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="20" height="20" viewbox="0 0 20 20" class="geoedit-icon geoedit-object-parallelogram"><path style="stroke: blue; fill: none;" d="M4 6 l13 -2 l-1 10 l-13 2z" /><circle style="stroke: none; fill: red;" cx="4" cy="6" r="2" /><circle style="stroke: none; fill: red;" cx="17" cy="4" r="2" /><circle style="stroke: none; fill: red;" cx="16" cy="14" r="2" /><circle style="stroke: none; fill: red;" cx="3" cy="16" r="2" /></svg>';

            /**
             * Draw the parallelogram on board in the construction.
             **/
            GeoParallelogram.prototype.asConstruct = function(board, construction) {
                var geoobject = this;
                var p4 = board.create(
                    'parallelpoint',
                    [this.p2, this.p1, this.p3],
                    {
                        visible: this.visible,
                        name: this.p4name,
                        id: this.p4geoid,
                        face: '<>',
                        size: 5,
                        strokeColor: 'none',
                        fillColor: '#ff0000'
                    }
                )
                var line1 = board.create(
                    'line',
                    [this.p1, this.p2],
                    {
                        visible : this.visible,
                        name : '',
                        id : this.geoid + '-side1',
                        withLabel : false,
                        straightFirst : false,
                        straightLast : false,
                        dash : this.dash,
                        color : this.strokeColor
                    }
                );
                construction.lines.push(line1);
                
                var line2 = board.create(
                    'line',
                    [this.p2, this.p3],
                    {
                        visible : this.visible,
                        name : '',
                        id : this.geoid + '-side2',
                        withLabel : false,
                        straightFirst : false,
                        straightLast : false,
                        dash : this.dash,
                        color : this.strokeColor
                    }
                );
                construction.lines.push(line2);
                
                var line3 = board.create(
                    'line',
                    [this.p3, this.p4geoid],
                    {
                        visible : this.visible,
                        name : '',
                        id : this.geoid + '-side3',
                        withLabel : false,
                        straightFirst : false,
                        straightLast : false,
                        dash : this.dash,
                        color : this.strokeColor
                    }
                );
                construction.lines.push(line3);
                
                var line4 = board.create(
                    'line',
                    [this.p4geoid, this.p1],
                    {
                        visible : this.visible,
                        name : '',
                        id : this.geoid + '-side4',
                        withLabel : false,
                        straightFirst : false,
                        straightLast : false,
                        dash : this.dash,
                        color : this.strokeColor
                    }
                );
                construction.lines.push(line4);
                
                var polygon = board.create(
                    'polygon',
                    [this.p1, this.p2, this.p3, this.p4geoid],
                    {
                        visible : this.visible,
                        name : this.name,
                        id : this.geoid,
                        withLabel : this.showName,
                        withLines : false,
                        straightFirst : false,
                        straightLast : false,
                        fillColor : this.fillColor,
                        fillOpacity : 1.0,
                        borders : {
                            strokeColor : this.strokeColor
                        }
                    }
                );
                construction.polygons.push(polygon);
                
                line1.on('up', function(event){
                    var line = this;
                    var updoptions = {name: geoobject.name, geoid: [geoobject.p1, geoobject.p2]};
                    $(line.board.containerObj).trigger('objectupdate', [updoptions]);
                });
                line2.on('up', function(event){
                    var line = this;
                    var updoptions = {name: geoobject.name, geoid: [geoobject.p2, geoobject.p3]};
                    $(line.board.containerObj).trigger('objectupdate', [updoptions]);
                });
                line3.on('up', function(event){
                    var line = this;
                    var updoptions = {name: geoobject.name, geoid: [geoobject.p3, geoobject.p4geoid]};
                    $(line.board.containerObj).trigger('objectupdate', [updoptions]);
                });
                line4.on('up', function(event){
                    var line = this;
                    var updoptions = {name: geoobject.name, geoid: [geoobject.p4geoid, geoobject.p1]};
                    $(line.board.containerObj).trigger('objectupdate', [updoptions]);
                });
                line1.on('down', function(event){
                    var line = this;
                    var options = {name: geoobject.name, geoid: geoobject.geoid};
                    $(line.board.containerObj).trigger('objectselected', [options]);
                });
                line2.on('down', function(event){
                    var line = this;
                    var options = {name: geoobject.name, geoid: geoobject.geoid};
                    $(line.board.containerObj).trigger('objectselected', [options]);
                });
                line3.on('down', function(event){
                    var line = this;
                    var options = {name: geoobject.name, geoid: geoobject.geoid};
                    $(line.board.containerObj).trigger('objectselected', [options]);
                });
                line4.on('down', function(event){
                    var line = this;
                    var options = {name: geoobject.name, geoid: geoobject.geoid};
                    $(line.board.containerObj).trigger('objectselected', [options]);
                });
            }
            
            /**
             * Select this object.
             **/
            GeoParallelogram.prototype.select = function(board){
                board.objects[this.geoid + '-side1'].setProperty({shadow: true});
                board.objects[this.geoid + '-side2'].setProperty({shadow: true});
                board.objects[this.geoid + '-side3'].setProperty({shadow: true});
                board.objects[this.geoid + '-side4'].setProperty({shadow: true});
            }
            
            /**
             * Deselect this object.
             **/
            GeoParallelogram.prototype.deselect = function(board){
                board.objects[this.geoid + '-side1'].setProperty({shadow: false});
                board.objects[this.geoid + '-side2'].setProperty({shadow: false});
                board.objects[this.geoid + '-side3'].setProperty({shadow: false});
                board.objects[this.geoid + '-side4'].setProperty({shadow: false});
            }

            /**
             * Get list of elements of given type.
             **/
            GeoParallelogram.prototype.getOfType = function(otype){
                var list = [];
                switch (otype){
                    case 'Parallelogram':
                        list.push({id: this.geoid, name: this.name});
                        break;
                    case 'Point':
                        list.push({id: this.p4geoid, name: this.p4name});
                        break;
                    case 'Linelike':
                        list.push({id: this.geoid + '-side1', name: this.name + '_1'});
                        list.push({id: this.geoid + '-side2', name: this.name + '_2'});
                        list.push({id: this.geoid + '-side3', name: this.name + '_3'});
                        list.push({id: this.geoid + '-side4', name: this.name + '_4'});
                        break;
                    default:
                        break;
                }
                return list;
            }
            
            /**
             * Get the html for options dialog.
             **/
            GeoParallelogram.prototype.getOptionsDialog = function() {
                var pointlist = this.geoparent.getPointlikes();
                var dialog = {
                    basic: [
                        {
                            type: 'Label',
                            label: 'Id',
                            key: '',
                            value: this.geoid
                        },
                        {
                            type: 'Text',
                            label: 'Label',
                            key: 'name',
                            value: this.name
                        },
                        {
                            type: 'Select',
                            label: 'First point',
                            key: 'p1',
                            value: this.p1,
                            data: pointlist
                        },
                        {
                            type: 'Select',
                            label: 'Second point',
                            key: 'p2',
                            value: this.p2,
                            data: pointlist
                        },
                        {
                            type: 'Select',
                            label: 'Third point',
                            key: 'p3',
                            value: this.p3,
                            data: pointlist
                        },
                        {
                            type: 'Color',
                            label: 'Stroke color',
                            key: 'strokeColor',
                            value: this.strokeColor
                        },
                        {
                            type: 'Color',
                            label: 'Fill color',
                            key: 'fillColor',
                            value: this.fillColor
                        }
                    ],
                    advanced: [
                        {
                            type: 'Checkbox',
                            label: 'Visible',
                            key: 'visible',
                            value: this.visible
                        },
                        {
                            type: 'Checkbox',
                            label: 'Show label',
                            key: 'showName',
                            value: this.showName
                        },
                        {
                            type: 'Checkbox',
                            label: 'Show fourth point',
                            key: 'showP4',
                            value: this.showP4
                        },
                        {
                            type: 'Checkbox',
                            label: 'Show fourth point name',
                            key: 'showP4Name',
                            value: this.showP4Name
                        }
                    ]
                }
                var dashDialog = {
                    type: 'Select',
                    label: 'Line style',
                    key: 'dash',
                    value: this.dash,
                    data: []
                }
                for (var i = 0; i < this.dashTypes.length; i++) {
                    dashDialog.data.push({id: i, name: this.dashTypes[i]});
                }
                dialog.advanced.push(dashDialog);
                return dialog;
            }
            
            /**
             * Tell, if Parallelogram is drawable.
             */
            GeoParallelogram.prototype.drawable = function(board){
                return  !!board.objects[this.p1] && !!board.objects[this.p2] && !!board.objects[this.p3];
            }
        } // End GeoParallelogram
        
        { // GeoLabel
            /**
             * Constructor for geometric point object.
             */ 
            var GeoLabel = function(params, geoparent) {
                this.type = 'Label';
                this.geoid = params.geoid;
                this.geoparent = geoparent;
                this.setData(params);
            }
            
            /**
             * Inherit the prototype of GeoObject.
             */
            GeoLabel.prototype = new GeoObject();


            /**
             * Set data from given object.
             */
            GeoLabel.prototype.setData = function(params){
                params = $.extend( {
                    'x' : (typeof(this.x) !== 'undefined' ? this.x : null),
                    'y' : (typeof(this.y) !== 'undefined' ? this.y : null),
                    'name' : (typeof(this.name) !== 'undefined' ? this.name : null),
                    'value' : (typeof this.value !== 'undefined' ? this.value : ''),
                    'visible' : (typeof this.visible !== 'undefined' ? this.visible : true),
                    'fixed' : (typeof this.fixed !== 'undefined' ? this.fixed : false),
                    'fontSize' : (typeof this.fontSize !== 'undefined' ? this.fontSize : 14),
                    'color' : this.color || '#000000',
                    'snapToGrid' : this.snapToGrid || false
                }, params);
                
                this.fontSize = this.strToNum(params.fontSize);
                this.x = this.strToNum(params.x);
                this.y = this.strToNum(params.y);
                this.name = params.name;
                this.value = params.value;
                this.visible = params.visible;
                this.fixed = params.fixed;
                this.color = params.color;
                this.snapToGrid = params.snapToGrid;
            }
            
            /**
             * Get data of GeoLabel
             **/
            GeoLabel.prototype.getData = function(){
                var data = {
                    type: this.type,
                    name: this.name,
                    geoid: this.geoid,
                    x: this.x,
                    y: this.y,
                    value: this.value,
                    visible: this.visible,
                    fixed: this.fixed,
                    fontSize: this.fontSize,
                    color: this.color,
                    snapToGrid: this.snapToGrid
                }
                return data;
            }
            
            /**
             * CSS style defining the icon representing this type.
             **/
            GeoLabel.prototype.iconCSS = 'labelBtn';
            
            GeoLabel.prototype.icon = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="20" height="20" viewbox="0 0 30 30" class="geoedit-icon geoedit-object-label"><text style="fill: #00a; font-family: serif; font-size: 18px; font-weight: bold;" x="2" y="22">Ab</text></svg>';
            
            /**
             * Draw the label on board in the construction.
             */
            GeoLabel.prototype.asConstruct = function(board, construction) {
                var geoobject = this;
                var p = board.create(
                    'text',
                    [this.x, this.y, this.value],
                    {
                        name : this.name,
                        id : this.geoid,
                        fontSize : this.fontSize,
                        visible : this.visible,
                        fixed : this.fixed,
                        color: (!this.fixed ? this.color : '#000000'),
                        snapToGrid: this.snapToGrid
                    }
                );
                if (!this.name) {
                    this.name = p.name;
                }
                p.on('up', function(event){
                    var obj = this;
                    var updoptions = {name: geoobject.name, geoid: [geoobject.geoid]};
                    $(obj.board.containerObj).trigger('objectupdate', [updoptions]);
                    var options = {
                        name: geoobject.name,
                        x: Math.round(obj.X() * 100)/100,
                        y: Math.round(obj.Y() * 100)/100,
                        element: geoobject
                    };
                    $(obj.board.containerObj).trigger('objectmoved', [options]);
                });
                p.on('down', function(event){
                    var obj = this;
                    var options = {name: geoobject.name, geoid: geoobject.geoid};
                    $(obj.board.containerObj).trigger('objectselected', [options]);
                });
            }
            
            /**
             * Update data of the object from the board.
             **/
            GeoLabel.prototype.updateFromBoard = function(board){
                var obj = board.objects[this.geoid];
                this.x = Math.round(obj.X() * 100)/100;
                this.y = Math.round(obj.Y() * 100)/100;
            }
            
            /**
             * Get list of elements of given type.
             **/
            GeoLabel.prototype.getOfType = function(otype){
                var list = [];
                if (otype === 'Label') {
                    list.push({id: this.geoid, name: this.name});
                }
                return list;
            }
            
            /**
             * Get the object for options dialog.
             */
            GeoLabel.prototype.getOptionsDialog = function() {
                var dialog = {
                    basic: [
                        {
                            type: 'Label',
                            label: 'Id',
                            key: '',
                            value: this.geoid
                        },
                        {
                            type: 'Text',
                            label: 'Label',
                            key: 'name',
                            value: this.name
                        },
                        {
                            type: 'Text',
                            label: 'Caption',
                            key: 'value',
                            value: this.value
                        },
                        {
                            type: 'Text',
                            label: 'x-coordinate',
                            key: 'x',
                            value: this.numToStr(this.x)
                        },
                        {
                            type: 'Text',
                            label: 'y-coordinate',
                            key: 'y',
                            value: this.numToStr(this.y)
                        },
                        {
                            type: 'Color',
                            label: 'Color',
                            key: 'color',
                            value: this.color
                        }
                    ],
                    advanced: [
                        {
                            type: 'Checkbox',
                            label: 'Visible',
                            key: 'visible',
                            value: this.visible
                        },
                        {
                            type: 'Checkbox',
                            label: 'Fixed',
                            key: 'fixed',
                            value: this.fixed
                        },
                        {
                            type: 'Checkbox',
                            label: 'Snap to grid',
                            key: 'snapToGrid',
                            value: this.snapToGrid
                        },
                        {
                            type: 'Text',
                            label: 'Text size',
                            key: 'fontSize',
                            value: this.fontSize
                        }
                    ]
                }
                return dialog;
            }
        } // End GeoLabel


    }
    
    
    { /*** GeoTools ***************************************************************/
        { // Virtual GeoTool
            /***************
             * Virtual GeoTool class, that can be inherited
             ***************/
            var GeoTool = function(geoparent){
                this.type = 'General GeoTool'
            }
            
            GeoTool.prototype.init = function(){
                this.steps = 0;
                this.currStep = 0;
            }
            
            /**
             * Subtool list
             **/
            GeoTool.prototype.subtools = [];
    
            /**
             * Get the icon of GeoTool;
             **/
            GeoTool.prototype.getIcon = function(){
                return this.icon;
            }
            
            /**
             * Get the type of GeoTool.
             **/
            GeoTool.prototype.getType = function(){
                return this.type;
            }
 
            /**
             * Get the name of object with given geoid.
             **/
            GeoTool.prototype.getObjName = function(name){
                return this.geoparent.getObjName(name);
            }
            
            /**
             * Action for click on board.
             **/
            GeoTool.prototype.click = function(){
                return true;
            }
            
            /**
             * Find all points in (near) given coordinates in given board. Return namelist.
             **/
            GeoTool.prototype.getPointsInCoords = function(board, coords){
                var points = [];
                for (var el in board.objects){
                    var element = board.objects[el];
                    if (element.name === 'gedithiddenmousecursor') {
                        continue;
                    }
                    if (JXG.isPoint(element) && !element.id.match(/^jxgBoard/) && element.hasPoint(coords.scrCoords[1], coords.scrCoords[2])) {
                        points.push(element);
                    }
                }
                return points;
            }

            /**
             * Find all lines in (near) given coordinates in given board. Return namelist.
             **/
            GeoTool.prototype.getLinesInCoords = function(board, coords){
                var gelements = [];
                for (var el in board.objects){
                    var element = board.objects[el];
                    if (!element.gedithelpobject &&
                        (element.elType === 'line' || element.elType === 'normal' || element.elType === 'parallel' || element.elType === 'tangent')
                        && !element.id.match(/^jxgBoard/)
                        && element.hasPoint(coords.scrCoords[1], coords.scrCoords[2])) {
                        gelements.push(element);
                    }
                }
                return gelements;
            }

            
            /**
             * Find all lines, circles, arcs, parallel, normal, axis,... in (near) given coordinates in given board. Return namelist.
             **/
            GeoTool.prototype.getElementsInCoords = function(board, coords){
                var gelements = [];
                for (var el in board.objects){
                    var element = board.objects[el];
                    if (!element.id.match(/^jxgBoard/) &&
                        (element.elType === 'line' ||
                        element.elType === 'circle' ||
                        element.elType === 'parallel' ||
                        element.elType === 'bisector' ||
                        element.elType === 'normal' ||
                        element.elType === 'axis')
                        && element.getProperty('visible')
                        && element.hasPoint(coords.scrCoords[1], coords.scrCoords[2])) {
                        gelements.push(element);
                    }
                }
                return gelements;
            }
            
            /**
             * Send updateinfo-event with message.
             **/
            GeoTool.prototype.sendInfo = function(board, message){
                message = this.type + '-' + message || '';
                $(board.containerObj).trigger('updateinfo', [message]);
            }
            
            /**
             * Tool info
             **/
            GeoTool.prototype.info = {};

        } // End GeoTool

        { // GeoToolSelect
            /****************************************
             * GeoToolSelect - Tool for selecting and moving objects.
             ****************************************/
            var GeoToolSelect = function(geoparent){
                this.type = 'Select';
                //this.lang = lang;
                this.geoparent = geoparent;
            }
            
            /**
             * Register the tool to the GEditor.
             **/
            GEditor.prototype.geotools.push(GeoToolSelect);
            
            /**
             * Inherit the virtual GeoTool.
             **/
            GeoToolSelect.prototype = new GeoTool();
            
            /**
             * Icon for select tool
             **/
            GeoToolSelect.prototype.icon = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="20" height="20" viewbox="0 0 20 20" class="geoedit-icon geoedit-tool-pointer"><path style="stroke: black; stroke-width: 1px; fill: white;" d="M4 4 l11 3 l-2 3 l5 5 l-3 3 l-5 -5 l-3 2z" /></svg>';

        } // End GeoToolSelect

        { // GeoToolPoint
            /****************************************
             * GeoToolPoint - Tool for creating points.
             ****************************************/
            var GeoToolPoint = function(geoparent){
                this.type = 'Point';
                this.geoparent = geoparent;
                this.steps = 1;
            }
            
            /**
             * Register the tool to the GEditor.
             **/
            GEditor.prototype.geotools.push(GeoToolPoint);
            
            /**
             * Inherit the virtual GeoTool.
             **/
            GeoToolPoint.prototype = new GeoTool();

            /**
             * Subtool list.
             **/
            GeoToolPoint.prototype.subtools = [];
            
            /**
             * Icon for point tool. - Use the same icon as for GeoPoint-object.
             **/
            GeoToolPoint.prototype.icon = GeoPoint.prototype.icon;
            
            /**
             * Init the GeoToolPoint. Reset the stepnumber etc.
             **/
            GeoToolPoint.prototype.init = function(){
                this.step = 0;
            }
            
            /**
             * Actions for clicking the board. Return data for the new object.
             **/
            GeoToolPoint.prototype.click = function(data){
                this.currStep = 0;
                return [{
                    type: 'Point',
                    x: Math.round(data.xcoord * 100)/100,
                    y: Math.round(data.ycoord * 100)/100
                }];
            }
        } // End GeoToolPoint
        
        { // GeoToolLine
            /****************************************
             * GeoToolLine - Tool for creating lines.
             ****************************************/
            var GeoToolLine = function(geoparent){
                this.type = 'Line';
                this.geoparent = geoparent;
                this.steps = 2;
            }
            
            /**
             * Register the tool to the GEditor.
             **/
            GEditor.prototype.geotools.push(GeoToolLine);
    
            /**
             * Inherit the virtual GeoTool.
             **/
            GeoToolLine.prototype = new GeoTool();
            
            /**
             * Subtool list.
             **/
            GeoToolLine.prototype.subtools = [];
            
            /**
             * Icon for line tool. - Use the same icon as for GeoLine-object.
             **/
            GeoToolLine.prototype.icon = GeoLine.prototype.icon;
            
            /**
             * Init the GeoToolLine. Reset the stepnumber etc.
             **/
            GeoToolLine.prototype.init = function(){
                this.currStep = 0;
                this.result = [];
                this.p1 = null;
                this.p2 = null;
                this.line = null;
            }
            
            /**
             * Actions for clicking the board. Return data for the new object.
             **/
            GeoToolLine.prototype.click = function(data){
                this.currStep = this.currStep + 1;
                var board = data.board;
                var coords = new JXG.Coords(JXG.COORDS_BY_USER, [data.xcoord, data.ycoord], board);
                switch (this.currStep){
                    case 1:
                        this.sendInfo(board, this.currStep);
                        this.result = [];
                        var points = this.getPointsInCoords(board, coords);
                        if (points.length === 0) {
                            this.p1geoid = this.geoparent.getObjId('Point');
                            this.p1 = board.create('Point', [data.xcoord, data.ycoord], {fillColor: 'gray', strokeColor: 'gray', face: 'x', id: this.p1geoid});
                            this.line = board.create('Line', [this.p1, 'gedithiddenmousecursor'], {strokeColor: 'gray', strokeWidth: 1});
                            
                            this.result.push({type: 'Point', name: this.p1.name, geoid: this.p1geoid, x: data.xcoord, y: data.ycoord});
                            return [];
                        } else {
                            this.p1 = points[0];
                            this.p1geoid = this.p1.id;
                            this.line = board.create('Line', [this.p1, 'gedithiddenmousecursor'], {strokeColor: 'gray', strokeWidth: 1});
                            return [];
                        }
                        break;
                    case 2:
                        this.sendInfo(board, 'start');
                        var points = this.getPointsInCoords(board, coords);
                        if (points.length === 0) {
                            //this.p2.remove();
                            this.p2geoid = this.geoparent.getObjId('Point');
                            this.p2 = board.create('Point', [data.xcoord, data.ycoord], {color: 'gray', face: 'x', id: this.p2geoid});
                            this.line.remove();
                            this.line = board.create('Line', [this.p1, this.p2], {color: 'gray', strokeWidth: 1});
                            this.result.push({type: 'Point', name: this.p2.name, geoid: this.p2geoid, x: data.xcoord, y: data.ycoord});
                            this.linegeoid = this.geoparent.getObjId('Line');
                            this.result.push({type: 'Line', name: this.line.name, geoid: this.linegeoid, p1: this.p1geoid, p2: this.p2geoid});
                        } else {
                            this.p2 = points[0];
                            this.p2geoid = this.p2.id;
                            this.linegeoid = this.geoparent.getObjId('Line');
                            this.result.push({type: 'Line', name: this.line.name, geoid: this.linegeoid, p1: this.p1geoid, p2: this.p2geoid});
                        }
                        this.currStep = 0;
                        break;
                    default:
                        this.result = [];
                }
                return this.result;
            }
        } // End GeoToolLine
        
        { // GeoToolCircle
            /****************************************
             * GeoToolCircle - Tool for creating circles.
             ****************************************/
            var GeoToolCircle = function(geoparent){
                this.type = 'Circle';
                this.geoparent = geoparent;
                this.steps = 3;
            }
            
            /**
             * Register the tool to the GEditor.
             **/
            GEditor.prototype.geotools.push(GeoToolCircle);
    
            /**
             * Inherit the virtual GeoTool.
             **/
            GeoToolCircle.prototype = new GeoTool();
            
            /**
             * Subtool list.
             **/
            GeoToolCircle.prototype.subtools = [];
            
            /**
             * Icon for Circle tool. - Use the same icon as for GeoCircle-object.
             **/
            GeoToolCircle.prototype.icon = GeoCircle.prototype.icon;
            
            /**
             * Init the GeoToolCircle. Reset the stepnumber etc.
             **/
            GeoToolCircle.prototype.init = function(){
                this.currStep = 0;
                this.result = [];
                this.p1 = null;
                this.p2 = null;
                this.circle = null;
            }
            
            /**
             * Actions for clicking the board. Return data for the new object.
             **/
            GeoToolCircle.prototype.click = function(data){
                this.currStep = this.currStep + 1;
                var board = data.board;
                var coords = new JXG.Coords(JXG.COORDS_BY_USER, [data.xcoord, data.ycoord], board);
                switch (this.currStep){
                    case 1:
                        this.result = [];
                        this.sendInfo(board, this.currStep);
                        var points = this.getPointsInCoords(board, coords);
                        if (points.length === 0) {
                            this.p1geoid = this.geoparent.getObjId('Point');
                            this.p1 = board.create('Point', [data.xcoord, data.ycoord], {fillColor: 'gray', strokeColor: 'gray', face: 'x', id: this.p1geoid});
                            this.circle = board.create('Circle', [this.p1, 'gedithiddenmousecursor'], {strokeColor: 'gray', strokeWidth: 1});
                            
                            this.result.push({type: 'Point', name: this.p1.name, geoid: this.p1geoid, x: data.xcoord, y: data.ycoord});
                            return [];
                        } else {
                            this.p1 = points[0];
                            this.p1geoid = this.p1.id;
                            this.circle = board.create('Circle', [this.p1, 'gedithiddenmousecursor'], {strokeColor: 'gray', strokeWidth: 1});
                            return [];
                        }
                        break;
                    case 2:
                        this.sendInfo(board, 'start');
                        var points = this.getPointsInCoords(board, coords);
                        if (points.length === 0) {
                            this.p2geoid = this.geoparent.getObjId('Point');
                            this.p2 = board.create('Point', [data.xcoord, data.ycoord], {color: 'gray', face: 'x', id: this.p2geoid});
                            this.circle.remove();
                            this.circle = board.create('Circle', [this.p1, this.p2], {color: 'gray', strokeWidth: 1});
                            this.result.push({type: 'Point', name: this.p2.name, geoid: this.p2geoid, x: data.xcoord, y: data.ycoord});
                            this.circlegeoid = this.geoparent.getObjId('Circle');
                            this.result.push({type: 'Circle', name: this.circle.name, geoid: this.circlegeoid, p1: this.p1geoid, p2: this.p2geoid});
                        } else {
                            this.p2 = points[0];
                            this.p2geoid = this.p2.id;
                            this.circlegeoid = this.geoparent.getObjId('Circle');
                            this.result.push({type: 'Circle', name: this.circle.name, geoid: this.circlegeoid, p1: this.p1geoid, p2: this.p2geoid});
                        }
                        this.currStep = 0;
                        break;
                    default:
                        this.result = [];
                }
                return this.result;
            }
        } // End GeoToolCircle

        { // GeoToolRcircle
            /****************************************
             * GeoToolRcircle - Tool for creating circles with segment as radius.
             ****************************************/
            var GeoToolRcircle = function(geoparent){
                this.type = 'Rcircle';
                this.subtool = true;
                this.geoparent = geoparent;
                this.steps = 2;
            }
            
            /**
             * Register the tool to the GEditor.
             **/
            GEditor.prototype.geotools.push(GeoToolRcircle);
            GeoToolCircle.prototype.subtools.push('Rcircle');
    
            /**
             * Inherit the virtual GeoTool.
             **/
            GeoToolRcircle.prototype = new GeoTool();
            
            /**
             * Icon for Rcircle tool. - Use the same icon as for GeoRcircle-object.
             **/
            GeoToolRcircle.prototype.icon = GeoRcircle.prototype.icon;
            
            /**
             * Init the GeoToolRcircle. Reset the stepnumber etc.
             **/
            GeoToolRcircle.prototype.init = function(){
                this.currStep = 0;
                this.result = [];
                this.p1 = null;
                this.p2 = null;
                this.p3 = null;
                this.p1fake = null;
                this.circle = null;
                this.fakeradius = null;
                this.fakecircle = null;
            }
            
            /**
             * Actions for clicking the board. Return data for the new object.
             **/
            GeoToolRcircle.prototype.click = function(data){
                var ctool = this;
                this.currStep = this.currStep + 1;
                var board = data.board;
                var coords = new JXG.Coords(JXG.COORDS_BY_USER, [data.xcoord, data.ycoord], board);
                switch (this.currStep){
                    case 1:
                        this.result = [];
                        this.sendInfo(board, this.currStep);
                        var points = this.getPointsInCoords(board, coords);
                        if (points.length === 0) {
                            this.p1geoid = this.geoparent.getObjId('Point');
                            this.p1 = board.create('Point', [data.xcoord, data.ycoord], {fillColor: 'gray', strokeColor: 'gray', face: 'x', showLabel: false, size: 5, id: this.p1geoid});
                            this.p1fake = this.p1;
                            
                            this.result.push({type: 'Point', name: this.p1.name, geoid: this.p1geoid, x: data.xcoord, y: data.ycoord});
                            return [];
                        } else {
                            this.p1 = points[0];
                            this.p1geoid = this.p1.id;
                            this.p1fake = board.create('Point', [this.p1.X(), this.p1.Y()], {fillColor: 'none', strokeColor: 'black', face: 'x', size: 5, name: '', id: this.p1geoid+'_fake'});
                            return [];
                        }
                        break;
                    case 2:
                        var lines = this.getLinesInCoords(board, coords);
                        var points = this.getPointsInCoords(board, coords);
                        if (points.length > 0) {
                            this.p2 = points[0];
                            this.p2geoid = this.p2.id;
                            this.fakeradius = board.create('Line', [this.p2, 'gedithiddenmousecursor'], {visible: false});
                            this.fakecircle = board.create('Circle', [this.p1fake, this.fakeradius], {strokeColor: 'gray', strokeWidth: 1, id: this.geoid+'fake', name: ''});

                            this.sendInfo(board, '2');
                            return [];
                        } else if (lines.length > 0) {
                            var linedata = this.geoparent.getObjDataById(lines[0].id);
                            if (linedata) {
                                this.p2geoid = linedata.p1;
                                this.p3geoid = linedata.p2;
                                this.circlegeoid = this.geoparent.getObjId('Rcircle');
                                this.circle = board.create('Circle', [this.p1, board.objects[linedata.geoid]], {color: 'gray', strokeWidth: 1});
                                this.result.push({type: 'Rcircle', name: this.circle.name, geoid: this.circlegeoid, p1: this.p1geoid, p2: this.p2geoid, p3: this.p3geoid});
                                this.sendInfo(board, 'start');
                                this.currStep = 0;
                            }
                        } else {
                            this.currStep--;
                            this.sendInfo(board, 'error-'+this.currStep);
                            return [];
                        };
                        break;
                    case 3:
                        var points = this.getPointsInCoords(board, coords);
                        if (points.length > 0) {
                            this.p3 = points[0];
                            this.p3geoid = this.p3.id;
                            this.circlegeoid = this.geoparent.getObjId('Rcircle');
                            var radius = this.p2.Dist(this.p3);
                            this.circle = board.create('Circle', [this.p1, radius], {color: 'gray', strokeWidth: 1});
                            this.result.push({type: 'Rcircle', name: this.circle.name, geoid: this.circlegeoid, p1: this.p1geoid, p2: this.p2geoid, p3: this.p3geoid});
                            this.sendInfo(board, 'start');
                            this.currStep = 0;
                        } else {
                            this.currStep--;
                            this.sendInfo(board, 'error-'+this.currStep);
                            return [];
                        };
                        break;
                    default:
                        this.currStep = this.currStep - 1;
                        this.sendInfo(board, 'error-'+this.currStep);
                        this.result = [];
                }
                return this.result;
            }
        } // End GeoToolRcircle

        { // GeoToolTriangle
            /****************************************
             * GeoToolTriangle - Tool for creating triangles.
             ****************************************/
            var GeoToolTriangle = function(geoparent){
                this.type = 'Triangle';
                this.geoparent = geoparent;
                this.steps = 3;
            }
            
            /**
             * Register the tool to the GEditor.
             **/
            GEditor.prototype.geotools.push(GeoToolTriangle);
    
            /**
             * Inherit the virtual GeoTool.
             **/
            GeoToolTriangle.prototype = new GeoTool();
            
            /**
             * Subtool list.
             **/
            GeoToolTriangle.prototype.subtools = [];
            
            /**
             * Icon for triangle tool. - Use the same icon as for GeoTriangle-object.
             **/
            GeoToolTriangle.prototype.icon = GeoTriangle.prototype.icon;
            
            /**
             * Init the GeoToolTriangle. Reset the stepnumber etc.
             **/
            GeoToolTriangle.prototype.init = function(){
                this.currStep = 0;
                this.result = [];
                this.p1 = null;
                this.p2 = null;
                this.p3 = null;
                this.line1 = null;
                this.line2 = null;
                this.line3 = null;
            }
            
            /**
             * Actions for clicking the board. Return data for the new object.
             **/
            GeoToolTriangle.prototype.click = function(data){
                this.currStep = this.currStep + 1;
                var board = data.board;
                var coords = new JXG.Coords(JXG.COORDS_BY_USER, [data.xcoord, data.ycoord], board);
                switch (this.currStep){
                    case 1:
                        this.sendInfo(board, this.currStep);
                        this.result = [];
                        var points = this.getPointsInCoords(board, coords);
                        if (points.length === 0) {
                            this.p1geoid = this.geoparent.getObjId('Point');
                            this.p1 = board.create('Point', [data.xcoord, data.ycoord], {fillColor: 'gray', strokeColor: 'gray', face: 'x', id: this.p1geoid});
                            this.line1 = board.create('Line', [this.p1, 'gedithiddenmousecursor'], {strokeColor: 'gray', strokeWidth: 1, straightFirst: false, straightLast: false});
                            
                            this.result.push({type: 'Point', name: this.p1.name, geoid: this.p1geoid, x: data.xcoord, y: data.ycoord});
                            return [];
                        } else {
                            this.p1 = points[0];
                            this.p1geoid = this.p1.id;
                            this.line1 = board.create('Line', [this.p1, 'gedithiddenmousecursor'], {strokeColor: 'gray', strokeWidth: 1, straightFirst: false, straightLast: false});
                            return [];
                        }
                        break;
                    case 2:
                        this.sendInfo(board, this.currStep);
                        var points = this.getPointsInCoords(board, coords);
                        if (points.length === 0) {
                            this.p2geoid = this.geoparent.getObjId('Point');
                            this.p2 = board.create('Point', [data.xcoord, data.ycoord], {color: 'gray', face: 'x', id: this.p2geoid});
                            this.line1.remove();
                            this.line1 = board.create('Line', [this.p1, this.p2], {color: 'gray', strokeWidth: 1, straightFirst: false, straightLast: false});
                            this.line2 = board.create('Line', [this.p1, 'gedithiddenmousecursor'], {strokeColor: 'gray', withLabel: false, strokeWidth: 1, straightFirst: false, straightLast: false});
                            this.line3 = board.create('Line', [this.p2, 'gedithiddenmousecursor'], {strokeColor: 'gray', withLabel: false, strokeWidth: 1, straightFirst: false, straightLast: false});
                            this.result.push({type: 'Point', name: this.p2.name, geoid: this.p2geoid, x: data.xcoord, y: data.ycoord});
                        } else {
                            this.p2 = points[0];
                            this.p2geoid = this.p2.id;
                            this.line1.remove();
                            this.line1 = board.create('Line', [this.p1, this.p2], {color: 'gray', strokeWidth: 1, straightFirst: false, straightLast: false});
                            this.line2 = board.create('Line', [this.p1, 'gedithiddenmousecursor'], {strokeColor: 'gray', withLabel: false, strokeWidth: 1, straightFirst: false, straightLast: false});
                            this.line3 = board.create('Line', [this.p2, 'gedithiddenmousecursor'], {strokeColor: 'gray', withLabel: false, strokeWidth: 1, straightFirst: false, straightLast: false});
                        }
                        return [];
                        break;
                    case 3:
                        this.sendInfo(board, 'start');
                        var points = this.getPointsInCoords(board, coords);
                        if (points.length === 0) {
                            this.p3geoid = this.geoparent.getObjId('Point');
                            this.p3 = board.create('Point', [data.xcoord, data.ycoord], {color: 'gray', face: 'x', id: this.p3geoid});
                            //this.line1.remove();
                            //this.line2.remove();
                            //this.line1 = board.create('Line', [this.p1, this.p2], {color: 'gray', strokeWidth: 1});
                            this.result.push({type: 'Point', name: this.p3.name, geoid: this.p3geoid, x: data.xcoord, y: data.ycoord});
                            this.trianglegeoid = this.geoparent.getObjId('Triangle');
                            this.result.push({type: 'Triangle', name: '\u25b3'+this.p1.name+this.p2.name+this.p3.name, geoid: this.trianglegeoid, p1: this.p1geoid, p2: this.p2geoid, p3: this.p3geoid});
                        } else {
                            this.p3 = points[0];
                            this.p3geoid = this.p3.id;
                            this.trianglegeoid = this.geoparent.getObjId('Triangle');
                            this.result.push({type: 'Triangle', name: '\u25b3'+this.p1.name+this.p2.name+this.p3.name, geoid: this.trianglegeoid, p1: this.p1geoid, p2: this.p2geoid, p3: this.p3geoid});
                        }
                        this.currStep = 0;
                        break;
                    default:
                        this.result = [];
                }
                return this.result;
            }
        } // End GeoToolTriangle
        
        { // GeoToolRighttriangle
            /****************************************
             * GeoToolRighttriangle - Tool for creating right triangles.
             ****************************************/
            var GeoToolRighttriangle = function(geoparent){
                this.type = 'Righttriangle';
                this.subtool = true;
                this.geoparent = geoparent;
                this.steps = 3;
            }
            
            /**
             * Register the tool to the GEditor.
             **/
            GEditor.prototype.geotools.push(GeoToolRighttriangle);
            GeoToolTriangle.prototype.subtools.push('Righttriangle');
    
            /**
             * Inherit the virtual GeoTool.
             **/
            GeoToolRighttriangle.prototype = new GeoTool();
            
            /**
             * Icon for right triangle tool. - Use the same icon as for GeoRighttriangle-object.
             **/
            GeoToolRighttriangle.prototype.icon = GeoRighttriangle.prototype.icon;
            
            /**
             * Init the GeoToolRighttriangle. Reset the stepnumber etc.
             **/
            GeoToolRighttriangle.prototype.init = function(){
                this.currStep = 0;
                this.result = [];
                this.p1 = null;
                this.p2 = null;
                this.p3 = null;
                this.line1 = null;
                this.line2 = null;
                this.line3 = null;
            }
            
            /**
             * Actions for clicking the board. Return data for the new object.
             **/
            GeoToolRighttriangle.prototype.click = function(data){
                var geotool = this;
                this.currStep = this.currStep + 1;
                var board = data.board;
                var coords = new JXG.Coords(JXG.COORDS_BY_USER, [data.xcoord, data.ycoord], board);
                switch (this.currStep){
                    case 1:
                        this.sendInfo(board, this.currStep);
                        this.result = [];
                        var points = this.getPointsInCoords(board, coords);
                        if (points.length === 0) {
                            this.p1geoid = this.geoparent.getObjId('Point');
                            this.p1 = board.create('Point', [data.xcoord, data.ycoord], {fillColor: 'gray', strokeColor: 'gray', face: 'x', id: this.p1geoid});
                            this.line1 = board.create('Line', [this.p1, 'gedithiddenmousecursor'], {strokeColor: 'gray', strokeWidth: 1, straightFirst: false, straightLast: false});
                            
                            this.result.push({type: 'Point', name: this.p1.name, geoid: this.p1geoid, x: data.xcoord, y: data.ycoord});
                            return [];
                        } else {
                            this.p1 = points[0];
                            this.p1geoid = this.p1.id;
                            this.line1 = board.create('Line', [this.p1, 'gedithiddenmousecursor'], {strokeColor: 'gray', strokeWidth: 1, straightFirst: false, straightLast: false});
                            return [];
                        }
                        break;
                    case 2:
                        this.sendInfo(board, this.currStep);
                        var points = this.getPointsInCoords(board, coords);
                        if (points.length === 0) {
                            this.p2geoid = this.geoparent.getObjId('Point');
                            this.p2 = board.create('Point', [data.xcoord, data.ycoord], {color: 'gray', face: 'x', id: this.p2geoid});
                            this.line1.remove();
                            this.line1 = board.create('Line', [this.p1, this.p2], {color: 'gray', strokeWidth: 1, straightFirst: false, straightLast: false});
                            var midpoint = board.create('midpoint', [this.p1, this.p2], {visible: false});
                            var circle = board.create('circle', [midpoint, this.p1], {visible: false});
                            var helpline = board.create('line', [midpoint, 'gedithiddenmousecursor'], {visible: false, strokeColor: 'gray'});
                            this.p3 = board.create('intersection', [helpline, circle, 0], {visible: true, color: 'gray', name: '', face: 'x'});
                            this.line2 = board.create('Line', [this.p1, this.p3], {strokeColor: 'gray', withLabel: false, strokeWidth: 1, straightFirst: false, straightLast: false});
                            this.line3 = board.create('Line', [this.p2, this.p3], {strokeColor: 'gray', withLabel: false, strokeWidth: 1, straightFirst: false, straightLast: false});
                            var helpangle1 = board.create('angle', [this.p1, this.p3, this.p2], {
                                orthoType: 'square',
                                strokeColor: 'gray',
                                fillColor: 'gray',
                                fillOpacity: 0.3,
                                radius: 0.5,
                                id: this.geoid + '_helpangle1',
                                name: function(){
                                    board.objects[geotool.geoid + '_helpangle1'].setProperty({visible: (JXG.Math.Geometry.trueAngle(geotool.p1, geotool.p3, geotool.p2).toFixed(0) < 180)});
                                    return '';
                                }
                            });
                            var helpangle2 = board.create('angle', [this.p2, this.p3, this.p1], {
                                orthoType: 'square',
                                strokeColor: 'gray',
                                fillColor: 'gray',
                                fillOpacity: 0.3,
                                radius: 0.5,
                                id: this.geoid + '_helpangle2',
                                name: function(){
                                    board.objects[geotool.geoid + '_helpangle2'].setProperty({visible: (JXG.Math.Geometry.trueAngle(geotool.p2, geotool.p3, geotool.p1).toFixed(0) < 180)});
                                    return '';
                                }
                            });
                            this.result.push({type: 'Point', name: this.p2.name, geoid: this.p2geoid, x: data.xcoord, y: data.ycoord});
                        } else {
                            this.p2 = points[0];
                            this.p2geoid = this.p2.id;
                            this.line1.remove();
                            this.line1 = board.create('Line', [this.p1, this.p2], {color: 'gray', strokeWidth: 1, straightFirst: false, straightLast: false});
                            var midpoint = board.create('midpoint', [this.p1, this.p2], {visible: false, name: ''});
                            var circle = board.create('circle', [midpoint, this.p1], {visible: false});
                            var helpline = board.create('line', [midpoint, 'gedithiddenmousecursor'], {visible: false, strokeColor: 'gray'});
                            this.p3 = board.create('intersection', [helpline, circle, 0], {visible: true, color: 'gray', name: '', face: 'x'});
                            this.line2 = board.create('Line', [this.p1, this.p3], {strokeColor: 'gray', withLabel: false, strokeWidth: 1, straightFirst: false, straightLast: false});
                            this.line3 = board.create('Line', [this.p2, this.p3], {strokeColor: 'gray', withLabel: false, strokeWidth: 1, straightFirst: false, straightLast: false});
                            var helpangle1 = board.create('angle', [this.p1, this.p3, this.p2], {
                                orthoType: 'square',
                                strokeColor: 'gray',
                                fillColor: 'gray',
                                fillOpacity: 0.3,
                                radius: 0.5,
                                id: this.geoid + '_helpangle1',
                                name: function(){
                                    board.objects[geotool.geoid + '_helpangle1'].setProperty({visible: (JXG.Math.Geometry.trueAngle(geotool.p1, geotool.p3, geotool.p2).toFixed(0) < 180)});
                                    return '';
                                }
                            });
                            var helpangle2 = board.create('angle', [this.p2, this.p3, this.p1], {
                                orthoType: 'square',
                                strokeColor: 'gray',
                                fillColor: 'gray',
                                fillOpacity: 0.3,
                                radius: 0.5,
                                id: this.geoid + '_helpangle2',
                                name: function(){
                                    board.objects[geotool.geoid + '_helpangle2'].setProperty({visible: (JXG.Math.Geometry.trueAngle(geotool.p2, geotool.p3, geotool.p1).toFixed(0) < 180)});
                                    return '';
                                }
                            });
                        }
                        return [];
                        break;
                    case 3:
                        this.sendInfo(board, 'start');
                        this.p3x = this.p3.X();
                        this.p3y = this.p3.Y();
                        var point3 = board.create('point', [this.p3x, this.p3y], {visible: false});
                        this.p3name = point3.name;
                        this.trianglegeoid = this.geoparent.getObjId('Righttriangle');
                        this.result.push({type: 'Righttriangle', name: '\u25b3'+this.p1.name+this.p2.name, geoid: this.trianglegeoid, p1: this.p1geoid, p2: this.p2geoid, p3x: this.p3x, p3y: this.p3y, p3name: this.p3name});
                        this.p3.remove();
                        this.currStep = 0;
                        break;
                    default:
                        this.result = [];
                }
                return this.result;
            }
        } // End GeoToolRighttriangle
        
        { // GeoToolGlider
            /****************************************
             * GeoToolGlider - Tool for creating gliders.
             ****************************************/
            var GeoToolGlider = function(geoparent){
                this.type = 'Glider';
                this.subtool = true;
                this.geoparent = geoparent;
                this.steps = 1;
            }
            
            /**
             * Register the tool to the GEditor.
             **/
            GEditor.prototype.geotools.push(GeoToolGlider);
            GeoToolPoint.prototype.subtools.push('Glider');
    
            /**
             * Inherit the virtual GeoTool.
             **/
            GeoToolGlider.prototype = new GeoTool();
            
            /**
             * Icon for glider tool. - Use the same icon as for GeoGlider-object.
             **/
            GeoToolGlider.prototype.icon = GeoGlider.prototype.icon;
            
            /**
             * Init the GeoToolGlider. Reset the stepnumber etc.
             **/
            GeoToolGlider.prototype.init = function(){
                this.currStep = 0;
                this.result = [];
                this.parent = null;
                this.glider = null;
            }
            
            /**
             * Actions for clicking the board. Return data for the new object.
             **/
            GeoToolGlider.prototype.click = function(data){
                this.currStep = 0;
                var board = data.board;
                var coords = new JXG.Coords(JXG.COORDS_BY_USER, [data.xcoord, data.ycoord], board);
                this.sendInfo(board, 'start');
                var curves = this.getElementsInCoords(board, coords);
                if (curves.length > 0) {
                    this.parent = curves[0].id;
                    this.geoid = this.geoparent.getObjId('Glider');
                    this.glider = board.create('Glider', [this.parent], {fillColor: 'gray', strokeColor: 'gray', face: 'x', id: this.geoid});
                    return [{
                        geoid: this.geoid,
                        name: this.glider.name,
                        type: 'Glider',
                        x: Math.round(data.xcoord * 100)/100,
                        y: Math.round(data.ycoord * 100)/100,
                        parent: this.parent
                    }];
                }
                return [];
            }
        } // End GeoToolGlider

        { // GeoToolMidpoint
            /****************************************
             * GeoToolMidpoint - Tool for creating midpoint between two points.
             ****************************************/
            var GeoToolMidpoint = function(geoparent){
                this.type = 'Midpoint';
                this.subtool = true;
                this.geoparent = geoparent;
                this.steps = 2;
            }
            
            /**
             * Register the tool to the GEditor.
             **/
            GEditor.prototype.geotools.push(GeoToolMidpoint);
            GeoToolPoint.prototype.subtools.push('Midpoint');
    
            /**
             * Inherit the virtual GeoTool.
             **/
            GeoToolMidpoint.prototype = new GeoTool();
            
            /**
             * Icon for midpoint tool. - Use the same icon as for GeoMidpoint-object.
             **/
            GeoToolMidpoint.prototype.icon = GeoMidpoint.prototype.icon;
            
            /**
             * Init the GeoToolMidpoint. Reset the stepnumber etc.
             **/
            GeoToolMidpoint.prototype.init = function(){
                this.currStep = 0;
                this.result = [];
                this.p1 = null;
                this.p2 = null;
                this.midpoint = null;
            }
            
            /**
             * Actions for clicking the board. Return data for the new object.
             **/
            GeoToolMidpoint.prototype.click = function(data){
                this.currStep++;
                var board = data.board;
                var coords = new JXG.Coords(JXG.COORDS_BY_USER, [data.xcoord, data.ycoord], board);
                switch (this.currStep){
                    case 1:
                        this.sendInfo(board, 1);
                        var lines = this.getLinesInCoords(board, coords);
                        var points = this.getPointsInCoords(board, coords);
                        if (points.length > 0) {
                            this.p1 = points[0].id;
                            this.midpoint = board.create('midpoint',
                                [this.p1, 'gedithiddenmousecursor'],{
                                   fillColor: 'gray',
                                   strokeColor: 'gray',
                                   face: '<>'
                                });
                            this.sendInfo(board, '1');
                            return [];
                        } else if (lines.length > 0) {
                            var line = lines[0];
                            this.p1 = line.point1.id;
                            this.p2 = line.point2.id;
                            this.geoid = this.geoparent.getObjId('Midpoint');
                            this.midpoint = board.create('midpoint', [this.p1, this.p2], {fillColor: 'gray', strokeColor: 'gray', face: '<>', id: this.geoid});
                            this.currStep = 0;
                            this.sendInfo(board, 'start');
                            return [{
                                geoid: this.geoid,
                                name: this.midpoint.name,
                                type: 'Midpoint',
                                p1: this.p1,
                                p2: this.p2
                            }];
                        } else {
                            this.currStep--;
                            this.sendInfo(board, 'error-'+this.currStep);
                            return [];
                        }
                        break;
                    case 2:
                        var points = this.getPointsInCoords(board, coords);
                        if (points.length > 0) {
                            this.p2 = points[0].id;
                            this.midpoint = board.create('midpoint',
                                [this.p1, this.p2],{
                                   fillColor: 'gray',
                                   strokeColor: 'gray',
                                   face: '<>'
                                });
                            this.currStep = 0;
                            this.sendInfo(board, 'start');
                            this.geoid = this.geoparent.getObjId('Midpoint');
                            return [{
                                type: 'Midpoint',
                                name: this.midpoint.name,
                                geoid: this.geoid,
                                p1: this.p1,
                                p2: this.p2
                            }];
                        } else {
                            this.currStep--;
                            this.sendInfo(board, 'error-'+this.currStep);
                            return [];
                        }
                        break;
                    default:
                        this.currStep--;
                        this.sendInfo('board', 'error-'+this.currStep);
                        break;
                }
                return [];
            }
        } // End GeoToolMidpoint

        { // GeoToolIntersection
            /****************************************
             * GeoToolIntersection - Tool for creating intersections.
             ****************************************/
            var GeoToolIntersection = function(geoparent){
                this.type = 'Intersection';
                this.subtool = true;
                this.geoparent = geoparent;
                this.steps = 2;
            }
            
            /**
             * Register the tool to the GEditor.
             **/
            GEditor.prototype.geotools.push(GeoToolIntersection);
            GeoToolPoint.prototype.subtools.push('Intersection');
    
            /**
             * Inherit the virtual GeoTool.
             **/
            GeoToolIntersection.prototype = new GeoTool();
            
            /**
             * Icon for intersection tool. - Use the same icon as for GeoIntersection-object.
             **/
            GeoToolIntersection.prototype.icon = GeoIntersection.prototype.icon;
            
            /**
             * Init the GeoToolIntersection. Reset the stepnumber etc.
             **/
            GeoToolIntersection.prototype.init = function(){
                this.currStep = 0;
                this.result = [];
                this.parent1 = null;
                this.parent2 = null;
                this.intersection = null;
            }
            
            /**
             * Actions for clicking the board. Return data for the new object.
             **/
            GeoToolIntersection.prototype.click = function(data){
                this.currStep++;
                var board = data.board;
                var coords = new JXG.Coords(JXG.COORDS_BY_USER, [data.xcoord, data.ycoord], board);
                switch (this.currStep) {
                    case 1:
                        this.result = [];
                        var curves = this.getElementsInCoords(board, coords);
                        if (curves.length > 0) {
                            this.parent1 = curves[0].id;
                            this.sendInfo(board, this.currStep);
                            return [];
                        } else {
                            this.currStep--;
                            this.sendInfo(board, 'start');
                            return [];
                        }
                        break;
                    case 2:
                        this.result = [];
                        var curves = this.getElementsInCoords(board, coords);
                        if (curves.length > 0) {
                            this.parent2 = curves[0].id;
                            //this.intersection = board.create('Intersection', [this.parent1, this.parent2, 0], {fillColor: 'gray', strokeColor: 'gray', face: 'x', id: this.geoid});
                            this.geoid = this.geoparent.getObjId('Intersection');
                            var num = this.geoid.match(/GeoIntersection_{([0-9]+)}/)[1];
                            this.sendInfo(board, 'start');
                            this.currStep = 0;
                            return [{
                                geoid: this.geoid,
                                name: 'i' + num,
                                type: 'Intersection',
                                parent1: this.parent1,
                                parent2: this.parent2
                            }];
                        } else {
                            this.currStep--;
                            return [];
                        }
                        break;
                    default:
                        return [];
                        break;
                }
                return [];
            }
        } // End GeoToolIntersection
        
        { // GeoToolNormal
            /****************************************
             * GeoToolNormal - Tool for creating normal.
             ****************************************/
            var GeoToolNormal = function(geoparent){
                this.type = 'Normal';
                this.subtool = true;
                this.geoparent = geoparent;
                this.steps = 2;
            }
            
            /**
             * Register the tool to the GEditor.
             **/
            GEditor.prototype.geotools.push(GeoToolNormal);
            GeoToolLine.prototype.subtools.push('Normal');
    
            /**
             * Inherit the virtual GeoTool.
             **/
            GeoToolNormal.prototype = new GeoTool();
            
            /**
             * Icon for line tool. - Use the same icon as for GeoLine-object.
             **/
            GeoToolNormal.prototype.icon = GeoNormal.prototype.icon;
            
            /**
             * Init the GeoToolNormal. Reset the stepnumber etc.
             **/
            GeoToolNormal.prototype.init = function(){
                this.currStep = 0;
                this.result = [];
                this.p1 = null;
                this.p2 = null;
                this.line = null;
            }
            
            /**
             * Actions for clicking the board. Return data for the new object.
             **/
            GeoToolNormal.prototype.click = function(data){
                this.currStep = this.currStep + 1;
                var board = data.board;
                var coords = new JXG.Coords(JXG.COORDS_BY_USER, [data.xcoord, data.ycoord], board);
                switch (this.currStep){
                    case 1:
                        this.sendInfo(board, this.currStep);
                        this.result = [];
                        var elements = this.getElementsInCoords(board, coords);
                        if (elements.length === 0) {
                            this.currStep--;
                            this.sendInfo(board, 'error-' + this.currStep);
                            return [];
                        } else {
                            this.p1 = elements[0];
                            this.p1geoid = this.p1.id;
                            this.line = board.create('Normal', [this.p1, 'gedithiddenmousecursor'], {strokeColor: 'gray', strokeWidth: 1});
                            return [];
                        }
                        break;
                    case 2:
                        this.sendInfo(board, 'start');
                        var points = this.getPointsInCoords(board, coords);
                        if (points.length === 0) {
                            this.p2geoid = this.geoparent.getObjId('Point');
                            this.p2 = board.create('Point', [data.xcoord, data.ycoord], {color: 'gray', face: 'x', id: this.p2geoid});
                            this.line.remove();
                            this.line = board.create('Normal', [this.p1, this.p2], {color: 'gray', strokeWidth: 1});
                            this.result.push({type: 'Point', name: this.p2.name, geoid: this.p2geoid, x: data.xcoord, y: data.ycoord});
                            this.normalgeoid = this.geoparent.getObjId('Normal');
                            this.result.push({type: 'Normal', name: this.line.name, geoid: this.normalgeoid, p1: this.p1geoid, p2: this.p2geoid});
                        } else {
                            this.p2 = points[0];
                            this.p2geoid = this.p2.id;
                            this.normalgeoid = this.geoparent.getObjId('Normal');
                            this.result.push({type: 'Normal', name: this.line.name, geoid: this.normalgeoid, p1: this.p1geoid, p2: this.p2geoid});
                        }
                        this.currStep = 0;
                        break;
                    default:
                        this.result = [];
                }
                return this.result;
            }
        } // End GeoToolNormal
        
        { // GeoToolParallel
            /****************************************
             * GeoToolParallel - Tool for creating parallel.
             ****************************************/
            var GeoToolParallel = function(geoparent){
                this.type = 'Parallel';
                this.subtool = true;
                this.geoparent = geoparent;
                this.steps = 2;
            }
            
            /**
             * Register the tool to the GEditor.
             **/
            GEditor.prototype.geotools.push(GeoToolParallel);
            GeoToolLine.prototype.subtools.push('Parallel');
    
            /**
             * Inherit the virtual GeoTool.
             **/
            GeoToolParallel.prototype = new GeoTool();
            
            /**
             * Icon for line tool. - Use the same icon as for GeoLine-object.
             **/
            GeoToolParallel.prototype.icon = GeoParallel.prototype.icon;
            
            /**
             * Init the GeoToolParallel. Reset the stepnumber etc.
             **/
            GeoToolParallel.prototype.init = function(){
                this.currStep = 0;
                this.result = [];
                this.p1 = null;
                this.p2 = null;
                this.line = null;
            }
            
            /**
             * Actions for clicking the board. Return data for the new object.
             **/
            GeoToolParallel.prototype.click = function(data){
                this.currStep = this.currStep + 1;
                var board = data.board;
                var coords = new JXG.Coords(JXG.COORDS_BY_USER, [data.xcoord, data.ycoord], board);
                switch (this.currStep){
                    case 1:
                        this.sendInfo(board, this.currStep);
                        this.result = [];
                        var elements = this.getLinesInCoords(board, coords);
                        if (elements.length === 0) {
                            this.currStep--;
                            this.sendInfo(board, 'error-' + this.currStep);
                            return [];
                        } else {
                            this.p1 = elements[0];
                            this.p1geoid = this.p1.id;
                            this.line = board.create('Parallel', [this.p1, 'gedithiddenmousecursor'], {strokeColor: 'gray', strokeWidth: 1});
                            return [];
                        }
                        break;
                    case 2:
                        this.sendInfo(board, 'start');
                        var points = this.getPointsInCoords(board, coords);
                        if (points.length === 0) {
                            this.p2geoid = this.geoparent.getObjId('Point');
                            this.p2 = board.create('Point', [data.xcoord, data.ycoord], {color: 'gray', face: 'x', id: this.p2geoid});
                            this.line.remove();
                            this.line = board.create('Parallel', [this.p1, this.p2], {color: 'gray', strokeWidth: 1});
                            this.result.push({type: 'Point', name: this.p2.name, geoid: this.p2geoid, x: data.xcoord, y: data.ycoord});
                            this.normalgeoid = this.geoparent.getObjId('Normal');
                            this.result.push({type: 'Parallel', name: this.line.name, geoid: this.normalgeoid, p1: this.p1geoid, p2: this.p2geoid});
                        } else {
                            this.p2 = points[0];
                            this.p2geoid = this.p2.id;
                            this.parallelgeoid = this.geoparent.getObjId('Parallel');
                            this.result.push({type: 'Parallel', name: this.line.name, geoid: this.parallelgeoid, p1: this.p1geoid, p2: this.p2geoid});
                        }
                        this.currStep = 0;
                        break;
                    default:
                        this.result = [];
                }
                return this.result;
            }
        } // End GeoToolParallel
        
        { // GeoToolTangent
            /****************************************
             * GeoToolTangent - Tool for creating normal.
             ****************************************/
            var GeoToolTangent = function(geoparent){
                this.type = 'Tangent';
                this.subtool = true;
                this.geoparent = geoparent;
                this.steps = 2;
            }
            
            /**
             * Register the tool to the GEditor.
             **/
            GEditor.prototype.geotools.push(GeoToolTangent);
            GeoToolLine.prototype.subtools.push('Tangent');
    
            /**
             * Inherit the virtual GeoTool.
             **/
            GeoToolTangent.prototype = new GeoTool();
            
            /**
             * Icon for line tool. - Use the same icon as for GeoLine-object.
             **/
            GeoToolTangent.prototype.icon = GeoTangent.prototype.icon;
            
            /**
             * Init the GeoToolTangent. Reset the stepnumber etc.
             **/
            GeoToolTangent.prototype.init = function(){
                this.currStep = 0;
                this.result = [];
                this.p1 = null;
                this.p2 = null;
                this.tangent1 = null;
                this.tangent2 = null;
            }
            
            /**
             * Actions for clicking the board. Return data for the new object.
             **/
            GeoToolTangent.prototype.click = function(data){
                this.currStep = this.currStep + 1;
                var board = data.board;
                var coords = new JXG.Coords(JXG.COORDS_BY_USER, [data.xcoord, data.ycoord], board);
                switch (this.currStep){
                    case 1:
                        this.sendInfo(board, this.currStep);
                        this.result = [];
                        var elements = this.getElementsInCoords(board, coords);
                        if (elements.length === 0) {
                            this.currStep--;
                            this.sendInfo(board, 'error-' + this.currStep);
                            return [];
                        } else {
                            this.p1 = elements[0];
                            this.p1geoid = this.p1.id;
                            var helpline = board.create(
                                'Tangent',
                                [this.p1, 'gedithiddenmousecursor'],
                                {
                                    visible: false
                                }
                            );
                            var int1 = board.create(
                                'intersection',
                                [this.p1, helpline, 0],
                                {
                                    strokeColor: 'gray',
                                    face: '+'
                                }
                            );
                            var int2 = board.create(
                                'intersection',
                                [this.p1, helpline, 1],
                                {
                                    strokeColor: 'gray',
                                    face: '+'
                                }
                            );
                            this.tangent1 = board.create(
                                'line',
                                [int1, 'gedithiddenmousecursor'],
                                {
                                    strokeColor: 'gray',
                                    strokeWidth: 1
                                }
                            );
                            this.tangent2 = board.create(
                                'line',
                                [int2, 'gedithiddenmousecursor'],
                                {
                                    strokeColor: 'gray',
                                    strokeWidth: 1
                                }
                            );
                            return [];
                        }
                        break;
                    case 2:
                        this.sendInfo(board, 'start');
                        var points = this.getPointsInCoords(board, coords);
                        if (points.length === 0) {
                            this.p2geoid = this.geoparent.getObjId('Point');
                            this.p2 = board.create(
                                'Point',
                                [data.xcoord, data.ycoord],
                                {
                                    color: 'gray',
                                    face: 'x',
                                    id: this.p2geoid
                                }
                            );
                            var helpline = board.create(
                                'Tangent',
                                [this.p1, this.p2],
                                {
                                    color: 'gray',
                                    strokeWidth: 1
                                }
                            );
                            var int1 = board.create(
                                'intersection',
                                [this.p1, helpline, 0],
                                {
                                    strokeColor: 'gray',
                                    face: '+'
                                }
                            );
                            var int2 = board.create(
                                'intersection',
                                [this.p1, helpline, 1],
                                {
                                    strokeColor: 'gray',
                                    face: '+'
                                }
                            );
                            var tangent1 = board.create(
                                'line',
                                [this.p2, int1],
                                {visible: false}
                            );
                            this.result.push({
                                type: 'Point',
                                name: this.p2.name,
                                geoid: this.p2geoid,
                                x: data.xcoord, y:
                                data.ycoord
                            });
                            this.tangentgeoid = this.geoparent.getObjId('Tangent');
                            this.result.push({
                                type: 'Tangent',
                                name: tangent1.name,
                                geoid: this.tangentgeoid,
                                p1: this.p1geoid,
                                p2: this.p2geoid
                            });
                        } else {
                            this.p2 = points[0];
                            this.p2geoid = this.p2.id;
                            this.tangentgeoid = this.geoparent.getObjId('Tangent');
                            var fakeline = board.create('line', [this.p2, this.p2], {visible: false});
                            this.result.push({
                                type: 'Tangent',
                                name: fakeline.name,
                                geoid: this.tangentgeoid,
                                p1: this.p1geoid,
                                p2: this.p2geoid
                            });
                        }
                        this.currStep = 0;
                        break;
                    default:
                        this.result = [];
                }
                return this.result;
            }
        } // End GeoToolTangent
        
        { // GeoToolRectangle
            /****************************************
             * GeoToolRrectangle - Tool for creating rectangles.
             ****************************************/
            var GeoToolRectangle = function(geoparent){
                this.type = 'Rectangle';
                this.geoparent = geoparent;
                this.subtool = false;
                this.steps = 3;
            }
            
            /**
             * Register the tool to the GEditor.
             **/
            GEditor.prototype.geotools.push(GeoToolRectangle);
            //GeoToolTriangle.prototype.subtools.push('Rectangle');
    
            /**
             * Inherit the virtual GeoTool.
             **/
            GeoToolRectangle.prototype = new GeoTool();
            
            /**
             * Subtool list.
             **/
            GeoToolRectangle.prototype.subtools = [];
            
            /**
             * Icon for rectangle tool. - Use the same icon as for GeoRectangle-object.
             **/
            GeoToolRectangle.prototype.icon = GeoRectangle.prototype.icon;
            
            /**
             * Init the GeoToolRectangle. Reset the stepnumber etc.
             **/
            GeoToolRectangle.prototype.init = function(){
                this.currStep = 0;
                this.result = [];
                this.p1 = null;
                this.p2 = null;
                this.p3 = null;
                this.p4 = null
                this.line1 = null;
                this.line2 = null;
                this.line3 = null;
                this.line4 = null;
            }
            
            /**
             * Actions for clicking the board. Return data for the new object.
             **/
            GeoToolRectangle.prototype.click = function(data){
                var geotool = this;
                this.currStep = this.currStep + 1;
                var board = data.board;
                var coords = new JXG.Coords(JXG.COORDS_BY_USER, [data.xcoord, data.ycoord], board);
                switch (this.currStep){
                    case 1:
                        this.sendInfo(board, this.currStep);
                        this.result = [];
                        var points = this.getPointsInCoords(board, coords);
                        if (points.length === 0) {
                            this.p1geoid = this.geoparent.getObjId('Point');
                            this.p1 = board.create('Point', [data.xcoord, data.ycoord], {fillColor: 'gray', strokeColor: 'gray', face: 'x', id: this.p1geoid});
                            this.line1 = board.create('Line', [this.p1, 'gedithiddenmousecursor'], {strokeColor: 'gray', strokeWidth: 1, straightFirst: false, straightLast: false});
                            
                            this.result.push({type: 'Point', name: this.p1.name, geoid: this.p1geoid, x: data.xcoord, y: data.ycoord});
                            return [];
                        } else {
                            this.p1 = points[0];
                            this.p1geoid = this.p1.id;
                            this.line1 = board.create('Line', [this.p1, 'gedithiddenmousecursor'], {strokeColor: 'gray', strokeWidth: 1, straightFirst: false, straightLast: false});
                            return [];
                        }
                        break;
                    case 2:
                        this.sendInfo(board, this.currStep);
                        var points = this.getPointsInCoords(board, coords);
                        if (points.length === 0) {
                            this.p2geoid = this.geoparent.getObjId('Point');
                            this.p2 = board.create('Point', [data.xcoord, data.ycoord], {color: 'gray', face: 'x', id: this.p2geoid});
                            this.line1.remove();
                            this.line1 = board.create('Line', [this.p1, this.p2], {color: 'gray', strokeWidth: 1, straightFirst: false, straightLast: false});
                            var helpline1 = board.create('normal', [this.p2, this.line1], {visible: false, strokeColor: 'gray'});
                            var helpline2 = board.create('parallel', ['gedithiddenmousecursor', this.line1], {visible: false, strokeColor: 'gray'});
                            var helppoint1 = board.create('intersection', [helpline1, helpline2, 0], {visible: true, face: 'x', strokeColor: 'gray'});
                            var helppoint2 = board.create('parallelpoint', [this.p2, this.p1, helppoint1], {visible: false, face: 'x', strokeColor: 'gray'});
                            this.line2 = board.create('Line', [this.p2, helppoint1], {strokeColor: 'gray', withLabel: false, strokeWidth: 1, straightFirst: false, straightLast: false});
                            this.line3 = board.create('Line', [helppoint1, helppoint2], {strokeColor: 'gray', withLabel: false, strokeWidth: 1, straightFirst: false, straightLast: false});
                            this.line4 = board.create('Line', [this.p1, helppoint2], {strokeColor: 'gray', withLabel: false, strokeWidth: 1, straightFirst: false, straightLast: false});
                            this.result.push({type: 'Point', name: this.p2.name, geoid: this.p2geoid, x: data.xcoord, y: data.ycoord});
                        } else {
                            this.p2 = points[0];
                            this.p2geoid = this.p2.id;
                            this.line1.remove();
                            this.line1 = board.create('Line', [this.p1, this.p2], {color: 'gray', strokeWidth: 1, straightFirst: false, straightLast: false});
                            var helpline1 = board.create('normal', [this.p2, this.line1], {visible: false, strokeColor: 'gray'});
                            var helpline2 = board.create('parallel', ['gedithiddenmousecursor', this.line1], {visible: false, strokeColor: 'gray'});
                            var helppoint1 = board.create('intersection', [helpline1, helpline2, 0], {visible: true, face: 'x', strokeColor: 'gray'});
                            var helppoint2 = board.create('parallelpoint', [this.p2, this.p1, helppoint1], {visible: false, face: 'x', strokeColor: 'gray'});
                            this.line2 = board.create('Line', [this.p2, helppoint1], {strokeColor: 'gray', withLabel: false, strokeWidth: 1, straightFirst: false, straightLast: false});
                            this.line3 = board.create('Line', [helppoint1, helppoint2], {strokeColor: 'gray', withLabel: false, strokeWidth: 1, straightFirst: false, straightLast: false});
                            this.line4 = board.create('Line', [this.p1, helppoint2], {strokeColor: 'gray', withLabel: false, strokeWidth: 1, straightFirst: false, straightLast: false});
                        }
                        this.p3 = helppoint1;
                        this.p4 = helppoint2;
                        return [];
                        break;
                    case 3:
                        this.sendInfo(board, 'start');
                        this.p3dist = this.p3.Dist(this.p2);
                        if (JXG.Math.Geometry.trueAngle(this.p1, this.p2, this.p3) < 180) {
                            this.p3dist = -this.p3dist;
                        }
                        var helpline1 = board.create('normal', [this.p2, this.line1], {visible: false, strokeColor: 'gray'});
                        this.p3name = this.p3.name;
                        this.p4name = this.p4.name;
                        this.rectanglegeoid = this.geoparent.getObjId('Rectangle');
                        this.result.push({type: 'Rectangle', name: '\u25af'+this.p1.name+this.p2.name + this.p3name + this.p4name, geoid: this.rectanglegeoid, p1: this.p1geoid, p2: this.p2geoid, p3dist: this.p3dist, p3name: this.p3name, p4name: this.p4name});
                        this.p3.remove();
                        this.p4.remove();
                        this.currStep = 0;
                        break;
                    default:
                        this.result = [];
                }
                return this.result;
            }
        } // End GeoToolRectangle

        { // GeoToolRtriangle
            /****************************************
             * GeoToolRtriangle - Tool for creating rectangles.
             ****************************************/
            var GeoToolRtriangle = function(geoparent){
                this.type = 'Rtriangle';
                this.geoparent = geoparent;
                this.subtool = true;
                this.steps = 3;
            }
            
            /**
             * Register the tool to the GEditor.
             **/
            GEditor.prototype.geotools.push(GeoToolRtriangle);
            GeoToolTriangle.prototype.subtools.push('Rtriangle');
    
            /**
             * Inherit the virtual GeoTool.
             **/
            GeoToolRtriangle.prototype = new GeoTool();
            
            /**
             * Icon for rtriangle tool. - Use the same icon as for GeoRtriangle-object.
             **/
            GeoToolRtriangle.prototype.icon = GeoRtriangle.prototype.icon;
            
            /**
             * Init the GeoToolRtriangle. Reset the stepnumber etc.
             **/
            GeoToolRtriangle.prototype.init = function(){
                this.currStep = 0;
                this.result = [];
                this.p1 = null;
                this.p2 = null;
                this.p3 = null;
                this.line1 = null;
                this.line2 = null;
                this.line3 = null;
            }
            
            /**
             * Actions for clicking the board. Return data for the new object.
             **/
            GeoToolRtriangle.prototype.click = function(data){
                var geotool = this;
                this.currStep = this.currStep + 1;
                var board = data.board;
                var coords = new JXG.Coords(JXG.COORDS_BY_USER, [data.xcoord, data.ycoord], board);
                switch (this.currStep){
                    case 1:
                        this.sendInfo(board, this.currStep);
                        this.result = [];
                        var points = this.getPointsInCoords(board, coords);
                        if (points.length === 0) {
                            this.p1geoid = this.geoparent.getObjId('Point');
                            this.p1 = board.create('Point', [data.xcoord, data.ycoord], {fillColor: 'gray', strokeColor: 'gray', face: 'x', id: this.p1geoid});
                            this.line1 = board.create('Line', [this.p1, 'gedithiddenmousecursor'], {strokeColor: 'gray', strokeWidth: 1, straightFirst: false, straightLast: false});
                            
                            this.result.push({type: 'Point', name: this.p1.name, geoid: this.p1geoid, x: data.xcoord, y: data.ycoord});
                            return [];
                        } else {
                            this.p1 = points[0];
                            this.p1geoid = this.p1.id;
                            this.line1 = board.create('Line', [this.p1, 'gedithiddenmousecursor'], {strokeColor: 'gray', strokeWidth: 1, straightFirst: false, straightLast: false});
                            return [];
                        }
                        break;
                    case 2:
                        this.sendInfo(board, this.currStep);
                        var points = this.getPointsInCoords(board, coords);
                        if (points.length === 0) {
                            this.p2geoid = this.geoparent.getObjId('Point');
                            this.p2 = board.create('Point', [data.xcoord, data.ycoord], {color: 'gray', face: 'x', id: this.p2geoid});
                            this.line1.remove();
                            this.line1 = board.create('Line', [this.p1, this.p2], {color: 'gray', strokeWidth: 1, straightFirst: false, straightLast: false});
                            var helpline1 = board.create('normal', [this.p2, this.line1], {visible: false, strokeColor: 'gray'});
                            var helpline2 = board.create('parallel', ['gedithiddenmousecursor', this.line1], {visible: false, strokeColor: 'gray'});
                            var helppoint1 = board.create('intersection', [helpline1, helpline2, 0], {visible: true, face: 'x', strokeColor: 'gray'});
                            this.line2 = board.create('Line', [this.p2, helppoint1], {strokeColor: 'gray', withLabel: false, strokeWidth: 1, straightFirst: false, straightLast: false});
                            this.line3 = board.create('Line', [this.p1, helppoint1], {strokeColor: 'gray', withLabel: false, strokeWidth: 1, straightFirst: false, straightLast: false});
                            this.result.push({type: 'Point', name: this.p2.name, geoid: this.p2geoid, x: data.xcoord, y: data.ycoord});
                        } else {
                            this.p2 = points[0];
                            this.p2geoid = this.p2.id;
                            this.line1.remove();
                            this.line1 = board.create('Line', [this.p1, this.p2], {color: 'gray', strokeWidth: 1, straightFirst: false, straightLast: false});
                            var helpline1 = board.create('normal', [this.p2, this.line1], {visible: false, strokeColor: 'gray'});
                            var helpline2 = board.create('parallel', ['gedithiddenmousecursor', this.line1], {visible: false, strokeColor: 'gray'});
                            var helppoint1 = board.create('intersection', [helpline1, helpline2, 0], {visible: true, face: 'x', strokeColor: 'gray'});
                            this.line2 = board.create('Line', [this.p2, helppoint1], {strokeColor: 'gray', withLabel: false, strokeWidth: 1, straightFirst: false, straightLast: false});
                            this.line3 = board.create('Line', [this.p1, helppoint1], {strokeColor: 'gray', withLabel: false, strokeWidth: 1, straightFirst: false, straightLast: false});
                        }
                        this.p3 = helppoint1;
                        return [];
                        break;
                    case 3:
                        this.sendInfo(board, 'start');
                        this.p3dist = this.p3.Dist(this.p2);
                        if (JXG.Math.Geometry.trueAngle(this.p1, this.p2, this.p3) < 180) {
                            this.p3dist = -this.p3dist;
                        }
                        var helpline1 = board.create('normal', [this.p2, this.line1], {visible: false, strokeColor: 'gray'});
                        this.p3name = this.p3.name;
                        this.rtrianglegeoid = this.geoparent.getObjId('Rtriangle');
                        this.result.push({type: 'Rtriangle', name: '\u25b3'+this.p1.name+this.p2.name + this.p3name, geoid: this.rtrianglegeoid, p1: this.p1geoid, p2: this.p2geoid, p3dist: this.p3dist, p3name: this.p3name});
                        this.p3.remove();
                        this.currStep = 0;
                        break;
                    default:
                        this.result = [];
                }
                return this.result;
            }
        } // End GeoToolRtriangle

        
        { // GeoToolAngle
            /****************************************
             * GeoToolAngle - Tool for creating Angles.
             ****************************************/
            var GeoToolAngle = function(geoparent){
                this.type = 'Angle';
                this.geoparent = geoparent;
                this.steps = 3;
            }
            
            /**
             * Register the tool to the GEditor.
             **/
            GEditor.prototype.geotools.push(GeoToolAngle);
    
            /**
             * Inherit the virtual GeoTool.
             **/
            GeoToolAngle.prototype = new GeoTool();
            
            /**
             * Subtool list.
             **/
            GeoToolAngle.prototype.subtools = [];
            
            /**
             * Icon for angle tool. - Use the same icon as for GeoAngle-object.
             **/
            GeoToolAngle.prototype.icon = GeoAngle.prototype.icon;
            
            /**
             * Init the GeoToolAngle. Reset the stepnumber etc.
             **/
            GeoToolAngle.prototype.init = function(){
                this.currStep = 0;
                this.result = [];
                this.p1 = null;
                this.p2 = null;
                this.p2 = null;
                this.line1 = null;
                this.line2 = null;
            }
            
            /**
             * Actions for clicking the board. Return data for the new object.
             **/
            GeoToolAngle.prototype.click = function(data){
                this.currStep = this.currStep + 1;
                var board = data.board;
                var coords = new JXG.Coords(JXG.COORDS_BY_USER, [data.xcoord, data.ycoord], board);
                switch (this.currStep){
                    case 1:
                        this.sendInfo(board, this.currStep);
                        this.result = [];
                        var points = this.getPointsInCoords(board, coords);
                        if (points.length === 0) {
                            this.p1geoid = this.geoparent.getObjId('Point');
                            this.p1 = board.create('Point', [data.xcoord, data.ycoord], {fillColor: 'gray', strokeColor: 'gray', face: 'x', id: this.p1geoid});
                            this.line1 = board.create('Line', [this.p1, 'gedithiddenmousecursor'], {strokeColor: 'gray', strokeWidth: 1, straightFirst: false, straightLast: false});
                            
                            this.result.push({type: 'Point', name: this.p1.name, geoid: this.p1geoid, x: data.xcoord, y: data.ycoord});
                            return [];
                        } else {
                            this.p1 = points[0];
                            this.p1geoid = this.p1.id;
                            this.line1 = board.create('Line', [this.p1, 'gedithiddenmousecursor'], {strokeColor: 'gray', strokeWidth: 1, straightFirst: false, straightLast: false});
                            return [];
                        }
                        break;
                    case 2:
                        this.sendInfo(board, this.currStep);
                        var points = this.getPointsInCoords(board, coords);
                        if (points.length === 0) {
                            this.p2geoid = this.geoparent.getObjId('Point');
                            this.p2 = board.create('Point', [data.xcoord, data.ycoord], {color: 'gray', face: 'x', id: this.p2geoid});
                            this.line1.remove();
                            this.line1 = board.create('Line', [this.p1, this.p2], {color: 'gray', strokeWidth: 1, straightFirst: false, straightLast: false});
                            this.line2 = board.create('Line', [this.p2, 'gedithiddenmousecursor'], {strokeColor: 'gray', withLabel: false, strokeWidth: 1, straightFirst: false, straightLast: false});
                            this.result.push({type: 'Point', name: this.p2.name, geoid: this.p2geoid, x: data.xcoord, y: data.ycoord});
                        } else {
                            this.p2 = points[0];
                            this.p2geoid = this.p2.id;
                            this.line1.remove();
                            this.line1 = board.create('Line', [this.p1, this.p2], {color: 'gray', strokeWidth: 1, straightFirst: false, straightLast: false});
                            this.line2 = board.create('Line', [this.p2, 'gedithiddenmousecursor'], {strokeColor: 'gray', withLabel: false, strokeWidth: 1, straightFirst: false, straightLast: false});
                        }
                        return [];
                        break;
                    case 3:
                        this.sendInfo(board, 'start');
                        var points = this.getPointsInCoords(board, coords);
                        if (points.length === 0) {
                            this.p3geoid = this.geoparent.getObjId('Point');
                            this.p3 = board.create('Point', [data.xcoord, data.ycoord], {color: 'gray', face: 'x', id: this.p3geoid});
                            this.line1.remove();
                            this.line2.remove();
                            this.result.push({type: 'Point', name: this.p3.name, geoid: this.p3geoid, x: data.xcoord, y: data.ycoord});
                            this.geoid = this.geoparent.getObjId('Angle');
                            this.result.push({type: 'Angle', name: '\u2220'+this.p1.name+this.p2.name+this.p3.name, geoid: this.geoid, p1: this.p1geoid, p2: this.p2geoid, p3: this.p3geoid});
                        } else {
                            this.p3 = points[0];
                            this.p3geoid = this.p3.id;
                            this.geoid = this.geoparent.getObjId('Angle');
                            this.result.push({type: 'Angle', name: '\u2220'+this.p1.name+this.p2.name+this.p3.name, geoid: this.geoid, p1: this.p1geoid, p2: this.p2geoid, p3: this.p3geoid});
                        }
                        this.currStep = 0;
                        break;
                    default:
                        this.result = [];
                }
                return this.result;
            }
        } // End GeoToolAngle
        
        { // GeoToolBisector
            /****************************************
             * GeoToolBisector - Tool for creating Bisectors.
             ****************************************/
            var GeoToolBisector = function(geoparent){
                this.type = 'Bisector';
                this.geoparent = geoparent;
                this.subtool = true;
                this.steps = 3;
            }
            
            /**
             * Register the tool to the GEditor.
             * Register as subtool of another tool.
             **/
            GEditor.prototype.geotools.push(GeoToolBisector);
            GeoToolLine.prototype.subtools.push('Bisector');
            GeoToolAngle.prototype.subtools.push('Bisector');
    
            /**
             * Inherit the virtual GeoTool.
             **/
            GeoToolBisector.prototype = new GeoTool();
            
            /**
             * Icon for angle tool. - Use the same icon as for GeoAngle-object.
             **/
            GeoToolBisector.prototype.icon = GeoBisector.prototype.icon;
            
            /**
             * Init the GeoToolBisector. Reset the stepnumber etc.
             **/
            GeoToolBisector.prototype.init = function(){
                this.currStep = 0;
                this.result = [];
                this.p1 = null;
                this.p2 = null;
                this.p2 = null;
                this.line1 = null;
                this.line2 = null;
                this.bisector = null;
            }
            
            /**
             * Actions for clicking the board. Return data for the new object.
             **/
            GeoToolBisector.prototype.click = function(data){
                this.currStep = this.currStep + 1;
                var board = data.board;
                var coords = new JXG.Coords(JXG.COORDS_BY_USER, [data.xcoord, data.ycoord], board);
                switch (this.currStep){
                    case 1:
                        this.sendInfo(board, this.currStep);
                        this.result = [];
                        var points = this.getPointsInCoords(board, coords);
                        if (points.length === 0) {
                            this.p1geoid = this.geoparent.getObjId('Point');
                            this.p1 = board.create('Point',
                                                    [data.xcoord, data.ycoord],
                                                    {
                                                        fillColor: 'gray',
                                                        strokeColor: 'gray',
                                                        face: 'x',
                                                        id: this.p1geoid
                                                    });
                            this.line1 = board.create('Line',
                                                        [this.p1, 'gedithiddenmousecursor'],
                                                        {
                                                            strokeColor: 'gray',
                                                            strokeWidth: 1,
                                                            straightFirst: false,
                                                            straightLast: false
                                                        });
                            
                            this.result.push({
                                type: 'Point',
                                name: this.p1.name,
                                geoid: this.p1geoid,
                                x: data.xcoord,
                                y: data.ycoord
                            });
                            return [];
                        } else {
                            this.p1 = points[0];
                            this.p1geoid = this.p1.id;
                            this.line1 = board.create('Line',
                                                        [this.p1, 'gedithiddenmousecursor'],
                                                        {
                                                            strokeColor: 'gray',
                                                            strokeWidth: 1,
                                                            straightFirst: false,
                                                            straightLast: false
                                                        });
                            return [];
                        }
                        break;
                    case 2:
                        this.sendInfo(board, this.currStep);
                        var points = this.getPointsInCoords(board, coords);
                        if (points.length === 0) {
                            this.p2geoid = this.geoparent.getObjId('Point');
                            this.p2 = board.create('Point',
                                                    [data.xcoord, data.ycoord],
                                                    {
                                                        color: 'gray',
                                                        face: 'x',
                                                        id: this.p2geoid
                                                    });
                            this.line1.remove();
                            this.line1 = board.create('Line',
                                                        [this.p1, this.p2],
                                                        {
                                                            color: 'gray',
                                                            strokeWidth: 1,
                                                            straightFirst: false,
                                                            straightLast: false
                                                        });
                            this.line2 = board.create('Line',
                                                        [this.p2, 'gedithiddenmousecursor'],
                                                        {
                                                            strokeColor: 'gray',
                                                            withLabel: false,
                                                            strokeWidth: 1,
                                                            straightFirst: false,
                                                            straightLast: false
                                                        });
                            this.bisector = board.create('bisector',
                                                        [this.p1, this.p2, 'gedithiddenmousecursor'],
                                                        {
                                                            strokeColor: 'gray',
                                                            withLabel: false,
                                                            strokeWidth: 1,
                                                            straightFirst: true,
                                                            straightLast: true
                                                        });
                            this.result.push({
                                type: 'Point',
                                name: this.p2.name,
                                geoid: this.p2geoid,
                                x: data.xcoord,
                                y: data.ycoord
                            });
                        } else {
                            this.p2 = points[0];
                            this.p2geoid = this.p2.id;
                            this.line1.remove();
                            this.line1 = board.create('Line',
                                                        [this.p1, this.p2],
                                                        {
                                                            color: 'gray',
                                                            strokeWidth: 1,
                                                            straightFirst: false,
                                                            straightLast: false
                                                        });
                            this.line2 = board.create('Line',
                                                        [this.p2, 'gedithiddenmousecursor'],
                                                        {
                                                            strokeColor: 'gray',
                                                            withLabel: false,
                                                            strokeWidth: 1,
                                                            straightFirst: false,
                                                            straightLast: false
                                                        });
                            this.bisector = board.create('bisector',
                                                        [this.p1, this.p2, 'gedithiddenmousecursor'],
                                                        {
                                                            strokeColor: 'gray',
                                                            withLabel: false,
                                                            strokeWidth: 1,
                                                            straightFirst: true,
                                                            straightLast: true
                                                        });
                        }
                        return [];
                        break;
                    case 3:
                        this.sendInfo(board, 'start');
                        var points = this.getPointsInCoords(board, coords);
                        if (points.length === 0) {
                            this.p3geoid = this.geoparent.getObjId('Point');
                            this.p3 = board.create('Point',
                                                    [data.xcoord, data.ycoord],
                                                    {
                                                        color: 'gray',
                                                        face: 'x',
                                                        id: this.p3geoid
                                                    });
                            this.line1.remove();
                            this.line2.remove();
                            this.result.push({
                                type: 'Point',
                                name: this.p3.name,
                                geoid: this.p3geoid,
                                x: data.xcoord,
                                y: data.ycoord
                            });
                            this.geoid = this.geoparent.getObjId('Bisector');
                            this.result.push({type: 'Bisector',
                                name: this.p1.name+this.p2.name+this.p3.name,
                                geoid: this.geoid,
                                p1: this.p1geoid,
                                p2: this.p2geoid,
                                p3: this.p3geoid
                            });
                        } else {
                            this.p3 = points[0];
                            this.p3geoid = this.p3.id;
                            this.geoid = this.geoparent.getObjId('Bisector');
                            this.result.push({
                                type: 'Bisector',
                                name: this.p1.name+this.p2.name+this.p3.name,
                                geoid: this.geoid,
                                p1: this.p1geoid,
                                p2: this.p2geoid,
                                p3: this.p3geoid
                            });
                        }
                        this.currStep = 0;
                        break;
                    default:
                        this.result = [];
                }
                return this.result;
            }
        } // End GeoToolBisector
        
        { // GeoToolParallelogram
            /****************************************
             * GeoToolParallelogram - Tool for creating parallelograms.
             ****************************************/
            var GeoToolParallelogram = function(geoparent){
                this.type = 'Parallelogram';
                this.subtool = true;
                this.geoparent = geoparent;
                this.steps = 3;
            }
            
            /**
             * Register the tool to the GEditor.
             **/
            GEditor.prototype.geotools.push(GeoToolParallelogram);
            GeoToolRectangle.prototype.subtools.push('Parallelogram');
    
            /**
             * Inherit the virtual GeoTool.
             **/
            GeoToolParallelogram.prototype = new GeoTool();
            
            /**
             * Icon for parallelogram tool. - Use the same icon as for GeoParallelogram-object.
             **/
            GeoToolParallelogram.prototype.icon = GeoParallelogram.prototype.icon;
            
            /**
             * Init the GeoToolParallelogram. Reset the stepnumber etc.
             **/
            GeoToolParallelogram.prototype.init = function(){
                this.currStep = 0;
                this.result = [];
                this.p1 = null;
                this.p2 = null;
                this.p3 = null;
                this.p4 = null;
                this.line1 = null;
                this.line2 = null;
                this.line3 = null;
                this.line4 = null;
            }
            
            /**
             * Actions for clicking the board. Return data for the new object.
             **/
            GeoToolParallelogram.prototype.click = function(data){
                this.currStep = this.currStep + 1;
                var board = data.board;
                var coords = new JXG.Coords(JXG.COORDS_BY_USER, [data.xcoord, data.ycoord], board);
                switch (this.currStep){
                    case 1:
                        this.sendInfo(board, this.currStep);
                        this.result = [];
                        var points = this.getPointsInCoords(board, coords);
                        if (points.length === 0) {
                            this.p1geoid = this.geoparent.getObjId('Point');
                            this.p1 = board.create(
                                'Point',
                                [data.xcoord, data.ycoord],
                                {
                                    fillColor: 'gray',
                                    strokeColor: 'gray',
                                    face: 'x',
                                    id: this.p1geoid
                                }
                            );
                            this.line1 = board.create(
                                'Line',
                                [this.p1, 'gedithiddenmousecursor'],
                                {
                                    strokeColor: 'gray',
                                    strokeWidth: 1,
                                    straightFirst: false,
                                    straightLast: false
                                }
                            );
                            
                            this.result.push({
                                type: 'Point',
                                name: this.p1.name,
                                geoid: this.p1geoid,
                                x: data.xcoord,
                                y: data.ycoord
                            });
                            return [];
                        } else {
                            this.p1 = points[0];
                            this.p1geoid = this.p1.id;
                            this.line1 = board.create(
                                'Line',
                                [this.p1, 'gedithiddenmousecursor'],
                                {
                                    strokeColor: 'gray',
                                    strokeWidth: 1,
                                    straightFirst: false,
                                    straightLast: false
                                }
                            );
                            return [];
                        }
                        break;
                    case 2:
                        this.sendInfo(board, this.currStep);
                        var points = this.getPointsInCoords(board, coords);
                        if (points.length === 0) {
                            this.p2geoid = this.geoparent.getObjId('Point');
                            this.p2 = board.create(
                                'Point',
                                [data.xcoord, data.ycoord],
                                {
                                    color: 'gray',
                                    face: 'x',
                                    id: this.p2geoid
                                }
                            );
                            this.p4 = board.create(
                                'parallelpoint',
                                [this.p2, this.p1, 'gedithiddenmousecursor'],
                                {
                                    color: 'gray',
                                    face: 'x',
                                    id: 'gedittempparallelpoint'
                                }
                            );
                            this.line1.remove();
                            this.line1 = board.create(
                                'Line',
                                [this.p1, this.p2],
                                {
                                    color: 'gray',
                                    strokeWidth: 1,
                                    straightFirst: false,
                                    straightLast: false
                                }
                            );
                            this.line2 = board.create(
                                'Line',
                                [this.p2, 'gedithiddenmousecursor'],
                                {
                                    strokeColor: 'gray',
                                    withLabel: false,
                                    strokeWidth: 1,
                                    straightFirst: false,
                                    straightLast: false
                                }
                            );
                            this.line3 = board.create(
                                'Line',
                                ['gedithiddenmousecursor', 'gedittempparallelpoint'],
                                {
                                    strokeColor: 'gray',
                                    withLabel: false,
                                    strokeWidth: 1,
                                    straightFirst: false,
                                    straightLast: false
                                }
                            );
                            this.line4 = board.create(
                                'Line',
                                ['gedittempparallelpoint', this.p1],
                                {
                                    strokeColor: 'gray',
                                    withLabel: false,
                                    strokeWidth: 1,
                                    straightFirst: false,
                                    straightLast: false
                                }
                            );
                            this.result.push({type: 'Point', name: this.p2.name, geoid: this.p2geoid, x: data.xcoord, y: data.ycoord});
                        } else {
                            this.p2 = points[0];
                            this.p2geoid = this.p2.id;
                            this.p4 = board.create(
                                'parallelpoint',
                                [this.p2, this.p1, 'gedithiddenmousecursor'],
                                {
                                    color: 'gray',
                                    face: 'x',
                                    id: 'gedittempparallelpoint'
                                }
                            );
                            this.line1.remove();
                            this.line1 = board.create(
                                'Line',
                                [this.p1, this.p2],
                                {
                                    color: 'gray',
                                    strokeWidth: 1,
                                    straightFirst: false,
                                    straightLast: false
                                }
                            );
                            this.line2 = board.create(
                                'Line',
                                [this.p2, 'gedithiddenmousecursor'],
                                {
                                    strokeColor: 'gray',
                                    withLabel: false,
                                    strokeWidth: 1,
                                    straightFirst: false,
                                    straightLast: false
                                }
                            );
                            this.line3 = board.create(
                                'Line',
                                ['gedithiddenmousecursor', 'gedittempparallelpoint'],
                                {
                                    strokeColor: 'gray',
                                    withLabel: false,
                                    strokeWidth: 1,
                                    straightFirst: false,
                                    straightLast: false
                                }
                            );
                            this.line4 = board.create(
                                'Line',
                                ['gedittempparallelpoint', this.p1],
                                {
                                    strokeColor: 'gray',
                                    withLabel: false,
                                    strokeWidth: 1,
                                    straightFirst: false,
                                    straightLast: false
                                }
                            );
                        }
                        return [];
                        break;
                    case 3:
                        this.sendInfo(board, 'start');
                        var points = this.getPointsInCoords(board, coords);
                        if (points.length === 0) {
                            this.p3geoid = this.geoparent.getObjId('Point');
                            this.p3 = board.create('Point', [data.xcoord, data.ycoord], {color: 'gray', face: 'x', id: this.p3geoid});
                            this.result.push({type: 'Point', name: this.p3.name, geoid: this.p3geoid, x: data.xcoord, y: data.ycoord});
                            this.parallgeoid = this.geoparent.getObjId('Parallelogram');
                            this.result.push({
                                type: 'Parallelogram',
                                name: '\u25b1'+this.p1.name+this.p2.name+this.p3.name+this.p4.name,
                                geoid: this.parallgeoid,
                                p1: this.p1geoid,
                                p2: this.p2geoid,
                                p3: this.p3geoid,
                                p4name: this.p4.name
                            });
                        } else {
                            this.p3 = points[0];
                            this.p3geoid = this.p3.id;
                            this.parallgeoid = this.geoparent.getObjId('Parallelogram');
                            this.result.push({
                                type: 'Parallelogram',
                                name: '\u25b1'+this.p1.name+this.p2.name+this.p3.name+this.p4.name,
                                geoid: this.parallgeoid,
                                p1: this.p1geoid,
                                p2: this.p2geoid,
                                p3: this.p3geoid,
                                p4name: this.p4.name
                            });
                        }
                        this.currStep = 0;
                        break;
                    default:
                        this.result = [];
                }
                return this.result;
            }
        } // End GeoToolParallelogram
        
        { // GeoToolLabel
            /****************************************
             * GeoToolLabel - Tool for creating text labels.
             ****************************************/
            var GeoToolLabel = function(geoparent){
                this.type = 'Label';
                this.geoparent = geoparent;
                this.steps = 1;
            }
            
            /**
             * Register the tool to the GEditor.
             **/
            GEditor.prototype.geotools.push(GeoToolLabel);
            
            /**
             * Inherit the virtual GeoTool.
             **/
            GeoToolLabel.prototype = new GeoTool();

            /**
             * Subtool list.
             **/
            GeoToolLabel.prototype.subtools = [];
            
            /**
             * Icon for label tool. - Use the same icon as for GeoLabel-object.
             **/
            GeoToolLabel.prototype.icon = GeoLabel.prototype.icon;
            
            /**
             * Init the GeoToolLabel. Reset the stepnumber etc.
             **/
            GeoToolLabel.prototype.init = function(){
                this.step = 0;
            }
            
            /**
             * Actions for clicking the board. Return data for the new object.
             **/
            GeoToolLabel.prototype.click = function(data){
                this.currStep = 0;
                this.geoid = this.geoparent.getObjId('Label');
                return [{
                    type: 'Label',
                    id: this.geoid,
                    value: 'Text',
                    x: Math.round(data.xcoord * 100)/100,
                    y: Math.round(data.ycoord * 100)/100
                }];
            }
        } // End GeoToolLabel
        

    } // End Geotools
    
    { // GeoWidgets
        
        // Place for widgettypes.
        GEditor.prototype.widgets = {};
        
        /*********************************************
         * Virtual class for Widget for collecting data for geometric property.
         */
        var GeoWidget = function(place, options, data){}
        
        /**
         * Localize strings
         */
        GeoWidget.prototype.localize = function(str, lang){
            return this.localizer.localize(str, lang);
        }
        
        /**
         * Use template and replace variables in it.
         */
        GeoWidget.prototype.useTemplate = function(tname, data){
            var str = this.templates[tname];
            for (var key in data) {
                var rex = RegExp('{{{'+key+'}}}', 'g');
                str = str.replace(rex, data[key]);
            }
            return str;
        }
        
        /**
         * Html-templates
         */
        GeoWidget.prototype.templates = {
        }
        
        
        
        /*********************************************
         * GeoWidgetLabel for static label.
         */
        var GeoWidgetLabel = function(place, options, data){
            this.type = 'Label';
            this.place = place;
            this.key = options.key || '';
            this.value = options.value || '';
        }
        
        /**
         * Register this widget.
         */
        GEditor.prototype.widgets['Label'] = GeoWidgetLabel;
        
        /**
         * Inherit GeoWidget
         */
        GeoWidgetLabel.prototype = new GeoWidget();
        
        /**
         * Get the html for the widget.
         */
        GeoWidgetLabel.prototype.init = function(){
            var html = this.value;
            this.place.html(html);
        }
        
        /*********************************************
         * GeoWidgetText for asking textdata.
         */
        var GeoWidgetText = function(place, options, data){
            this.type = 'Text';
            this.place = place;
            this.key = options.key || '';
            this.value = options.value || '';
        }
        
        /**
         * Register this widget.
         */
        GEditor.prototype.widgets['Text'] = GeoWidgetText;
        
        /**
         * Inherit GeoWidget
         */
        GeoWidgetText.prototype = new GeoWidget();
        
        /**
         * Get the html for the widget.
         */
        GeoWidgetText.prototype.init = function(){
            var html = '<input type="text" value="' + this.value + '" data-geoattribute="'+this.key+'" />';
            this.place.html(html);
        }
        
        
        /*********************************************
         * GeoWidgetColor for asking color in rgb.
         */
        var GeoWidgetColor = function(place, options, data){
            this.type = 'Color';
            this.place = place;
            this.key = options.key || '';
            this.value = options.value || '';
        }
        
        /**
         * Register this widget.
         */
        GEditor.prototype.widgets['Color'] = GeoWidgetColor;
        
        /**
         * Inherit GeoWidget
         */
        GeoWidgetColor.prototype = new GeoWidget();
        
        /**
         * Get the html for the widget.
         */
        GeoWidgetColor.prototype.init = function(){
            var html = '<input type="text" value="' + this.value + '" data-geoattribute="'+this.key+'" />';
            this.place.html(html);
            if (typeof(jQuery.fn.colpicker) === 'function') {
                this.place.find('input[type="text"]').colpicker({showInput: true, hiddable: true});
            }
        }
        
        /*********************************************
         * GeoWidgetTextbox for asking textdata.
         */
        var GeoWidgetTextbox = function(place, options, data){
            this.type = 'Textbox';
            this.place = place;
            this.key = options.key || '';
            this.value = options.value || '';
        }
        
        /**
         * Register this widget.
         */
        GEditor.prototype.widgets['Textbox'] = GeoWidgetTextbox;
        
        /**
         * Inherit GeoWidget
         */
        GeoWidgetTextbox.prototype = new GeoWidget();
        
        /**
         * Get the html for the widget.
         */
        GeoWidgetTextbox.prototype.init = function(){
            var html = '<textarea type="text" data-geoattribute="'+this.key+'">' + this.value + '</textarea>';
            this.place.html(html);
        }
        
        /*********************************************
         * GeoWidgetCheckbox for asking yes/no -data.
         */
        var GeoWidgetCheckbox = function(place, options, data){
            this.type = 'Checkbox';
            this.place = place;
            this.key = options.key || '';
            this.value = options.value || false;
        }

        /**
         * Register this widget.
         */
        GEditor.prototype.widgets['Checkbox'] = GeoWidgetCheckbox;
        
        /**
         * Inherit GeoWidget
         */
        GeoWidgetCheckbox.prototype = new GeoWidget();
        
        /**
         * Get the html for the widget.
         */
        GeoWidgetCheckbox.prototype.init = function(){
            var html = '<input type="checkbox" ' + (this.value ? 'checked="checked"' : '') + '" data-geoattribute="'+this.key+'" />';
            this.place.html(html);
        }
        
        /*********************************************
         * GeoWidgetSelect for asking one-from-multiple -data.
         */
        var GeoWidgetSelect = function(place, options, data){
            this.type = 'Select';
            this.place = place;
            this.key = options.key || '';
            this.option = options.data || data || [];
            this.selected = options.value;
            this.localizer = new Localizer(place.closest('[lang]').attr('lang'));
        }
        
        /**
         * Register this widget.
         */
        GEditor.prototype.widgets['Select'] = GeoWidgetSelect;

        /**
         * Inherit GeoWidget
         */
        GeoWidgetSelect.prototype = new GeoWidget();
        
        /**
         * Get the html for the widget.
         */
        GeoWidgetSelect.prototype.init = function(){
            var html = ['<select data-geoattribute="'+this.key+'" >'];
            for (var i = 0; i < this.option.length; i++) {
                var option = '<option value="' + this.option[i].id + '" ' + (this.selected && this.selected.toString() === this.option[i].id.toString() ? 'selected="selected"' : '') + '>' + this.localize(this.option[i].name) + '</option>';
                html.push(option);
            }
            html.push('</select>');
            this.place.html(html.join('\n'));
        }
        
        /*********************************************
         * GeoWidgetBoxarea for asking textdata.
         */
        var GeoWidgetBoxarea = function(place, options, data){
            this.type = 'Boxarea';
            this.place = place;
            this.key = options.key || [0,1,2,3];
            this.value = options.value || ['','','',''];
        }
        
        /**
         * Register this widget.
         */
        GEditor.prototype.widgets['Boxarea'] = GeoWidgetBoxarea;
        
        /**
         * Inherit GeoWidget
         */
        GeoWidgetBoxarea.prototype = new GeoWidget();
        
        /**
         * Get the html for the widget.
         */
        GeoWidgetBoxarea.prototype.init = function(){
            var html = '<table><tbody><tr><td></td><td colspan="2"><span class="geoProperty"><input type="text" value="' + this.value[0] + '" size="2" data-geoattribute="'+this.key[0]+'" /></span></td><td></td></tr><tr><td colspan="2"><span class="geoProperty"><input type="text" value="' + this.value[1] + '" size="2" data-geoattribute="'+this.key[1]+'" /></span></td><td colspan="2"><span class="geoProperty"><input type="text" value="' + this.value[2] + '" size="2" data-geoattribute="'+this.key[2]+'" /></span></td></tr><tr><td></td><td colspan="2"><span class="geoProperty"><input type="text" value="' + this.value[3] + '" size="2" data-geoattribute="'+this.key[3]+'" /></span></td><td></td></tr></tbody></table>';
            this.place.replaceWith(html);
        }

        
    } // End GeoWidgets
    
    { // GeoDialogs
        /********************************
         * Base class for dialogs.
         */
        var GeoDialog = function(place, options){
            options = $.extend({
                title: '',
                text: '',
                buttons: [
                    {
                        text: 'OK',
                        event: '',
                        data: {}
                    }
                ]
            }, options);
            this.place = place;
            this.titletext = options.title;
            this.text = options.text;
            this.buttons = options.buttons;
        }
        
        GeoDialog.prototype.show = function(){
            if ($('head style#geodialogstyle').length === 0) {
                $('head').append('<style id="geodialogstyle" type="text/css">'+this.templates.style+'</style>');
            }
            this.wrapper = this.place.append(this.templates.dialog).find('.gedit-dialog-wrapper').last();
            this.dialog = this.wrapper.children().eq(0);
            this.title = this.dialog.find('.gedit-dialog-title');
            this.content = this.dialog.find('.gedit-dialog-content');
            this.buttonbar = this.dialog.find('.gedit-dialog-buttonbar');
            this.addButtons();
            this.initHandlers();
            this.title.html(this.titletext);
            this.content.html(this.text);
        }
        
        GeoDialog.prototype.remove = function(){
            this.wrapper.remove();
        }
        
        GeoDialog.prototype.initHandlers = function(){
            var gdialog = this;
            for (var i = 0; i < this.buttons.length; i++) {
                this.dialog.delegate('.gedit-dialog-button[data-action="'+i+'"]', 'click', function(e){
                    var action = $(this).attr('data-action');
                    var button = gdialog.buttons[action];
                    if (button.event) {
                        gdialog.place.trigger(button.event, [button.data]);
                    }
                    gdialog.remove();
                });
            }
            
        }
        
        GeoDialog.prototype.addButtons = function(){
            for (var i = 0; i < this.buttons.length; i++) {
                var button = this.templates.button.replace(/{{button}}/g, this.buttons[i].text). replace(/{{buttonid}}/g, i);
                this.buttonbar.append(button);
            }
        }
        
        GeoDialog.prototype.templates = {
            dialog: [
                '<div class="gedit-dialog-wrapper">',
                '<div class="gedit-dialog">',
                '<div class="gedit-dialog-title"></div>',
                '<div class="gedit-dialog-content"></div>',
                '<div class="gedit-dialog-buttonbar"></div>',
                '</div>',
                '</div>'
            ].join('\n'),
            button: '<div class="gedit-dialog-button" data-action="{{buttonid}}">{{button}}</div>',
            style: [
                '.gedit-dialog-wrapper {position: absolute; top: 0; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.2);}',
                '.gedit-dialog {position: absolute; bottom: 20px; right: 20px; width: 300px; border: 1px solid black; border-radius: 8px; box-shadow: 4px 4px 8px rgba(0,0,0,0.5);}',
                '.gedit-dialog .gedit-dialog-title {font-weight: bold; font-size: 150%; padding: 0.2em 0.5em; height: 1.2em; overflow-hidden;}',
                '.gedit-dialog {background: rgb(238,238,238);',
                    'background: -moz-linear-gradient(top,  rgba(238,238,238,1) 0%, rgba(204,204,204,1) 100%);',
                    'background: -webkit-gradient(linear, left top, left bottom, color-stop(0%,rgba(238,238,238,1)), color-stop(100%,rgba(204,204,204,1)));',
                    'background: -webkit-linear-gradient(top,  rgba(238,238,238,1) 0%,rgba(204,204,204,1) 100%);',
                    'background: -o-linear-gradient(top,  rgba(238,238,238,1) 0%,rgba(204,204,204,1) 100%);',
                    'background: -ms-linear-gradient(top,  rgba(238,238,238,1) 0%,rgba(204,204,204,1) 100%);',
                    'background: linear-gradient(to bottom,  rgba(238,238,238,1) 0%,rgba(204,204,204,1) 100%);',
                    "filter: progid:DXImageTransform.Microsoft.gradient( startColorstr='#eeeeee', endColorstr='#cccccc',GradientType=0 );}",
                '.gedit-dialog .gedit-dialog-content { min-height: 100px; padding: 0 0.5em;}',
                '.gedit-dialog .gedit-dialog-buttonbar {text-align: right; padding: 0.2em 1em;}',
                '.gedit-dialog .gedit-dialog-buttonbar .gedit-dialog-button {display: inline-block; cursor: pointer; background-color: #a00; text-align: center; border: 1px solid black; border-radius: 4px; box-shadow: -1px -1px 1px rgba(0,0,0,0.5), inset 1p 1px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(0,0,0,0.5), 1px 1px 1px rgba(255,255,255,0.7); color: white; font-weight: bold; text-shadow: 1px 1px 1px rgba(255,255,255,0.7), -1px -1px 1px rgba(0,0,0,0.5); padding: 0.1em 0.8em; margin: 0 0.2em;}'
            ].join('\n')
        }
        
        /******************************
         * GeoAlert - custom alert for GEditor.
         */
        var GeoAlert = function(place, options){
            this.place = place;
            this.titletext = options && options.title || '';
            this.text = options && options.text || '';
            this.callbacks = {
                'Ok': options.callbacks && options.callbacks['Ok'] || function(){}
            }
            this.buttons = ['Ok'];
        }
        
        GeoAlert.prototype = new GeoDialog();
        
        /******************************
         * GeoConfirm - custom confirm for GEditor.
         */
        var GeoConfirm = function(place, options){
            this.place = place;
            this.titletext = options && options.title || '';
            this.text = options && options.text || '';
            this.callbacks = {
                'Ok': options.callbacks && options.callbacks['Ok'] || function(){},
                'Cancel': options.callbacks && options.callbacks['Cancel'] || function(){}
            }
            this.buttons = ['Cancel','Ok'];
        }
        
        GeoConfirm.prototype = new GeoDialog();
        
    } // End GeoDialogs
})(jQuery);

if (typeof(config) !== 'undefined' && typeof(config.macros) !== 'undefined'){
    // Create macro for TiddlyWiki
    config.macros.geoedit2 = {
        /******************************
        * Show geoeditor2
        ******************************/
        handler: function (place, macroName, params, wikifier, paramString, tiddler)
        {
            var geoname = '';
            var editable = false;
            var isauthor = false;
            if (params.length > 0){
                geoname = params[0];
            }
            if (params.length > 1){
                editable = (params[1] === 'author' || params[1] === 'edit');
                isauthor = params[1] === 'author';
            }
            var grapheditordiv = '{{geoeditor{\n}}}';
            wikify(grapheditordiv, place, null, tiddler);
            var geoeditors = (tiddler ? DataTiddler.getData(tiddler, 'Geoeditors', {}): {});
            if (geoname !== ''){
                var editor = jQuery.extend(true, {}, geoeditors[geoname]);
            }
            editor.editable = editable;
            
            jQuery(place).find('.geoeditor').attr('geoeditor',params[0]).geditor(editor);
            if (editable && params[1] !== 'author'){
                jQuery(place).find('.geoeditor').bind('geoeditor_changed', function(e){
                    var geoeditors = DataTiddler.getData(tiddler, 'Geoeditors', {});
                    var geodata = jQuery(this).geditor('getdata');
                    geoeditors[geoname] = geodata;
                    var autosavestatus = config.options.chkAutoSave;
                    config.options.chkAutoSave = false;
                    DataTiddler.setData(tiddler, 'Geoeditors', geoeditors, {});
                    config.options.chkAutoSave = autosavestatus;
                });
            }
        }
    }
}
//}}}