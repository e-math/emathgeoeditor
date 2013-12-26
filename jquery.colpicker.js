/***
The MIT License (MIT)

Copyright (c) 2013 Petri Salmela

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

|Name|ColPicker|
|Version|0.2|
|Author|Petri Salmela (pesasa@iki.fi)|
|Type|plugin|
|Requires|jQuery 1.4.3 or newer.|
|Description|Colorpicker widget as jQuery plugin.|
!!!!!Revisions
<<<
20131219.2251 ''Version 0.2''
* Hiddable picker, showable input, preview
<<<
<<<
20131218.2251 ''Version 0.1''
* Project starts.
<<<
!!!!!Code
***/

//{{{
/**
 * Colorpicker (jQuery plugin).
 * Petri Salmela <pesasa@iki.fi>
 **/

(function ($) {
    { /*** jQuery plugin ***/
        $.fn.colpicker = function(options){
            if (methods[options]){
                return methods[options].apply( this, Array.prototype.slice.call( arguments, 1));
            } else if (typeof(options) === 'object' || !options) {
                return methods.init.apply(this, arguments);
            } else {
                $.error( 'Method ' +  method + ' does not exist on Colpicker' );
                return this;
            }
        }
        
        var methods = {
            init: function(params){
                
                params = $.extend(true, {
                }, params);
                var picker = new ColPicker(this, params);
                //picker.init();
            },
            getdata: function(params){
                var $place = $(this);
                $place.trigger('getdata');
                var data = $place.data('[[colpickerdata]]');
                return data;
            }
        }
    }
    
    { /*** Color picker class ***/
        /******
         * Class for color picker
         ******/
        var ColPicker = function(place, params){
            this.place = $(place);
            this.options = $.extend({
                width: '100%',
                showInput: false,
                hiddable: false
            }, params);
            if (this.place[0].tagName === 'INPUT') {
                this.init();
            }
        }
        
        /******
         * Init the color picker
         ******/
        ColPicker.prototype.init = function(){
            if ($('head style#colpickertoolstyle').length == 0){
                $('head').append('<style id="colpickertoolstyle" type="text/css">'+ColPicker.strings.css+'</style>');
            }
            this.id = this.genId();
            this.place.addClass('colpicker-input');
            this.place.after('<div class="colpickertool-preview"><div class="colorpreview"></div></div>');
            this.preview = this.place.next().children();
            this.place.next().after('<div id="'+this.id+'" class="colpickertool">\n'+ColPicker.strings.svg+'</div>');
            this.picker = this.place.next().next();
            if (this.options.hiddable) {
                this.preview.addClass('colpickertool-hidebutton');
                this.picker.addClass('colpickertool-hiddable colpickertool-hidden');
            }
            var maxwidth = this.picker.parent().width();
            var maxheight = maxwidth/2;
            this.picker.find('svg').css({"max-width": maxwidth, "width": this.options.width, "max-height": maxheight, "height": "auto"});
            if (!this.options.showInput) {
                this.place.hide();
            }
            this.getColor();
            this.initSelected();
            this.initHandlers();
        }
        
        /******
         * Get color from input-element.
         ******/
        ColPicker.prototype.getColor = function(){
            var color = this.place.val();
            if (color[0] === '#') {
                this.rgb = color.substr(0,7);
                this.opacity = color.substr(7,2) || 'ff';
                this.color = this.rgb+this.opacity;
            } else {
                this.opacity = '';
                this.rgb = this.colornames[color.toLowerCase()] || '';
                this.color = this.rgb;
            }
        }
        
        /******
         * Set color to input element.
         ******/
        ColPicker.prototype.setColor = function(){
            this.place.val(this.color).focusout();
        }
        
        /******
         * Change the color of opacity/transparency selector.
         ******/
        ColPicker.prototype.setPickerTransCol = function(){
            var color;
            if (this.rgb !== 'none') {
                color = this.rgb;
            } else {
                color = '#000000';
            }
            this.picker.find('.color-transparent').css('fill', color);
        }
        
        /******
         * Set the selection attributes to highlight selected color/opacity
         ******/
        ColPicker.prototype.initSelected = function(){
            this.picker.find('[data-selected-color="true"]').attr('data-selected-color', '');
            this.picker.find('[data-color="'+this.rgb+'"]').attr('data-selected-color', 'true');
            this.picker.find('[data-selected-opacity="true"]').attr('data-selected-opacity', '');
            if (this.opacity.length > 0) {
                this.picker.find('[data-opacity="'+this.opacity+'"]').attr('data-selected-opacity', 'true');
            } else {
                this.picker.find('[data-opacity="ff"]').attr('data-selected-opacity', 'true');
            }
            this.setPickerTransCol();
            if (this.color[0] === '#') {
                var rgba = this.hex2rgba(this.color);
                this.preview.css({'background-color': 'rgba(' + rgba[0] + ',' + rgba[1] + ',' + rgba[2] + ',' + rgba[3] + ')'});
            } else {
                this.preview.css({'background-color': 'transparent'});
            }
        }
        
        /******
         * Init event handlers
         ******/
        ColPicker.prototype.initHandlers = function(){
            var picker = this;
            this.picker.delegate('path[data-color]', 'click', function(e){
                var $button = $(this);
                picker.rgb = $button.attr('data-color');
                if (picker.rgb === 'none') {
                    picker.opacity = '';
                }
                picker.color = picker.rgb + picker.opacity;
                picker.initSelected();
                picker.setColor();
                picker.setPickerTransCol();
            });
            this.picker.delegate('[data-opacity]', 'click', function(e){
                var $button = $(this);
                picker.opacity = $button.attr('data-opacity');
                if (picker.rgb !== 'none') {
                    picker.color = picker.rgb + picker.opacity;
                } else {
                    picker.color = 'none';
                }
                picker.initSelected();
                picker.setColor();
                picker.setPickerTransCol();
            });
            this.place.bind('change', function(e){
                picker.getColor();
                picker.initSelected();
            });
            this.preview.filter('.colpickertool-hidebutton').bind('click', function(e){
                picker.picker.toggleClass('colpickertool-hidden');
            });
        }
        
        /******
         * Find available id for the tool.
         ******/
        ColPicker.prototype.genId = function(){
            var i = 0;
            while ($('#colorpickertool-'+i).length > 0){
                i++;
            }
            return 'colorpickertool-'+i;
        }
        
        /******
         * Hex to rgba
         ******/
        ColPicker.prototype.hex2rgba = function(hex){
            hex = hex + '#ffffffff'.slice(hex.length);
            var rgb = hex.substr(1,6);
            var alpha = hex.substr(7,2) || 'ff';
            var num = parseInt(rgb, 16);
            var r = (num >> 16) % 256;
            var g = (num >> 8) % 256;
            var b = num % 256;
            var a = parseInt(alpha, 16) / 255;
            return [r, g, b, a];
        }

        /******
         * Named colors
         ******/
        ColPicker.prototype.colornames = {
            'black':     '#000000',
            'white':     '#ffffff',
            'red'  :     '#ff0000',
            'green':     '#00ff00',
            'blue' :     '#0000ff',
            'yellow':    '#ffff00',
            'orange':    '#ff6600',
            'darkred':   '#aa0000',
            'darkgreen': '#00aa00',
            'darkblue':  '#0000aa',
            'navy':      '#000080',
            'navyblue':  '#000080',
            'sky':       '#87ceeb',
            'skyblue':   '#87ceeb',
            'steel':     '#4682b4',
            'steelblue': '#4682b4',
            'royal':     '#4169e1', 
            'royalblue': '#4169e1',
            'aqua':      '#00ffff',
            'cyan':      '#00ffff',
            'magenta':   '#ff00ff',
            'fuchsia':   '#ff00ff',
            'brown':     '#a52a2a',
            'chocolate': '#d2691e',
            'pink':      '#ffc0cb',
            'lime':      '#32cd32',
            'olive':     '#6b8e23',
            'silver':    '#c0c0c0',
            'gray':      '#808080',
            'none' :     'none'
        }
        
        /******
         * Some strings (css, svg)
         ******/
        ColPicker.strings = {
            css: [
                '.colpickertool {background-color: transparent;}',
                '.colpickertool-preview {display: block; height: 1.5em; border: 1px solid black; vertical-align: middle; margin: 0.2em; background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0iI2ZmZiI+PC9yZWN0Pgo8cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNjY2MiPjwvcmVjdD4KPHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNjY2MiPjwvcmVjdD4KPC9zdmc+");}',
                '.colpickertool-preview .colorpreview {display: block; height: 100%;}',
                '.colpickertool-preview .colpickertool-hidebutton {cursor: pointer}',
                '.colpickertool-hidden {display: none;}',
                '.colpickertool svg {width: 100%; height: auto;}',
                '.colpickertool svg path.color-grayscale {stroke: black; stroke-width: 1}',
                '.colpickertool svg path[data-color]:hover {cursor: pointer;}',
                '.colpickertool svg rect[data-opacity]:hover {cursor: pointer;}',
                '.colpickertool svg path.color-dark:hover {stroke-width: 2; stroke: white;}',
                '.colpickertool svg path.color-light:hover {stroke-width: 2; stroke: white;}',
                '.colpickertool svg path[data-selected-color="true"], .colpickertool svg rect[data-selected-opacity="true"] {stroke: black; stroke-width: 3; stroke-opacity: 1;}',
                '.colpickertool svg path.color-grayscale[data-selected-color="true"] {stroke: red;}',
                'input.colpicker-input {max-width: 100%; width: 100%; font-family: monospace; -moz-box-sizing: border-box; box-sizing: border-box;}'
            ].join('\n'),
            svg: [
                '  <svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="220" height="110" viewbox="-15 -5 230 110" class="colorpicker">',
                '    <path class="color-dark" transform="translate(12 14)" data-color="#aa0000" stroke="#aa0000" style="fill: #aa0000;" stroke-width="2" d="M-11 -6 l11 -6 l11 6 l0 12 l-11 6 l-11 -6z" />',
                '    <path class="color-dark" transform="translate(36 14)" data-color="#aa4400" stroke="#aa4400" style="fill: #aa4400;" stroke-width="2" d="M-11 -6 l11 -6 l11 6 l0 12 l-11 6 l-11 -6z" />',
                '    <path class="color-light" transform="translate(60 14)" data-color="#ffcc00" stroke="#ffcc00" style="fill: #ffcc00;" stroke-width="2" d="M-11 -6 l11 -6 l11 6 l0 12 l-11 6 l-11 -6z" />',
                '    <path class="color-dark" transform="translate(84 14)" data-color="#00aa00" stroke="#00aa00" style="fill: #00aa00;" stroke-width="2" d="M-11 -6 l11 -6 l11 6 l0 12 l-11 6 l-11 -6z" />',
                '    <path class="color-dark" transform="translate(108 14)" data-color="#0000ff" stroke="#0000ff" style="fill: #0000ff;" stroke-width="2" d="M-11 -6 l11 -6 l11 6 l0 12 l-11 6 l-11 -6z" />',
                '    <path class="color-dark" transform="translate(132 14)" data-color="#660080" stroke="#660080" style="fill: #660080;" stroke-width="2" d="M-11 -6 l11 -6 l11 6 l0 12 l-11 6 l-11 -6z" />',
                '    <path class="color-dark" transform="translate(156 14)" data-color="#aa0044" stroke="#aa0044" style="fill: #aa0044;" stroke-width="2" d="M-11 -6 l11 -6 l11 6 l0 12 l-11 6 l-11 -6z" />',
                ////////
                '    <path class="color-dark" transform="translate(24 34)" data-color="#ff0000" stroke="#ff0000" style="fill: #ff0000;" stroke-width="2" d="M-11 -6 l11 -6 l11 6 l0 12 l-11 6 l-11 -6z" />',
                '    <path class="color-dark" transform="translate(48 34)" data-color="#ff6600" stroke="#ff6600" style="fill: #ff6600;" stroke-width="2" d="M-11 -6 l11 -6 l11 6 l0 12 l-11 6 l-11 -6z" />',
                '    <path class="color-light" transform="translate(72 34)" data-color="#ffff00" stroke="#ffff00" style="fill: #ffff00;" stroke-width="2" d="M-11 -6 l11 -6 l11 6 l0 12 l-11 6 l-11 -6z" />',
                '    <path class="color-dark" transform="translate(96 34)" data-color="#00ff00" stroke="#00ff00" style="fill: #00ff00;" stroke-width="2" d="M-11 -6 l11 -6 l11 6 l0 12 l-11 6 l-11 -6z" />',
                '    <path class="color-dark" transform="translate(120 34)" data-color="#0066ff" stroke="#0066ff" style="fill: #0066ff;" stroke-width="2" d="M-11 -6 l11 -6 l11 6 l0 12 l-11 6 l-11 -6z" />',
                '    <path class="color-dark" transform="translate(144 34)" data-color="#aa0088" stroke="#aa0088" style="fill: #aa0088;" stroke-width="2" d="M-11 -6 l11 -6 l11 6 l0 12 l-11 6 l-11 -6z" />',
                ///////
                '    <path class="color-light" transform="translate(12 54)" data-color="#ff8080" stroke="#ff8080" style="fill: #ff8080;" stroke-width="2" d="M-11 -6 l11 -6 l11 6 l0 12 l-11 6 l-11 -6z" />',
                '    <path class="color-light" transform="translate(36 54)" data-color="#ff9955" stroke="#ff9955" style="fill: #ff9955;" stroke-width="2" d="M-11 -6 l11 -6 l11 6 l0 12 l-11 6 l-11 -6z" />',
                '    <path class="color-light" transform="translate(60 54)" data-color="#ffdd55" stroke="#ffdd55" style="fill: #ffdd55;" stroke-width="2" d="M-11 -6 l11 -6 l11 6 l0 12 l-11 6 l-11 -6z" />',
                '    <path class="color-light" transform="translate(84 54)" data-color="#bcd35f" stroke="#bcd35f" style="fill: #bcd35f;" stroke-width="2" d="M-11 -6 l11 -6 l11 6 l0 12 l-11 6 l-11 -6z" />',
                '    <path class="color-light" transform="translate(108 54)" data-color="#80e5ff" stroke="#80e5ff" style="fill: #80e5ff;" stroke-width="2" d="M-11 -6 l11 -6 l11 6 l0 12 l-11 6 l-11 -6z" />',
                '    <path class="color-light" transform="translate(132 54)" data-color="#ccaaff" stroke="#ccaaff" style="fill: #ccaaff;" stroke-width="2" d="M-11 -6 l11 -6 l11 6 l0 12 l-11 6 l-11 -6z" />',
                '    <path class="color-light" transform="translate(156 54)" data-color="#ffaaee" stroke="#ffaaee" style="fill: #ffaaee;" stroke-width="2" d="M-11 -6 l11 -6 l11 6 l0 12 l-11 6 l-11 -6z" />',
                ////////
                '    <path class="color-none color-dark" transform="translate(0 85)" data-color="none" stroke="#000000" style="fill: #ffffff;" stroke-width="2" d="M-11 -6 l11 -6 l11 6 l0 12 l-11 6 l-11 -6z m5 0 l12 12 m-12 0 l12 -12" />',
                '    <path class="color-grayscale color-dark" transform="translate(24 85)" data-color="#000000" stroke="#000000" style="fill: #000000;" stroke-width="2" d="M-11 -6 l11 -6 l11 6 l0 12 l-11 6 l-11 -6z" />',
                '    <path class="color-grayscale color-light" transform="translate(48 85)" data-color="#333333" stroke="#333333" style="fill: #333333;" stroke-width="2" d="M-11 -6 l11 -6 l11 6 l0 12 l-11 6 l-11 -6z" />',
                '    <path class="color-grayscale color-light" transform="translate(72 85)" data-color="#4d4d4d" stroke="#4d4d4d" style="fill: #4d4d4d;" stroke-width="2" d="M-11 -6 l11 -6 l11 6 l0 12 l-11 6 l-11 -6z" />',
                '    <path class="color-grayscale color-light" transform="translate(96 85)" data-color="#808080" stroke="#808080" style="fill: #808080;" stroke-width="2" d="M-11 -6 l11 -6 l11 6 l0 12 l-11 6 l-11 -6z" />',
                '    <path class="color-grayscale color-light" transform="translate(120 85)" data-color="#999999" stroke="#999999" style="fill: #999999;" stroke-width="2" d="M-11 -6 l11 -6 l11 6 l0 12 l-11 6 l-11 -6z" />',
                '    <path class="color-grayscale color-light" transform="translate(144 85)" data-color="#cccccc" stroke="#cccccc" style="fill: #cccccc;" stroke-width="2" d="M-11 -6 l11 -6 l11 6 l0 12 l-11 6 l-11 -6z" />',
                '    <path class="color-grayscale color-light" transform="translate(168 85)" data-color="#ffffff" stroke="#555555" style="fill: #ffffff;" stroke-width="2" d="M-11 -6 l11 -6 l11 6 l0 12 l-11 6 l-11 -6z" />',
                ////////
                '    <g class="color-transparent" transform="translate(190 -2)" fill="black">',
                '      <rect x="0" y="0" width="20" height="105" style="fill: transparent; stroke: black; stroke-width: 1px;" />',
                '      <rect x="0" y="0" width="20" height="15" fill-opacity="1" data-opacity="ff" />',
                '      <rect x="0" y="15" width="20" height="15" fill-opacity="0.83" data-opacity="d4" />',
                '      <rect x="0" y="30" width="20" height="15" fill-opacity="0.67" data-opacity="aa" />',
                '      <rect x="0" y="45" width="20" height="15" fill-opacity="0.5" data-opacity="80" />',
                '      <rect x="0" y="60" width="20" height="15" fill-opacity="0.33" data-opacity="55" />',
                '      <rect x="0" y="75" width="20" height="15" fill-opacity="0.167" data-opacity="2b" />',
                '      <rect x="0" y="90" width="20" height="15" fill-opacity="0" data-opacity="00" />',
                '    </g>',
                '  </svg>'].join('\n')
        }
    }
    
})(jQuery);
//}}}