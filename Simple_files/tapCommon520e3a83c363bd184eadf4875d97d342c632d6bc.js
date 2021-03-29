tap = {};
tap.userLogin = "${adminLayout_userLogin}";
tap.userOwner = "${adminLayout_userOwnerName}";
window.localizedStrings = {};
$(document).ready(function () {
    $("#logout").click(function () {
        var landat = window.location.href.replace(window.location.origin, "");
        if (landat && landat.startsWith("/") && !landat.startsWith("//")) {
            sessionStorage.setItem("landat", landat);
        }
    });
});

(function($){

    TapAttributeEditor = function(options) {
        util.validateExists(options, ['strings', 'dataSelector', 'tableSelector']);

        var _strings = $.extend({}, options.strings);
        // Root node containing the serialized data
        var _dataContainer = $(options.dataSelector);
        // The table nodes
        var _table = $(options.tableSelector);
        var _tbody = _table.find('tbody');
        if (!_tbody) {
            _tbody = $('<tbody>');
            _table.append(_tbody);
        }
        // A mapping of attribute key to value
        var _attributes;

        var _onEditStart = options.onEditStart || function(){};
        var _onEditEnded = options.onEditEnded || function(){};

        // Deserialize attribute data from the data container,
        // which contains elements with id's of the pattern:
        //     attributesX.key and attributesX.value
        // where X is a zero-based index.
        var _deserialize = function() {
            _attributes = {};
            var attributeIndex = 0;
            var endOfData = false;
            var keyInput;
            var key;
            var valueInput;
            var value;

            while (!endOfData) {
                keyInput = _dataContainer.find('#attributes' + attributeIndex + '\\.key')[0];
                valueInput = _dataContainer.find('#attributes' + attributeIndex + '\\.value')[0];

                if (keyInput && valueInput) {
                    key = $.trim(keyInput.value);
                    value = $.trim(valueInput.value);
                    _attributes[key] = {'key': key, 'value': value};
                } else if (keyInput || valueInput) {
                    throw new Error('Missing key or value for index ' + attributeIndex);
                } else {
                    endOfData = true;
                }
                attributeIndex++;
            }
            console.log('deserialized attributes: ', _attributes);
        };

        // Replaces any nodes with id starting with attributes
        // with hidden inputs named in the format needed by
        // the Spring MVC WebDataBinder to build a attribute
        // collection in Java.
        var _serialize = function() {
            _dataContainer.find('[id^=attributes]').remove();
            var index = 0;

            $.each(_attributes, function(key, attribute) {
                var keyInput = $('<input>', {
                    'type': 'hidden',
                    'id': 'attributes' + index + '.key',
                    'name': 'attributes[' + index + '].key',
                    'value': attribute.key
                });
                var valueInput = $('<input>', {
                    'type': 'hidden',
                    'id': 'attributes' + index + '.value',
                    'name': 'attributes[' + index + '].value',
                    'value': attribute.value
                });
                _dataContainer.append(keyInput, valueInput);
                index++;
            });
        };

        var _createEditActions = function(rowContext) {
            var editAction = $('<a>', {'class': 'initiateAttrAction btn btn-small'});
            editAction.text(_strings.edit);
            editAction.click({context: rowContext}, _startEdit);

            var deleteAction = $('<a>', {'class': 'initiateAttrAction btn btn-small'});
            deleteAction.html('<i class="icon-trash"></i> ');
            deleteAction.click({context: rowContext}, _deleteRow);

            return [editAction, ' ', deleteAction];
        };

        var _saveEdit = function(evt) {
            var rowContext = evt.data.context;
            var keyCell = rowContext.key;
            var valueCell = rowContext.value;
            var actionsCell = rowContext.actions;
            var attribute = rowContext.attribute;

            // Validate names are not  duplicated.
            // It's only valid to exist in the map if it's
            // the row being edited.
            var keyInput = $(keyCell).find('input');
            var key = $.trim(keyInput.val());
            var errors = "";
            if (_attributes[key] && (attribute.key !== key)) {
                keyInput.focus();
                keyInput.select();
                errors += ' ' + _strings.unique_attribute_name;
            }else if (!key){
                keyInput.focus();
                keyInput.select();
                errors += ' ' +  _strings.empty_attribute_key;
            }else if(! key.match(/^[\w|\-]+$/)){
                keyInput.focus();
                keyInput.select();
                errors += ' ' +  _strings.invalid_attribute_key;
            }

            var valueInput = $(valueCell).find('input');
            var value = $.trim(valueInput.val());
            if(!value){
                valueInput.focus();
                valueInput.select();
                errors += ' ' +  _strings.empty_attribute_value;
            }
            if(errors){
                $("#attributeInlineError").text(errors);
                return;
            }
            if (attribute.key) {
                if(attribute.key !== key){
                    _attributes[attribute.key] = {key: key, value: value};
                    _attributes[key] = _attributes[attribute.key];
                    delete _attributes[attribute.key];

                }else{
                    _attributes[key] = {key: key, value: value};
                }
            }else{
                _attributes[key] = {key: key, value: value};
            }
            render();
            _onEditEnded();
        };

        var _cancelEdit = function(evt) {
            _onEditEnded();
            render();
        };

        var _deleteRow = function(evt) {
            var rowContext = evt.data.context;
            var attribute = rowContext.attribute;
            delete _attributes[attribute.key];
            console.log('Attributes after delete ', _attributes);
            render();
        };

        var _startEdit = function(evt) {
            // Prevent other rows from being edited
            _tbody.find('a.initiateAttrAction').hide();

            var rowContext = evt.data.context;
            var key = rowContext.key;
            var value = rowContext.value;
            var actions = rowContext.actions;
            var attribute = rowContext.attribute;
            var keyText = attribute.key;
            var valueText = attribute.value;

            key.empty();
            value.empty();
            actions.empty();

            var keyInput = $('<input>', {'type': 'text'});
            keyInput.val(keyText);
            key.append(keyInput);
            var valueInput = $('<input>', {'type': 'text'});
            valueInput.val(valueText);
            value.append(valueInput);

            var saveAction = $('<a>', {'class': 'btn btn-small'});
            saveAction.text(_strings.done);
            saveAction.click({context: rowContext}, _saveEdit);

            var cancelAction = $('<a>', {'class': 'btn btn-small'});
            cancelAction.text(_strings.cancel);
            cancelAction.click({context: rowContext}, _cancelEdit);

            var inlineError = $('<span>', {'id': 'attributeInlineError','class': 'inlineError'});

            actions.append(saveAction, ' ', cancelAction, ' ', inlineError);
            keyInput.focus();
            keyInput.select();
            _onEditStart();
        };

        var _startCreate = function(evt) {
            // Prevent other rows from being edited
            _tbody.find('a.initiateAttrAction').hide();

            var row = $('<tr>');
            var keyCell = $('<td>');
            var keyInput = $('<input>', {'type': 'text'});
            keyCell.append(keyInput);
            row.append(keyCell);

            var valueCell = $('<td>');
            var valueInput = $('<input>', {'type': 'text'});
            valueCell.append(valueInput);
            row.append(valueCell);

            var actionsCell = $('<td>');

            var rowContext  = {
                key: keyCell,
                value: valueCell,
                actions: actionsCell,
                attribute: {}
            };

            var saveAction = $('<a>', {'class': 'btn btn-small'});
            saveAction.text(_strings.done);
            saveAction.click({context: rowContext}, _saveEdit);

            var cancelAction = $('<a>', {'class': 'btn btn-small'});
            cancelAction.text(_strings.cancel);
            cancelAction.click({context: rowContext}, _cancelEdit);

            var inlineError = $('<span>', {'id': 'attributeInlineError','class': 'inlineError'});
            actionsCell.append(saveAction, ' ', cancelAction, ' ', inlineError);

            row.append(actionsCell);
            _tbody.find('tr:last').remove();
            _tbody.append(row);
            keyInput.focus();
            _onEditStart();
        };

        var render = function() {
            var rows = _tbody.find('tr');
            rows.remove();

            $.each(_attributes, function(attributeName, attribute) {
                var row = $('<tr>');
                var keyCell = $('<td>');
                var valueCell = $('<td>');
                keyCell.text(attribute.key);
                valueCell.text(attribute.value);
                if (attribute.value.length === 0) {
                    row.addClass("alert").addClass("alert-error").css("background-image", "none");
                }
                row.append(keyCell);
                row.append(valueCell);

                var actionsCell = $('<td>', {'class': 'actionCell'});
                var rowContext = {
                    key: keyCell,
                    value: valueCell,
                    actions: actionsCell,
                    attribute: attribute
                };
                _.each(_createEditActions(rowContext), function(action) {
                    actionsCell.append(action);
                });
                row.append(actionsCell);
                if (attribute.value.length === 0) {
                    row.append($('<div>').text(_strings.emptyAttributeWarning));
                }
                _tbody.append(row);
            });

            var addAction = $('<a>', {'class': 'initiateAttrAction btn btn-small'});
            addAction.html('<i class="icon-plus"></i> ');
            addAction.append(document.createTextNode(_strings.add));
            addAction.click(_startCreate);
            var addRow = $('<tr>');
            var spacer = $('<td>', {'colspan': '2'});
            var addCell = $('<td>');
            addCell.append(addAction);
            addRow.append(spacer, addCell);
            _tbody.append(addRow);
        };

        // Public API
        this.render = render;

        // Saves the current committed table state to the DOM.
        this.save = function() {
            _cancelEdit({});
            render();
            _serialize();
        };

        // Resets the editor state to reflect the DOM.
        this.reset = function() {
            _deserialize();
            render();
        };
    };

})(jQuery);
(function($){
    adminPageAuditRecords = {
        init: function(args) {
            util.validateExists(args, ["entityType", "entityId"]);
            var entityType = args.entityType;
            var entityId = args.entityId;
            var dataDiv = $("#auditDataDiv");
            var errorDiv = $("#auditErrorDiv");
            var loadAuditButton = $('#loadAuditButton');
            var refreshAuditButton = $('#refreshAuditButton');
            var spinner = $('#loadingSpinner');
            var refreshDataDiv = function(evt) {
                errorDiv.hide();
                dataDiv.empty();
                loadAuditButton.hide();
                refreshAuditButton.show();
                spinner.show();
                $.ajax({
                    type: "GET",
                    url: document.requestPathPrefix + "/get-change-audit",
                    data: {
                        entityType: entityType,
                        entityId: entityId
                    },
                    success: function(data) {
                        dataDiv.html(data);
                    },
                    error: function() {
                        errorDiv.show();
                    },
                    complete: function() {
                        spinner.hide();
                    }
                });
            };
            loadAuditButton.click(refreshDataDiv);
            refreshAuditButton.click(refreshDataDiv);
        }
    };
})(jQuery);tapConstants = {
    URL_BASE: document.requestPathPrefix
};
(function($){
    dataTablesEntitySearch = {
            /**
             * Initializes a table to enable pagination using DataTables
             * @param table The table to be initialized.
             * @param strings Localized strings
             * @param ajaxSource URL of the AJAX controller that will provide data to DataTables
             * @param fnParser Callback function that returns JSON-stringified filter options
             * @param fnPageSize Callback function that returns current selected page size
             */
            init: function(options) {
                var table = options.table;
                var strings = options.strings;
                var ajaxSource = options.ajaxSource;
                var fnParser = options.fnParser;
                var fnPageSize = options.fnPageSize;
                var errorDiv = options.errorDiv;
                var data, pageSize;
                var refreshMs = 500; // half second refresh
                var currentlyRetrying = false;
                function fnError() {
                    if (currentlyRetrying) {
                        return;
                    }
                    if (errorDiv !== undefined) {
                        errorDiv.show();
                    }
                    currentlyRetrying = true;
                    _.delay(function() {
                        if (errorDiv !== undefined) {
                            errorDiv.hide();
                        }
                        currentlyRetrying = false;
                        table.fnDraw(table.fnSettings());
                    }, 2000);
                }
                // Set up Previous / Next buttons to have Bootstrap classes
                $.fn.dataTableExt.oStdClasses.sPageNextDisabled = "btn disabled dataTablesNext";
                $.fn.dataTableExt.oStdClasses.sPagePrevDisabled = "btn disabled dataTablesPrev";
                $.fn.dataTableExt.oStdClasses.sPageNextEnabled = "btn dataTablesNext";
                $.fn.dataTableExt.oStdClasses.sPagePrevEnabled = "btn dataTablesPrev";
                table.dataTable({
                    "bProcessing": "true",
                    "bServerSide": "true",
                    "bSort": false,
                    "bLengthChange": false,
                    "iDeferLoading": true,
                    "sAjaxSource": ajaxSource,
                    "oLanguage": {
                        "sInfo": strings.sInfo,
                        "sInfoEmpty": strings.sInfoEmpty,
                        "oPaginate": {
                            "sPrevious": strings.sPrevious,
                            "sNext": strings.sNext
                        },
                        "sInfoFiltered": strings.sInfoFiltered,
                        "sSearch": strings.sSearch,
                        "sZeroRecords": strings.sZeroRecords,
                        "sLengthMenu": strings.sLengthMenu
                    },
                    // Top to bottom: Pagination, Table, Information, pRocessing blurb
                    "sDom": 'ptir',
                    "fnServerData": function ( sSource, aoData, fnCallback, oSettings ) {
                        oSettings.jqXHR = $.ajax( {
                          "dataType": 'json',
                          "type": "GET",
                          "url": sSource,
                          "data": aoData,
                          "success": function(data) {
                              table.show();
                              $('.dataTables_info').show();
                              fnCallback(data);
                          },
                          "error": fnError
                        } );
                    },
                    "fnDrawCallback": function() {
                        window.dataTableRefreshed();
                    }
                });
                table.hide();
                $('.dataTables_info').hide();
                // We are using multiple search boxes, hide the default search box
                $('.dataTables_filter').hide();
                // Check filter boxes, update table if needed
                function checkFields() {
                    // If no parser function was passed in, don't try calling it repeatedly
                    if (fnParser === undefined) {
                        return;
                    }
                    try {
                        var newData = fnParser();
                        if (data !== newData) {
                            data = newData;
                            var oFeatures = table.fnSettings();
                            table.fnFilter(data);
                        }
                    } catch (error) {
                        console.log(error);
                    }
                    _.delay(checkFields, refreshMs);
                }
                function checkPageSize() {
                    // If no page size function was passed in, don't try calling it repeatedly
                    if (fnPageSize === undefined) {
                        return;
                    }
                    var newPageSize = fnPageSize();
                    if (newPageSize !== pageSize) {
                        pageSize = newPageSize;
                        table.fnSettings()._iDisplayLength = pageSize;
                        table.fnDraw(table.fnSettings());
                    }
                    _.delay(checkPageSize, refreshMs);
                }
                checkFields();
                checkPageSize();
            }
    };

    window.dataTableRefreshed = function() {
    };
})(jQuery);// Thanks to http://stackoverflow.com/questions/1219860
// A method to escape a string in HTML style
window.escapeHtml = function(string) {
    return string
        .replace(/&/g, "&amp;")
        .replace(/'/g, "&apos;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
};

window.safeParser = function(jsonString) {
    try {
        return JSON.parse(jsonString);
    } catch (e) {
        return jsonString;
    }
};/**
  * https://gist.github.com/cjcliffe/1185173
  */

window.enums = window.enums || {};
window.enums.keyboard = {
      BACKSPACE: 8,
      TAB: 9,
      ENTER: 13,
      SHIFT: 16,
      CTRL: 17,
      ALT: 18,
      PAUSE: 19,
      CAPS_LOCK: 20,
      ESCAPE: 27,
      SPACE: 32,
      PAGE_UP: 33,
      PAGE_DOWN: 34,
      END: 35,
      HOME: 36,
      LEFT_ARROW: 37,
      UP_ARROW: 38,
      RIGHT_ARROW: 39,
      DOWN_ARROW: 40,
      INSERT: 45,
      DELETE: 46,
      KEY_0: 48,
      KEY_1: 49,
      KEY_2: 50,
      KEY_3: 51,
      KEY_4: 52,
      KEY_5: 53,
      KEY_6: 54,
      KEY_7: 55,
      KEY_8: 56,
      KEY_9: 57,
      KEY_A: 65,
      KEY_B: 66,
      KEY_C: 67,
      KEY_D: 68,
      KEY_E: 69,
      KEY_F: 70,
      KEY_G: 71,
      KEY_H: 72,
      KEY_I: 73,
      KEY_J: 74,
      KEY_K: 75,
      KEY_L: 76,
      KEY_M: 77,
      KEY_N: 78,
      KEY_O: 79,
      KEY_P: 80,
      KEY_Q: 81,
      KEY_R: 82,
      KEY_S: 83,
      KEY_T: 84,
      KEY_U: 85,
      KEY_V: 86,
      KEY_W: 87,
      KEY_X: 88,
      KEY_Y: 89,
      KEY_Z: 90,
      LEFT_META: 91,
      RIGHT_META: 92,
      SELECT: 93,
      NUMPAD_0: 96,
      NUMPAD_1: 97,
      NUMPAD_2: 98,
      NUMPAD_3: 99,
      NUMPAD_4: 100,
      NUMPAD_5: 101,
      NUMPAD_6: 102,
      NUMPAD_7: 103,
      NUMPAD_8: 104,
      NUMPAD_9: 105,
      MULTIPLY: 106,
      ADD: 107,
      SUBTRACT: 109,
      DECIMAL: 110,
      DIVIDE: 111,
      F1: 112,
      F2: 113,
      F3: 114,
      F4: 115,
      F5: 116,
      F6: 117,
      F7: 118,
      F8: 119,
      F9: 120,
      F10: 121,
      F11: 122,
      F12: 123,
      NUM_LOCK: 144,
      SCROLL_LOCK: 145,
      SEMICOLON: 186,
      EQUALS: 187,
      COMMA: 188,
      DASH: 189,
      PERIOD: 190,
      FORWARD_SLASH: 191,
      GRAVE_ACCENT: 192,
      OPEN_BRACKET: 219,
      BACK_SLASH: 220,
      CLOSE_BRACKET: 221,
      SINGLE_QUOTE: 222
    };/*
Selectors for various entity types.
Built on top of select2.
*/

(function($){
    var BASE_SEARCH_URL = '/selector-search';

    // Note that until we can update Select2, this will double escape ampersands
    function escapeData(data) {
        data.results.forEach(function(item, index) {
            item.id = window.escapeHtml(item.id);
            item.text = window.escapeHtml(item.text);
        });
    }

    function initSelection(element, callback, urlSuffix){
        if($(element).val() === ""){
            if($(element).attr('multiple')){
                $(element).parent().find('.select2-search-choice').remove();
            }
            return;
        }

        $.ajax(document.requestPathPrefix + BASE_SEARCH_URL + urlSuffix, {
            dataType: 'json',
            data: {
                name: "",
                page: 0,
                ids:  $(element).val()
            }
        }).done(function(data) {
            var selectData;
            if ($(element).attr('multiple')) {
                selectData = data.results;
            } else if($(element).data('init-text')){
                var text = $(element).data('init-text');
                data.results.forEach(function(option){
                    if(option.text === text){
                        selectData = option;
                    }
                });
            } else {
                selectData = data.results.length > 0 ? data.results[0] : null;
            }
            callback(selectData);
        });
    }

    function initSelectionForCTI(element, callback, urlSuffix, ticketCategory, ticketType){
        if($(element).val() === ""){
            return;
        }

        $.ajax(document.requestPathPrefix + BASE_SEARCH_URL + urlSuffix, {
            dataType: 'json',
            data: {
                name: "",
                page: 0,
                ids:  $(element).val(),
                category:  ticketCategory,
                type:  ticketType
            }
        }).done(function(data) {
            var selectData = data.results.length > 0 ? data.results[0] : null;
            callback(selectData);
        });
    }

    function select2Options(urlSuffix, options) {
        options = $.extend({
            minimumInputLength: 0,
            closeOnSelect: true
        }, options);

        return {
            minimumInputLength: options.minimumInputLength,
            initSelection: options.initSelection ? options.initSelection : function(element, callback){
                initSelection(element, callback, urlSuffix);
            },
            allowClear: options.allowClear,
            placeholder: options.placeholder,
            multiple: options.multiple,
            closeOnSelect: options.closeOnSelect,
            ajax: $.extend({
                url: document.requestPathPrefix + BASE_SEARCH_URL + urlSuffix,
                dataType: 'json',
                quietMillis: 300,
                data: function(term, page) {
                    return $.extend({name: term, page: page - 1}, options.ajaxData);
                },
                results: function(data, page) {
                    escapeData(data);
                    return data;
                }
            }, options.ajax)
        };
    }

    $.fn.extend({

        callCenterSelect: function(options) {
            options = $.extend({
                allowClear: true,
                placeholder: 'Global'
            }, options);

            return this.each(function(){
                $(this).select2(select2Options('/callCenters', options));
            });
        },

        cdrMetricNameSelect: function(options) {
            options = $.extend({
                allowClear: true,
                placeholder: 'CTR Metric Name'
            }, options);

            return this.each(function(){
                $(this).select2(select2Options('/cdr-metric-names', options));
            });
        },
        /*
         * Select call flows. Names are returned instead of call flow IDs
         */
        callFlowNameSelect: function(options) {
            options = $.extend({
                allowClear: true,
                minimumInputLength: 0, // Loads first page without any input
                placeholder: 'Select a call flow'
            }, options);

            return this.each(function(){
                $(this).select2(select2Options('/callFlowNames', options));
            });
        },

        callflowTemplateSelect: function(options) {
              options = $.extend({
                  allowClear: true,
                  placeholder: 'Select a template'
              }, options);

              return this.each(function(){
                  $(this).select2(select2Options('/callflowTemplates', options));
              });
         },

        c2CallTemplateSelect: function(options) {
            options = $.extend({
                allowClear: true,
                placeholder: 'Select a template'
            }, options);

            return this.each(function(){
                $(this).select2(select2Options('/c2c-templates/Voice', options));
            });
        },

        c2ChatTemplateSelect: function(options) {
            options = $.extend({
                allowClear: true,
                placeholder: 'Select a template'
            }, options);

            return this.each(function(){
                $(this).select2(select2Options('/c2c-templates/Chat', options));
            });
        },

        c2EmailTemplateSelect: function(options) {
            options = $.extend({
                allowClear: true,
                placeholder: 'Select a template'
            }, options);

            return this.each(function(){
                $(this).select2(select2Options('/c2c-templates/Email', options));
            });
        },

        c2WorkItemTemplateSelect: function(options) {
            options = $.extend({
                allowClear: true,
                placeholder: 'Select a template'
            }, options);

            return this.each(function(){
                $(this).select2(select2Options('/c2c-templates/WorkItem', options));
            });
        },

        emailDomainSelect: function(options) {
            options = $.extend({
                allowClear: true,
                placeholder : 'Select Domain'
            }, options);

            return this.each(function() {
                $(this).select2(select2Options('/email-queue-domains', options));
            });
        },

        emailQueueDepartmentsSelect: function(options) {
            options = $.extend({
                allowClear: true,
                placeholder : 'Select Department'
            }, options);

            return this.each(function() {
                $(this).select2(select2Options('/email-queue-departments', options));
            });
        },

        ctiCategorySelect: function(options) {
            if (options.ajaxData) {
                var ticketCategory = options.ajaxData.category ? options.ajaxData.category : "";
                var ticketType = options.ajaxData.type ? options.ajaxData.type : "";
            }
            options = $.extend({
                allowClear: true,
                placeholder : 'Select Category',
                initSelection : function(element, callback) {
                    initSelectionForCTI(element, callback, '/cti-category-search', ticketCategory, ticketType);
                    }
            }, options);

            return this.each(function() {
                $(this).select2(select2Options('/cti-category-search', options));
            });
          },

        ctiTypeSelect: function(options) {
            if (options.ajaxData) {
                var ticketCategory = options.ajaxData.category ? options.ajaxData.category : "";
                var ticketType = options.ajaxData.type ? options.ajaxData.type : "";
            }
            options = $.extend({
                  allowClear: true,
                  placeholder : 'Select Type',
                  initSelection : function(element, callback) {
                      initSelectionForCTI(element, callback, '/cti-type-search', ticketCategory, ticketType);
                      }
            }, options);

            return this.each(function() {
                $(this).select2(select2Options('/cti-type-search', options));
            });
        },

        ctiItemSelect: function(options) {
            if (options.ajaxData) {
                var ticketCategory = options.ajaxData.category ? options.ajaxData.category : "";
                var ticketType = options.ajaxData.type ? options.ajaxData.type : "";
            }
            options = $.extend({
                allowClear: true,
                placeholder : 'Select Item',
                initSelection : function(element, callback) {
                    initSelectionForCTI(element, callback, '/cti-item-search', ticketCategory, ticketType);
                    }
            }, options);

                return this.each(function() {
                $(this).select2(select2Options('/cti-item-search', options));
            });
        },

        marketplaceSelect : function(options) {
            options = $.extend({
                allowClear: true,
                placeholder : 'Select Marketplace'
            }, options);

            return this.each(function() {
                $(this).select2(select2Options('/marketplaces', options));
            });
        },
        marketplaceNameSelect : function(options) {
            options = $.extend({
                allowClear: false,
                placeholder : 'Select Marketplace'
            }, options);

            return this.each(function() {
                $(this).select2(select2Options('/marketplaceName', options));
            });
        },
        workCategorySelect : function(options) {
            options = $.extend({
                allowClear: false,
                placeholder : 'Select Work Category'
            }, options);

            return this.each(function() {
                $(this).select2(select2Options('/workCategoryName', options));
            });
        },

        entryPointSelect: function(options){
            options = $.extend({
                allowClear: true,
                placeholder: 'Entry Point'
            }, options);
            if(options.byAddress){
                options.data =  function(term, page){
                    return {
                        address: term,
                        byAddress: true,
                        page: page - 1
                    };
                };
                options.initSelection = function(element, callback){
                    $.ajax(document.requestPathPrefix + BASE_SEARCH_URL + '/entry-points', {
                        dataType: 'json',
                        data: $.extend({
                            address: $(element).val(),
                            page: 0
                        }, options.ajax ? options.ajax.data() : {})
                    }).done(function(data) {
                        callback(data.results[0]);
                    });
                };
            }

            return this.each(function(){
                $(this).select2(select2Options('/entry-points', options));
            });
        },

        entryPointAddressSelect: function(options) {
            options = $.extend({
                allowClear: false,
                placeholder: 'Search for a number'
            }, options);

            return this.each(function(){
                $(this).select2(select2Options('/entryPointsByAddress', options));
            });
        },

        entityTypeSelect: function(options) {
            options = $.extend({
                allowClear: true,
                placeholder: 'Any Entity'
            }, options);

            return this.each(function(){
                $(this).select2(select2Options('/entity-types-selector', options));
            });
        },

        messageSelect: function(options) {
            options = $.extend({
                allowClear: false,
                placeholder: "Search for a Message"
            }, options);

            return this.each(function() {
                $(this).select2(select2Options('/messages', options));
            });
        },

        ownerSelect: function(options) {
            options = $.extend({
                allowClear: true,
                placeholder: tap.ownerPref
            }, options);

            return this.each(function(){
                $(this).select2(select2Options('/owners', options));
            });
        },

        profileSelect: function(options) {
            options = $.extend({
                allowClear: false,
                placeholder: 'Search for a Profile'
            }, options);

            return this.each(function(){
                $(this).select2(select2Options('/profiles', options));
            });
        },

        promptSelect: function(options) {
            options = $.extend({
                allowClear: false,
                placeholder: 'Search for a Prompt'
            }, options);

            return this.each(function(){
                $(this).select2(select2Options('/prompts', options));
            });
        },

        skillSelect: function(options) {
            options = $.extend({
                allowClear: true,
                placeholder: 'Search for a Skill'
            }, options);

            return this.each(function(){
                $(this).select2(select2Options('/skills', options));
            });
        },

        sipDomainSelect: function(options) {
            options = $.extend({
                allowClear: false,
                placeholder: 'Search for SIP domains'
            }, options);

            return this.each(function(){
                $(this).select2(select2Options('/sip-domains', options));
            });
        },

        subMediaTypeSelect: function(options) {
            options = $.extend({
                allowClear: true,
                placeholder: 'Search for a SubMediaType'
            }, options);

            return this.each(function(){
                $(this).select2(select2Options('/subMediaTypes', options));
            });
        },

        teamSelect: function(options){
            options = $.extend({
                allowClear: true,
                placeholder: 'Search for a Team'
            }, options);

            return this.each(function(){
                $(this).select2(select2Options('/teams', options));
            });
        },

        timezoneSelect: function(options) {
            options = $.extend({
                allowClear: true,
                placeholder: 'Select a Timezone'
            }, options);

            return this.each(function(){
                $(this).select2(select2Options('/timezones', options));
            });
        },

        hoopSelect: function(options) {
            options = $.extend({
                allowClear: true,
                placeholder: 'Select Hours of Operation'
            }, options);

            return this.each(function(){
                $(this).select2(select2Options('/hoops', options));
            });
        }
    });

})(jQuery);
/*
Selectors for various entity types.
Built on top of select2.
*/

(function($){

    var BASE_SEARCH_URL = '/metrics-selector-search';

    function initSelection(element, callback, urlSuffix){
        if($(element).val() === ""){
            if($(element).attr('multiple')){
                $(element).parent().find('.select2-search-choice').remove();
            }
            return;
        }

        $.ajax(document.requestPathPrefix + BASE_SEARCH_URL + urlSuffix, {
            dataType: 'json',
            data: {
                name: "",
                page: 0,
                ids:  $(element).val()
            }
        }).done(function(data) {
            var selectData;
            if ($(element).attr('multiple')) {
                selectData = data.results;
            } else if($(element).data('init-text')){
                var text = $(element).data('init-text');
                data.results.forEach(function(option){
                    if(option.text === text){
                        selectData = option;
                    }
                });
            } else {
                selectData = data.results.length > 0 ? data.results[0] : null;
            }
            callback(selectData);
        });
    }

    function select2Options(urlSuffix, options) {
        options = $.extend({
            closeOnSelect: true,
            minimumInputLength: 0
        }, options);

        return {
            minimumInputLength: options.minimumInputLength,
            initSelection: options.initSelection ? options.initSelection : function(element, callback){
                initSelection(element, callback, urlSuffix);
            },
            allowClear: options.allowClear,
            placeholder: options.placeholder,
            multiple: options.multiple,
            closeOnSelect: options.closeOnSelect,
            ajax: $.extend({
                url: document.requestPathPrefix + BASE_SEARCH_URL + urlSuffix,
                dataType: 'json',
                quietMillis: 300,
                data: function(term, page) {
                    return $.extend({name: term, page: page - 1}, options.ajaxData);
                },
                results: function(data, page) {
                    return data;
                }
            }, options.ajax)
        };
    }

    $.fn.extend({

        metricsOwnerSelect: function(options) {
            options = $.extend({
                allowClear: true,
                placeholder: 'Search for an Owner'
            }, options);

            return this.each(function(){
                $(this).select2(select2Options('/owners', options));
            });
        },

        metricsCallCenterSelect: function(options) {
            options = $.extend({
                allowClear: true,
                placeholder: 'Search for a Call Center'
            }, options);

            return this.each(function(){
                $(this).select2(select2Options('/callCenters', options));
            });
        },

        metricsSkillSelect: function(options) {
            options = $.extend({
                allowClear: true,
                placeholder: 'Search for a Skill'
            }, options);

            return this.each(function(){
                $(this).select2(select2Options('/skills', options));
            });
        },

        metricsProfileSelect: function(options) {
            options = $.extend({
                allowClear: false,
                placeholder: 'Search for a Profile'
            }, options);

            return this.each(function(){
                $(this).select2(select2Options('/profiles', options));
            });
        },

        metricsEntryPointSelect: function(options) {
            options = $.extend({
                allowClear: false,
                placeholder: 'Search for an Entry Point'
            }, options);

            return this.each(function(){
                $(this).select2(select2Options('/entryPoints', options));
            });
        },

        metricsTeamSelect: function(options){
            options = $.extend({
                allowClear: true,
                placeholder: 'Search for a Team'
            }, options);

            return this.each(function(){
                $(this).select2(select2Options('/teams', options));
            });
        },

        metricsTimezoneSelect: function(options) {
            options = $.extend({
                allowClear: true,
                placeholder: 'Select a Timezone'
            }, options);

            return this.each(function(){
                $(this).select2(select2Options('/timezones', options));
            });
        },

        cdrMetricNameSelect: function(options) {
            options = $.extend({
                allowClear: true,
                placeholder: 'CTR Metric Name'
            }, options);

            return this.each(function(){
                $(this).select2(select2Options('/cdr-metric-names', options));
            });
        }

    });

})(jQuery);
(function($){
    tapSituationalMessageAdmin = {
        initSituationalMessagePage: function(args) {
            var token = args.token;

            $('.selectAllCheck').change(function(){
                var columnIndex = $(this).closest('td').index();
                if(this.checked){
                    $('tbody tr').each(function(i){
                        var checkboxes = $(this).children('td').eq(columnIndex).children('input:checkbox');
                        if (!checkboxes.attr('checked')) {
                            checkboxes.click();
                        }
                    });
                }
            });

            $('.columnCheck').change(function(){
                var columnIndex = $(this).closest('td').index();
                if(this.checked){
                    $('tbody tr').each(function(){
                        var checkboxes = $(this).children('td').eq(columnIndex).children('input:checkbox');
                        if (!checkboxes.attr('checked')) {
                            checkboxes.click();
                        }
                    });
                } else {
                    $('tbody tr').each(function(){
                        var checkboxes = $(this).children('td').eq(columnIndex).children('input:checkbox');
                        if (checkboxes.attr('checked')) {
                            checkboxes.click();
                        }
                    });
                }
            });

            $('.rowCheck').change(function(){
                if(this.checked) {
                    $(this).parent().siblings().children('input:checkbox').each(function() {
                        if ($(this).attr('checked')) {
                            $(this).click();
                        }
                    });
                }
                if ($(this).find('input[type=checkbox]:checked').length === 0) {
                    $(this).attr('checked', true);
                }
            });

            $('.individualCheck').change(function(){
                var columnIndex = $(this).closest('td').index();
                var parentSiblings = $(this).parent().siblings();
                if (this.checked) {
                    parentSiblings.children('.rowCheck').attr('checked', false);
                    $('table tr').children('td').children('.selectAllCheck').attr('checked', false);
                } else {
                    $('table tr').children('td').eq(columnIndex).children('.columnCheck').attr('checked', false);
                    if (parentSiblings.find('input[type=checkbox]:checked').length === 0) {
                        parentSiblings.children('.rowCheck').attr('checked', true);
                    }
                }
            });

            $('table tr').each(function(i) {
                if (i > 1) {
                    if ($(this).find('input[type=checkbox]:checked').length === 0) {
                        $(this).children('td').children('.rowCheck').attr('checked', true);
                    }
                }
            });

            $('.submitButton').click(function() {
                var results = [];
                $('.situational-message-row').each(function(index, container) {
                    results.push($(container).children().find('.individualCheck').map(function(innerIndex, innerContainer) {
                        var jqContainer = $(innerContainer);
                        if (jqContainer.prop('checked')) {
                            return innerContainer.id;
                        }
                    }).get());
                });
                var entityIds = $(".entityIdHolder").map(function(index,container) {
                    return $(container).val();
                }).get();
                $("#successDiv").hide();
                $("#errorDiv").hide();

                $.ajax({
                    url: args.baseUrl + "/" + entityIds.join(",") + "/emergency",
                    type: "POST",
                    data: {
                        selectedMessagesJson: JSON.stringify(results),
                        token: token
                    },
                    success: function(response) {
                        $("#successDiv").show();
                    },
                    statusCode: {
                        500: function() {
                            $("#errorDiv").show();
                        }
                    },
                    error: function(response) {
                        $("#errorDiv").show();
                    }
                });
            });

        },
        initViewPageWidget: function(args) {
            var emCheck = '.emergencyCheckbox';
            var nonEmCheck = '.noEmergencyCheckbox';
            // Uncheck 'No problems' if a problem is checked
            $(emCheck).click(function() {
                if ($(this).is(':checked')) {
                    $(nonEmCheck).prop('checked', false);
                } else if ($(emCheck + ":checked").length === 0){
                    // Check 'No problems' if the last problem was unchecked
                    $(nonEmCheck).prop('checked', true);
                }
            });
            // Uncheck all problems if the 'no problems' is checked
            $(nonEmCheck).click(function() {
                if ($(this).is(':checked')) {
                    $(emCheck).prop('checked', false);
                } else if (!$(emCheck).prop('checked')){
                    // Don't allow uncheck of 'No problems' box - only allow implicit unchecking via checking problems
                    $(nonEmCheck).prop('checked', true);
                }
            });
            if ($(emCheck + ":checked").length === 0) {
                $(nonEmCheck).prop('checked', true);
            }
            $('#updateStatusButton').click(function(evt) {
                var checkedEmergencies = [];
                $(emCheck + ':checked').each(function(index, value) {
                    checkedEmergencies.push(value.id);
                });
                $.ajax({
                    url: args.postUrl,
                    type: "POST",
                    data: {
                        situations: checkedEmergencies,
                        token: args.token
                    },
                    success: function(evt) {
                        location.reload();
                    },
                    error: function(evt) {
                        showStatusError();
                    }
                });
            });
            var showStatusError = function() {
                $('#statusError').show();
                _.delay(function() {
                    $('#statusError').fadeOut();
                }, 5000);
            };
        }
    };
})(jQuery);// This sets up basic elements of the page not associated with specific tabs


(function($){

    var OWNER_ID_COOKIE = 'cs-taw-admin-owner-id';

    var $ownerSelect, $ownerName;

    // Setup the owner selector when page loads
    $(document).ready(selectorInit);

    function selectorInit() {
        $ownerSelect = $('#cs-tap-admin-owner-select');
        $ownerName = $('#cs-tap-admin-user-owner-name');

        if (tap.ownerList != null && tap.ownerList.length > 1) {
            $ownerName.click(onOwnerNameClicked);
            $ownerSelect.change(onSelectChanged);
        }
    }

    // Show selector
    function onOwnerNameClicked() {
        $ownerName.hide();
        $ownerSelect.show().focus();
        $ownerSelect.select2({query: getOwners});
    }

    // Save choice as cookie and reload page
    function onSelectChanged() {
        var userName = $('#cs-tap-user-name').text();
        document.cookie = OWNER_ID_COOKIE + "=" + $(this).val() + ":" + userName + ";path=/call-center-manager/";
        document.cookie = OWNER_ID_COOKIE + "=" + $(this).val() + ":" + userName + ";path=/taw/";
        window.location.reload();
    }

    function getOwners(query){
        var data = {results: []};
        for (var i = 0 ; i < tap.ownerList.length ; ++i) {
            var owner = tap.ownerList[i];
            if (!query.term || owner.name.toLowerCase().indexOf(query.term.toLowerCase()) !== -1) {
                data.results.push({id: owner.id, text: owner.name});
            }
        }
        query.callback(data);
    }

})(jQuery);
(function($){

    TICKET_DATA_URL = document.requestPathPrefix + "/tickets";

    $.fn.extend({
        tickets: function(params, strings){
            var self = this;
            strings = $.extend({
                working: "We are currently working on these high severity issues."
            }, strings);
            $.ajax({
                url: TICKET_DATA_URL,
                data: params,
                type: "GET",
                dataType: "json",
                success: function(tickets){
                    if(tickets.length === 0){
                        self.hide();
                    }
                    var div = $('<div>').append($('<h3>').append(strings.working));
                    $(self).empty();
                    $.each(tickets, function(i){
                        div.append(
                            $('<div>').addClass('alert alert-danger').append(
                                $('<a>', { href: "https://tt.amazon.com/" + this.id }).append(
                                    this.description
                                )
                            )
                        );
                    });
                    self.append(div);
                }
            });
        }
    });
})(jQuery);
(function(){

    util = {

        // Return the name of the missing attribute in allAttributes, if any.
        // All attributes names described in requiredKeys must be present.
        findMissingAttributeName: function(allAttributes, requiredKeys) {
            var len = requiredKeys.length;
            var i;
            for(i=0; i<len; i++) {
                var key = requiredKeys[i];
                if (! (key in allAttributes) || allAttributes[key] === null) {
                    return key;
                }
            }
            return null;
        },

        validateExists: function(object, keys) {
            var missingAttr = util.findMissingAttributeName(object, keys);
            if (missingAttr) {
                throw new Error("Missing required attribute: " + missingAttr);
            }
        },

        // Animated scroll to a given element
        scrollTo: function(elem, animationMs, minus) {
            var offset = $(elem).offset();
            if (!offset) { return; }
            var top = offset.top;
            if (!top) { return; }

            // Subtract 'minus' to give a little breathing room up top
            var scrollTo = Math.max( top - minus, 0 );

            $('html, body').animate({ scrollTop: scrollTo }, animationMs || 0);
        },

        hideMessages: function() {
            $('div.messages > .alert').hide();
        },

        // Create a <td> element with the given text
        newTextCell: function(text) {
            var cell = $("<td>");
            cell.text(text);
            return cell;
        },

        // Create a <tr> element with the given text
        newTextHeaderCell: function(text) {
            var cell = $("<th>");
            cell.text(text);
            return cell;
        },

        // Update the rows of a table in such a way
        // that does not jerk around the scrolling on the page.
        resetTableBody: function(table, newTBody) {
            if (!newTBody) {
                newTBody = document.createElement('tbody');
            }
            var newTBodyFragment = document.createDocumentFragment();
            newTBodyFragment.appendChild(newTBody);
            var oldTbody = table.tBodies[0];
            if (oldTbody) {
                table.replaceChild(newTBodyFragment, oldTbody);
            }
            else {
                table.appendChild(newTBodyFragment);
            }
        },

        // Enhancement to _.once: added context param
        once: function(context, func) {
            return _.once(function() {
                func.apply(context, arguments);
            });
        },

        // validate the current field is not null
        validateNotNull: function(id, errorMessage){
            var value = $("#" + id).val();
            if(value === ''){
                this.errorMsg(id, errorMessage);
                return false;
            }else{
                $("#" + id + "InlineError").remove();
                return true;
            }
        },

        //validate the current field using regulation expression provided
        validateField: function(id, regex, errorMessage){
            var value = $("#" + id).val();
            if(! value.match(regex)){
                this.errorMsg(id, errorMessage);
                return false;
            }else{
                $("#" + id + "InlineError").remove();
                return true;
            }
        },

        //generate error message
        errorMsg: function (id, errorMessage){
            var errorFieldId = id + "InlineError";
            $("#" + id).focus();
            if($("#" + errorFieldId).length === 0){
                var errorSpan = $('<span>', {'id' : errorFieldId, 'class' : 'inlineError'});
                errorSpan.text(errorMessage);
                $("#" + id).after(errorSpan);
            }
        },

        removeSpan: function(spanId) {
            $('#' + spanId).remove();
        },

        isFunction: function(obj) {
           return !!(obj && obj.constructor && obj.call && obj.apply);
        },

        hitch: function() {
           var args = Array.prototype.slice.call(arguments);
           var scope = args.shift();
           var method = args.shift();

           if (! scope) {
              throw new Error("hitch(): scope is required!");
           }

           if (! method) {
              throw new Error("hitch(): method is required!");
           }

           if (! util.isFunction(method)) {
              throw new Error("hitch(): method is not a function!");
           }

           return function() {
              var closureArgs = Array.prototype.slice.call(arguments);
              return method.apply(scope, args.concat(closureArgs));
           };
        }
    };

})();
/* Extensions to Backbone.js for Telephony Agent Website */

(function(){

    TapBackbone = {};

    TapBackbone.Collection = Backbone.Collection.extend({

        // Pre-pend url with TAW url base
        // and add to the end of the path, depending on the method.
        sync: function(method, model, options) {
            var urlProperty = getValue(this, 'url') || urlError();
            if (method === 'read') {
                if( options.load ) {
                    options.url = tapConstants.URL_BASE + urlProperty + '/load';
                }
                else {
                    options.url = tapConstants.URL_BASE + urlProperty + '/list';
                }
            }
            else if (method === 'update') {
                options.url = tapConstants.URL_BASE + urlProperty + '/save';
            }
            else {
                options.url = tapConstants.URL_BASE + urlProperty;
            }
            Backbone.sync.apply(this, arguments);
        },

        // Customized fetch() that throws an event when it starts.
        // Useful for views to know that we started to get some data
        // and that it should expect a 'reset' event soon
        fetch: function(){
            this.trigger('fetch');
            return Backbone.Collection.prototype.fetch.apply(this, arguments);
        },

        // Overrides reset function to allow a custom function
        // to be run after the function method finishes
        reset: function(models, options){
            Backbone.Collection.prototype.reset.apply(this, arguments);
            if(options && options.nextFunc && typeof(options.nextFunc) === "function"){
                options.nextFunc();
            }
        },

        // Like Backbone.Model.save() function, but for bulk-updating a collection
        saveAll: function(options) {
            var collection = this;
            var success = options.success;
            options.success = function(resp, status, xhr) {
                if (success) {
                    success(this, resp);
                } else {
                    this.trigger('syncAll', this, resp, options);
                }
            };
            options.success = _.bind(options.success, this);
            options.error = Backbone.wrapError(options.error, this, options);
            var xhr = (this.sync || Backbone.sync).call(this, 'update', this, options);
            return xhr;
        }

    });

    TapBackbone.Model = Backbone.Model.extend({

        // Pre-pend URL with taw URL base
        sync: function(method, model, options) {
            var urlProperty = getValue(this, 'url') || urlError();
            if (method === 'update' || method === 'create') {
                options.url = tapConstants.URL_BASE + urlProperty + '/save';
            }
            else if (method === 'delete') {
                options.url = tapConstants.URL_BASE + urlProperty + '/delete' +
                    '?' + $.param(options.data);
            }
            else {
                options.url = tapConstants.URL_BASE + urlProperty;
            }
            Backbone.sync.apply(this, arguments);
        },

        // First check to make sure all required attributes are there
        validateRequired: function() {
            if (this.requiredAttributes) {
                var missingAttribute = util.findMissingAttributeName(this.attributes, this.requiredAttributes);
                if (missingAttribute) {
                    return "Missing required attribute: " + missingAttribute;
                }
            }
        }

    });

    // Helper function to get a value from a Backbone object as a property
    // or as a function.
    // (copied from backbone.js)
    function getValue(object, prop) {
        if (!(object && object[prop])){ return null; }
        return _.isFunction(object[prop]) ? object[prop]() : object[prop];
    }

    // Throw an error when a URL is needed, and none is supplied.
    // (copied from backbone.js)
    function urlError() {
        throw new Error('A "url" property or function must be specified');
    }


})();
