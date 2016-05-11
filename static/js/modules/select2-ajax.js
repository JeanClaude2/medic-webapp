var _ = require('underscore'),
    format = require('./format');

(function() {

  'use strict';

  exports.init = function($translate, Search, DB, $q) {
    var PAGE_SIZE,
        ALLOW_NEW,
        OBJECT_TYPE;

    var formatResult = function(row) {
      if(!row.doc) {
        return $('<p>' + (row.text || '&nbsp;') + '</p>');
      }
      if(row.doc.type === 'person') {
        return $(format.contact(row.doc));
      }
      // format escapes the content for us, and if we just return
      // a string select2 escapes it again, so return an element instead.
      return $('<span>' + format.clinic(row.doc) + '</span>');
    };

    var formatSelection = function(row) {
      if(row.doc) {
        return row.doc.name;
      }
      return row.text;
    };

    var prepareRows = function(documents, first) {
      var rows = _.sortBy(documents, function(doc) {
        return doc.name;
      }).map(function(doc) {
        return {
          id: doc._id,
          doc: doc
        };
      });

      if (first && ALLOW_NEW) {
        rows.unshift({
          id: 'NEW',
          text: $translate('contact.type.' + OBJECT_TYPE + '.new'),
        });
      }

      return rows;
    };

    var currentQuery;

    var query = function(params, successCb, failureCb) {
      var query = params.data.q;
      var skip = ((params.data.page || 1) - 1) * PAGE_SIZE;

      currentQuery = params.data.q;
      Search({ // $scope
          filterModel: {
              type: 'contacts',
              contactTypes: [OBJECT_TYPE],
          },
          filterQuery: {
              value: query
          }
      }, { // options
        limit: PAGE_SIZE,
        skip: skip
      }, function(err, documents) {
        if (currentQuery !== params.data.q) {
          return;
        }

        if (err) {
          return failureCb(err);
        }

        successCb({
          results: prepareRows(documents, skip === 0),
          pagination: {
            more: documents.length === PAGE_SIZE
          }
        });
      });
    };

    var resolveInitialValue = function(selectEl) {
      var value = selectEl.val();
      if (!value || value.length === 0) {
        return $q.resolve(selectEl);
      } else {
        return DB.get(value)
          .then(function(doc) {
            var text = formatSelection({doc: doc});
            selectEl.children('option[value='+value+']').text(text);
            return $q.resolve(selectEl);
          });
      }
    };

    var initSelect2 = function(selectEl) {
      selectEl.select2({
        ajax: {
          delay: 500,
          transport: query
        },
        allowClear: true,
        placeholder: '',
        templateResult: formatResult,
        templateSelection: formatSelection,
        width: '100%',
      });
    };

    return function(selectEl, objectType, options) {
      options = options || {};
      _.defaults(options, {
        pageSize: 20,
        allowNew: false,
        templateSelection: formatSelection,
        templateResult: formatResult
      });

      PAGE_SIZE = options.pageSize;
      ALLOW_NEW = options.allowNew;
      formatResult = options.templateResult;
      formatSelection = options.templateSelection;

      OBJECT_TYPE = objectType;

      return resolveInitialValue(selectEl).then(initSelect2);
    };
  };
})();
