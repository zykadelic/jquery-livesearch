/* jQuery.liveSearch.js - https://github.com/zykadelic/jquery-livesearch
 * 
 * Author: zykadelic - https://github.com/zykadelic
 * License: Free under MIT license
 * Dependencies: $.tmpl (optional) - https://github.com/jquery/jquery-tmpl
 * 
 * TODO:
 * Remove browser-default autofill (if possible)
 * Accept "protected" custom success/error events (wrapped in the AJAX success/error callbacks)
 * Key navigations
 * Enable selection in results-list (like autocomplete)
 * Support multiple selections in results-list (optional)
 */

(function($){
	// By wrapping the methods inside of a function, we can get an instance-like behavior
	// without turning this into a widget (thus requiring jQuery UI) .andreas
	var methods = function(){
		return {
			init: function(el, settings){
				var _t = this
				_t.element = el, _t.settings = settings
				_t._runValidations()
			
				// Transform resultsList to ul element if it's not already
				if(!_t.settings.resultsList.is('ul')){
					// Store all attributes of the resultsList
					var attrs = {}
					$.each(_t.settings.resultsList[0].attributes, function(_, attr){
						attrs[attr.nodeName] = attr.nodeValue
					})
				
					// Replace resultsList with ul element and apply all of the stored attributes
					var resultsList = $('<ul>', attrs)
					_t.settings.resultsList.replaceWith(resultsList)
					_t.settings.resultsList = resultsList
				}
			
				// Run keyUp method on keyup event
				_t.element.on('keyup.liveSearch', function(key){ _t.keyUp(key) })
			
				// Only show results on focus if there is a value in the element (space sensitive)
				_t.element.on('focus.liveSearch', function(){
					if(_t.settings.considerSpaces ? $(this).val() : $(this).val().trim()) _t.showResultsList()
				})
			
				// Hide results on blur
				_t.element.on('blur.liveSearch', function(){ _t.hideResultsList() })
			
				// Don't display results on initiation
				_t.hideResultsList
			},
		
			keyUp: function(key){
				// Read and write previous value, as a property, from the element
				var previousValue	= this.element.prop('previousValue') || ''
				var currentValue	= this.element.val()
				this.element.prop('previousValue', currentValue)
			
				// Consider keypressings that don't necessarily input anything (Shift, Alt...)
				if(previousValue != currentValue){
					// Apply for running a search if value isn't empty (space sensitive) - else hide the results
					if(this.settings.considerSpaces ? currentValue : currentValue.trim()){
						// Unless spaces are considered, don't run the search when space key is hit
						if(key.keyCode != 32 || this.settings.considerSpaces) this._search(currentValue)
					}else{
						this.hideResultsList()
					}
				}
			},
		
			hideResultsList: function(){
				this.settings.resultsList.css('display', 'none')
			},
		
			showResultsList: function(){
				this.settings.resultsList.css('display', 'block')
			},
		
		
			// Private methods
		
			_search: function(query){
				var _t = this
				// Trim the query of whitespace unless spaces are set to be taken into consideration
				if(!_t.settings.considerSpaces) query = query.trim().replace(/\s+/gi, ' ')
			
				// Toggle visibility on list depending on query value
				if(query){
					_t.showResultsList()
					_t.settings.resultsList.addClass('loading')
				}else{
					_t.hideResultsList
				}
			
				// Send AJAX request with specified settings except for some explicit, required overridings
				$.ajax($.extend(_t.settings.request, {
					data: $.extend(_t.settings.request.data, { query: query }),
					success: function(data, status, xhr){
						_t.settings.resultsList.removeClass('loading')
						_t._renderResults(data)
					}
				}))
			},
		
			_renderResults: function(results){
				var _t = this, body = ''
				if(results.length){
					// Loop through the results and render them as text or in templates depending on type
					$.each(results, function(_, result){
						var resultItem
						if(_t.settings.template){
							resultItem = $('<li>').html($.tmpl(_t.settings.template, result))
						}else{
							if(typeof result == "object") _t.throwError('Response was of type Object, but no text/html-template was specified')
							resultItem = $('<li>').html(result)
						}
					
						// Extract HTML as a string and add it to the html variable (ugly, but works...)
						body += $("<div>").html(resultItem).html()
					})
				}else{
					// No results was returned - render the noResultsText unless it's false (hidden)
					if(_t.settings.noResultsText) body = $('<li>').addClass('empty').html(_t.settings.noResultsText)
				}
			
				// Insert the sum of the cardamum to the resultsList
				_t.settings.resultsList.html(body)
			},
		
			_runValidations: function(){
				if(!this.settings.request.url) this._throwError('Request URL is not specified')
				if(!this.settings.resultsList.length) this._throwError('Can\'t find resultsList element')
			
				if(this.settings.template){
					if(!this.settings.template.length) this._throwError('Can\'t find HTML-template')
					var type = this.settings.template[0].type
					if(type) type = type.toLowerCase()
					if(type != 'text/html-template') this._throwError('"' + this.settings.template.selector + '" is not a text/html-template')
					if(!$.tmpl) this._throwError('Use of HTML templates require the jQuery.tmpl plugin. Download at http://github.com/jquery/jquery-tmpl')
				}
			},
		
			_throwError: function(error){
				throw new Error('[jQuery liveSearch] ' + error)
			}
		}
	}
	
	
	
	$.fn.liveSearch = function(options){
		// Set default settings and override with provided ones
		var settings = $.extend({
			considerSpaces:	false,
			resultsList:		$('.jquery-livesearch-results'),
			template:				false,
			noResultsText:	'No results found',
			request: {
				type:			'GET',
				dataType:	'JSON',
				url:			this.parents('form').attr('action'),
				data:			{},
				error:		function(xhr, status, data){ alert(data) }
			}
		}, options)
		
		return this.each(function(){
			new methods().init($(this), settings)
		})
	}
})(jQuery)