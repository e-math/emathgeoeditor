Emathgeoeditor
==============

See the [demo page](http://e-math.github.io/emathgeoeditor).

What?
-----
A tool for creating geometric constructions and showing them statically or in interactive mode.

How?
----
Emathgeoeditor is a jQuery-plugin and can be embedded on any web page
by including `gedit.js`-file and defining some html-element
as a geoeditor with: `$('#mydiv').geditor()`.

Emathgeoeditor depends on external JavaScript libraries:
* jQuery
* JSXGraph

Additionally `jquery.colpicker.js` can be used to show fancier colorpicker to select the colors (instead rgba-hexacode).

Who?
----
The tool was developed in EU-funded [E-Math -project](http://emath.eu) by
* Petri Salmela
* Rolf Lindén
* Petri Sallasmaa

and the copyrights are owned by [Four Ferries oy](http://fourferries.fi).

License?
--------
The tool is licensed under [GNU AGPL](http://www.gnu.org/licenses/agpl-3.0.html).
The tool depends on some publicly available open source components with other licenses:
* [jQuery](http://jquery.com) (MIT-license)
* [JSXGraph](http://jsxgraph.uni-bayreuth.de/) (GNU LGPL and MIT-license)
* [Colpicker](http://github.com/pesasa/colpicker) (MIT-license)



Usage
======
Initing a geoeditor
----
Init a new, empty, editable geoeditor.

```javascript
jQuery('#box').geditor({editable: true});
```

Init a new geoeditor in editing mode with existing data.

```javascript
var data = {...<some data>...};
data.editable = true;
jQuery('.box').geditor(data);
```

Init a new geoeditor in view mode with existing data.

```javascript
var data = {...<some data>...};
data.editable = false;
jQuery('.box').geditor(data);
```

Init a new geoeditor in view mode with existing data and with navigation dots instead of tabs.

```javascript
var data = {...<some data>...};
data.editable = false;
data.browsingMode = 'tabless';
jQuery('.box').geditor(data);
```

Getting data from geoeditor
-----------------------

Get the data as a JavaScript object from the geoeditor in html-element with
id `#box`.

```javascript
var data = jQuery('#box').geditor('getdata');
```

Edit mode
-----------

For more details see the [demo page](http://e-math.github.io/emathgeoeditor).
