/* jQuery Live Search Plugin 1.0.0
 * http://github.com/zykadelic/jquery-livesearch
 * 
 * Licensed under the GNU General Public License
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
				
				// Disable browser's autocomplete for inputs
				_t.element.attr('autocomplete', 'off')
				
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
				
				// Add .hover to hovered list item instead of using :hover (for key navigations to work smoother)
				$(_t.settings.resultsList.selector + ' li').live('mouseenter.liveSearch', function(){
					// Remove .hover from all list items, if keynav has been used to add .hover to something else
					$(_t.settings.resultsList.selector + ' li').removeClass('hover')
					$(this).addClass('hover')
				})
				
				$(_t.settings.resultsList.selector + ' li').live('mouseleave.liveSearch', function(){
					$(this).removeClass('hover')
				})
				
				// Only show results on focus if there is a value in the element (space sensitive)
				_t.element.live('focus.liveSearch', function(){
					if(_t.settings.considerSpaces ? $(this).val() : $(this).val().trim()) _t.showResultsList()
				})
				
				// Run keypress with the character as argument - used for search queries
				_t.element.live('keypress.liveSearch', function(key){ _t.keypress(String.fromCharCode(key.charCode)) })
				
				// Hook a keydown event to catch key navigations that keypress doesn't
				_t.element.live('keydown.liveSearch', function(key){ _t.keydown(key) })
				
				
				// Hide results on blur
				_t.element.live('blur.liveSearch', function(){ _t.hideResultsList() })
				
				// Don't display results on initiation
				_t.hideResultsList
			},
			
			// Catches only characters, used for queries
			keypress: function(_char){
				// Read and write previous value, as a property, from the element
				var previousValue	= this.element.prop('previousValue') || ''
				var currentValue	= this.element.val() + _char
				this.element.prop('previousValue', currentValue)
				
				// Unless spaces are considered, don't run the search when space key is hit
				if(_char != ' ' || this.settings.considerSpaces) this._search(currentValue)
			},
			
			// Catches all keys, but only care for key navigations
			keydown: function(key){
				switch(key.keyCode){
					case 40: // Down arrow
						this._keynav('down')
					break
					
					case 38: // Up arrow
						this._keynav('up')
					break
					
					case 13: // Enter
						// TODO Enable selection in resultsList for an autocomplete-like feel
					break
					
					case 27: // Escape
						if(this.settings.blurOnEscape) this.element.blur()
					break
					
					case 8: // Backspace
						// Manually invoke search (bypassing keypress) with the last character removed, since this is a keydown event
						this._search(this.element.val().slice(0, -1))
					break
					
					case 46: // Delete
						// Same as case 8 (backspace)
						this._search(this.element.val().slice(0, -1))
					break
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
					_t.hideResultsList()
				}
				
				// Store the custom callbacks so that we can intelligently override and re-call them
				var callbacks = {
					success: _t.settings.request.success,
					error: _t.settings.request.error
				}
				
				var request = $.extend(_t.settings.request, {
					// Send the data with an added query parameter
					data: $.extend(_t.settings.request.data, { query: query }),
					
					// Override the success callback, and then re-call it from the request object, so that we can perform our callbacks first
					success: function(data, status, xhr){
						_t.settings.resultsList.removeClass('loading')
						_t._renderResults(data)
						callbacks.success(data, status, xhr)
					},
					
					// Same here - override the error callback and call it again after we have performed our callbacks
					error: function(xhr, status, data){
						_t.settings.resultsList.removeClass('loading')
						callbacks.error(xhr, status, data)
					}
				})
				
				// Clean motherf*****!
				$.ajax(request)
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
			
			_keynav: function(direction){
				var firstLi		= direction == 'up' ? this.settings.resultsList.find('li').last() : this.settings.resultsList.find('li').first()
				var currentLi	= this.settings.resultsList.find('li.hover')
				var nextLi		= direction == 'up' ? currentLi.prev('li') : currentLi.next('li')
				if(currentLi.length){
					currentLi.removeClass('hover')
					nextLi.length ? nextLi.addClass('hover') : firstLi.addClass('hover')
				}else{
					firstLi.addClass('hover')
				}
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
		// Set the default request and extend with options (if provided)
		// We do this here in order to avoid overwriting the entire object from options
		var request = $.extend({
			type:			'GET',
			dataType:	'JSON',
			url:			this.parents('form').attr('action'),
			data:			{},
			success:	function(data, status, xhr){},
			error:		function(xhr, status, data){ alert(status) }
		}, options ? options.request : undefined)
		
		// Set default settings and override with provided ones (except the request object)
		var settings = $.extend({
			considerSpaces:	false,
			resultsList:		$('.jquery-livesearch-results'),
			template:				false,
			noResultsText:	'No results found',
			blurOnEscape:		true
		}, options)
		
		// Overwrite the overwriting request object here (if provided by options), with our nicely merged one
		settings.request = request
		
		return this.each(function(){
			new methods().init($(this), settings)
		})
	}
})(jQuery)